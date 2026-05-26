const SUPABASE_URL = window.SUPABASE_URL || 'https://lznftylbukcbrciiwabg.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bmZ0eWxidWtjYnJjaWl3YWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDI5NjQsImV4cCI6MjA5NDk3ODk2NH0.oSxTQzZHyOaKK4ENSnFayujKV5IB0KQpD0nITSLbo5M';

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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Supabase error');
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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Supabase error');
    }
    return res.json();
  }
};

window.supabase = supabase;

