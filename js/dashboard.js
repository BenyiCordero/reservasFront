const Dashboard = {
  init() {
    const username = localStorage.getItem('username') || 'Usuario';
    const displayName = document.getElementById('display-name');
    if (displayName) displayName.textContent = username;

    const avatar = document.getElementById('topbar-avatar');
    if (avatar) avatar.textContent = username.charAt(0).toUpperCase();

    this.checkRole();
    this.bindEvents();
    this.loadDefaultView();
  },

  getRoleFromToken() {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.rol || null;
    } catch (_) {
      return null;
    }
  },

  checkRole() {
    const rol = this.getRoleFromToken();
    const sidebar = document.getElementById('sidebar');
    const sidebarNav = document.getElementById('sidebar-nav');
    const topbar = document.getElementById('topbar');

    if (rol === 'VISTA') {
      if (sidebar) sidebar.style.display = 'none';
      if (topbar) topbar.style.display = 'none';
      const mainContent = document.getElementById('main-content');
      if (mainContent) mainContent.style.marginLeft = '0';
    } else {
      if (sidebar) sidebar.style.display = '';
      if (topbar) topbar.style.display = '';
      const mainContent = document.getElementById('main-content');
      if (mainContent) mainContent.style.marginLeft = '';
    }
  },

  loadDefaultView() {
    const rol = this.getRoleFromToken();
    if (rol === 'VISTA') {
      Utils.cargarVista('pages/vista-usuario.html', 'vista-usuario');
      document.querySelectorAll('.sidebar-item').forEach((l) => l.classList.remove('active'));
    } else {
      Utils.cargarVista('pages/reservas.html', 'reservas');
    }
  },

  bindEvents() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => Auth.logout());
    }

    const reloadBtn = document.getElementById('btn-reload');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => Utils.recargarModulo());
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('sidebar-open');
        if (overlay) overlay.classList.toggle('active');
      });

      if (overlay) {
        overlay.addEventListener('click', () => {
          sidebar.classList.remove('sidebar-open');
          overlay.classList.remove('active');
        });
      }

      document.addEventListener('click', (e) => {
        if (
          window.innerWidth < 992 &&
          sidebar.classList.contains('sidebar-open') &&
          !sidebar.contains(e.target) &&
          !sidebarToggle.contains(e.target)
        ) {
          sidebar.classList.remove('sidebar-open');
          if (overlay) overlay.classList.remove('active');
        }
      });
    }

    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-view]');
      if (link) {
        e.preventDefault();
        const ruta = link.getAttribute('data-view');
        const modulo = link.getAttribute('data-module');

        Utils.cargarVista(ruta, modulo);

        document.querySelectorAll('.sidebar-item').forEach((l) => l.classList.remove('active'));
        link.classList.add('active');

        if (window.innerWidth < 992 && sidebar) {
          sidebar.classList.remove('sidebar-open');
          if (overlay) overlay.classList.remove('active');
        }
      }
    });
  },
};

// Dashboard.init() is called by Auth.checkAuthStatus() when a valid token exists
