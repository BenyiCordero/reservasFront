let usuarios = [];
let editId = null;

export function init() {
  editId = null;
  usuarios = [];

  document.getElementById('btnNuevoUsuario').addEventListener('click', abrirModalNuevo);
  document.getElementById('btnGuardarUsuario').addEventListener('click', guardarUsuario);
  document.getElementById('usuarioModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('formUsuario').reset();
    editId = null;
  });

  cargarUsuarios();
}

async function cargarUsuarios() {
  const tbody = document.querySelector('#tablaUsuarios tbody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="5" class="text-center"><div class="spinner-table"></div><p class="text-muted mt-2">Cargando usuarios...</p></td></tr>';

  try {
    usuarios = await API.get('/usuarios');
    renderUsuarios();
  } catch (err) {
    Utils.showToast('Error al cargar usuarios: ' + err.message, 'error');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Error al cargar usuarios</td></tr>';
  }
}

function renderUsuarios() {
  const tbody = document.querySelector('#tablaUsuarios tbody');
  if (usuarios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No hay usuarios registrados</td></tr>';
    return;
  }

  tbody.innerHTML = usuarios.map(u => {
    const badgeClass = u.activa ? 'badge-activo' : 'badge-inactivo';
    const badgeText = u.activa ? 'Activo' : 'Inactivo';
    const rolClass = u.rol === 'ADMINISTRADOR' ? 'text-primary' : 'text-info';
    return '<tr>' +
      '<td class="fw-semibold">' + Utils.esc(u.usuario) + '</td>' +
      '<td><span class="' + rolClass + ' fw-semibold">' + u.rol + '</span></td>' +
      '<td><span class="' + badgeClass + '">' + badgeText + '</span></td>' +
      '<td class="text-muted small">' + (u.fechaRegistro ? new Date(u.fechaRegistro).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '-') + '</td>' +
      '<td class="acciones-cell">' +
        '<button class="btn-action btn-action-editar" data-id="' + u.id + '" title="Editar"><i class="fas fa-pen"></i></button>' +
        '<button class="btn-action btn-action-eliminar" data-id="' + u.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');

  tbody.querySelectorAll('.btn-action-editar').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEditar(parseInt(btn.dataset.id)));
  });

  tbody.querySelectorAll('.btn-action-eliminar').forEach(btn => {
    btn.addEventListener('click', () => eliminarUsuario(parseInt(btn.dataset.id)));
  });
}

function abrirModalNuevo() {
  editId = null;
  document.getElementById('modalUsuarioTitle').textContent = 'Nuevo Usuario';
  document.getElementById('formUsuario').reset();
  document.getElementById('usuarioPassword').required = true;
  document.getElementById('usuarioPassword').disabled = false;
  document.getElementById('usuarioPasswordGroup').classList.remove('d-none');
  document.getElementById('usuarioRol').value = 'VISTA';
  document.getElementById('usuarioActiva').checked = true;

  const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
  modal.show();
}

function abrirModalEditar(id) {
  const u = usuarios.find(x => x.id === id);
  if (!u) return;

  editId = id;
  document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuario';
  document.getElementById('usuarioUsuario').value = u.usuario;
  document.getElementById('usuarioRol').value = u.rol;
  document.getElementById('usuarioActiva').checked = u.activa;
  document.getElementById('usuarioPassword').required = false;
  document.getElementById('usuarioPassword').disabled = true;
  document.getElementById('usuarioPassword').value = '';
  document.getElementById('usuarioPasswordGroup').classList.add('d-none');

  const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
  modal.show();
}

async function guardarUsuario() {
  const form = document.getElementById('formUsuario');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    usuario: document.getElementById('usuarioUsuario').value.trim(),
    rol: document.getElementById('usuarioRol').value,
    activa: document.getElementById('usuarioActiva').checked,
  };

  if (!editId) {
    data.password = document.getElementById('usuarioPassword').value;
  }

  const btn = document.getElementById('btnGuardarUsuario');
  btn.disabled = true;

  try {
    if (editId) {
      await API.put('/usuarios/' + editId, data);
      Utils.showToast('Usuario actualizado exitosamente', 'success');
    } else {
      await API.post('/usuarios', data);
      Utils.showToast('Usuario creado exitosamente', 'success');
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('usuarioModal'));
    if (modal) modal.hide();

    cargarUsuarios();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function eliminarUsuario(id) {
  const u = usuarios.find(x => x.id === id);
  if (!u) return;

  const ok = await Utils.confirmAction(
    '¿Estás seguro de eliminar al usuario <strong>' + Utils.esc(u.usuario) + '</strong>?',
    'Eliminar Usuario',
    'Eliminar'
  );
  if (!ok) return;

  try {
    await API.del('/usuarios/' + id);
    Utils.showToast('Usuario eliminado', 'success');
    cargarUsuarios();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}
