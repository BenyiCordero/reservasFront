const TIME_START = 6;
const TIME_END = 22;
const SLOT_HEIGHT = 40;
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = (TIME_END - TIME_START) * 2;

let state = {
  weekStart: null,
  salaId: null,
  salaNombre: '',
  reservas: [],
};

let autoRefreshInterval = null;
let timeIndicatorInterval = null;

export function init() {
  state.weekStart = Utils.getWeekStart(new Date());
  state.reservas = [];

  document.body.classList.add('fullscreen-mode');

  document.getElementById('vuPrevWeek').addEventListener('click', () => navegarSemana(-1));
  document.getElementById('vuNextWeek').addEventListener('click', () => navegarSemana(1));
  document.getElementById('vuToday').addEventListener('click', irAHoy);

  const cachedSalaId = localStorage.getItem('vuSalaId');
  const cachedSalaNombre = localStorage.getItem('vuSalaNombre');

  if (cachedSalaId && cachedSalaNombre) {
    state.salaId = parseInt(cachedSalaId);
    state.salaNombre = cachedSalaNombre;
    document.getElementById('vu-room-selector').style.display = 'none';
    document.getElementById('vu-calendar-view').style.display = 'flex';
    document.getElementById('vuRoomName').textContent = cachedSalaNombre;
    cargarSemana();
  } else {
    cargarSalas();
  }

  iniciarAutoRefresh();
  iniciarTimeIndicator();

  document.getElementById('vuRoomName').addEventListener('click', function (e) {
    if (e.detail === 3) {
      limpiarCacheSala();
    }
  });
}

export function destroy() {
  detenerAutoRefresh();
  detenerTimeIndicator();
}

function iniciarAutoRefresh() {
  detenerAutoRefresh();
  autoRefreshInterval = setInterval(() => {
    if (state.salaId) {
      cargarSemana(true);
    }
  }, 30000);
}

function detenerAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

function iniciarTimeIndicator() {
  detenerTimeIndicator();
  renderTimeIndicator();
  timeIndicatorInterval = setInterval(renderTimeIndicator, 60000);
}

function detenerTimeIndicator() {
  if (timeIndicatorInterval) {
    clearInterval(timeIndicatorInterval);
    timeIndicatorInterval = null;
  }
}

function renderTimeIndicator() {
  const existing = document.getElementById('nowIndicator');
  if (existing) existing.remove();

  const grid = document.getElementById('vuCalendarGrid');
  if (!grid) return;

  const timeCol = grid.querySelector('.time-col');
  if (!timeCol) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = TIME_START * 60;
  const endMinutes = TIME_END * 60;

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) return;

  const dayCols = grid.querySelectorAll('.day-col');
  if (dayCols.length === 0) return;

  const todayDate = Utils.formatDateISO(now);
  let todayCol = null;
  dayCols.forEach((col) => {
    const dateStr = col.dataset.date;
    if (dateStr === todayDate) {
      todayCol = col;
    }
  });

  if (!todayCol) return;

  const pixelsPerMinute = SLOT_HEIGHT / SLOT_MINUTES;
  const topPx = (currentMinutes - startMinutes) * pixelsPerMinute;

  const indicator = document.createElement('div');
  indicator.id = 'nowIndicator';
  indicator.className = 'now-indicator';

  const firstCol = grid.querySelector('.day-col');
  if (!firstCol) return;

  const gridRect = grid.getBoundingClientRect();
  const firstColRect = firstCol.getBoundingClientRect();
  const timeColRect = timeCol.getBoundingClientRect();
  const leftOffset = timeColRect.width;

  indicator.style.top = topPx + 'px';
  indicator.style.left = '0';
  indicator.style.right = '0';
  indicator.style.position = 'absolute';
  indicator.style.zIndex = '50';
  indicator.style.height = '2px';

  const dot = document.createElement('div');
  dot.className = 'now-indicator-dot';

  grid.style.position = 'relative';
  grid.appendChild(indicator);
  grid.appendChild(dot);

  dot.style.position = 'absolute';
  dot.style.top = (topPx - 5) + 'px';
  dot.style.left = (leftOffset - 6) + 'px';
  dot.style.zIndex = '50';
}

function limpiarCacheSala() {
  localStorage.removeItem('vuSalaId');
  localStorage.removeItem('vuSalaNombre');
  state.salaId = null;
  state.salaNombre = '';
  state.reservas = [];
  detenerAutoRefresh();

  document.getElementById('vu-calendar-view').style.display = 'none';
  document.getElementById('vu-room-selector').style.display = 'flex';

  cargarSalas();

  Utils.showToast('Caché de sala limpiada. Selecciona una sala.', 'info');
}

async function cargarSalas() {
  try {
    const salas = await API.get('/salas/activas');
    renderSalas(salas);
  } catch (err) {
    Utils.showToast('Error al cargar salas: ' + err.message, 'error');
  }
}

function renderSalas(salas) {
  const grid = document.getElementById('vu-room-grid');
  grid.innerHTML = salas.map(s =>
    '<div class="vu-room-card" data-id="' + s.id + '" data-nombre="' + Utils.esc(s.nombre) + '">' +
      '<div class="vu-room-icon"><i class="fas fa-door-open"></i></div>' +
      '<div class="vu-room-name">' + Utils.esc(s.nombre) + '</div>' +
    '</div>'
  ).join('');

  grid.querySelectorAll('.vu-room-card').forEach(card => {
    card.addEventListener('click', () => {
      seleccionarSala(parseInt(card.dataset.id), card.dataset.nombre);
    });
  });
}

function seleccionarSala(id, nombre) {
  state.salaId = id;
  state.salaNombre = nombre;

  localStorage.setItem('vuSalaId', id);
  localStorage.setItem('vuSalaNombre', nombre);

  document.getElementById('vu-room-selector').style.display = 'none';
  document.getElementById('vu-calendar-view').style.display = 'flex';
  document.getElementById('vuRoomName').textContent = nombre;

  iniciarAutoRefresh();
  cargarSemana();
}

function salir() {
  detenerAutoRefresh();
  detenerTimeIndicator();
  document.body.classList.remove('fullscreen-mode');
  Utils.cargarVista('pages/reservas.html', 'reservas');
}

function navegarSemana(dir) {
  state.weekStart = Utils.addDays(state.weekStart, dir * 7);
  cargarSemana();
}

function irAHoy() {
  state.weekStart = Utils.getWeekStart(new Date());
  cargarSemana();
}

async function cargarSemana(silent) {
  if (!state.salaId) return;

  const loading = document.getElementById('vuLoading');
  if (!silent) {
    loading.classList.remove('d-none');
  }

  const inicioStr = Utils.formatDateISO(state.weekStart);
  document.getElementById('vuWeekLabel').textContent = formatWeekLabel(state.weekStart);

  try {
    state.reservas = await API.get('/reservas/semana?salaId=' + state.salaId + '&inicio=' + inicioStr);
    renderCalendario();
  } catch (err) {
    if (!silent) {
      Utils.showToast('Error al cargar reservas: ' + err.message, 'error');
    }
  } finally {
    if (!silent) {
      loading.classList.add('d-none');
    }
  }
}

function formatWeekLabel(weekStart) {
  const end = Utils.addDays(weekStart, 6);
  const opts = { day: 'numeric', month: 'short' };
  return Utils.DAYS[weekStart.getDay()] + ' ' + weekStart.toLocaleDateString('es-MX', opts) +
    ' \u2014 ' + Utils.DAYS[end.getDay()] + ' ' + end.toLocaleDateString('es-MX', opts) +
    ' ' + end.getFullYear();
}

function renderCalendario() {
  const grid = document.getElementById('vuCalendarGrid');
  const today = Utils.formatDateISO(new Date());

  let html = '<div class="time-col"><div class="day-header time-header">&nbsp;</div>';

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const h = Math.floor(i / 2) + TIME_START;
    const m = (i % 2) * 30;
    const isHour = m === 0;
    html += '<div class="time-slot' + (isHour ? ' hour-mark' : ' half-hour-mark') + '">' +
      (isHour
        ? '<span class="hour-label">' + h + ':00</span>'
        : '<span class="half-hour-label">' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + '</span>') +
      '</div>';
  }
  html += '</div>';

  for (let d = 0; d < 7; d++) {
    const date = Utils.addDays(state.weekStart, d);
    const dateStr = Utils.formatDateISO(date);
    const isToday = dateStr === today;

    html += '<div class="day-col' + (isToday ? ' today-col' : '') + '" data-day="' + d + '" data-date="' + dateStr + '">';
    html += '<div class="day-header' + (isToday ? ' today' : '') + '">' +
      Utils.DAYS_SHORT[d] + '<span class="day-num">' + date.getDate() + '</span></div>';
    html += '<div class="day-slots">';

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const isHour = i % 2 === 0;
      html += '<div class="slot vu-slot' + (isHour ? ' hour-mark' : '') + '"></div>';
    }

    const dayReservas = state.reservas.filter(r => r.fecha === dateStr);
    dayReservas.forEach(r => {
      html += buildCardHTML(r);
    });

    html += '</div></div>';
  }

  grid.innerHTML = html;
  renderTimeIndicator();
}

function buildCardHTML(item) {
  const topPx = timeToPixels(item.horaInicio);
  const heightPx = timeToPixels(item.horaFin) - topPx;
  const areaNombre = Utils.esc(item.areaNombre || '');
  const timeStr = Utils.formatTime(item.horaInicio) + ' - ' + Utils.formatTime(item.horaFin);

  return '<div class="calendar-card confirmed" style="top:' + topPx + 'px;height:' + Math.max(heightPx, 28) + 'px;cursor:default">' +
    '<div class="card-time">' + timeStr + '</div>' +
    '<div class="card-title">' + areaNombre + '</div>' +
    '</div>';
}

function timeToPixels(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = (h - TIME_START) * 60 + m;
  return (totalMinutes / SLOT_MINUTES) * SLOT_HEIGHT;
}
