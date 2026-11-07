const fmt = (n) => new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR', minimumFractionDigits:2 }).format(n);
const fmtN = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n);

function getComparisonData() {
  const yearA = parseInt(document.getElementById('compare-anio-a').value);
  const yearB = parseInt(document.getElementById('compare-anio-b').value);
  const filter = document.getElementById('compare-filter').value;
  return {
    yearA,
    yearB,
    filter,
    tablaA: TABLAS[yearA],
    tablaB: TABLAS[yearB],
    showMin: filter !== 'hide-minimos',
    showMax: filter !== 'hide-maximos'
  };
}

function renderSummary(data) {
  document.getElementById('compare-summary').innerHTML = `
    <div class="summary-card"><strong>Ejercicio ${data.yearA}</strong>Tarifa plana: <b>${fmt(data.tablaA.tarifaPlana)}/mes</b><br>Tipo de cotización: <b>${(data.tablaA.pct * 100).toFixed(1)} %</b></div>
    <div class="summary-card"><strong>Ejercicio ${data.yearB}</strong>Tarifa plana: <b>${fmt(data.tablaB.tarifaPlana)}/mes</b><br>Tipo de cotización: <b>${(data.tablaB.pct * 100).toFixed(1)} %</b></div>`;
}

function formatRange(tramo) {
  return tramo
    ? `${fmtN(tramo.desde)} – ${tramo.hasta >= 9999999 ? 'en adelante' : fmtN(tramo.hasta)} €`
    : '—';
}

function getTramoLabel(tramoA, tramoB, index) {
  return tramoA?.id || tramoB?.id || index + 1;
}

function renderDesktopTable(data) {
  const tableHead = document.getElementById('compare-table-head-desktop');
  const tableBody = document.getElementById('compare-table-body-desktop');
  const valueCell = (value, className = '') => `<td class="${className}">${value === undefined ? '—' : `${fmtN(value)} €`}</td>`;
  const deltaCell = (valueA, valueB) => {
    if (valueA === undefined || valueB === undefined) return '<td class="group-end">—</td>';
    const delta = valueB - valueA;
    const colorClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    return `<td class="group-end ${colorClass}">${delta > 0 ? '+' : ''}${fmtN(delta)} €</td>`;
  };
  const maxHeaders = data.showMax ? `
    <th colspan="3" class="group-head group-start group-end">Base máxima</th>
    <th colspan="3" class="group-head group-start group-end">Cuota máxima</th>` : '';
  const maxSubHeaders = data.showMax ? `
    <th class="group-start">${data.yearA}</th><th>${data.yearB}</th><th class="group-end">Diferencia</th>
    <th class="group-start">${data.yearA}</th><th>${data.yearB}</th><th class="group-end">Diferencia</th>` : '';

  tableHead.innerHTML = `<tr>
    <th rowspan="2">Tramo</th>
    <th colspan="2" class="group-head group-start group-end">Rendimiento mensual</th>
    ${data.showMin ? `<th colspan="3" class="group-head group-start group-end">Base mínima</th>` : ''}
    ${data.showMin ? `<th colspan="3" class="group-head group-start group-end">Cuota mínima</th>` : ''}
    ${maxHeaders}
  </tr><tr>
    <th class="group-start">${data.yearA}</th><th class="group-end">${data.yearB}</th>
    ${data.showMin ? `<th class="group-start">${data.yearA}</th><th>${data.yearB}</th><th class="group-end">Diferencia</th>` : ''}
    ${data.showMin ? `<th class="group-start">${data.yearA}</th><th>${data.yearB}</th><th class="group-end">Diferencia</th>` : ''}
    ${maxSubHeaders}
  </tr>`;

  const totalTramos = Math.max(data.tablaA.tramos.length, data.tablaB.tramos.length);
  tableBody.innerHTML = Array.from({ length: totalTramos }, (_, index) => {
    const tramoA = data.tablaA.tramos[index];
    const tramoB = data.tablaB.tramos[index];
    const maxCells = data.showMax ? `
      ${valueCell(tramoA?.bMax, 'group-start')}${valueCell(tramoB?.bMax)}${deltaCell(tramoA?.bMax, tramoB?.bMax)}
      ${valueCell(tramoA?.cMax, 'group-start')}${valueCell(tramoB?.cMax)}${deltaCell(tramoA?.cMax, tramoB?.cMax)}` : '';

    return `<tr>
      <td>Tramo ${getTramoLabel(tramoA, tramoB, index)}</td>
      <td class="group-start">${formatRange(tramoA)}</td><td class="group-end">${formatRange(tramoB)}</td>
      ${data.showMin ? `${valueCell(tramoA?.bMin, 'group-start')}${valueCell(tramoB?.bMin)}${deltaCell(tramoA?.bMin, tramoB?.bMin)}` : ''}
      ${data.showMin ? `${valueCell(tramoA?.cMin, 'group-start')}${valueCell(tramoB?.cMin)}${deltaCell(tramoA?.cMin, tramoB?.cMin)}` : ''}
      ${maxCells}
    </tr>`;
  }).join('');
}

function renderCompactTable(data) {
  const tableHead = document.getElementById('compare-table-head');
  const tableBody = document.getElementById('compare-table-body');
  const valueLine = (year, value) => `<span class="compare-line"><b>${year}</b><span>${value === undefined ? '—' : `${fmtN(value)} €`}</span></span>`;
  const rangeLine = (year, tramo) => `<span class="compare-line"><b>${year}</b><span>${formatRange(tramo)}</span></span>`;
  const compareCell = (tramoA, tramoB, field, extraClass = '') => {
    const valueA = tramoA?.[field];
    const valueB = tramoB?.[field];
    const delta = valueA === undefined || valueB === undefined ? '—' : `${valueB - valueA > 0 ? '+' : ''}${fmtN(valueB - valueA)} €`;
    const deltaClass = valueA === undefined || valueB === undefined ? '' : valueB - valueA > 0 ? 'positive' : valueB - valueA < 0 ? 'negative' : '';
    return `<td class="${extraClass}"><div class="compare-values">${valueLine(data.yearA, valueA)}${valueLine(data.yearB, valueB)}<span class="compare-delta ${deltaClass}">Dif.: ${delta}</span></div></td>`;
  };
  const rangeCell = (tramoA, tramoB) => `<td class="group-start group-end"><div class="compare-values">${rangeLine(data.yearA, tramoA)}${rangeLine(data.yearB, tramoB)}</div></td>`;
  const groupHeader = (label, extraClass = '', hasDifference = true) => `<th class="group-head ${extraClass}">${label}<small>${data.yearA} / ${data.yearB}${hasDifference ? ' / Dif.' : ''}</small></th>`;

  tableHead.innerHTML = `<tr>
    <th>Tramo</th>
    ${groupHeader('Rendimiento mensual', 'group-start group-end', false)}
    ${data.showMin ? groupHeader('Base mínima', 'group-start group-end') : ''}
    ${data.showMin ? groupHeader('Cuota mínima', 'group-start group-end') : ''}
    ${data.showMax ? groupHeader('Base máxima', 'group-start group-end') : ''}
    ${data.showMax ? groupHeader('Cuota máxima', 'group-start group-end') : ''}
  </tr>`;

  const totalTramos = Math.max(data.tablaA.tramos.length, data.tablaB.tramos.length);
  tableBody.innerHTML = Array.from({ length: totalTramos }, (_, index) => {
    const tramoA = data.tablaA.tramos[index];
    const tramoB = data.tablaB.tramos[index];
    return `<tr>
      <td>Tramo ${getTramoLabel(tramoA, tramoB, index)}</td>
      ${rangeCell(tramoA, tramoB)}
      ${data.showMin ? compareCell(tramoA, tramoB, 'bMin', 'group-start group-end') : ''}
      ${data.showMin ? compareCell(tramoA, tramoB, 'cMin', 'group-start group-end') : ''}
      ${data.showMax ? compareCell(tramoA, tramoB, 'bMax', 'group-start group-end') : ''}
      ${data.showMax ? compareCell(tramoA, tramoB, 'cMax', 'group-start group-end') : ''}
    </tr>`;
  }).join('');
}

function renderComparison() {
  const data = getComparisonData();
  if (!data.tablaA || !data.tablaB) return;
  renderSummary(data);
  renderDesktopTable(data);
  renderCompactTable(data);
}

document.getElementById('compare-anio-a').addEventListener('change', renderComparison);
document.getElementById('compare-anio-b').addEventListener('change', renderComparison);
document.getElementById('compare-filter').addEventListener('change', renderComparison);
renderComparison();
