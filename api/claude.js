// NÃO USADO pelo frontend hoje — o app usa o fluxo manual de copiar/colar
// (js/claude-generate.js). Mantido protegido por autenticação caso seja
// conectado no futuro; não remover a checagem de token abaixo.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lznftylbukcbrciiwabg.supabase.co';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização não fornecido.' });
  }
  const token = authHeader.split(' ')[1];

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
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao validar token: ' + e.message });
  }

  const { systemPrompt, userContent } = req.body || {};

  if (!systemPrompt || !userContent) {
    return res.status(400).json({ error: 'Campos systemPrompt e userContent são obrigatórios.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no ambiente Vercel.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 8192,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || `Erro na Claude API (status ${response.status})`,
      });
    }

    const data = await response.json();
    const textBlock = data.content.find(c => c.type === 'text');
    return res.status(200).json({ result: textBlock?.text || '' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
