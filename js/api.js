const API = {
  baseUrl: '/api/v1',

  getToken() {
    return localStorage.getItem('authToken');
  },

  tokenExpirado() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (_) {
      return true;
    }
  },

  cerrarSesion(mensaje) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    if (typeof Utils !== 'undefined') {
      Utils.showToast(mensaje || 'Sesi\u00f3n expirada. Inicia sesi\u00f3n nuevamente.', 'error', 6000);
    }
    setTimeout(function () {
      if (typeof Auth !== 'undefined' && Auth.checkAuthStatus) {
        Auth.checkAuthStatus();
      }
    }, 500);
  },

  async request(endpoint, options = {}) {
    if (this.tokenExpirado()) {
      this.cerrarSesion('Tu sesi\u00f3n ha expirado. Inicia sesi\u00f3n nuevamente.');
      throw new Error('Sesi\u00f3n expirada');
    }

    const url = this.baseUrl + endpoint;
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      throw new Error('Error de conexi\u00f3n con el servidor');
    }

    if (!response.ok) {
      let message = 'Error en la solicitud';
      try {
        const err = await response.json();
        message = err.message || err.error || message;
      } catch (_) {}

      if (response.status === 401) {
        this.cerrarSesion('Sesi\u00f3n expirada. Inicia sesi\u00f3n nuevamente.');
        throw new Error('Sesi\u00f3n expirada');
      }

      throw new Error(message);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  del(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },
};
