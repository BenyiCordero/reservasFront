let data = [];
let allData = [];
let modalInstance = null;

export function init() {
  document.getElementById('btnNuevaSala').addEventListener('click', () => abrirModalNuevo());
  document.getElementById('btnGuardarSala').addEventListener('click', guardar);
  document.getElementById('buscarSala').addEventListener('input', Utils.debounce(buscar, 300));
  document.getElementById('tableBody').addEventListener('click', handleTableClick);
  cargarDatos();
}

function handleTableClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'editar') abrirModalEditar(id);
  else if (action === 'eliminar') confirmarEliminar(id);
  else if (action === 'reactivar') confirmarReactivar(id);
}

async function cargarDatos() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="4" class="text-center py-4"><div class="spinner-table"></div></td></tr>';

  try {
    allData = await API.get('/salas');
    data = [...allData];
    renderTable();
  } catch (err) {
    const msg = err.message;
    if (msg && msg.includes('Ya existe')) {
      const input = document.getElementById('salaNombre');
      input.setCustomValidity(msg);
      input.reportValidity();
    } else {
      Utils.showToast(msg, 'error');
    }
  }
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');

  if (!data || data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('d-none');
    document.getElementById('tableInfo').textContent = '0 registros';
    return;
  }

  empty.classList.add('d-none');

  tbody.innerHTML = data.map((item, idx) => `
    <tr>
      <td class="fw-semibold text-muted">${idx + 1}</td>
      <td class="fw-medium">${esc(item.nombre)}</td>
      <td>${item.activa ? '<span class="badge-activo">Activo</span>' : '<span class="badge-inactivo">Inactivo</span>'}</td>
      <td class="acciones-cell">
        <button class="btn-action btn-action-editar" data-action="editar" data-id="${item.id}" title="Editar"><i class="fas fa-pen"></i></button>
        ${item.activa
          ? '<button class="btn-action btn-action-eliminar" data-action="eliminar" data-id="' + item.id + '" title="Eliminar"><i class="fas fa-trash-can"></i></button>'
          : '<button class="btn-action btn-action-reactivar" data-action="reactivar" data-id="' + item.id + '" title="Reactivar"><i class="fas fa-undo"></i></button>'}
      </td>
    </tr>
  `).join('');

  document.getElementById('tableInfo').textContent = data.length + ' registro(s)';
}

function abrirModalNuevo() {
  document.getElementById('salaModalTitle').textContent = 'Nueva Sala';
  document.getElementById('editId').value = '';
  document.getElementById('salaNombre').value = '';
  document.getElementById('salaNombre').setCustomValidity('');
  document.getElementById('salaActiva').checked = true;
  mostrarModal();
}

function abrirModalEditar(id) {
  const item = data.find(d => d.id === id);
  if (!item) { Utils.showToast('Registro no encontrado', 'error'); return; }

  document.getElementById('salaModalTitle').textContent = 'Editar Sala';
  document.getElementById('editId').value = item.id;
  document.getElementById('salaNombre').value = item.nombre;
  document.getElementById('salaNombre').setCustomValidity('');
  document.getElementById('salaActiva').checked = item.activa;
  mostrarModal();
}

function mostrarModal() {
  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(document.getElementById('salaModal'));
  }
  modalInstance.show();
}

async function guardar() {
  const form = document.getElementById('formSala');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const body = {
    nombre: document.getElementById('salaNombre').value.trim(),
    activa: document.getElementById('salaActiva').checked,
  };

  const editId = document.getElementById('editId').value;

  try {
    if (editId) {
      await API.put('/salas/' + editId, body);
      Utils.showToast('Sala actualizada exitosamente', 'success');
    } else {
      await API.post('/salas', body);
      Utils.showToast('Sala creada exitosamente', 'success');
    }
    modalInstance.hide();
    cargarDatos();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function confirmarEliminar(id) {
  const item = data.find(d => d.id === id);
  const ok = await Utils.confirmAction(
    'Se desactivará la sala ' + esc(item ? item.nombre : '') + '. Esta acción no se puede deshacer.',
    'Desactivar Sala',
    'Desactivar'
  );
  if (ok) eliminar(id);
}

async function eliminar(id) {
  try {
    const item = await API.get('/salas/' + id);
    item.activa = false;
    await API.put('/salas/' + id, item);
    Utils.showToast('Sala desactivada', 'success');
    cargarDatos();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function confirmarReactivar(id) {
  const item = data.find(d => d.id === id);
  const ok = await Utils.confirmAction('Se reactivará la sala ' + esc(item ? item.nombre : '') + '.', 'Reactivar Sala', 'Reactivar');
  if (ok) reactivar(id);
}

async function reactivar(id) {
  try {
    const item = await API.get('/salas/' + id);
    item.activa = true;
    await API.put('/salas/' + id, item);
    Utils.showToast('Sala reactivada', 'success');
    cargarDatos();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function buscar() {
  const term = document.getElementById('buscarSala').value.trim().toLowerCase();
  if (!term) {
    data = [...allData];
    renderTable();
    return;
  }
  data = allData.filter(item =>
    item.nombre && item.nombre.toLowerCase().includes(term)
  );
  renderTable();
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}


