const Utils = {
  showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = 'toast-custom toast-' + type;
    toast.innerHTML =
      '<i class="fas ' + (icons[type] || icons.info) + ' toast-icon"></i>' +
      '<span class="toast-text">' + message + '</span>' +
      '<button class="toast-close">&times;</button>';
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => Utils.removeToast(toast));
    if (duration > 0) setTimeout(() => Utils.removeToast(toast), duration);
  },

  removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  },

  async cargarVista(ruta, modulo) {
    try {
      const resp = await fetch(ruta);
      if (!resp.ok) throw new Error('Error al cargar la vista');
      const html = await resp.text();
      document.getElementById('main-content').innerHTML = html;

      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.dataset.currentView = ruta;
        mainContent.dataset.currentModule = modulo || '';
      }

      if (modulo) {
        try {
          const module = await import('./modules/' + modulo + '.js');
          if (module && typeof module.init === 'function') {
            module.init();
          }
        } catch (err) {
          console.warn('Módulo no disponible:', modulo, err);
        }
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  recargarModulo() {
    const main = document.getElementById('main-content');
    if (main && main.dataset.currentView && main.dataset.currentModule) {
      this.cargarVista(main.dataset.currentView, main.dataset.currentModule);
    }
  },

  confirmAction(message, title, buttonText) {
    return new Promise(function (resolve) {
      const modalEl = document.getElementById('confirmModal');
      if (!modalEl) { resolve(false); return; }
      document.getElementById('confirmTitle').textContent = title || '¿Estás seguro?';
      document.getElementById('confirmMsg').innerHTML = '<strong>' + (message || 'Esta acción no se puede deshacer.') + '</strong>';
      const confirmBtn = document.getElementById('confirmBtn');
      confirmBtn.textContent = buttonText || 'Eliminar';
      const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
      const cleanup = () => { try { modal.hide(); } catch (_) {} };
      confirmBtn.onclick = function () { cleanup(); resolve(true); };
      modalEl.addEventListener('hidden.bs.modal', function () { resolve(false); }, { once: true });
      modal.show();
    });
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return h12 + ':' + m + ' ' + ampm;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  },

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  makeSearchableSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const wrapper = select.parentElement;
    if (wrapper.classList.contains('searchable-wrapper')) {
      this.updateSearchableOptions(selectId);
      return;
    }

    wrapper.classList.add('searchable-wrapper');
    select.classList.add('searchable-original');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control searchable-input';
    input.placeholder = 'Seleccionar...';
    input.autocomplete = 'off';
    input.dataset.selectId = selectId;

    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-dropdown';

    select.parentNode.insertBefore(input, select.nextSibling);
    select.parentNode.insertBefore(dropdown, input.nextSibling);

    select.addEventListener('change', function () {
      const opt = select.options[select.selectedIndex];
      if (opt && opt.value) input.value = opt.text;
      else input.value = '';
    });

    const form = select.closest('form');
    if (form) {
      form.addEventListener('reset', function () {
        input.value = '';
      });
    }

    const buildOptions = (filter) => {
      dropdown.innerHTML = '';
      const f = (filter || '').toLowerCase();
      let hasVisible = false;
      Array.from(select.options).forEach(function (opt) {
        if (!opt.value) return;
        if (f && !opt.text.toLowerCase().includes(f)) return;
        hasVisible = true;
        const div = document.createElement('div');
        div.className = 'searchable-option';
        div.textContent = opt.text;
        div.dataset.value = opt.value;
        div.addEventListener('click', function () {
          select.value = opt.value;
          input.value = opt.text;
          dropdown.classList.remove('show');
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        dropdown.appendChild(div);
      });
      if (!hasVisible) {
        dropdown.innerHTML = '<div class="searchable-option disabled">Sin resultados</div>';
      }
    };

    input.addEventListener('focus', function () {
      buildOptions(input.value);
      dropdown.classList.add('show');
    });

    input.addEventListener('input', Utils.debounce(function () {
      buildOptions(input.value);
      dropdown.classList.add('show');
    }, 200));

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') dropdown.classList.remove('show');
      if (e.key === 'Enter') {
        const first = dropdown.querySelector('.searchable-option:not(.disabled)');
        if (first) first.click();
        dropdown.classList.remove('show');
      }
    });

    input.addEventListener('blur', function () {
      setTimeout(function () { dropdown.classList.remove('show'); }, 200);
    });

    const opt = select.options[select.selectedIndex];
    if (opt && opt.value) input.value = opt.text;

    const modal = select.closest('.modal');
    if (modal) {
      modal.addEventListener('shown.bs.modal', function () {
        const o = select.options[select.selectedIndex];
        if (o && o.value) input.value = o.text;
        else input.value = '';
      });
    }

    buildOptions('');
  },

  updateSearchableOptions(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const wrapper = select.parentElement;
    if (!wrapper.classList.contains('searchable-wrapper')) return;
    const input = wrapper.querySelector('.searchable-input');
    const dropdown = wrapper.querySelector('.searchable-dropdown');
    if (!input || !dropdown) return;
    const opt = select.options[select.selectedIndex];
    if (opt && opt.value) input.value = opt.text;
    else input.value = '';
  },

  syncSearchableSelects() {
    document.querySelectorAll('.searchable-wrapper').forEach(function (wrapper) {
      const select = wrapper.querySelector('.searchable-original');
      const input = wrapper.querySelector('.searchable-input');
      if (select && input && !select.value) {
        input.value = '';
      }
    });
  },

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  },

  formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  },

  debounce(fn, delay) {
    let timer;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(context, args), delay);
    };
  },

  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },

  DAYS: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  DAYS_SHORT: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};
