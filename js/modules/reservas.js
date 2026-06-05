const TIME_START = 6;
const TIME_END = 22;
const SLOT_HEIGHT = 40;
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = (TIME_END - TIME_START) * 2;

let state = {
  weekStart: null,
  salaId: null,
  reservas: [],
  borradores: [],
  areas: [],
  modalInstance: null,
};

export function init() {
  state.weekStart = Utils.getWeekStart(new Date());
  state.salaId = null;
  state.reservas = [];
  state.borradores = [];

  document.getElementById('selSala').addEventListener('change', onSalaChange);
  document.getElementById('btnSemanaAnt').addEventListener('click', () => navegarSemana(-1));
  document.getElementById('btnSemanaSig').addEventListener('click', () => navegarSemana(1));
  document.getElementById('btnHoy').addEventListener('click', irAHoy);
  document.getElementById('btnCrearReserva').addEventListener('click', crearReservaDesdeModal);
  document.getElementById('reservaModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('formReserva').reset();
  });

  cargarSalas();
  cargarAreas();
  llenarDuracion();
}

function llenarDuracion() {
  const sel = document.getElementById('modalDuracion');
  sel.innerHTML = '';
  for (let m = 30; m <= 360; m += 30) {
    const label = m >= 60 ? (m / 60) + ' hr' + (m > 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
    sel.innerHTML += '<option value="' + m + '">' + label + '</option>';
  }
}

async function cargarSalas() {
  try {
    const salas = await API.get('/salas/activas');
    const sel = document.getElementById('selSala');
    sel.innerHTML = '<option value="">Seleccione una sala</option>' +
      salas.map(s => '<option value="' + s.id + '">' + Utils.esc(s.nombre) + '</option>').join('');
    if (salas.length > 0) {
      sel.value = salas[0].id;
      state.salaId = salas[0].id;
      cargarSemana();
    } else {
      document.getElementById('calendarGrid').innerHTML = '<div class="p-4 text-center text-muted">No hay salas activas disponibles</div>';
    }
  } catch (err) {
    Utils.showToast('Error al cargar salas: ' + err.message, 'error');
  }
}

async function cargarAreas() {
  try {
    state.areas = await API.get('/areas/activas');
    const sel = document.getElementById('modalArea');
    sel.innerHTML = '<option value="">Seleccionar área</option>' +
      state.areas.map(a => '<option value="' + a.id + '">' + Utils.esc(a.nombre) + '</option>').join('');
  } catch (err) {
    Utils.showToast('Error al cargar áreas: ' + err.message, 'error');
  } finally {
    Utils.makeSearchableSelect('modalArea');
  }
}

function onSalaChange(e) {
  const val = e.target.value;
  if (!val) return;
  state.salaId = parseInt(val);
  state.borradores = [];
  cargarSemana();
}

function navegarSemana(dir) {
  state.weekStart = Utils.addDays(state.weekStart, dir * 7);
  state.borradores = [];
  cargarSemana();
}

function irAHoy() {
  state.weekStart = Utils.getWeekStart(new Date());
  state.borradores = [];
  cargarSemana();
}

async function cargarSemana() {
  if (!state.salaId) return;

  const loading = document.getElementById('calendarLoading');
  loading.classList.remove('d-none');

  const inicioStr = Utils.formatDateISO(state.weekStart);
  document.getElementById('lblSemana').textContent = formatWeekLabel(state.weekStart);

  try {
    state.reservas = await API.get('/reservas/semana?salaId=' + state.salaId + '&inicio=' + inicioStr);
    renderCalendario();
  } catch (err) {
    Utils.showToast('Error al cargar reservas: ' + err.message, 'error');
  } finally {
    loading.classList.add('d-none');
  }
}

function formatWeekLabel(weekStart) {
  const end = Utils.addDays(weekStart, 6);
  const opts = { day: 'numeric', month: 'short' };
  return Utils.DAYS[weekStart.getDay()] + ' ' + weekStart.toLocaleDateString('es-MX', opts) +
    ' — ' + Utils.DAYS[end.getDay()] + ' ' + end.toLocaleDateString('es-MX', opts) +
    ' ' + end.getFullYear();
}

function renderCalendario() {
  const grid = document.getElementById('calendarGrid');

  let html = '<div class="time-col"><div class="day-header" style="background:transparent;border-bottom:none">&nbsp;</div>';

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const h = Math.floor(i / 2) + TIME_START;
    const m = (i % 2) * 30;
    if (m === 0) {
      html += '<div class="time-slot" style="font-weight:600;font-size:0.75rem">' + h + ':00</div>';
    } else {
      html += '<div class="time-slot" style="font-size:0.6rem;color:var(--text-muted);opacity:0.5">' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + '</div>';
    }
  }
  html += '</div>';

  for (let d = 0; d < 7; d++) {
    const date = Utils.addDays(state.weekStart, d);
    const dateStr = Utils.formatDateISO(date);

    html += '<div class="day-col" data-day="' + d + '" data-date="' + dateStr + '">';
    html += '<div class="day-header">' +
      Utils.DAYS_SHORT[d] + '<span class="day-num">' + date.getDate() + '</span></div>';
    html += '<div class="day-slots" data-day="' + d + '" data-date="' + dateStr + '">';

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      html += '<div class="slot" data-slot="' + i + '" data-day="' + d + '"></div>';
    }

    const dayReservas = state.reservas.filter(r => r.fecha === dateStr);
    dayReservas.forEach(r => {
      html += buildCardHTML(r, false);
    });

    const dayBorradores = state.borradores.filter(b => b.fecha === dateStr);
    dayBorradores.forEach(b => {
      html += buildCardHTML(b, true);
    });

    html += '</div></div>';
  }

  grid.innerHTML = html;

  document.querySelectorAll('.slot').forEach(el => {
    el.addEventListener('click', onSlotClick);
  });

  document.querySelectorAll('.calendar-card').forEach(el => {
    const isBorrador = el.dataset.borrador === 'true';
    if (!isBorrador) {
      const btnDel = el.querySelector('.btn-delete');
      if (btnDel) btnDel.addEventListener('click', (e) => { e.stopPropagation(); eliminarReserva(el.dataset.id); });
    } else {
      const btnConf = el.querySelector('.btn-confirm');
      if (btnConf) btnConf.addEventListener('click', (e) => { e.stopPropagation(); confirmarReserva(el.dataset.id); });
    }
    initDrag(el);
  });

  grid.classList.remove('animate-in');
  void grid.offsetWidth;
  grid.classList.add('animate-in');
}

function buildCardHTML(item, isBorrador) {
  const id = isBorrador ? item._tempId : item.id;
  const topPx = timeToPixels(item.horaInicio);
  const heightPx = timeToPixels(item.horaFin) - topPx;
  const areaNombre = Utils.esc(item.areaNombre || '');
  const timeStr = Utils.formatTime(item.horaInicio) + ' - ' + Utils.formatTime(item.horaFin);
  const cls = isBorrador ? 'calendar-card unconfirmed' : 'calendar-card confirmed';
  const borradorAttr = isBorrador ? 'true' : 'false';

  let btns = '';
  if (isBorrador) {
    btns += '<button class="btn-confirm" title="Confirmar reserva"><i class="fas fa-check"></i></button>';
  } else if (item.activa) {
    btns += '<button class="btn-delete" title="Cancelar reserva"><i class="fas fa-times"></i></button>';
  }

  return '<div class="' + cls + '" style="top:' + topPx + 'px;height:' + Math.max(heightPx, 28) + 'px" ' +
    'data-id="' + id + '" data-borrador="' + borradorAttr + '" ' +
    'data-hora-inicio="' + item.horaInicio + '" data-hora-fin="' + item.horaFin + '" ' +
    'data-fecha="' + item.fecha + '" data-persona="' + Utils.esc(item.persona || '') + '" ' +
    'data-area-id="' + (item.areaId || '') + '" data-area-nombre="' + Utils.esc(item.areaNombre || '') + '">' +
    '<div class="card-time">' + timeStr + '</div>' +
    '<div class="card-title">' + areaNombre + '</div>' +
    btns +
    '</div>';
}

function timeToPixels(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = (h - TIME_START) * 60 + m;
  return (totalMinutes / SLOT_MINUTES) * SLOT_HEIGHT;
}

function pixelsToTime(pixels) {
  const slotIndex = Math.round(pixels / SLOT_HEIGHT);
  const totalMinutes = slotIndex * SLOT_MINUTES;
  const h = Math.floor(totalMinutes / 60) + TIME_START;
  const m = totalMinutes % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function onSlotClick(e) {
  const slot = e.currentTarget;
  const day = parseInt(slot.dataset.day);
  const slotIdx = parseInt(slot.dataset.slot);
  const date = Utils.addDays(state.weekStart, day);
  const dateStr = Utils.formatDateISO(date);

  const h = Math.floor(slotIdx / 2) + TIME_START;
  const m = (slotIdx % 2) * 30;
  const timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');

  const dayLabel = Utils.DAYS[date.getDay()] + ' ' + date.getDate();
  document.getElementById('modalDia').textContent = dayLabel;
  document.getElementById('modalHora').textContent = Utils.formatTime(timeStr);
  document.getElementById('modalFecha').value = dateStr;
  document.getElementById('modalHoraInicio').value = timeStr;
  document.getElementById('modalArea').value = '';
  document.getElementById('modalDuracion').value = '60';

  if (!state.modalInstance) {
    state.modalInstance = new bootstrap.Modal(document.getElementById('reservaModal'));
  }
  state.modalInstance.show();
}

function crearReservaDesdeModal() {
  Utils.syncSearchableSelects();

  const form = document.getElementById('formReserva');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const areaId = document.getElementById('modalArea').value;
  if (!areaId) { Utils.showToast('Debe seleccionar un área', 'warning'); return; }

  const fecha = document.getElementById('modalFecha').value;
  const horaInicio = document.getElementById('modalHoraInicio').value;
  const duracion = parseInt(document.getElementById('modalDuracion').value);

  const [hh, mm] = horaInicio.split(':').map(Number);
  const totalMin = hh * 60 + mm + duracion;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  if (endH > TIME_END || (endH === TIME_END && endM > 0)) {
    Utils.showToast('La reserva excede el horario permitido (22:00)', 'warning');
    return;
  }
  const horaFin = String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0');

  const areaNombre = state.areas.find(a => a.id == areaId)?.nombre || '';

  const borrador = {
    _tempId: 'temp_' + Date.now(),
    salaId: state.salaId,
    persona: 'Reservado',
    areaId: parseInt(areaId),
    areaNombre: areaNombre,
    fecha: fecha,
    horaInicio: horaInicio,
    horaFin: horaFin,
    activa: true,
  };

  state.borradores.push(borrador);
  state.modalInstance.hide();
  renderCalendario();
  Utils.showToast('Borrador creado. Arrástrelo para ajustar la hora y confírmelo.', 'info');
}

async function confirmarReserva(tempId) {
  const idx = state.borradores.findIndex(b => b._tempId === tempId);
  if (idx === -1) return;
  const b = state.borradores[idx];

  const body = {
    salaId: b.salaId,
    persona: b.persona,
    areaId: b.areaId,
    fecha: b.fecha,
    horaInicio: b.horaInicio,
    horaFin: b.horaFin,
    activa: true,
  };

  try {
    const creada = await API.post('/reservas', body);
    state.borradores.splice(idx, 1);
    state.reservas.push(creada);
    renderCalendario();
    Utils.showToast('Reserva confirmada exitosamente', 'success');
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function eliminarReserva(id) {
  const ok = await Utils.confirmAction('¿Desea cancelar esta reserva?', 'Cancelar Reserva', 'Eliminar');
  if (!ok) return;

  try {
    await API.del('/reservas/' + id);
    state.reservas = state.reservas.filter(r => r.id != id);
    renderCalendario();
    Utils.showToast('Reserva cancelada', 'success');
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function moverReserva(id, newHoraInicio, newHoraFin) {
  try {
    const r = state.reservas.find(r => r.id == id);
    if (!r) return;
    const body = {
      salaId: r.salaId,
      persona: r.persona,
      areaId: r.areaId,
      fecha: r.fecha,
      horaInicio: newHoraInicio,
      horaFin: newHoraFin,
      activa: r.activa,
    };
    const updated = await API.put('/reservas/' + id, body);
    Object.assign(r, updated);
    renderCalendario();
  } catch (err) {
    Utils.showToast(err.message, 'error');
    renderCalendario();
  }
}

function initDrag(card) {
  card.addEventListener('mousedown', onDragStart);
  card.addEventListener('touchstart', onDragStart, { passive: false });
}

function getEventPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function onDragStart(e) {
  const card = e.currentTarget;
  const isBorrador = card.dataset.borrador === 'true';

  if (!isBorrador && e.target.closest('.btn-delete')) return;
  if (isBorrador && e.target.closest('.btn-confirm')) return;

  const pos = getEventPos(e);
  const rect = card.getBoundingClientRect();
  const container = card.closest('.day-slots');
  if (!container) return;

  const containerRect = container.getBoundingClientRect();

  state.dragData = {
    card: card,
    container: container,
    isBorrador: isBorrador,
    id: card.dataset.id,
    fecha: card.dataset.fecha,
    offsetY: pos.y - rect.top,
    startTop: card.offsetTop,
    startHoraInicio: card.dataset.horaInicio,
    startHoraFin: card.dataset.horaFin,
    containerTop: containerRect.top,
  };

  card.classList.add('dragging');

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend', onDragEnd);

  e.preventDefault();
}

function onDragMove(e) {
  if (!state.dragData) return;
  const pos = getEventPos(e);
  const dd = state.dragData;
  const relY = pos.y - dd.containerTop - dd.offsetY;
  const maxY = TOTAL_SLOTS * (SLOT_HEIGHT / 2) - dd.card.offsetHeight;
  const clampedY = Math.max(0, Math.min(relY, maxY));
  dd.card.style.top = clampedY + 'px';
  e.preventDefault();
}

function onDragEnd(e) {
  if (!state.dragData) return;

  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  document.removeEventListener('touchmove', onDragMove);
  document.removeEventListener('touchend', onDragEnd);

  const dd = state.dragData;
  dd.card.classList.remove('dragging');

  const topPx = parseInt(dd.card.style.top) || 0;
  const heightPx = dd.card.offsetHeight;
  const newHoraInicio = pixelsToTime(topPx);
  const newHoraFin = pixelsToTime(topPx + heightPx);

  if (dd.isBorrador) {
    const idx = state.borradores.findIndex(b => b._tempId === dd.id);
    if (idx !== -1) {
      state.borradores[idx].horaInicio = newHoraInicio;
      state.borradores[idx].horaFin = newHoraFin;
    }
    renderCalendario();
  } else {
    if (newHoraInicio !== dd.startHoraInicio) {
      moverReserva(dd.id, newHoraInicio, newHoraFin);
    } else {
      renderCalendario();
    }
  }

  state.dragData = null;
}
