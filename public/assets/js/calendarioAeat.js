(function () {
    'use strict';

    var state = { events: [], view: 'calendar', showPaid: false, filterDates: false, expandedMonths: {}, layoutKey: '' };
    var $ = function (selector) { return document.querySelector(selector); };
    var escapeHtml = function (value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
    var numericValue = function (value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        var text = String(value == null ? '' : value).replace(/€/g, '').replace(/\s/g, '');
        if (text.includes(',') && text.includes('.')) text = text.replace(/\./g, '').replace(',', '.');
        else text = text.replace(',', '.');
        var parsed = parseFloat(text);
        return Number.isFinite(parsed) ? parsed : 0;
    };
    var amount = function (value) { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(numericValue(value)); };
    var dateText = function (value) { if (!value) return 'Sin fecha'; var date = new Date(value + 'T00:00:00'); return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
    var today = function () { var date = new Date(); date.setHours(0, 0, 0, 0); return date; };

    function classify(event) {
        var total = numericValue(event.total_a_pagar);
        var pending = numericValue(event.pendiente);
        if (event.check_pagado === true || pending < 0.01) return 'paid';
        if (pending < total - 0.01) return 'partial';
        if (event.fecha_vto && new Date(event.fecha_vto + 'T00:00:00') < today()) return 'past';
        return 'future';
    }

    function filteredEvents() {
        var from = $('#date-from').value ? new Date($('#date-from').value + 'T00:00:00') : null;
        var to = $('#date-to').value ? new Date($('#date-to').value + 'T23:59:59') : null;
        return state.events.filter(function (event) {
            if (!state.showPaid && classify(event) === 'paid') return false;
            if (state.filterDates && event.fecha_vto) {
                var date = new Date(event.fecha_vto + 'T00:00:00');
                if (from && date < from) return false;
                if (to && date > to) return false;
            }
            return true;
        }).sort(function (a, b) { return String(a.fecha_vto || '').localeCompare(String(b.fecha_vto || '')); });
    }

    function statusLabel(event) { return ({ paid: 'Pagado', partial: 'Parcial', past: 'Vencido', future: 'Pendiente' })[classify(event)]; }
    function statusClasses(event) { return ({ paid: 'border-emerald-500 bg-emerald-50 text-emerald-800', partial: 'border-purple-500 bg-purple-50 text-purple-800', past: 'border-orange-500 bg-orange-50 text-orange-800', future: 'border-sky-500 bg-sky-50 text-sky-800' })[classify(event)]; }
    function monthStatus(events) {
        var statuses = events.map(classify);
        if (statuses.every(function (status) { return status === 'paid'; })) return 'is-paid';
        if (statuses.indexOf('past') !== -1) return 'is-past';
        if (statuses.indexOf('partial') !== -1) return 'is-partial';
        return 'is-future';
    }

    function renderSummary() {
        var groups = {};
        filteredEvents().forEach(function (event) { var key = statusLabel(event); if (!groups[key]) groups[key] = { count: 0, total: 0 }; groups[key].count += 1; groups[key].total += numericValue(event.total_a_pagar); });
        $('#summary-grid').innerHTML = Object.keys(groups).map(function (key) { return '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">' + escapeHtml(key) + '</p><p class="mt-1 text-xs text-slate-600">' + groups[key].count + ' registro' + (groups[key].count === 1 ? '' : 's') + '</p><p class="mt-1 text-lg font-extrabold text-navy-900">' + amount(groups[key].total) + '</p></div>'; }).join('') || '<p class="text-sm text-slate-500">No hay registros visibles.</p>';
    }

    function eventMarkup(event) {
        var type = classify(event);
        var total = numericValue(event.total_a_pagar);
        var pending = numericValue(event.pendiente);
        return '<button type="button" data-event-id="' + escapeHtml(event.id_registro) + '" class="w-full rounded-lg border-l-4 p-3 text-left text-xs transition hover:shadow-md ' + statusClasses(event) + '"><div class="flex items-start justify-between gap-3"><span class="font-bold">' + escapeHtml(event.resumen_concepto || event.modelo || 'Obligación AEAT') + '</span><span class="shrink-0 font-extrabold">' + amount(type === 'paid' ? total : pending || total) + '</span></div><p class="mt-1 text-[11px] opacity-80">' + escapeHtml(dateText(event.fecha_vto)) + ' · ' + escapeHtml(statusLabel(event)) + '</p></button>';
    }

    function calendarEventMarkup(event) {
        var type = classify(event);
        var total = numericValue(event.total_a_pagar);
        var pending = numericValue(event.pendiente);
        var value = type === 'paid' ? total : pending || total;
        var classes = ({
            paid: 'bg-emerald-600 hover:bg-emerald-700',
            partial: 'bg-purple-600 hover:bg-purple-700',
            past: 'bg-orange-600 hover:bg-orange-700',
            future: 'bg-sky-600 hover:bg-sky-700'
        })[type];
        return '<button type="button" data-event-id="' + escapeHtml(event.id_registro) + '" title="' + escapeHtml(event.resumen_concepto || event.modelo || 'Obligación AEAT') + ' · ' + amount(value) + '" class="block w-full min-w-0 overflow-hidden rounded-lg px-2 py-1.5 text-left text-[11px] font-bold leading-tight text-white shadow-sm transition hover:-translate-y-0.5 ' + classes + '"><span class="block truncate">' + escapeHtml(event.resumen_concepto || event.modelo || 'Obligación') + '</span><span class="mt-0.5 block truncate text-xs opacity-100">' + amount(value) + '</span></button>';
    }

    function renderList() {
        var events = filteredEvents();
        var groups = {};
        events.forEach(function (event) { var key = event.fecha_vto ? event.fecha_vto.slice(0, 7) : 'sin-fecha'; (groups[key] = groups[key] || []).push(event); });
        $('#list-view').innerHTML = Object.keys(groups).sort().map(function (key) {
            var group = groups[key];
            var label = key === 'sin-fecha' ? 'Sin fecha' : new Date(key + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            var total = group.reduce(function (sum, event) { return sum + numericValue(event.total_a_pagar); }, 0);
            return '<article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div class="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3"><h2 class="text-base font-extrabold capitalize text-navy-900">' + escapeHtml(label) + '</h2><span class="month-total-badge ' + monthStatus(group) + '">' + amount(total) + '</span></div><div class="space-y-2">' + group.map(eventMarkup).join('') + '</div></article>';
        }).join('') || '<div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 lg:col-span-3">No hay registros visibles con los filtros actuales.</div>';
    }

    function renderCalendar() {
        var events = filteredEvents();
        var months = {};
        events.forEach(function (event) { var key = event.fecha_vto ? event.fecha_vto.slice(0, 7) : 'sin-fecha'; (months[key] = months[key] || []).push(event); });
        $('#calendar-view').style.gridTemplateColumns = 'repeat(' + $('#columns').value + ', minmax(0, 1fr))';
        $('#list-view').style.gridTemplateColumns = 'repeat(' + $('#columns').value + ', minmax(0, 1fr))';
        var monthKeys = Object.keys(months).sort();
        $('#calendar-view').innerHTML = monthKeys.map(function (key) {
            var eventsMonth = months[key];
            if (key === 'sin-fecha') {
                return '<article class="self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 class="mb-3 font-bold text-navy-900">Sin fecha</h2><div class="space-y-2">' + eventsMonth.map(eventMarkup).join('') + '</div></article>';
            }

            var parts = key.split('-');
            var year = Number(parts[0]);
            var month = Number(parts[1]) - 1;
            var firstDay = new Date(year, month, 1);
            var lastDay = new Date(year, month + 1, 0);
            var offset = (firstDay.getDay() + 6) % 7;
            var label = firstDay.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            var monthTotal = eventsMonth.reduce(function (sum, event) { return sum + numericValue(event.total_a_pagar); }, 0);
            var headers = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(function (day) { return '<div class="day-header">' + day + '</div>'; }).join('');
            var cells = [];
            for (var blank = 0; blank < offset; blank += 1) cells.push('<div class="day-cell other-month"></div>');
            for (var day = 1; day <= lastDay.getDate(); day += 1) {
                var dayKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                var dayEvents = eventsMonth.filter(function (event) { return event.fecha_vto === dayKey; });
                var cell = '<div class="day-cell' + (dayEvents.length ? ' has-event' : '') + '"><div class="day-number">' + day + '</div><div class="events-container">' + dayEvents.map(function (event) { return '<button type="button" data-event-id="' + escapeHtml(event.id_registro) + '" title="' + escapeHtml(event.resumen_concepto || event.modelo || 'Obligación AEAT') + ' · ' + amount(event.total_a_pagar) + '" class="event-badge is-' + classify(event) + '">' + amount(event.total_a_pagar) + '</button>'; }).join('') + '</div></div>';
                cells.push(cell);
            }
            return '<article class="self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><div class="month-title"><span>' + escapeHtml(label) + '</span><span class="month-total-badge ' + monthStatus(eventsMonth) + '">' + amount(monthTotal) + '</span></div><div class="calendar-grid">' + headers + cells.join('') + '</div></article>';
        }).join('') || '<div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 lg:col-span-3">No hay registros visibles con los filtros actuales.</div>';
    }

    function render() { renderSummary(); renderList(); renderCalendar(); }
    function setView(view) { state.view = view; $('#calendar-view').style.display = view === 'calendar' ? 'grid' : 'none'; $('#list-view').style.display = view === 'list' ? 'grid' : 'none'; $('#calendar-view-button').className = view === 'calendar' ? 'rounded-md bg-white px-3 py-2 text-xs font-bold text-teal-700 shadow-sm' : 'rounded-md px-3 py-2 text-xs font-bold text-slate-500'; $('#list-view-button').className = view === 'list' ? 'rounded-md bg-white px-3 py-2 text-xs font-bold text-teal-700 shadow-sm' : 'rounded-md px-3 py-2 text-xs font-bold text-slate-500'; }
    function openModal(event) { $('#modal-title').textContent = event.resumen_concepto || event.modelo || 'Detalle del vencimiento'; $('#modal-content').innerHTML = [['Modelo', event.modelo], ['Ejercicio', event.ejercicio], ['Periodo', event.periodo], ['Vencimiento', dateText(event.fecha_vto)], ['Total a pagar', amount(event.total_a_pagar)], ['Pagado', amount(event.pagado)], ['Pendiente', amount(event.pendiente)], ['Estado', event.estado], ['Observaciones', event.observaciones]].filter(function (item) { return item[1] !== null && item[1] !== undefined && item[1] !== ''; }).map(function (item) { return '<div class="border-b border-slate-100 pb-2"><p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">' + escapeHtml(item[0]) + '</p><p class="mt-1 text-sm text-slate-700">' + escapeHtml(item[1]) + '</p></div>'; }).join(''); $('#event-modal').classList.remove('hidden'); $('#event-modal').classList.add('flex'); }

    async function load() { try { var response = await fetch('/api/pro/aeat-calendar', { credentials: 'same-origin' }); var payload = await response.json().catch(function () { return {}; }); if (response.status === 401) { window.location.replace('Area-cliente-login.html'); return; } if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el calendario.'); state.events = payload.events || []; $('#client-caption').textContent = 'Información privada preparada para ' + (payload.client || 'tu cuenta') + '.'; $('#loading-panel').classList.add('hidden'); $('#calendar-app').classList.remove('hidden'); $('#print-button').classList.remove('hidden'); render(); setView('calendar'); } catch (error) { $('#loading-panel').classList.add('hidden'); $('#error-panel').textContent = error.message; $('#error-panel').classList.remove('hidden'); } }

    $('#calendar-view-button').addEventListener('click', function () { setView('calendar'); });
    $('#list-view-button').addEventListener('click', function () { setView('list'); });
    $('#show-paid').addEventListener('change', function () { state.showPaid = this.checked; render(); });
    $('#filter-dates').addEventListener('change', function () { state.filterDates = this.checked; $('#date-filters').classList.toggle('hidden', !this.checked); render(); });
    $('#date-from').addEventListener('change', render); $('#date-to').addEventListener('change', render); $('#columns').addEventListener('change', render);
    var resizeTimer;
    window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(renderCalendar, 150);
    });
    $('#summary-button').addEventListener('click', function () { $('#summary-panel').classList.toggle('hidden'); });
    $('#logout-button').addEventListener('click', async function () { await fetch('/api/cliente/logout', { method: 'POST', credentials: 'same-origin' }); window.location.replace('Area-cliente-login.html'); });
    $('#modal-close').addEventListener('click', function () { $('#event-modal').classList.add('hidden'); $('#event-modal').classList.remove('flex'); });
    document.addEventListener('click', function (event) {
        var monthToggle = event.target.closest('[data-month-toggle]');
        if (monthToggle) {
            var monthKey = monthToggle.dataset.monthToggle;
            state.expandedMonths[monthKey] = state.expandedMonths[monthKey] !== true;
            renderCalendar();
            return;
        }
        var button = event.target.closest('[data-event-id]');
        if (!button) return;
        var item = state.events.find(function (entry) { return String(entry.id_registro) === button.dataset.eventId; });
        if (item) openModal(item);
    });
    $('#print-button').addEventListener('click', function () { window.print(); });
    load();
})();
