const Auth = {
  init() {
    this.bindEvents();
    this.checkAuthStatus();
  },

  bindEvents() {
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.togglePassword());
    }
  },

  togglePassword() {
    const input = document.getElementById('password');
    const icon = document.getElementById('toggle-password-icon');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  },

  checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');

    if (token && !API.tokenExpirado()) {
      loginView.classList.add('d-none');
      dashboardView.classList.remove('d-none');
      if (typeof Dashboard !== 'undefined' && Dashboard.init) {
        Dashboard.init();
      }
    } else {
      if (token) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username');
      }
      dashboardView.classList.add('d-none');
      loginView.classList.remove('d-none');
    }
  },

  async handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      Utils.showToast('Por favor completa todos los campos', 'warning');
      return;
    }

    const btn = document.getElementById('btn-login');
    const btnText = document.getElementById('btn-login-text');
    const btnLoader = document.getElementById('btn-login-loader');

    btn.disabled = true;
    btnText.classList.add('d-none');
    btnLoader.classList.remove('d-none');

    try {
      const data = await API.post('/auth/login', {
        usuario: username,
        password: password,
      });

      localStorage.setItem('authToken', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }
      localStorage.setItem('username', username);

      Utils.showToast('Inicio de sesión exitoso. Bienvenido.', 'success');
      this.checkAuthStatus();
    } catch (error) {
      Utils.showToast(error.message || 'Credenciales inválidas', 'error');
    } finally {
      btn.disabled = false;
      btnText.classList.remove('d-none');
      btnLoader.classList.add('d-none');
    }
  },

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('vuSalaId');
    localStorage.removeItem('vuSalaNombre');
    Utils.showToast('Sesión cerrada correctamente', 'info');
    this.checkAuthStatus();
  },
};

document.addEventListener('DOMContentLoaded', function () {
  Auth.init();
});
