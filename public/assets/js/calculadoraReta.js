// ═══════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════
let state = {
  currentStep: 0,
  nombre: '', anio: 2025, alta: null, tarifaPlana: null, tarifaPlanaPrimerAno: false,
  tipo: null, rendNeto: 0, cuotaMedia: 0, meses: 12
};

const fmt = (n) => new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR', minimumFractionDigits:2 }).format(n);
const fmtN = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n);

function getTarifaPlanaYear(dateValue) {
  if (!dateValue) return null;

  const alta = new Date(`${dateValue}T00:00:00`);
  const hoy = new Date();
  if (Number.isNaN(alta.getTime())) return null;
  if (alta > hoy) return 0;

  let years = hoy.getFullYear() - alta.getFullYear();
  const aniversario = new Date(hoy.getFullYear(), alta.getMonth(), alta.getDate());
  if (hoy < aniversario) years--;
  return years + 1;
}

function isSocietario(tipo = state.tipo) {
  return tipo === 'societario' || tipo === 'laboral';
}

function getDeduccionRate(tipo = state.tipo, anio = state.anio) {
  const tabla = TABLAS[anio] || TABLAS[2025];
  return isSocietario(tipo) ? tabla.deduccionSocietario : tabla.deduccionFisica;
}

function getTarifaPlanaAmount(anio = state.anio) {
  return (TABLAS[anio] || TABLAS[2025]).tarifaPlana;
}

function getTipoLabel(tipo = state.tipo) {
  return {
    fisica: 'Autónomo persona física',
    'tarifa-plana': 'Beneficiario de la tarifa plana',
    societario: 'Autónomo societario',
    laboral: 'Socio trabajador de sociedad laboral',
    familiar: 'Familiar colaborador'
  }[tipo] || 'Autónomo';
}

function renderTramosPreview(anio = parseInt(document.getElementById('inp-anio').value)) {
  const tabla = TABLAS[anio];
  const tbody = document.getElementById('tabla-tramos-preview-body');
  const anioLabel = document.getElementById('tramos-preview-anio');
  if (!tabla || !tbody || !anioLabel) return;

  anioLabel.textContent = `AÑO ${anio}`;
  tbody.innerHTML = tabla.tramos.map(tramo => {
    const hasta = tramo.hasta >= 9999999 ? 'En adelante' : `${fmtN(tramo.hasta)} €`;
    return `<tr>
      <td>Tramo ${tramo.id}</td>
      <td>${fmtN(tramo.desde)} €</td>
      <td>${hasta}</td>
      <td>${fmtN(tramo.bMin)} €</td>
      <td>${fmtN(tramo.bMax)} €</td>
      <td>${fmtN(tramo.cMin)} €</td>
      <td>${fmtN(tramo.cMax)} €</td>
    </tr>`;
  }).join('');
}

function clearRendimientoInput() {
  state.rendNeto = 0;
  document.getElementById('inp-rend').value = '';
  document.getElementById('rend-preview').style.display = 'none';
}

function volverDesdePaso4() {
  clearRendimientoInput();
  goToStep(3);
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════
function goToStep(n) {
  document.querySelectorAll('.card').forEach(c => c.classList.remove('visible'));
  const card = document.getElementById(`card-${n}`);
  if (card) card.classList.add('visible');
  document.getElementById('result-panel').style.display = n === 'result' ? 'block' : 'none';

  document.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.remove('active');
    if (i < n) el.classList.add('done');
    else el.classList.remove('done');
    if (i === n) el.classList.add('active');
  });
  state.currentStep = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showResult() {
  document.querySelectorAll('.card').forEach(c => c.classList.remove('visible'));
  document.getElementById('result-panel').style.display = 'block';
  document.querySelectorAll('.step-item').forEach(el => el.classList.add('done'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showTarifaPlanaFirstYearResult() {
  state.tarifaPlanaPrimerAno = true;
  const tarifaPlanaAmount = getTarifaPlanaAmount();

  document.getElementById('res-ref').textContent = 'INFORME · TARIFA PLANA';
  document.getElementById('res-title').textContent = 'No procede la regularización por tramos';
  document.getElementById('res-sub').textContent = `${state.nombre} · ${new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})}`;

  document.getElementById('res-cuota-correcta').textContent = `${fmt(tarifaPlanaAmount)}/mes`;
  document.getElementById('res-base-note').textContent = 'Cuota reducida del primer año';
  document.getElementById('res-pagado').textContent = 'No procede';
  document.getElementById('res-meses-note').textContent = 'No se comparan tramos de cotización';
  document.getElementById('res-diff').textContent = '0,00 €';
  document.getElementById('res-diff').className = 'kpi-value';
  document.getElementById('res-diff-note').textContent = 'Sin regularización por tramos';

  const verdict = document.getElementById('res-verdict');
  verdict.className = 'verdict ok';
  verdict.innerHTML = '<i class="fa-solid fa-circle-check"></i> Estás en el primer año de tarifa plana. La cuota reducida no se regulariza por tramos, por lo que no es necesario continuar con el cálculo.';

  document.getElementById('prev-date-container').innerHTML = '';
  document.getElementById('res-desglose').innerHTML = `<h4>Resultado del análisis</h4>
    <div class="calc-step-row"><span class="csr-label">Situación</span><span class="csr-val">Primer año de tarifa plana</span></div>
    <div class="calc-step-row"><span class="csr-label">Cuota reducida de referencia</span><span class="csr-val">${fmt(tarifaPlanaAmount)}/mes</span></div>
    <div class="calc-step-row"><span class="csr-label">Regularización por tramos</span><span class="csr-val">No procede</span></div>`;
  document.getElementById('res-anio-tabla').textContent = '';
  document.getElementById('tabla-tramos-body').innerHTML = `<tr><td colspan="7" style="text-align:center">No se aplica la tabla de tramos durante el primer año de tarifa plana.</td></tr>`;

  showResult();
}

// ═══════════════════════════════════════════════════════
// VALIDACIONES POR PASO
// ═══════════════════════════════════════════════════════
function validateStep1() {
  state.nombre = document.getElementById('inp-nombre').value.trim() || 'Sin identificar';
  state.anio   = parseInt(document.getElementById('inp-anio').value);
  goToStep(2);
}

function validateStep2() {
  const altaVal = document.getElementById('inp-alta').value;
  if (!altaVal) { alert('Introduce tu fecha de alta.'); return; }
  const periodoTarifa = getTarifaPlanaYear(altaVal);
  if (periodoTarifa === 0) { alert('La fecha de alta no puede ser posterior a hoy.'); return; }

  state.alta = new Date(altaVal);
  state.tarifaPlanaPrimerAno = false;

  const menosDe2 = periodoTarifa === 1 || periodoTarifa === 2;

  if (menosDe2 && state.tarifaPlana === null) {
    alert('Indica si estás acogido a la tarifa plana.');
    return;
  }
  if (!menosDe2) state.tarifaPlana = false;

  // Durante el primer año no es necesario calcular la regularización.
  if (periodoTarifa === 1 && state.tarifaPlana === true) {
    showTarifaPlanaFirstYearResult();
    return;
  }

  goToStep(3);
}

function validateStep3() {
  const selectedTipo = document.querySelector('input[name="tipo"]:checked')?.value;
  if (selectedTipo) state.tipo = selectedTipo;
  if (!state.tipo) { alert('Selecciona tu tipo de autónomo.'); return; }
  if (state.tipo === 'tarifa-plana' && !state.tarifaPlana) {
    alert('Elige “Sí, tengo tarifa plana” en el paso 2 para usar este tipo de autónomo.');
    return;
  }
  if (state.tipo === 'familiar' && state.tarifaPlana) {
    alert('El familiar colaborador no puede acogerse a la tarifa plana.');
    return;
  }
  updateDeduccionInfo();
  updateRendimientoPreview();
  goToStep(4);
}

function validateStep4() {
  const val = parseFloat(document.getElementById('inp-rend').value);
  if (isNaN(val)) { alert('Introduce tus rendimientos netos.'); return; }
  state.rendNeto = val;
  goToStep(5);
}

// ═══════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════
function selectTipo(tipo) {
  state.tipo = tipo;
  document.querySelectorAll('.radio-card').forEach(card => {
    const radio = card.querySelector('input[name="tipo"]');
    card.classList.toggle('selected', radio?.value === tipo);
    if (radio) radio.checked = radio.value === tipo;
  });

  const alertBox = document.getElementById('tipo-alert');
  const msgs = {
    fisica:     '',
    'tarifa-plana': '<div class="alert alert-blue"><i class="fa-solid fa-tag"></i><div>Como beneficiario de la tarifa plana, se aplica una <strong>deducción del 7 %</strong>. Los meses acogidos a la tarifa plana no se regularizan por tramos.</div></div>',
    societario: '<div class="alert alert-blue"><i class="fa-solid fa-circle-info"></i><div>Base mínima <strong>1.424,40 €/mes</strong>. Deducción del <strong>3 %</strong>. Se requieren al menos 90 días de alta en el año.</div></div>',
    laboral:    '<div class="alert alert-blue"><i class="fa-solid fa-circle-info"></i><div>Misma base mínima que el societario: <strong>1.424,40 €/mes</strong>. Verifica tu encuadramiento con el asesor.</div></div>',
    familiar:   '<div class="alert alert-amber"><i class="fa-solid fa-triangle-exclamation"></i><div>El familiar colaborador <strong>no puede acogerse a la tarifa plana</strong>. Base mínima <strong>1.424,40 €/mes</strong>.</div></div>'
  };
  alertBox.innerHTML = msgs[tipo] || '';
  updateDeduccionInfo();
  updateRendimientoPreview();
}

function selectTarifaPlana(val) {
  state.tarifaPlana = val;
  const tarifaPlanaAmount = fmt(getTarifaPlanaAmount());
  document.getElementById('tp-si').className = 'toggle-btn' + (val ? ' selected-yes' : '');
  document.getElementById('tp-no').className = 'toggle-btn' + (!val ? ' selected-no' : '');
  document.getElementById('tp-info').style.display = val ? 'block' : 'none';
  document.getElementById('tp-info-text').innerHTML = val
    ? `Con tarifa plana, la regularización por tramos <strong>no aplica</strong> durante el período de tarifa. La cuota reducida de referencia para ${state.anio} es de <strong>${tarifaPlanaAmount}/mes</strong>.`
    : 'Has indicado que no estás acogido a la tarifa plana, por lo que continuaremos con la cotización ordinaria.';
}

document.getElementById('inp-alta').addEventListener('change', function() {
  const periodoTarifa = getTarifaPlanaYear(this.value);
  const block = document.getElementById('tarifa-plana-block');
  const periodMsg = document.getElementById('tp-period-msg');
  const visible = periodoTarifa === 1 || periodoTarifa === 2;

  block.style.display = visible ? 'block' : 'none';
  if (periodoTarifa === 1) {
    periodMsg.innerHTML = `Estás en el <strong>primer año de tarifa plana</strong> (cuota reducida de referencia: ${fmt(getTarifaPlanaAmount())}/mes). Si confirmas que la tienes, el formulario finalizará porque este período no se regulariza por tramos.`;
  } else if (periodoTarifa === 2) {
    periodMsg.innerHTML = `Estás en el <strong>segundo año de tarifa plana</strong> (cuota reducida de referencia: ${fmt(getTarifaPlanaAmount())}/mes). Aunque confirmes que la tienes, continuaremos el cálculo para revisar la regularización que corresponda.`;
  } else if (periodoTarifa === 0) {
    periodMsg.innerHTML = '<strong>La fecha de alta no puede ser posterior a hoy.</strong>';
  }
  if (!visible) {
    state.tarifaPlana = false;
  } else {
    state.tarifaPlana = null;
    document.getElementById('tp-si').className = 'toggle-btn';
    document.getElementById('tp-no').className = 'toggle-btn';
    document.getElementById('tp-info').style.display = 'none';
  }
});

function updateDeduccionInfo() {
  const pct = `${(getDeduccionRate() * 100).toFixed(0)} %`;
  document.getElementById('deduccion-txt').innerHTML =
    `${getTipoLabel()}: 
     se aplica una <strong>deducción del ${pct}</strong> sobre los rendimientos netos.`;
}

function updateRendimientoPreview() {
  const val = parseFloat(document.getElementById('inp-rend').value);
  if (isNaN(val)) { document.getElementById('rend-preview').style.display='none'; return; }
  const ded   = getDeduccionRate();
  const computable = val * (1 - ded);
  const mensual    = computable / 12;
  document.getElementById('prev-rend-bruto').textContent   = fmt(val);
  document.getElementById('prev-deduccion-label').textContent = `Deducción (${(ded * 100).toFixed(0)} %)`;
  document.getElementById('prev-deduccion').textContent    = `− ${fmt(val * ded)}`;
  document.getElementById('prev-rend-neto').textContent    = fmt(computable);
  document.getElementById('prev-rend-mensual').textContent = fmt(mensual);
  document.getElementById('rend-preview').style.display    = 'block';
}

document.getElementById('inp-rend').addEventListener('input', updateRendimientoPreview);

document.getElementById('inp-anio').addEventListener('change', function() {
  state.anio = parseInt(this.value);
  renderTramosPreview(state.anio);
  updateDeduccionInfo();
  updateRendimientoPreview();
});
renderTramosPreview();

document.getElementById('inp-cuota-media').addEventListener('input', updateCuotaPreview);
document.getElementById('inp-meses').addEventListener('input', updateCuotaPreview);
function updateCuotaPreview() {
  const c = parseFloat(document.getElementById('inp-cuota-media').value);
  const m = parseInt(document.getElementById('inp-meses').value) || 12;
  if (isNaN(c)) { document.getElementById('cuota-preview').style.display='none'; return; }
  document.getElementById('prev-cuota-mes').textContent   = fmt(c);
  document.getElementById('prev-meses').textContent       = `${m} meses`;
  document.getElementById('prev-total-pagado').textContent = fmt(c * m);
  document.getElementById('cuota-preview').style.display  = 'block';
}

// ═══════════════════════════════════════════════════════
// CÁLCULO PRINCIPAL
// ═══════════════════════════════════════════════════════
function calcular() {
  const cuotaMedia = parseFloat(document.getElementById('inp-cuota-media').value);
  const meses      = parseInt(document.getElementById('inp-meses').value) || 12;
  if (isNaN(cuotaMedia) || cuotaMedia <= 0) { alert('Introduce la cuota mensual media.'); return; }

  state.cuotaMedia = cuotaMedia;
  state.meses      = meses;

  const anio  = state.anio;
  const tabla = TABLAS[anio];
  if (!tabla) { alert(`No hay datos para el año ${anio}. Consulta con tu asesor.`); return; }

  const isSoc    = isSocietario();
  const isFamil  = state.tipo === 'familiar';
  const ded      = getDeduccionRate(state.tipo, anio);
  const pct      = tabla.pct;

  const rendBruto      = state.rendNeto;
  const rendComputable = rendBruto * (1 - ded);
  const rendMensual    = rendComputable / 12;

  // Localizar tramo
  const tramo = tabla.tramos.find(t => rendMensual >= t.desde && rendMensual < t.hasta)
             || tabla.tramos[tabla.tramos.length - 1];

  // La base de cotización es la base mínima del tramo correspondiente
  // Para societario/familiar/laboral, no puede bajar de baseMinSocietario
  let baseMensual = tramo.bMin;
  const baseMinEsp = (isSoc || isFamil) ? tabla.baseMinSocietario : 0;
  if (baseMensual < baseMinEsp) baseMensual = baseMinEsp;

  const cuotaMensualCorrecta = baseMensual * pct;
  const cuotaAnualCorrecta   = cuotaMensualCorrecta * meses;
  const totalPagado          = cuotaMedia * meses;
  const diferencia           = cuotaAnualCorrecta - totalPagado;

  // ── Rellenar resultado ───────────────────────────────
  const refStr = `REG-${anio}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  document.getElementById('res-ref').textContent   = `REF: ${refStr}`;
  document.getElementById('res-title').textContent = `Informe de regularización RETA ${anio}`;
  document.getElementById('res-sub').textContent   = `${state.nombre} · ${new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})}`;

  document.getElementById('res-cuota-correcta').textContent = fmt(cuotaAnualCorrecta);
  document.getElementById('res-base-note').textContent      = `${fmt(cuotaMensualCorrecta)}/mes · base ${fmt(baseMensual)}`;
  document.getElementById('res-pagado').textContent         = fmt(totalPagado);
  document.getElementById('res-meses-note').textContent     = `${fmt(cuotaMedia)}/mes × ${meses} meses`;

  const diffEl = document.getElementById('res-diff');
  const diffNoteEl = document.getElementById('res-diff-note');
  diffEl.textContent = (diferencia >= 0 ? '+' : '') + fmt(diferencia);
  diffEl.className   = 'kpi-value ' + (diferencia > 0 ? 'positive' : diferencia < 0 ? 'negative' : '');
  diffNoteEl.textContent = diferencia > 0 ? 'Deberás abonar esta diferencia' : diferencia < 0 ? 'La TGSS te devolverá esta cantidad' : 'Sin diferencia';

  // Veredicto
  const vEl = document.getElementById('res-verdict');
  if (state.tarifaPlana) {
    vEl.className = 'verdict warn';
    vEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> Tienes tarifa plana: los meses en tarifa plana no están sujetos a regularización por tramos. Esta estimación aplica solo a los meses fuera de tarifa plana.';
  } else if (diferencia <= 0) {
    vEl.className = 'verdict ok';
    vEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> No hay regularización adicional para el ejercicio ${anio}. Has cotizado correctamente o en exceso (${fmt(Math.abs(diferencia))} a devolver).`;
  } else {
    vEl.className = 'verdict ko';
    vEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Existe una diferencia de <strong>${fmt(diferencia)}</strong> que la TGSS reclamará en la regularización del ejercicio ${anio}.`;
  }

  // Fecha previsión
  const anioReg = anio + 2;
  const prevCont = document.getElementById('prev-date-container');
  if (diferencia > 0 && !state.tarifaPlana) {
    prevCont.innerHTML = `<div class="prev-date-box">
      <div class="prev-date-icon"><i class="fa-solid fa-calendar-exclamation"></i></div>
      <div>
        <div class="prev-date-title">Fecha prevista de reclamación</div>
        <div class="prev-date-body">La TGSS suele emitir la regularización del ejercicio ${anio} entre <strong>enero y febrero de ${anioReg}</strong>. Prepara la liquidación de <strong>${fmt(diferencia)}</strong> para esa fecha.</div>
      </div>
    </div>`;
  } else { prevCont.innerHTML = ''; }

  // Desglose
  const desgl = document.getElementById('res-desglose');
  desgl.innerHTML = `<h4>Desglose del cálculo — Ejercicio ${anio}</h4>
    <div class="calc-step-row"><span class="csr-label">Rendimiento neto declarado</span><span class="csr-val">${fmt(rendBruto)}</span></div>
    <div class="calc-step-row"><span class="csr-label">Deducción ${(ded*100).toFixed(0)} % (${getTipoLabel()})</span><span class="csr-val">− ${fmt(rendBruto * ded)}</span></div>
    <div class="calc-step-row"><span class="csr-label">Rendimiento computable anual</span><span class="csr-val">${fmt(rendComputable)}</span></div>
    <div class="calc-step-row"><span class="csr-label">Rendimiento computable mensual</span><span class="csr-val">${fmt(rendMensual)}</span></div>
    <div class="calc-step-row"><span class="csr-label">Tramo asignado</span><span class="csr-val">Tramo ${tramo.id}</span></div>
    <div class="calc-step-row"><span class="csr-label">Base mínima de cotización mensual</span><span class="csr-val">${fmt(baseMensual)}</span></div>
    <div class="calc-step-row"><span class="csr-label">Tipo de cotización (${(pct*100).toFixed(1)} %)</span><span class="csr-val">${(pct*100).toFixed(1)} %</span></div>
    <div class="calc-step-row"><span class="csr-label">Cuota mensual correcta</span><span class="csr-val">${fmt(cuotaMensualCorrecta)}</span></div>
    <div class="calc-step-row"><span class="csr-label">Cuota anual correcta (× ${meses} meses)</span><span class="csr-val">${fmt(cuotaAnualCorrecta)}</span></div>
    <div class="calc-step-row"><span class="csr-label">Total cuotas pagadas</span><span class="csr-val">− ${fmt(totalPagado)}</span></div>
    <div class="calc-step-row"><span class="csr-label">Diferencia (regularización)</span><span class="csr-val">${(diferencia>=0?'+':'')}${fmt(diferencia)}</span></div>`;

  // Tabla de tramos
  document.getElementById('res-anio-tabla').textContent = `· ${anio} · tipo ${(pct*100).toFixed(1)} %`;
  const tbody = document.getElementById('tabla-tramos-body');
  tbody.innerHTML = '';
  tabla.tramos.forEach(t => {
    const isHighlight = t.id === tramo.id;
    const tr2 = document.createElement('tr');
    if (isHighlight) tr2.className = 'highlight-row';
    const hasta = t.hasta >= 9999999 ? 'En adelante' : fmtN(t.hasta) + ' €';
    tr2.innerHTML = `
      <td>${isHighlight ? '▶ ' : ''}Tramo ${t.id}</td>
      <td>${fmtN(t.desde)} €</td>
      <td>${hasta}</td>
      <td>${fmtN(t.bMin)} €</td>
      <td>${fmtN(t.bMax)} €</td>
      <td>${fmtN(t.cMin)} €</td>
      <td>${fmtN(t.cMax)} €</td>`;
    tbody.appendChild(tr2);
  });

  showResult();
}

function resetCalc() {
  state = { currentStep:0, nombre:'', anio:2025, alta:null, tarifaPlana:null, tarifaPlanaPrimerAno:false, tipo:null, rendNeto:0, cuotaMedia:0, meses:12 };
  document.getElementById('inp-nombre').value = '';
  document.getElementById('inp-rend').value = '';
  document.getElementById('inp-cuota-media').value = '';
  document.getElementById('inp-meses').value = '12';
  document.getElementById('inp-alta').value = '';
  document.getElementById('tarifa-plana-block').style.display = 'none';
  document.getElementById('tp-info').style.display = 'none';
  document.getElementById('tp-period-msg').innerHTML = 'Llevas menos de 2 años de alta. Podrías estar acogido a la <strong>tarifa plana</strong>.';
  document.getElementById('tp-info-text').innerHTML = 'Con tarifa plana, la regularización por tramos <strong>no aplica</strong> durante el período de tarifa.';
  document.getElementById('tp-si').className = 'toggle-btn';
  document.getElementById('tp-no').className = 'toggle-btn';
  document.getElementById('rend-preview').style.display = 'none';
  document.getElementById('cuota-preview').style.display = 'none';
  document.querySelectorAll('.radio-card').forEach(card => {
    card.classList.remove('selected');
    const radio = card.querySelector('input[name="tipo"]');
    if (radio) radio.checked = false;
  });
  document.getElementById('tipo-alert').innerHTML = '';
  goToStep(0);
}

// Stepper clickable
document.querySelectorAll('.step-item').forEach((el, i) => {
  el.addEventListener('click', () => { if (i <= state.currentStep) goToStep(i); });
});
