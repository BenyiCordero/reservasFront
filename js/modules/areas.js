let data = [];
let allData = [];
let modalInstance = null;

export function init() {
  document.getElementById('btnNuevaArea').addEventListener('click', () => abrirModalNuevo());
  document.getElementById('btnGuardarArea').addEventListener('click', guardar);
  document.getElementById('buscarArea').addEventListener('input', Utils.debounce(buscar, 300));
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
    allData = await API.get('/areas');
    data = [...allData];
    renderTable();
  } catch (err) {
    const msg = err.message;
    if (msg && msg.includes('Ya existe')) {
      const input = document.getElementById('areaNombre');
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
  document.getElementById('areaModalTitle').textContent = 'Nueva Área';
  document.getElementById('editId').value = '';
  document.getElementById('areaNombre').value = '';
  document.getElementById('areaNombre').setCustomValidity('');
  document.getElementById('areaActiva').checked = true;
  mostrarModal();
}

function abrirModalEditar(id) {
  const item = data.find(d => d.id === id);
  if (!item) { Utils.showToast('Registro no encontrado', 'error'); return; }

  document.getElementById('areaModalTitle').textContent = 'Editar Área';
  document.getElementById('editId').value = item.id;
  document.getElementById('areaNombre').value = item.nombre;
  document.getElementById('areaNombre').setCustomValidity('');
  document.getElementById('areaActiva').checked = item.activa;
  mostrarModal();
}

function mostrarModal() {
  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(document.getElementById('areaModal'));
  }
  modalInstance.show();
}

async function guardar() {
  const form = document.getElementById('formArea');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const body = {
    nombre: document.getElementById('areaNombre').value.trim(),
    activa: document.getElementById('areaActiva').checked,
  };

  const editId = document.getElementById('editId').value;

  try {
    if (editId) {
      await API.put('/areas/' + editId, body);
      Utils.showToast('Área actualizada exitosamente', 'success');
    } else {
      await API.post('/areas', body);
      Utils.showToast('Área creada exitosamente', 'success');
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
    'Se desactivará el área ' + esc(item ? item.nombre : '') + '. Esta acción no se puede deshacer.',
    'Desactivar Área',
    'Desactivar'
  );
  if (ok) eliminar(id);
}

async function eliminar(id) {
  try {
    const item = await API.get('/areas/' + id);
    item.activa = false;
    await API.put('/areas/' + id, item);
    Utils.showToast('Área desactivada', 'success');
    cargarDatos();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function confirmarReactivar(id) {
  const item = data.find(d => d.id === id);
  const ok = await Utils.confirmAction('Se reactivará el área ' + esc(item ? item.nombre : '') + '.', 'Reactivar Área', 'Reactivar');
  if (ok) reactivar(id);
}

async function reactivar(id) {
  try {
    const item = await API.get('/areas/' + id);
    item.activa = true;
    await API.put('/areas/' + id, item);
    Utils.showToast('Área reactivada', 'success');
    cargarDatos();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function buscar() {
  const term = document.getElementById('buscarArea').value.trim().toLowerCase();
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
