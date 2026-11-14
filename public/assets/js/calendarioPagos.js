/**
 * calendario.js
 * Lógica completa del Calendario de Pagos.
 *
 * Llama a /api/sheets/clientes y /api/sheets/pagos (Vercel Serverless Functions)
 * en lugar de a Google Sheets directamente, de modo que las credenciales
 * (SHEETS_API_KEY, SHEET_ID) viven únicamente en el servidor Vercel.
 */

/* ══════════════════════════════════════════════════════════════
   ESTADO GLOBAL
══════════════════════════════════════════════════════════════ */
let gEventos        = [];
let gClienteNombre  = '';
let gVistaActual    = 'calendario';
let gResumenVisible = false;

/* ══════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════ */
const fmt = n =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);

const fmtSin = n =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n || 0);

function getHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizar(str) {
  return str
    ? str.toString().toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : '';
}

/**
 * Clasifica un evento:
 *   is-paid    → pendiente < 0.01
 *   is-partial → 0.01 ≤ pendiente < total
 *   is-past    → sin pagar y fecha pasada
 *   is-future  → sin pagar y fecha futura / sin fecha
 */
function clasificar(ev) {
  const pend = Number(ev.pendiente) || 0;
  const tot  = Number(ev.total)     || 0;
  if (pend < 0.01)       return 'is-paid';
  if (pend < tot - 0.01) return 'is-partial';
  const f = ev.fecha ? new Date(ev.fecha + 'T00:00:00') : null;
  return f && f < getHoy() ? 'is-past' : 'is-future';
}

function labelClase(c) {
  return { 'is-paid': 'Pagado', 'is-past': 'Vencido', 'is-future': 'Pendiente', 'is-partial': 'Parcial' }[c] || '';
}

function importeBadge(ev) {
  const c = clasificar(ev);
  if (c === 'is-paid')    return Number(ev.total);
  if (c === 'is-partial') return Number(ev.pendiente);
  if (c === 'is-past')    return Number(ev.pendiente);
  return Number(ev.total);
}

function importePrincipal(ev) {
  const c = clasificar(ev);
  if (c === 'is-paid')    return Number(ev.total);
  if (c === 'is-partial') return Number(ev.pendiente);
  if (c === 'is-past')    return Number(ev.pendiente);
  return Number(ev.total);
}

/* ══════════════════════════════════════════════════════════════
   API — llama a los endpoints proxy de Vercel
══════════════════════════════════════════════════════════════ */
async function apiGet(path) {
  const res = await fetch(path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/* ══════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════ */
async function hacerLogin() {
  const nombre = document.getElementById('inputNombre').value.trim();
  const pin    = document.getElementById('inputPin').value.trim();

  if (!nombre || !pin) {
    mostrarAlerta('alertLogin', 'error', 'Introduce el nombre y el PIN.');
    return;
  }

  setUI('loading');
  ocultarAlerta('alertLogin');

  try {
    /* 1 ── Obtener tabla de clientes desde el proxy */
    const { values } = await apiGet('/api/sheets/clientes');

    if (!values || values.length < 2) {
      throw new Error('La hoja de clientes está vacía o el rango es incorrecto.');
    }

    /* 2 ── Buscar cliente (fila 0 = header del rango) */
    const nombreClean = normalizar(nombre);
    let filaCliente   = null;

    for (let i = 1; i < values.length; i++) {
      const fila = values[i];
      if (!fila || fila.every(c => c === '')) continue;
      if (normalizar(fila[1] || '') === nombreClean) {
        filaCliente = fila;
        break;
      }
    }

    if (!filaCliente) {
      setUI('login');
      mostrarAlerta('alertLogin', 'error', 'El cliente introducido no existe en la base de datos.');
      return;
    }

    /* 3 ── Comprobar bloqueo */
    const bloqueado = (filaCliente[5] || '').toString().toUpperCase() === 'TRUE';
    if (bloqueado) {
      setUI('login');
      mostrarAlerta('alertLogin', 'error', 'Usuario bloqueado. Contacta con tu asesor para desbloquearlo.');
      return;
    }

    /* 4 ── Validar PIN */
    const pinSheet = (filaCliente[3] || '').toString().trim();
    if (pinSheet !== pin) {
      setUI('login');
      const intentos = Number(filaCliente[4] || 0) + 1;
      const aviso = intentos >= 2
        ? 'Demasiados intentos fallidos. Contacta con tu asesor.'
        : 'PIN incorrecto. Te queda 1 intento.';
      mostrarAlerta('alertLogin', 'error', aviso);
      return;
    }

    /* 5 ── Cargar pagos del cliente */
    const { pagos } = await apiGet(`/api/sheets/pagos?cliente=${encodeURIComponent(nombre)}`);

    gClienteNombre = nombre;
    gEventos       = pagos || [];

    if (gEventos.length === 0) {
      setUI('empty');
      actualizarHeaderUsuario();
      return;
    }

    setUI('dashboard');
    actualizarHeaderUsuario();
    document.getElementById('numCols').value = '2';
    setVista('calendario');
    render();

  } catch (err) {
    setUI('login');
    mostrarAlerta('alertLogin', 'error', 'Error: ' + err.message);
  }
}

function actualizarHeaderUsuario() {
  document.getElementById('userLabel').textContent = `Cliente: ${gClienteNombre.toUpperCase()}`;
  document.getElementById('headerNav').style.display = 'flex';
}

/* ══════════════════════════════════════════════════════════════
   CERRAR SESIÓN
══════════════════════════════════════════════════════════════ */
function cerrarSesion() {
  gEventos = [];
  gClienteNombre = '';
  gResumenVisible = false;

  document.getElementById('inputNombre').value        = '';
  document.getElementById('inputPin').value           = '';
  document.getElementById('numCols').value            = '2';
  document.getElementById('chkPagados').checked       = false;
  document.getElementById('chkFecha').checked         = false;
  document.getElementById('dateFilterRow').classList.remove('show');
  document.getElementById('resumenPanel').classList.remove('show');
  document.getElementById('btnResumen').classList.remove('active');
  document.getElementById('headerNav').style.display  = 'none';

  ocultarAlerta('alertLogin');
  setUI('login');
}

/* ══════════════════════════════════════════════════════════════
   CAMBIAR PIN (requiere endpoint de escritura — ver nota)
══════════════════════════════════════════════════════════════ */
function abrirModalPin() {
  document.getElementById('pinActual').value = '';
  document.getElementById('pinNuevo').value  = '';
  ocultarAlerta('alertPin');
  document.getElementById('modalPin').classList.add('show');
}

async function ejecutarCambioPin() {
  const pActual = document.getElementById('pinActual').value.trim();
  const pNuevo  = document.getElementById('pinNuevo').value.trim();

  if (!pActual || !pNuevo) {
    mostrarAlerta('alertPin', 'error', 'Introduce el PIN actual y el nuevo PIN.');
    return;
  }

  /**
   * NOTA: la escritura al Sheet necesita el endpoint /api/sheets/cambiar-pin
   * (que usa OAuth2 Service Account o Apps Script webhook).
   * Mientras no esté implementado, se informa al usuario.
   *
   * Para implementarlo:
   *   1. Crea api/sheets/cambiar-pin.js con lógica de escritura
   *      usando google-auth-library + googleapis npm packages.
   *   2. Añade GOOGLE_SERVICE_ACCOUNT_JSON a las env vars de Vercel.
   *   3. Descomenta el bloque de fetch de abajo.
   */

  /*
  try {
    const res = await fetch('/api/sheets/cambiar-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente: gClienteNombre, pinActual: pActual, pinNuevo: pNuevo }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    mostrarAlerta('alertPin', 'success', 'PIN actualizado correctamente.');
  } catch (err) {
    mostrarAlerta('alertPin', 'error', 'Error al cambiar PIN: ' + err.message);
  }
  */

  mostrarAlerta('alertPin', 'info',
    'El cambio de PIN requiere el endpoint /api/sheets/cambiar-pin con credenciales de escritura (Service Account). Consulta el README.');
}

/* ══════════════════════════════════════════════════════════════
   UI STATE MACHINE
══════════════════════════════════════════════════════════════ */
function setUI(estado) {
  const ids = {
    login   : document.getElementById('loginSection'),
    loader  : document.getElementById('loader'),
    toolbar : document.getElementById('toolbar'),
    cal     : document.getElementById('viewCalendario'),
    lista   : document.getElementById('viewLista'),
    empty   : document.getElementById('emptyMsg'),
  };

  // Ocultar todo
  ids.login.style.display   = 'none';
  ids.loader.classList.remove('show');
  ids.toolbar.style.display = 'none';
  ids.cal.style.display     = 'none';
  ids.lista.style.display   = 'none';
  ids.empty.style.display   = 'none';

  if (estado === 'login') {
    ids.login.style.display = 'block';
  } else if (estado === 'loading') {
    ids.loader.classList.add('show');
  } else if (estado === 'dashboard') {
    ids.toolbar.style.display = 'flex';
    if (gVistaActual === 'calendario') ids.cal.style.display   = 'grid';
    else                               ids.lista.style.display = 'grid';
  } else if (estado === 'empty') {
    ids.empty.style.display = 'block';
  }
}

/* ══════════════════════════════════════════════════════════════
   ALERTAS
══════════════════════════════════════════════════════════════ */
function mostrarAlerta(id, tipo, msg) {
  const el  = document.getElementById(id);
  const msgEl = document.getElementById(id + 'Msg');
  el.className = `alert alert-${tipo} show`;
  if (msgEl) msgEl.textContent = msg;
}

function ocultarAlerta(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

/* ══════════════════════════════════════════════════════════════
   MODALES
══════════════════════════════════════════════════════════════ */
function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

/* ══════════════════════════════════════════════════════════════
   VISTA
══════════════════════════════════════════════════════════════ */
function setVista(tipo) {
  gVistaActual = tipo;
  document.getElementById('btnCal').classList.toggle('active',   tipo === 'calendario');
  document.getElementById('btnLista').classList.toggle('active', tipo === 'lista');

  const cal   = document.getElementById('viewCalendario');
  const lista = document.getElementById('viewLista');

  if (tipo === 'calendario') {
    cal.style.display   = 'grid';
    lista.style.display = 'none';
  } else {
    cal.style.display   = 'none';
    lista.style.display = 'grid';
  }
  actualizarGrid();
}

function actualizarGrid() {
  const cols = document.getElementById('numCols').value;
  const val  = `repeat(${cols}, minmax(0, 1fr))`;
  document.getElementById('viewCalendario').style.gridTemplateColumns = val;
  document.getElementById('viewLista').style.gridTemplateColumns      = val;
}

function toggleFiltroFecha() {
  const activo = document.getElementById('chkFecha').checked;
  const row    = document.getElementById('dateFilterRow');

  if (activo) {
    row.classList.add('show');
    const hoy   = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 6, hoy.getDate());
    document.getElementById('fechaDesde').valueAsDate = desde;
    document.getElementById('fechaHasta').value = '';
  } else {
    row.classList.remove('show');
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';
  }
  render();
}

function toggleResumen() {
  gResumenVisible = !gResumenVisible;
  document.getElementById('resumenPanel').classList.toggle('show', gResumenVisible);
  document.getElementById('btnResumen').classList.toggle('active', gResumenVisible);
  if (gResumenVisible) renderResumen();
}

/* ══════════════════════════════════════════════════════════════
   FILTROS
══════════════════════════════════════════════════════════════ */
function eventosFiltrados() {
  const mostrarPagados = document.getElementById('chkPagados').checked;
  const filtrarFechas  = document.getElementById('chkFecha').checked;
  let dDesde = null, dHasta = null;

  if (filtrarFechas) {
    const vD = document.getElementById('fechaDesde').value;
    const vH = document.getElementById('fechaHasta').value;
    if (vD) dDesde = new Date(vD + 'T00:00:00');
    if (vH) dHasta = new Date(vH + 'T23:59:59');
  }

  return gEventos.filter(ev => {
    if (!mostrarPagados && clasificar(ev) === 'is-paid') return false;
    if (filtrarFechas) {
      if (!ev.fecha) return false;
      const f = new Date(ev.fecha + 'T00:00:00');
      if (dDesde && f < dDesde) return false;
      if (dHasta && f > dHasta) return false;
    }
    return true;
  });
}

/* ══════════════════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════════════════ */
function render() {
  renderCalendario();
  renderLista();
  actualizarGrid();
  if (gResumenVisible) renderResumen();
}

/* ── Agrupar por mes ──────────────────────────────────────── */
function agruparMes(lista) {
  const grupos = {};
  lista.forEach(ev => {
    let key     = 'Sin fecha';
    let sortKey = '9999-99';
    if (ev.fecha) {
      const d = new Date(ev.fecha + 'T00:00:00');
      key     = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      sortKey = ev.fecha.substring(0, 7);
    }
    if (!grupos[key]) grupos[key] = { items: [], total: 0, sortKey };
    grupos[key].items.push(ev);
    grupos[key].total += Number(ev.total) || 0;
  });
  return grupos;
}

/* ── Resumen ─────────────────────────────────────────────── */
function renderResumen() {
  const mostrarPag = document.getElementById('chkPagados').checked;
  const stats = {
    'Pagado'   : { total: 0, count: 0, tipo: 'paid'   },
    'Vencido'  : { total: 0, count: 0, tipo: 'past'   },
    'Pendiente': { total: 0, count: 0, tipo: 'future' },
    'Parcial'  : { total: 0, count: 0, tipo: 'other'  },
  };

  gEventos.forEach(ev => {
    const c = clasificar(ev);
    if (!mostrarPag && c === 'is-paid') return;
    const lbl = labelClase(c);
    stats[lbl].total += Number(ev.total) || 0;
    stats[lbl].count += 1;
  });

  const grid = document.getElementById('resumenGrid');
  grid.innerHTML = '';

  Object.entries(stats).forEach(([lbl, s]) => {
    if (!s.count) return;
    grid.insertAdjacentHTML('beforeend', `
      <div class="resumen-card ${s.tipo}">
        <div class="r-label">${lbl}</div>
        <div class="r-count">${s.count} registro${s.count !== 1 ? 's' : ''}</div>
        <div class="r-amt">${fmt(s.total)}</div>
      </div>`);
  });
}

/* ── Calendario ──────────────────────────────────────────── */
const MES_NAMES = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];

function renderCalendario() {
  const container = document.getElementById('viewCalendario');
  container.innerHTML = '';

  const ef = eventosFiltrados();
  ef.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  const mesesSet = new Set();
  ef.forEach(e => { if (e.fecha) mesesSet.add(e.fecha.substring(0, 7)); });

  if (!mesesSet.size) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-regular fa-calendar-xmark" style="color:var(--slate-300)"></i></div>
        No hay registros visibles con los filtros actuales.
      </div>`;
    return;
  }

  const grupos = agruparMes(ef);

  Array.from(mesesSet).sort().forEach(ym => {
    const [yStr, mStr] = ym.split('-');
    const year  = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;

    // Buscar el total del mes en grupos
    const keyMes = new Date(year, month, 1)
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    let totalMes = 0;
    for (const [k, v] of Object.entries(grupos)) {
      if (k.toLowerCase() === keyMes.toLowerCase()) { totalMes = v.total; break; }
    }

    const wrap = document.createElement('div');
    wrap.className = 'month-wrap';
    wrap.innerHTML = `
      <div class="month-head">
        <span class="month-name">${capitalize(MES_NAMES[month])} ${year}</span>
        <span class="month-badge">${fmt(totalMes)}</span>
      </div>
      <div class="cal-grid">
        ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
          .map(d => `<div class="cal-day-hdr">${d}</div>`).join('')}
      </div>`;

    const grid = wrap.querySelector('.cal-grid');

    // Día de inicio (Lunes = 0)
    const firstDay = new Date(year, month, 1);
    let startIdx = firstDay.getDay() - 1;
    if (startIdx < 0) startIdx = 6;

    for (let i = 0; i < startIdx; i++) {
      const e = document.createElement('div');
      e.className = 'cal-cell other-month';
      grid.appendChild(e);
    }

    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvs  = ef.filter(e => e.fecha === dateKey);

      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      cell.innerHTML = `<div class="cal-day-num">${day}</div><div class="ev-badges"></div>`;

      if (dayEvs.length) {
        cell.classList.add('has-event');
        const badges = cell.querySelector('.ev-badges');
        dayEvs.forEach(ev => {
          const badge = document.createElement('div');
          badge.className = `ev-badge ${clasificar(ev)}`;
          badge.textContent = fmtSin(importeBadge(ev));
          badges.appendChild(badge);
        });
        cell.onclick = () => abrirModalDetalle(dateKey, dayEvs);
      }

      grid.appendChild(cell);
    }

    container.appendChild(wrap);
  });
}

/* ── Lista ───────────────────────────────────────────────── */
function renderLista() {
  const container = document.getElementById('viewLista');
  container.innerHTML = '';

  const ef = eventosFiltrados();

  if (!ef.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-regular fa-calendar-xmark" style="color:var(--slate-300)"></i></div>
        No hay registros visibles con los filtros actuales.
      </div>`;
    return;
  }

  const grupos  = agruparMes(ef);
  const ordered = Object.entries(grupos)
    .sort((a, b) => (a[1].sortKey || '').localeCompare(b[1].sortKey || ''));

  ordered.forEach(([mes, g]) => {
    const wrap = document.createElement('div');
    wrap.className = 'list-month-wrap';
    wrap.innerHTML = `
      <div class="month-head">
        <span class="month-name" style="text-transform:capitalize;">${mes}</span>
        <span class="month-badge">${fmt(g.total)}</span>
      </div>`;
    g.items.forEach(ev => wrap.insertAdjacentHTML('beforeend', buildCardHTML(ev)));
    container.appendChild(wrap);
  });
}

/* ── Tarjeta de evento (lista) ───────────────────────────── */
function buildCardHTML(ev) {
  const c      = clasificar(ev);
  const total  = Number(ev.total)     || 0;
  const pend   = Number(ev.pendiente) || 0;
  const pagado = total - pend;
  const lbl    = labelClase(c);
  const importe = importePrincipal(ev);

  const fechaTxt = ev.fecha
    ? new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '—';

  const desgl = c === 'is-partial' ? `
    <div class="partial-breakdown">
      <span><span>Total:</span><span class="pval">${fmt(total)}</span></span>
      <span><span>Pagado:</span><span class="pval" style="color:var(--green-600)">${fmt(pagado)}</span></span>
      <span><span>Pendiente:</span><span class="pval" style="color:var(--orange-600)">${fmt(pend)}</span></span>
    </div>` : '';

  return `
    <div class="ev-card ${c}">
      <div class="ev-card-left">
        <div class="ev-card-date">${fechaTxt}</div>
        <div class="ev-card-concepto">${ev.concepto}</div>
        <div class="ev-card-estado">${ev.estado || ''}</div>
        ${desgl}
      </div>
      <div class="ev-card-right">
        <div class="ev-card-amt ${c}">${fmt(importe)}</div>
        <span class="ev-tag ${c}">${lbl}</span>
      </div>
    </div>`;
}

/* ── Modal detalle ───────────────────────────────────────── */
function abrirModalDetalle(fecha, evList) {
  const d = new Date(fecha + 'T00:00:00');
  document.getElementById('modalDetalleTitle').textContent =
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const body = document.getElementById('modalDetalleBody');
  body.innerHTML = '';

  evList.forEach(ev => {
    const c      = clasificar(ev);
    const total  = Number(ev.total)     || 0;
    const pend   = Number(ev.pendiente) || 0;
    const pagado = total - pend;
    const lbl    = labelClase(c);
    const importe = importePrincipal(ev);

    const desgl = c === 'is-partial' ? `
      <div class="partial-breakdown" style="margin-top:6px;">
        <span><span>Total:</span><span class="pval">${fmt(total)}</span></span>
        <span><span>Pagado:</span><span class="pval" style="color:var(--green-600)">${fmt(pagado)}</span></span>
        <span><span>Pendiente:</span><span class="pval" style="color:var(--orange-600)">${fmt(pend)}</span></span>
      </div>` : '';

    body.insertAdjacentHTML('beforeend', `
      <div class="modal-detail-item">
        <div style="font-size:11px;font-weight:700;color:var(--slate-500);margin-bottom:3px;">${ev.clienteReal}</div>
        <div style="font-weight:700;font-size:14px;color:var(--slate-800);">${ev.concepto}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:8px;gap:8px;">
          <div>
            <div class="ev-card-amt ${c}" style="font-size:18px;">${fmt(importe)}</div>
            ${desgl}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0;">
            <span class="ev-tag ${c}">${lbl}</span>
            <span style="font-size:10px;font-weight:600;color:var(--slate-500);">${ev.estado || ''}</span>
          </div>
        </div>
      </div>`);
  });

  document.getElementById('modalDetalle').classList.add('show');
}

/* ── Helpers ─────────────────────────────────────────────── */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
(function init() {
  setUI('login');
})();



/**
 * GET /api/sheets/clientes
 *
 * Proxy seguro hacia Google Sheets API v4.
 * Las credenciales viven en variables de entorno de Vercel —
 * nunca llegan al navegador del cliente.
 *
 * Env vars requeridas (Vercel > Project Settings > Environment Variables):
 *   SHEETS_API_KEY  — API Key de Google Cloud con Sheets API v4 activada
 *   SHEET_ID        — ID del Google Spreadsheet
 */

const TAB_CLIENTES  = 'TABLAS';
const RANGO_CLIENTES = `${TAB_CLIENTES}!A20:F200`;

export default async function handler(req, res) {
  // Solo GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SHEETS_API_KEY, SHEET_ID } = process.env;

  if (!SHEETS_API_KEY || !SHEET_ID) {
    return res.status(500).json({
      error: 'Variables de entorno SHEETS_API_KEY o SHEET_ID no configuradas en Vercel.'
    });
  }

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/` +
    encodeURIComponent(RANGO_CLIENTES) +
    `?key=${SHEETS_API_KEY}`;

  try {
    const upstream = await fetch(url);
    const data     = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || `Google Sheets error ${upstream.status}`
      });
    }

    // Cabeceras de caché cortas — los datos de clientes cambian poco
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.status(200).json({ values: data.values || [] });

  } catch (err) {
    return res.status(502).json({ error: 'Error al conectar con Google Sheets: ' + err.message });
  }
}


/**
 * GET /api/sheets/pagos?cliente=NOMBRE
 *
 * Proxy seguro hacia Google Sheets API v4.
 * Filtra los pagos por cliente ya en el servidor para no
 * exponer filas de otros clientes al navegador.
 *
 * Env vars requeridas:
 *   SHEETS_API_KEY
 *   SHEET_ID
 */

const TAB_PAGOS   = 'Database';
const RANGO_PAGOS = `${TAB_PAGOS}!A20:P2000`;

/** Normaliza texto para comparación: minúsculas, sin tildes, sin espacios extra */
function normalizar(str) {
  return str
    ? str.toString().toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : '';
}

/** Convierte la fecha que devuelve Sheets (string o serial numérico) a yyyy-MM-dd */
function parseFecha(raw) {
  if (!raw) return '';
  const s = raw.toString().trim();

  // yyyy-MM-dd o yyyy-MM-ddThh:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);

  // dd/MM/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Serial numérico de Sheets (días desde 1899-12-30)
  const serial = Number(s);
  if (!isNaN(serial) && serial > 0) {
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().substring(0, 10);
  }

  return s.substring(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cliente } = req.query;
  if (!cliente || !cliente.trim()) {
    return res.status(400).json({ error: 'Parámetro "cliente" requerido.' });
  }

  const { SHEETS_API_KEY, SHEET_ID } = process.env;
  if (!SHEETS_API_KEY || !SHEET_ID) {
    return res.status(500).json({
      error: 'Variables de entorno SHEETS_API_KEY o SHEET_ID no configuradas en Vercel.'
    });
  }

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/` +
    encodeURIComponent(RANGO_PAGOS) +
    `?key=${SHEETS_API_KEY}`;

  try {
    const upstream = await fetch(url);
    const data     = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || `Google Sheets error ${upstream.status}`
      });
    }

    const filas       = data.values || [];
    const clienteKey  = normalizar(cliente);
    const resultados  = [];

    // Fila 0 = header del rango (fila 20 del sheet), datos desde fila 1
    for (let i = 1; i < filas.length; i++) {
      const fila = filas[i];
      if (!fila || fila.every(c => c === '')) continue;

      if (normalizar(fila[1] || '') !== clienteKey) continue;

      resultados.push({
        clienteReal : fila[1]  || cliente,
        concepto    : fila[5]  || 'Sin concepto',
        total       : Number(fila[10]) || 0,
        fecha       : parseFecha(fila[11]),
        estado      : fila[12] || 'Pendiente',
        pendiente   : Number(fila[14]) || 0,
      });
    }

    // Caché más agresiva para datos de pagos (cambian menos)
    res.setHeader('Cache-Control', 'private, max-age=120');
    return res.status(200).json({ pagos: resultados });

  } catch (err) {
    return res.status(502).json({ error: 'Error al conectar con Google Sheets: ' + err.message });
  }
}