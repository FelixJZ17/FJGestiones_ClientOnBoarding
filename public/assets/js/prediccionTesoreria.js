/**
 * Lógica de Previsión y Control de Tesorería
 * Fix: PDF ocultando secciones + nombre empresa, líneas de fin de mes en gráfico,
 *      saldo inicial correcto al filtrar por mes, área negativa precisa entre puntos.
 */

document.addEventListener('DOMContentLoaded', () => {
    let movements = [];
    let treasuryChart = null;

    // Elementos del DOM
    const initialBalanceInput = document.getElementById('initialBalance');
    const targetBalanceInput  = document.getElementById('targetBalance');
    const graveBalanceInput   = document.getElementById('graveBalance');
    const minBalanceDisplay   = document.getElementById('minBalanceDisplay');
    const healthBadge         = document.getElementById('healthBadge');

    // Formulario y edición
    const movementForm   = document.getElementById('movementForm');
    const formTitle      = document.getElementById('formTitle');
    const editingIdInput = document.getElementById('editingId');
    const btnSubmitForm  = document.getElementById('btnSubmitForm');
    const btnCancelEdit  = document.getElementById('btnCancelEdit');

    const movementsTableBody = document.getElementById('movementsTableBody');
    const filterMonthSelect  = document.getElementById('filterMonth');
    const btnDemoData        = document.getElementById('btnDemoData');
    const btnReset           = document.getElementById('btnReset');
    const btnRefreshChart    = document.getElementById('btnRefreshChart');
    const refreshIcon        = document.getElementById('refreshIcon');
    const chartContainerCard = document.getElementById('chartContainerCard');
    const movDateInput       = document.getElementById('movDate');
    const excelFileInput     = document.getElementById('excelFile');
    const btnExportExcel     = document.getElementById('btnExportExcel');
    const btnExportPDF       = document.getElementById('btnExportPDF');

    // Modal de Ayuda
    const helpModal        = document.getElementById('helpModal');
    const btnHelpModal     = document.getElementById('btnHelpModal');
    const btnCloseModal    = document.getElementById('btnCloseModal');
    const btnCloseModalBtn = document.getElementById('btnCloseModalBtn');

    if (movDateInput) movDateInput.valueAsDate = new Date();

    // ─── Modal ───────────────────────────────────────────────────────────────
    const toggleModal = (show) => {
        if (show) helpModal.classList.remove('hidden');
        else      helpModal.classList.add('hidden');
    };
    btnHelpModal.addEventListener('click',    () => toggleModal(true));
    btnCloseModal.addEventListener('click',   () => toggleModal(false));
    btnCloseModalBtn.addEventListener('click',() => toggleModal(false));
    window.addEventListener('click', (e) => { if (e.target === helpModal) toggleModal(false); });

    // ─── LocalStorage ────────────────────────────────────────────────────────
    const loadFromLocalStorage = () => {
        try {
            const savedConfig = localStorage.getItem('tesoreria_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                initialBalanceInput.value = config.initialBalance ?? 12500;
                targetBalanceInput.value  = config.targetBalance  ?? 5000;
                graveBalanceInput.value   = config.graveBalance   ?? 1000;
            }
            const savedMovements = localStorage.getItem('tesoreria_movements');
            if (savedMovements) movements = JSON.parse(savedMovements);
        } catch (e) { console.error('Error al cargar LocalStorage:', e); }
    };

    const saveToLocalStorage = () => {
        try {
            const config = {
                initialBalance: initialBalanceInput.value,
                targetBalance:  targetBalanceInput.value,
                graveBalance:   graveBalanceInput.value
            };
            localStorage.setItem('tesoreria_config',    JSON.stringify(config));
            localStorage.setItem('tesoreria_movements', JSON.stringify(movements));
        } catch (e) { console.error('Error al guardar en LocalStorage:', e); }
    };

    // ─── Helpers de formato ──────────────────────────────────────────────────
    const formatCurrency = (amount) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        if (dateStr.includes('/')) return dateStr;
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr;
        return `${day}/${month}/${year}`;
    };

    // ─── Plugin personalizado del gráfico ────────────────────────────────────
    // Dibuja líneas verticales discontinuas de fin de mes sobre el área del gráfico
    const customChartPlugins = {
        id: 'customChartPlugins',
        afterDraw: (chart) => {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            if (!x) return;

            const monthEndDates = chart.config.options.plugins.customChartPlugins?.monthEndDates || [];

            ctx.save();

            // 1. Guías verticales tenues hacia cada punto
            const meta = chart.getDatasetMeta(1);
            if (meta && meta.data) {
                ctx.setLineDash([2, 4]);
                ctx.lineWidth    = 1;
                ctx.strokeStyle  = 'rgba(203, 213, 225, 0.5)';
                meta.data.forEach(el => {
                    const { x: px, y: py } = el.tooltipPosition();
                    ctx.beginPath();
                    ctx.moveTo(px, bottom);
                    ctx.lineTo(px, py);
                    ctx.stroke();
                });
            }

            // 2. Líneas de separación de fin de mes
            if (monthEndDates.length > 0) {
                ctx.setLineDash([5, 5]);
                ctx.lineWidth   = 1.5;
                ctx.strokeStyle = '#94a3b8';

                monthEndDates.forEach((dateStr) => {
                    // Colocar la línea justo al final del último día del mes
                    // Sumamos 1 día (siguiente día) para que caiga en el límite exacto entre meses
                    const [y, m, d] = dateStr.split('-').map(Number);
                    const nextDay = new Date(y, m - 1, d + 1);
                    const nextDayStr = nextDay.toISOString().split('T')[0];

                    const xPos = x.getPixelForValue(nextDayStr);
                    if (xPos > x.left && xPos < x.right) {
                        ctx.beginPath();
                        ctx.moveTo(xPos, top);
                        ctx.lineTo(xPos, bottom);
                        ctx.stroke();
                    }
                });
            }

            ctx.restore();
        }
    };

    // ─── Inicialización del gráfico ──────────────────────────────────────────
    const initChart = () => {
        const ctx = document.getElementById('treasuryChart').getContext('2d');

        // Patrón de rayas para zona < 0 €
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width  = 12;
        patternCanvas.height = 12;
        const pctx = patternCanvas.getContext('2d');
        pctx.fillStyle   = 'rgba(244, 63, 94, 0.15)';
        pctx.fillRect(0, 0, 12, 12);
        pctx.strokeStyle = '#e11d48';
        pctx.lineWidth   = 2;
        pctx.beginPath();
        pctx.moveTo(0, 12);
        pctx.lineTo(12, 0);
        pctx.stroke();
        const stripePattern = ctx.createPattern(patternCanvas, 'repeat');

        treasuryChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    // Dataset 0: área roja debajo de 0 €
                    // Ahora se construye con puntos interpolados exactos para que el área
                    // empiece / termine justo donde la línea cruza el cero.
                    {
                        label: 'Zona Descuadre (< 0 €)',
                        data: [],
                        borderColor: 'transparent',
                        backgroundColor: stripePattern,
                        fill: { target: { value: 0 } },
                        tension: 0,          // Sin curvas: necesitamos segmentos rectos para interpolar el cruce
                        pointRadius: 0,
                        order: 2
                    },
                    // Dataset 1: línea principal del saldo
                    {
                        label: 'Saldo Estimado en Banco (€)',
                        data: [],
                        borderColor: '#0d9488',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.2,
                        pointBackgroundColor: '#0f172a',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        order: 1,
                        segment: {
                            borderColor: ctx => {
                                const val = ctx.p1.parsed.y;
                                const grave  = parseFloat(graveBalanceInput.value) || 0;
                                const target = parseFloat(targetBalanceInput.value) || 0;
                                if (val < 0)       return '#be123c';
                                if (val < grave)   return '#e11d48';
                                if (val < target)  return '#d97706';
                                return '#0d9488';
                            }
                        }
                    }
                ]
            },
            plugins: [customChartPlugins],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { left: 10, right: 15 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const rawObj = context[0].raw;
                                if (rawObj && rawObj.records && rawObj.records.length > 0)
                                    return `Fecha: ${formatDate(rawObj.x)}`;
                                return `Fecha: ${formatDate(context[0].label || rawObj.x)}`;
                            },
                            label: function(context) {
                                if (context.datasetIndex === 0) return null;
                                const rawObj = context.raw;

                                if (rawObj && rawObj.records && rawObj.records.length > 0) {
                                    let lines = [` Saldo Acumulado: ${formatCurrency(context.parsed.y)}`];
                                    lines.push(` --- Movimientos del día (${rawObj.records.length}) ---`);
                                    rawObj.records.forEach((rec, idx) => {
                                        const sign = rec.isIncome ? '+' : '-';
                                        lines.push(` ${idx + 1}. ${rec.concept}: ${sign}${formatCurrency(rec.amount)}`);
                                    });
                                    return lines;
                                }

                                const concept  = rawObj && rawObj.concept ? rawObj.concept : 'Saldo inicial de partida';
                                const amount   = rawObj && rawObj.amount !== undefined ? rawObj.amount : null;
                                const isIncome = rawObj && rawObj.isIncome;

                                let lines = [` Saldo Acumulado: ${formatCurrency(context.parsed.y)}`];
                                lines.push(` Concepto: ${concept}`);
                                if (amount !== null)
                                    lines.push(` Importe: ${isIncome ? '+' : '-'}${formatCurrency(amount)}`);
                                return lines;
                            }
                        }
                    },
                    customChartPlugins: { monthEndDates: [] }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'dd/MM/yyyy',
                            displayFormats: { day: 'dd/MM/yyyy', week: 'dd/MM/yyyy', month: 'dd/MM/yyyy' }
                        },
                        grid: { display: false },
                        ticks: {
                            font: { family: 'Inter', size: 11 },
                            maxTicksLimit: 10,
                            maxRotation: 30,
                            autoSkip: true
                        }
                    },
                    y: {
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            font: { family: 'Inter', size: 11 },
                            padding: 8,
                            callback: function(value) { return value.toLocaleString('es-ES') + ' €'; }
                        }
                    }
                }
            }
        });
    };

    // ─── Reset del formulario ────────────────────────────────────────────────
    const resetForm = () => {
        editingIdInput.value = '';
        document.getElementById('movConcept').value = '';
        document.getElementById('movAmount').value  = '';
        if (movDateInput) movDateInput.valueAsDate = new Date();
        movementForm.querySelector('input[name="type"][value="income"]').checked = true;

        formTitle.innerHTML   = '<i class="fa-solid fa-circle-plus text-teal-600 mr-1"></i> Añadir Previsión Manual';
        btnSubmitForm.innerHTML = '<i class="fa-solid fa-plus"></i> Registrar en Previsión';
        btnCancelEdit.classList.add('hidden');
    };

    btnCancelEdit.addEventListener('click', resetForm);

    // ─── Interpolación lineal del cruce por cero ─────────────────────────────
    // Dado un segmento (x1,y1)→(x2,y2) donde y1 y y2 tienen signos distintos,
    // devuelve la fecha ISO exacta del cruce y=0 interpolando linealmente.
    const interpolateCrossing = (x1Str, y1, x2Str, y2) => {
        const t1 = new Date(x1Str).getTime();
        const t2 = new Date(x2Str).getTime();
        // t = t1 + (0 - y1) / (y2 - y1) * (t2 - t1)
        const tCross = t1 + (-y1 / (y2 - y1)) * (t2 - t1);
        return new Date(tCross).toISOString().split('T')[0];
    };

    // ─── Cálculo principal ───────────────────────────────────────────────────
    const updateCalculations = () => {
        const initialBalance = parseFloat(initialBalanceInput.value) || 0;
        const targetBalance  = parseFloat(targetBalanceInput.value)  || 0;
        const graveBalance   = parseFloat(graveBalanceInput.value)   || 0;

        movements.sort((a, b) => new Date(a.date) - new Date(b.date));

        // ── Reconstruir opciones del filtro de mes ──
        const availableMonths = [...new Set(
            movements.map(m => m.date ? m.date.substring(0, 7) : '').filter(Boolean)
        )];
        const currentSelectedMonth = filterMonthSelect.value;

        filterMonthSelect.innerHTML = '<option value="all">🗓️ Todos los meses</option>';
        availableMonths.forEach(ym => {
            const [y, m] = ym.split('-');
            const dateObj   = new Date(y, m - 1, 1);
            const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            const opt       = document.createElement('option');
            opt.value       = ym;
            opt.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            filterMonthSelect.appendChild(opt);
        });
        if (availableMonths.includes(currentSelectedMonth))
            filterMonthSelect.value = currentSelectedMonth;

        const selectedFilterMonth = filterMonthSelect.value;

        // ── FIX #3: Calcular saldo exacto al inicio del mes filtrado ──────────
        // Se suman TODOS los movimientos visibles cuya fecha es ESTRICTAMENTE
        // anterior al día 1 del mes seleccionado. Esto incluye movimientos de
        // meses anteriores con independencia de cuántos sean.
        let balanceAtStartOfFilteredMonth = initialBalance;

        if (selectedFilterMonth !== 'all') {
            const firstDayOfMonthStr = `${selectedFilterMonth}-01`;
            movements.forEach(m => {
                if (m.hidden === true) return;
                // Comparación lexicográfica de fechas ISO: válida para YYYY-MM-DD
                if (m.date < firstDayOfMonthStr) {
                    balanceAtStartOfFilteredMonth += m.type === 'income' ? m.amount : -m.amount;
                }
            });
        }

        // ── Punto de inicio del gráfico ───────────────────────────────────────
        let chartStartDateStr;
        let chartStartBalance;
        let currentBalance; // saldo acumulado corriente para la tabla

        if (selectedFilterMonth === 'all') {
            // Un día antes del primer movimiento para que el punto inicial sea visible
            const firstMovDate = movements.length > 0 && movements[0].date
                ? movements[0].date
                : new Date().toISOString().split('T')[0];
            const [fY, fM, fD] = firstMovDate.split('-').map(Number);
            const initDateObj  = new Date(fY, fM - 1, fD - 1);
            chartStartDateStr  = initDateObj.toISOString().split('T')[0];
            chartStartBalance  = initialBalance;
            currentBalance     = initialBalance;
        } else {
            chartStartDateStr = `${selectedFilterMonth}-01`;
            chartStartBalance = balanceAtStartOfFilteredMonth;
            currentBalance    = balanceAtStartOfFilteredMonth;
        }

        // ── Datos principales para el gráfico ─────────────────────────────────
        const mainChartData = [{
            x: chartStartDateStr,
            y: chartStartBalance,
            concept: selectedFilterMonth === 'all'
                ? 'Saldo Inicial de Partida'
                : `Saldo a 1 de ${selectedFilterMonth}`,
            amount: null,
            isIncome: true
        }];

        // ── Calcular fechas de fin de mes naturales (último día real de cada mes) ──
        const monthLastDates = {};
        movements.forEach(m => {
            if (!m.date) return;
            const ym = m.date.substring(0, 7);
            const [yN, mN] = ym.split('-').map(Number);
            // Día 0 del mes siguiente = último día del mes actual
            const lastDay    = new Date(yN, mN, 0);
            const lastDayStr = lastDay.toISOString().split('T')[0];
            if (!monthLastDates[ym] || lastDayStr > monthLastDates[ym])
                monthLastDates[ym] = lastDayStr;
        });
        const separatorDatesList = Object.values(monthLastDates);

        // ── Construir tabla y datos del gráfico ───────────────────────────────
        movementsTableBody.innerHTML = '';

        // Para el saldo acumulado de toda la serie (incluye meses anteriores al filtro)
        // necesitamos un pase completo sobre todos los movimientos visibles,
        // pero para la tabla sólo mostramos los del mes filtrado.
        // currentBalance ya está inicializado al saldo correcto para el mes filtrado.

        // Acumular saldo completo (todos los meses) para calcular minBalance global
        let globalBalance = initialBalance;
        let minBalance    = initialBalance;
        movements.forEach(m => {
            if (m.hidden === true) return;
            const delta = m.type === 'income' ? m.amount : -m.amount;
            globalBalance += delta;
            if (globalBalance < minBalance) minBalance = globalBalance;
        });

        // Ahora recorremos los movimientos para la tabla y el gráfico del mes filtrado
        const movementsByDate = {};

        // Reiniciamos currentBalance al valor correcto para el filtro
        currentBalance = selectedFilterMonth === 'all' ? initialBalance : balanceAtStartOfFilteredMonth;

        movements.forEach((mov) => {
            const isVisible = mov.hidden !== true;
            const isIncome  = mov.type === 'income';

            // Siempre acumular para mantener currentBalance correcto
            if (isVisible) {
                currentBalance += isIncome ? mov.amount : -mov.amount;
            }

            const movMonth      = mov.date ? mov.date.substring(0, 7) : '';
            const matchesFilter = selectedFilterMonth === 'all' || movMonth === selectedFilterMonth;

            if (matchesFilter) {
                // ── Fila de tabla ──
                let rowHighlightClass = '';
                if (!isVisible) {
                    rowHighlightClass = 'opacity-45 bg-slate-100 line-through';
                } else if (currentBalance < 0) {
                    rowHighlightClass = 'bg-rose-100/70';
                } else if (currentBalance < graveBalance) {
                    rowHighlightClass = 'bg-rose-50/70';
                } else if (currentBalance < targetBalance) {
                    rowHighlightClass = 'bg-amber-50/70';
                }

                const tr = document.createElement('tr');
                tr.className = `transition hover:bg-slate-50 ${rowHighlightClass}`;
                tr.innerHTML = `
                    <td class="px-3 py-3 text-slate-600 text-xs font-medium">${formatDate(mov.date)}</td>
                    <td class="px-3 py-3 text-slate-800 font-semibold">${mov.concept}${!isVisible ? ' <span class="text-[10px] font-normal text-slate-400 no-underline ml-1">(Oculto)</span>' : ''}</td>
                    <td class="px-3 py-3 text-right font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}">
                        ${isIncome ? '+' : '-'}${formatCurrency(mov.amount)}
                    </td>
                    <td class="px-3 py-3 text-right font-bold ${
                        !isVisible        ? 'text-slate-400'  :
                        currentBalance < 0            ? 'text-rose-700'   :
                        currentBalance < graveBalance  ? 'text-rose-600'   :
                        currentBalance < targetBalance ? 'text-amber-600'  : 'text-slate-950'
                    }">
                        ${isVisible ? formatCurrency(currentBalance) : '---'}
                    </td>
                    <td class="px-3 py-3 text-center space-x-2 no-underline">
                        <button class="btn-toggle-visibility text-slate-400 transition hover:text-indigo-600" data-id="${mov.id}" title="${isVisible ? 'Ocultar movimiento' : 'Mostrar movimiento'}">
                            <i class="fa-solid ${isVisible ? 'fa-eye' : 'fa-eye-slash text-indigo-600'}"></i>
                        </button>
                        <button class="btn-edit text-slate-400 transition hover:text-teal-600" data-id="${mov.id}" title="Editar">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-delete text-slate-400 transition hover:text-rose-600" data-id="${mov.id}" title="Eliminar">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>`;
                movementsTableBody.appendChild(tr);

                // ── Datos para el gráfico ──
                if (isVisible) {
                    if (!movementsByDate[mov.date]) {
                        movementsByDate[mov.date] = { date: mov.date, finalBalance: currentBalance, records: [] };
                    }
                    movementsByDate[mov.date].finalBalance = currentBalance;
                    movementsByDate[mov.date].records.push({
                        concept: mov.concept, amount: mov.amount, isIncome
                    });
                }
            }
        });

        // ── Añadir puntos al dataset principal del gráfico ──
        Object.keys(movementsByDate).sort().forEach(dateKey => {
            const group   = movementsByDate[dateKey];
            const isMulti = group.records.length > 1;
            mainChartData.push({
                x: group.date,
                y: group.finalBalance,
                concept:  isMulti ? `${group.records.length} movimientos en esta fecha` : group.records[0].concept,
                amount:   isMulti ? null : group.records[0].amount,
                isIncome: isMulti ? true : group.records[0].isIncome,
                records:  group.records
            });
        });

        // ── FIX #4: Dataset de área negativa con interpolación exacta del cruce ──
        // Recorremos el array de puntos principales y cuando hay un cruce por 0
        // insertamos un punto interpolado exacto para que el área roja empiece/termine
        // exactamente en el cruce, no en el punto anterior/siguiente.
        const negativeChartData = [];

        for (let i = 0; i < mainChartData.length; i++) {
            const pt = mainChartData[i];
            const y  = pt.y;

            if (i > 0) {
                const prev   = mainChartData[i - 1];
                const prevY  = prev.y;

                // Detectar cruce de positivo a negativo: insertar punto en y=0
                if (prevY >= 0 && y < 0) {
                    const xCross = interpolateCrossing(prev.x, prevY, pt.x, y);
                    negativeChartData.push({ x: xCross, y: 0 });
                }
                // Detectar cruce de negativo a positivo: cerrar el área en y=0
                if (prevY < 0 && y >= 0) {
                    const xCross = interpolateCrossing(prev.x, prevY, pt.x, y);
                    negativeChartData.push({ x: xCross, y: 0 });
                }
            }

            // Sólo incluir el punto real si es negativo (o 0 en el límite)
            negativeChartData.push({ x: pt.x, y: y < 0 ? y : 0 });
        }

        // ── Empty state ──
        if (movements.length === 0) {
            movementsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400">
                        <i class="fa-solid fa-receipt text-3xl mb-2"></i>
                        <p class="text-xs">No hay previsiones programadas. Sube un fichero o añade cobros/pagos.</p>
                    </td>
                </tr>`;
        }

        // ── Diagnóstico de liquidez ──
        minBalanceDisplay.textContent = formatCurrency(minBalance);

        if (minBalance < 0) {
            minBalanceDisplay.className = 'text-xl font-extrabold text-rose-700 mb-2';
            healthBadge.className       = 'inline-flex items-center gap-2 rounded-lg bg-rose-200 px-3 py-1.5 text-xs font-bold text-rose-900 self-start';
            healthBadge.innerHTML       = '<i class="fa-solid fa-skull-crossbones"></i> Descuadre Crítico (< 0 €)';
        } else if (minBalance < graveBalance) {
            minBalanceDisplay.className = 'text-xl font-extrabold text-rose-600 mb-2';
            healthBadge.className       = 'inline-flex items-center gap-2 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-800 self-start';
            healthBadge.innerHTML       = '<i class="fa-solid fa-triangle-exclamation"></i> Alerta Grave';
        } else if (minBalance < targetBalance) {
            minBalanceDisplay.className = 'text-xl font-extrabold text-amber-600 mb-2';
            healthBadge.className       = 'inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 self-start';
            healthBadge.innerHTML       = '<i class="fa-solid fa-circle-exclamation"></i> Bajo Objetivo';
        } else {
            minBalanceDisplay.className = 'text-xl font-extrabold text-emerald-600 mb-2';
            healthBadge.className       = 'inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 self-start';
            healthBadge.innerHTML       = '<i class="fa-solid fa-circle-check"></i> Saludable';
        }

        // ── Actualizar gráfico ──
        if (treasuryChart) {
            treasuryChart.data.datasets[0].data = negativeChartData;
            treasuryChart.data.datasets[1].data = mainChartData;

            // Líneas de fin de mes solo en vista global
            treasuryChart.options.plugins.customChartPlugins.monthEndDates =
                selectedFilterMonth === 'all' ? separatorDatesList : [];

            // Eje Y holgado
            const yValues = mainChartData.map(d => d.y);
            if (yValues.length > 0) {
                const minY   = Math.min(...yValues);
                const maxY   = Math.max(...yValues);
                const margin = Math.max(Math.abs(maxY - minY) * 0.2, 1500);
                treasuryChart.options.scales.y.min = minY < 0
                    ? Math.floor((minY - margin) / 100) * 100
                    : 0;
                treasuryChart.options.scales.y.max = Math.ceil((maxY + margin) / 100) * 100;
            }

            treasuryChart.update();
        }

        saveToLocalStorage();

        // ── Eventos de la tabla ──
        document.querySelectorAll('.btn-toggle-visibility').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id  = parseFloat(e.currentTarget.getAttribute('data-id'));
                const mov = movements.find(m => m.id === id);
                if (mov) { mov.hidden = !mov.hidden; updateCalculations(); }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseFloat(e.currentTarget.getAttribute('data-id'));
                movements = movements.filter(m => m.id !== id);
                if (editingIdInput.value == id) resetForm();
                updateCalculations();
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id       = parseFloat(e.currentTarget.getAttribute('data-id'));
                const movToEdit = movements.find(m => m.id === id);
                if (!movToEdit) return;

                editingIdInput.value                = movToEdit.id;
                document.getElementById('movConcept').value = movToEdit.concept;
                document.getElementById('movAmount').value  = movToEdit.amount;
                document.getElementById('movDate').value    = movToEdit.date;
                movementForm.querySelector(`input[name="type"][value="${movToEdit.type}"]`).checked = true;

                formTitle.innerHTML     = '<i class="fa-solid fa-pen-to-square text-teal-600 mr-1"></i> Modificar Previsión';
                btnSubmitForm.innerHTML = '<i class="fa-solid fa-check"></i> Guardar Cambios';
                btnCancelEdit.classList.remove('hidden');
                movementForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });
    };

    filterMonthSelect.addEventListener('change', updateCalculations);

    if (btnRefreshChart) {
        btnRefreshChart.addEventListener('click', () => {
            if (refreshIcon)        refreshIcon.classList.add('rotate-180', 'text-teal-600');
            if (chartContainerCard) chartContainerCard.classList.add('ring-2', 'ring-teal-500/50', 'bg-teal-50/20');
            setTimeout(() => {
                if (refreshIcon)        refreshIcon.classList.remove('rotate-180', 'text-teal-600');
                if (chartContainerCard) chartContainerCard.classList.remove('ring-2', 'ring-teal-500/50', 'bg-teal-50/20');
            }, 500);
            updateCalculations();
        });
    }

    // ─── Helper: obtener SheetJS con comprobación robusta ───────────────────
    // El CDN de jsDelivr (xlsx@0.18.5) a veces no expone window.XLSX.
    // Usamos cdnjs como fuente recomendada. Si la lib sigue sin cargarse,
    // mostramos un aviso accionable en lugar de un ReferenceError críptico.
    const getXLSX = () => {
        const lib = window.XLSX || window.xlsx;
        if (!lib) {
            alert(
                'La librería SheetJS (XLSX) no está disponible.\n\n' +
                'Sustituye el script de SheetJS en tu HTML por esta línea:\n\n' +
                '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"><\/script>'
            );
        }
        return lib || null;
    };

    // ─── Exportar Excel ──────────────────────────────────────────────────────
    // Usamos aoa_to_sheet (array of arrays) para garantizar el orden exacto
    // de columnas en cualquier versión de SheetJS.
    btnExportExcel.addEventListener('click', () => {
        const XLSX = getXLSX();
        if (!XLSX) return;

        if (movements.length === 0) {
            alert('No hay movimientos en la previsión para exportar.');
            return;
        }

        // Las fechas se guardan como texto ISO (YYYY-MM-DD) para evitar
        // que SheetJS las convierta a número serial de Excel.
        const aoa = [
            ['CONFIGURACION', 'Saldo Inicial',  parseFloat(initialBalanceInput.value) || 0, '', ''],
            ['CONFIGURACION', 'Saldo Objetivo', parseFloat(targetBalanceInput.value)  || 0, '', ''],
            ['CONFIGURACION', 'Saldo Grave',    parseFloat(graveBalanceInput.value)   || 0, '', ''],
            ['', '', '', '', ''],
            ['FECHA', 'CONCEPTO', 'IMPORTE', 'TIPO', 'ESTADO']
        ];

        movements.forEach(m => {
            aoa.push([
                m.date,
                m.concept,
                m.amount,
                m.type === 'income' ? 'ingreso' : 'gasto',
                m.hidden ? 'oculto' : 'activo'
            ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        const workbook  = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'PrevisionTesoreria');
        XLSX.writeFile(workbook, 'Prevision_Tesoreria_Completa.xlsx');
    });

    // ─── Importar Excel / CSV ────────────────────────────────────────────────
    excelFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const XLSX = getXLSX();
        if (!XLSX) { excelFileInput.value = ''; return; }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data       = new Uint8Array(event.target.result);
                const workbook   = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
                const worksheet  = workbook.Sheets[workbook.SheetNames[0]];
                // raw:false → valores formateados como string; header:1 → array de arrays
                const jsonRows   = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

                if (!jsonRows || jsonRows.length < 2) {
                    alert('El archivo está vacío o no contiene filas de datos.');
                    return;
                }

                let newMovements   = [];
                let parsedInitial  = null;
                let parsedTarget   = null;
                let parsedGrave    = null;
                let isReadingMovs  = false;

                // Convierte cualquier formato de fecha a YYYY-MM-DD
                const toISODate = (raw) => {
                    if (!raw) return '';
                    // Si ya es un objeto Date (cellDates:true)
                    if (raw instanceof Date) {
                        const y = raw.getFullYear();
                        const m = String(raw.getMonth() + 1).padStart(2, '0');
                        const d = String(raw.getDate()).padStart(2, '0');
                        return `${y}-${m}-${d}`;
                    }
                    const s = String(raw).trim();
                    // Ya en formato ISO YYYY-MM-DD
                    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
                    // Formato DD/MM/YYYY o D/M/YYYY
                    if (s.includes('/')) {
                        const parts = s.split('/');
                        if (parts.length === 3) {
                            const [d, m, y] = parts;
                            return `${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                        }
                    }
                    // Formato DD-MM-YYYY
                    if (s.includes('-') && s.length <= 10 && !/^\d{4}/.test(s)) {
                        const parts = s.split('-');
                        if (parts.length === 3) {
                            const [d, m, y] = parts;
                            return `${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                        }
                    }
                    // Número serial de Excel (por si llega como string numérico)
                    const num = Number(s);
                    if (!isNaN(num) && num > 1000) {
                        // Epoch de Excel: 1 enero 1900 = día 1 (con el bug del año bisiesto de Lotus)
                        const excelEpoch = new Date(1899, 11, 30);
                        const d = new Date(excelEpoch.getTime() + num * 86400000);
                        const yr = d.getFullYear();
                        const mo = String(d.getMonth() + 1).padStart(2, '0');
                        const dy = String(d.getDate()).padStart(2, '0');
                        return `${yr}-${mo}-${dy}`;
                    }
                    return s;
                };

                jsonRows.forEach((row) => {
                    if (!row || row.length === 0) return;

                    const col0 = String(row[0] || '').trim();
                    const col1 = String(row[1] || '').trim();
                    const col2 = parseFloat(String(row[2] || '').replace(',', '.'));

                    // ── Filas de configuración ──
                    if (col0.toUpperCase() === 'CONFIGURACION') {
                        const lc = col1.toLowerCase();
                        if (lc.includes('inicial')  && !isNaN(col2)) parsedInitial = col2;
                        if (lc.includes('objetivo') && !isNaN(col2)) parsedTarget  = col2;
                        if (lc.includes('grave')    && !isNaN(col2)) parsedGrave   = col2;
                        return;
                    }

                    // ── Fila de cabecera de movimientos ──
                    if (col0.toUpperCase() === 'FECHA') {
                        isReadingMovs = true;
                        return;
                    }

                    if (!isReadingMovs) return;

                    // ── Fila de movimiento ──
                    const rawDate  = row[0];
                    const concept  = String(row[1] || 'Movimiento importado').trim();
                    const rawAmt   = parseFloat(String(row[2] || '').replace(',', '.'));
                    const tipoCol  = String(row[3] || '').trim().toLowerCase();
                    const isHidden = String(row[4] || '').trim().toLowerCase().includes('oculto');

                    if (!rawDate || isNaN(rawAmt)) return;

                    const dateStr = toISODate(rawDate);
                    if (!dateStr) return;

                    let type = 'expense';
                    if (tipoCol.includes('ingreso') || tipoCol.includes('cobro') || tipoCol.includes('in')) {
                        type = 'income';
                    } else if (tipoCol.includes('gasto') || tipoCol.includes('pago') || tipoCol.includes('out')) {
                        type = 'expense';
                    } else {
                        type = rawAmt >= 0 ? 'income' : 'expense';
                    }

                    newMovements.push({
                        id:     Date.now() + Math.random(),
                        type,
                        concept,
                        amount: Math.abs(rawAmt),
                        date:   dateStr,
                        hidden: isHidden
                    });
                });

                if (parsedInitial !== null) initialBalanceInput.value = parsedInitial;
                if (parsedTarget  !== null) targetBalanceInput.value  = parsedTarget;
                if (parsedGrave   !== null) graveBalanceInput.value   = parsedGrave;
                if (newMovements.length > 0) movements = newMovements;

                resetForm();
                updateCalculations();
                alert(`¡Fichero importado con éxito! (${newMovements.length} movimientos cargados).`);
                excelFileInput.value = '';

            } catch (err) {
                console.error('Error importando Excel:', err);
                alert(`Error al procesar el fichero:\n${err.message || err}\n\nRevisa la consola del navegador para más detalles.`);
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // ─── Exportar PDF — construcción programática con jsPDF ──────────────────
    // Evitamos html2canvas sobre el DOM completo (no captura bien el canvas de
    // Chart.js y arrastra el header/whitespace de la página).
    // En su lugar construimos el PDF directamente: exportamos el gráfico como
    // imagen PNG desde el canvas de Chart.js y pintamos la tabla fila a fila.
    btnExportPDF.addEventListener('click', async () => {

        // 1. Pedir nombre de empresa
        const companyName = prompt(
            '¿Con qué nombre de empresa quieres identificar el informe?\n(Deja en blanco para omitirlo)',
            ''
        );
        if (companyName === null) return; // canceló el prompt

        // 2. Acceder a jsPDF — el bundle html2pdf lo expone de distintas formas
        // según la versión. Probamos todas las posibles hasta encontrar una válida.
        const jsPDF =
            (window.jspdf && window.jspdf.jsPDF)   ||  // html2pdf bundle moderno
            (window.jsPDF)                          ||  // script jsPDF independiente
            (window.jspdf);                             // algunos bundles antiguos

        if (typeof jsPDF !== 'function') {
            alert(
                'No se pudo cargar jsPDF.\n\n' +
                'Añade este script en el <head> de tu HTML justo ANTES de html2pdf:\n' +
                '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>'
            );
            return;
        }

        // ── Configuración de página ──
        const doc        = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW      = doc.internal.pageSize.getWidth();   // 297 mm
        const pageH      = doc.internal.pageSize.getHeight();  // 210 mm
        const marginL    = 14;
        const marginR    = 14;
        const contentW  = pageW - marginL - marginR;
        let   curY       = 14;

        const initialBalance = parseFloat(initialBalanceInput.value) || 0;
        const targetBalance  = parseFloat(targetBalanceInput.value)  || 0;
        const graveBalance   = parseFloat(graveBalanceInput.value)   || 0;

        // ── Helpers ──
        const checkPageBreak = (neededH) => {
            if (curY + neededH > pageH - 10) { doc.addPage(); curY = 14; }
        };

        const tealColor  = [13,  148, 136];
        const slateLight = [241, 245, 249];
        const slate500   = [100, 116, 139];
        const slate900   = [15,  23,  42];
        const roseColor  = [225, 29,  72];
        const amberColor = [217, 119, 6];
        const emerald    = [5,   150, 105];

        // ── 3. Cabecera del informe ──────────────────────────────────────────
        // Banda de fondo
        doc.setFillColor(...tealColor);
        doc.rect(0, 0, pageW, 20, 'F');

        // Título empresa
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        const title = companyName && companyName.trim() !== ''
            ? companyName.trim()
            : 'Informe de Tesorería';
        doc.text(title, marginL, 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Previsión y Control de Tesorería', marginL, 15);

        // Fecha a la derecha
        const fechaStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.setFontSize(8);
        doc.text(`Generado el ${fechaStr}`, pageW - marginR, 12, { align: 'right' });

        curY = 28;

        // ── 4. Tarjetas de resumen (4 KPIs) ──────────────────────────────────
        // Calcular minBalance global (todos los movimientos visibles)
        let globalBal   = initialBalance;
        let minBalPDF   = initialBalance;
        movements.forEach(m => {
            if (m.hidden) return;
            globalBal += m.type === 'income' ? m.amount : -m.amount;
            if (globalBal < minBalPDF) minBalPDF = globalBal;
        });

        const kpis = [
            { label: 'Tesorería Actual',    value: formatCurrency(initialBalance), color: tealColor },
            { label: 'Saldo Mín. Objetivo', value: formatCurrency(targetBalance),  color: amberColor },
            { label: 'Saldo Mín. Grave',    value: formatCurrency(graveBalance),   color: roseColor },
            {
                label: 'Diagnóstico de Liquidez',
                value: formatCurrency(minBalPDF),
                color: minBalPDF < 0 ? roseColor : minBalPDF < graveBalance ? roseColor : minBalPDF < targetBalance ? amberColor : emerald
            }
        ];

        const kpiW = (contentW - 9) / 4;
        kpis.forEach((kpi, i) => {
            const kx = marginL + i * (kpiW + 3);
            doc.setFillColor(...slateLight);
            doc.roundedRect(kx, curY, kpiW, 18, 2, 2, 'F');
            doc.setDrawColor(220, 220, 220);
            doc.roundedRect(kx, curY, kpiW, 18, 2, 2, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(...slate500);
            doc.text(kpi.label.toUpperCase(), kx + 3, curY + 5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...kpi.color);
            doc.text(kpi.value, kx + 3, curY + 13);
        });

        curY += 24;

        // ── 5. Gráfico desde canvas ───────────────────────────────────────────
        // Chart.js expone el canvas; lo convertimos a PNG y lo incrustamos.
        const chartCanvas = document.getElementById('treasuryChart');
        if (chartCanvas && treasuryChart) {
            try {
                // Forzar redibujado para asegurar que el canvas esté actualizado
                treasuryChart.update('none');
                const chartImgData = chartCanvas.toDataURL('image/png', 1.0);

                const chartH = 65; // mm
                checkPageBreak(chartH + 12);

                // Título de sección
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(...slate900);
                doc.text('Proyección Temporal de Liquidez', marginL, curY);
                curY += 5;

                // Marco del gráfico
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(220, 220, 220);
                doc.roundedRect(marginL, curY, contentW, chartH, 2, 2, 'FD');

                // Imagen del gráfico (con padding interior de 3mm)
                doc.addImage(chartImgData, 'PNG', marginL + 3, curY + 3, contentW - 6, chartH - 6);
                curY += chartH + 8;
            } catch (e) {
                console.warn('No se pudo incrustar el gráfico:', e);
                curY += 4;
            }
        }

        // ── 6. Tabla de movimientos ───────────────────────────────────────────
        checkPageBreak(16);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...slate900);
        doc.text('Cronograma de Tesorería', marginL, curY);
        curY += 5;

        // Encabezado de tabla
        const colWidths = [28, contentW - 28 - 28 - 40 - 2, 28, 40]; // Fecha, Concepto, Importe, Saldo Acum.
        const colX      = [
            marginL,
            marginL + colWidths[0] + 1,
            marginL + colWidths[0] + 1 + colWidths[1] + 1,
            marginL + colWidths[0] + 1 + colWidths[1] + 1 + colWidths[2] + 1
        ];
        const rowH = 6.5;

        const drawTableHeader = () => {
            doc.setFillColor(...slate900);
            doc.rect(marginL, curY, contentW, rowH, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.text('FECHA',             colX[0] + 2,  curY + 4.5);
            doc.text('CONCEPTO',          colX[1] + 2,  curY + 4.5);
            doc.text('IMPORTE',           colX[2] + colWidths[2], curY + 4.5, { align: 'right' });
            doc.text('SALDO ACUMULADO',   colX[3] + colWidths[3], curY + 4.5, { align: 'right' });
            curY += rowH;
        };

        drawTableHeader();

        // Recalcular saldos para la tabla del PDF (siempre todos los movimientos)
        let runBal     = initialBalance;
        let rowIndex   = 0;

        const visibleMovements = movements.filter(m => !m.hidden);

        if (visibleMovements.length === 0) {
            checkPageBreak(10);
            doc.setFontSize(8);
            doc.setTextColor(...slate500);
            doc.text('No hay movimientos visibles en la previsión.', marginL + 2, curY + 5);
            curY += 10;
        }

        visibleMovements.forEach((mov) => {
            checkPageBreak(rowH + 2);

            // Si se inició página nueva, redibujar encabezado
            if (curY === 14) drawTableHeader();

            const isIncome = mov.type === 'income';
            runBal += isIncome ? mov.amount : -mov.amount;

            // Color de fondo de fila
            const isEven = rowIndex % 2 === 0;
            if (isEven) {
                doc.setFillColor(248, 250, 252);
                doc.rect(marginL, curY, contentW, rowH, 'F');
            }

            // Borde inferior sutil
            doc.setDrawColor(226, 232, 240);
            doc.line(marginL, curY + rowH, marginL + contentW, curY + rowH);

            // Color del saldo según estado
            let balColor = slate900;
            if      (runBal < 0)            balColor = roseColor;
            else if (runBal < graveBalance)  balColor = roseColor;
            else if (runBal < targetBalance) balColor = amberColor;

            // Contenido de la fila
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...slate500);
            doc.text(formatDate(mov.date), colX[0] + 2, curY + 4.5);

            doc.setTextColor(...slate900);
            // Truncar concepto si es muy largo
            const maxConceptW = colWidths[1] - 4;
            const conceptFull = mov.concept;
            let conceptTxt = conceptFull;
            while (doc.getTextWidth(conceptTxt) > maxConceptW && conceptTxt.length > 3) {
                conceptTxt = conceptTxt.slice(0, -1);
            }
            if (conceptTxt !== conceptFull) conceptTxt += '…';
            doc.text(conceptTxt, colX[1] + 2, curY + 4.5);

            // Importe con color
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...(isIncome ? emerald : roseColor));
            const importeStr = `${isIncome ? '+' : '-'}${formatCurrency(mov.amount)}`;
            doc.text(importeStr, colX[2] + colWidths[2], curY + 4.5, { align: 'right' });

            // Saldo acumulado
            doc.setTextColor(...balColor);
            doc.text(formatCurrency(runBal), colX[3] + colWidths[3], curY + 4.5, { align: 'right' });

            curY      += rowH;
            rowIndex  += 1;
        });

        // ── 7. Pie de página en cada hoja ─────────────────────────────────────
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...slate500);
            doc.text(
                `Página ${p} de ${totalPages}  ·  Generado el ${fechaStr}`,
                pageW / 2,
                pageH - 6,
                { align: 'center' }
            );
        }

        // ── 8. Guardar ────────────────────────────────────────────────────────
        const filename = companyName && companyName.trim() !== ''
            ? `Prevision_Tesoreria_${companyName.trim().replace(/\s+/g, '_')}.pdf`
            : 'Prevision_Tesoreria.pdf';
        doc.save(filename);
    });

    // ─── Eventos de inputs de configuración ─────────────────────────────────
    initialBalanceInput.addEventListener('input', updateCalculations);
    targetBalanceInput.addEventListener('input',  updateCalculations);
    graveBalanceInput.addEventListener('input',   updateCalculations);

    // ─── Formulario de movimiento ────────────────────────────────────────────
    movementForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const editingId = editingIdInput.value;
        const type    = movementForm.querySelector('input[name="type"]:checked').value;
        const concept = document.getElementById('movConcept').value.trim();
        const amount  = parseFloat(document.getElementById('movAmount').value);
        const date    = document.getElementById('movDate').value;

        if (!concept || isNaN(amount) || !date) return;

        if (editingId) {
            const index = movements.findIndex(m => m.id == editingId);
            if (index !== -1) movements[index] = { ...movements[index], type, concept, amount, date };
        } else {
            movements.push({ id: Date.now(), type, concept, amount, date, hidden: false });
        }

        resetForm();
        updateCalculations();
    });

    // ─── Datos de demo ───────────────────────────────────────────────────────
    btnDemoData.addEventListener('click', () => {
        const today = new Date();
        const fmt   = (days) => {
            const d = new Date(today);
            d.setDate(d.getDate() + days);
            return d.toISOString().split('T')[0];
        };

        initialBalanceInput.value = 10000;
        targetBalanceInput.value  = 4000;
        graveBalanceInput.value   = 1500;

        movements = [
            { id: 1, type: 'expense', concept: 'Alquiler y Suministros',       amount: 1800,  date: fmt(3),  hidden: false },
            { id: 2, type: 'income',  concept: 'Cobro Cliente Principal',       amount: 3500,  date: fmt(7),  hidden: false },
            { id: 3, type: 'expense', concept: 'Pago Impuestos Trimestrales',   amount: 12500, date: fmt(12), hidden: false },
            { id: 4, type: 'expense', concept: 'Nóminas',                       amount: 3200,  date: fmt(15), hidden: false },
            { id: 5, type: 'income',  concept: 'Remesa de Ventas',              amount: 6500,  date: fmt(20), hidden: false }
        ];

        resetForm();
        updateCalculations();
    });

    // ─── Reset total ─────────────────────────────────────────────────────────
    btnReset.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas limpiar todos los datos y la configuración?')) {
            movements = [];
            initialBalanceInput.value = 12500;
            targetBalanceInput.value  = 5000;
            graveBalanceInput.value   = 1000;
            localStorage.clear();
            resetForm();
            updateCalculations();
        }
    });

    // ─── Arranque ────────────────────────────────────────────────────────────
    loadFromLocalStorage();
    initChart();
    updateCalculations();
});