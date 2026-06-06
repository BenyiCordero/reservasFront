const API = {
  baseUrl: 'http://localhost:1059/api/v1',

  async request(endpoint, options = {}) {
    const url = this.baseUrl + endpoint;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      throw new Error('Error de conexión con el servidor');
    }

    if (!response.ok) {
      let message = 'Error en la solicitud';
      try {
        const err = await response.json();
        message = err.message || err.error || message;
      } catch (_) {}
      throw new Error(message);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  get(endpoint) { return this.request(endpoint); },
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
  patch(endpoint, body) { return this.request(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }); },
  del(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },
};
