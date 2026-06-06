const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lznftylbukcbrciiwabg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização não fornecido.' });
  }
  const token = authHeader.split(' ')[1];

  // 1. Validar o usuário chamando o endpoint do Supabase Auth
  let callerUser = null;
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bmZ0eWxidWtjYnJjaWl3YWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDI5NjQsImV4cCI6MjA5NDk3ODk2NH0.oSxTQzZHyOaKK4ENSnFayujKV5IB0KQpD0nITSLbo5M',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
    callerUser = await userRes.json();
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao validar token: ' + e.message });
  }

  // 2. Verificar se o usuário é administrador
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  const isEmailAdmin = adminEmails.includes(callerUser.email.toLowerCase());
  const isRoleAdmin = callerUser.app_metadata?.role === 'admin' || callerUser.user_metadata?.role === 'admin';

  if (!isEmailAdmin && !isRoleAdmin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta área.' });
  }

  // 3. Executar as ações com a Service Role Key
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' });
  }

  const { action } = req.query;

  try {
    if (req.method === 'GET' && action === 'listUsers') {
      const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (!usersRes.ok) {
        const err = await usersRes.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao listar usuários do Supabase Auth');
      }
      const data = await usersRes.json();
      // GoTrue retorna uma lista direta de usuários
      return res.status(200).json({ users: data || [] });
    }

    if (req.method === 'POST' && action === 'toggleAdmin') {
      const { userId, role } = req.body || {};
      if (!userId || !role) {
        return res.status(400).json({ error: 'Campos userId e role são obrigatórios.' });
      }

      // Evitar auto-remoção de privilégios admin
      if (userId === callerUser.id && role !== 'admin') {
        return res.status(400).json({ error: 'Você não pode remover seu próprio privilégio de admin.' });
      }

      const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_metadata: { role },
          user_metadata: { role }
        })
      });

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao atualizar metadados do usuário.');
      }

      const updatedUser = await updateRes.json();
      return res.status(200).json({ user: updatedUser });
    }

    if (req.method === 'POST' && action === 'deleteUser') {
      const { userId } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: 'Campo userId é obrigatório.' });
      }

      if (userId === callerUser.id) {
        return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
      }

      const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });

      if (!deleteRes.ok) {
        const err = await deleteRes.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao excluir usuário do Supabase Auth.');
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Ação ou método inválido.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
