// Authentication management
const auth = {
  async signup(email, password) {
    const url = `${SUPABASE_URL}/auth/v1/signup`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      let errMsg = 'Erro ao realizar cadastro.';
      try {
        const err = await res.json();
        errMsg = err.error_description || err.msg || err.message || err.error || errMsg;
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
    const data = await res.json();
    if (data.access_token) {
      this.setSession(data);
    }
    return data;
  },

  async login(email, password) {
    const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      let errMsg = 'Erro ao realizar login. Verifique e-mail e senha.';
      try {
        const err = await res.json();
        errMsg = err.error_description || err.msg || err.message || err.error || errMsg;
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
    const data = await res.json();
    this.setSession(data);
    return data.user;
  },

  async logout() {
    const token = localStorage.getItem('supabase_access_token');
    if (token) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.error('Erro ao realizar logout no servidor:', e);
      }
    }
    this.clearSession();
    window.location.reload();
  },

  async checkSession() {
    const token = localStorage.getItem('supabase_access_token');
    const refreshToken = localStorage.getItem('supabase_refresh_token');
    if (!token || !refreshToken) {
      this.clearSession();
      return null;
    }

    // Evita disparar múltiplos refresh em paralelo (ex: saveAll com 3 requests
    // simultâneas após token expirar). O Supabase rotaciona o refresh_token a
    // cada uso, então renovações concorrentes com o mesmo token invalidam a
    // sessão recém-renovada. Compartilha uma única promise em voo.
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      try {
        const url = `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        if (!res.ok) {
          throw new Error('Sessão expirada');
        }
        const data = await res.json();
        this.setSession(data);
        return data.user;
      } catch (e) {
        console.warn('Sessão inválida ou expirada, limpando tokens...', e);
        this.clearSession();
        return null;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  },

  setSession(data) {
    localStorage.setItem('supabase_access_token', data.access_token);
    localStorage.setItem('supabase_refresh_token', data.refresh_token);
    localStorage.setItem('supabase_user', JSON.stringify(data.user));
  },

  clearSession() {
    localStorage.removeItem('supabase_access_token');
    localStorage.removeItem('supabase_refresh_token');
    localStorage.removeItem('supabase_user');
  },

  getUser() {
    const userStr = localStorage.getItem('supabase_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('supabase_access_token');
  }
};
