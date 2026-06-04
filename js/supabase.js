const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_KEY = window.SUPABASE_KEY || '';

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;

const supabase = {
  async query(table, method = 'GET', body = null, filter = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${filter}`;
    const token = localStorage.getItem('supabase_access_token') || SUPABASE_KEY;
    const res = await fetch(url, {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (res.status === 401 && localStorage.getItem('supabase_access_token') && window.auth) {
      try {
        const refreshedUser = await window.auth.checkSession();
        if (refreshedUser) {
          return this.query(table, method, body, filter);
        }
      } catch (authErr) {
        console.error('Erro na renovação silenciosa de token:', authErr);
      }
    }
    if (!res.ok) {
      let errMsg = 'Erro de comunicação com o servidor';
      try {
        const err = await res.json();
        errMsg = err.message || err.error_description || errMsg;
      } catch (e) {
        try {
          const textErr = await res.text();
          errMsg = textErr || res.statusText || errMsg;
        } catch (innerErr) {
          errMsg = res.statusText || errMsg;
        }
      }
      throw new Error(errMsg);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  },

  async select(table, filter = '') {
    return this.query(table, 'GET', null, filter);
  },

  async insert(table, data) {
    return this.query(table, 'POST', data);
  },

  async update(table, id, data) {
    return this.query(table, 'PATCH', data, `?id=eq.${id}`);
  },

  async delete(table, id) {
    return this.query(table, 'DELETE', null, `?id=eq.${id}`);
  },

  async upsert(table, data) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const token = localStorage.getItem('supabase_access_token') || SUPABASE_KEY;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(data),
    });
    if (res.status === 401 && localStorage.getItem('supabase_access_token') && window.auth) {
      try {
        const refreshedUser = await window.auth.checkSession();
        if (refreshedUser) {
          return this.upsert(table, data);
        }
      } catch (authErr) {
        console.error('Erro na renovação silenciosa de token (upsert):', authErr);
      }
    }
    if (!res.ok) {
      let errMsg = 'Erro de comunicação com o servidor';
      try {
        const err = await res.json();
        errMsg = err.message || err.error_description || errMsg;
      } catch (e) {
        try {
          const textErr = await res.text();
          errMsg = textErr || res.statusText || errMsg;
        } catch (innerErr) {
          errMsg = res.statusText || errMsg;
        }
      }
      throw new Error(errMsg);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  }
};

window.supabase = supabase;

