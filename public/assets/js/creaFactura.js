(function () {
    'use strict';

    var MAX_LINES = 10;
    var MAX_LINE_WORDS = 15;
    var MAX_LINE_CHARACTERS = 150;
    var MAX_DESCRIPTION_WORDS = 120;
    var MAX_OBSERVATION_WORDS = 50;
    var isBudget = document.body.dataset.documentType === 'presupuesto';
    var documentLabel = isBudget ? 'presupuesto' : 'factura';
    var form = document.getElementById('invoice-form');
    if (!form) return;

    var lineItems = document.getElementById('line-items');
    var lineCount = document.getElementById('line-count');
    var lineSection = document.getElementById('line-items-section');
    var descriptionSection = document.getElementById('long-description-section');
    var baseTotal = document.getElementById('base-total');
    var vatRate = document.getElementById('vat-rate');
    var withholdingWrap = document.getElementById('withholding-rate-wrap');
    var paidAmountWrap = document.getElementById('paid-amount-wrap');
    var descriptionField = document.getElementById('long-description');
    var observationsField = document.getElementById('observations');
    var fileStatus = document.getElementById('file-status');
    var uploadFile = document.getElementById('upload-file');
    var printButton = document.getElementById('print-invoice');
    var printDisclaimer = document.getElementById('print-disclaimer');
    var printLegal = document.getElementById('print-legal');
    var printHelp = document.getElementById('print-help');
    var paymentMethod = document.getElementById('payment-method');
    var paymentDetailWrap = document.getElementById('payment-detail-wrap');
    var paymentDetailLabel = document.getElementById('payment-detail-label');
    var paymentDetail = document.getElementById('payment-detail');
    var hideVat = document.getElementById('hide-vat');
    var paymentNotesToggle = document.getElementById('payment-notes-toggle');
    var paymentNotesWrap = document.getElementById('payment-notes-wrap');
    var paymentNotes = document.getElementById('payment-notes');
    var copyPaymentSuggestion = document.getElementById('copy-payment-suggestion');
    var paymentSuggestionStatus = document.getElementById('payment-suggestion-status');
    var lastLineId = 0;
    var rowItemsBeingDragged = null;

    var FIELD_DEFINITIONS = [
        { key: 'company_name', label: 'Empresa' },
        { key: 'company_nif', label: 'NIF de la empresa' },
        { key: 'company_address', label: 'Dirección de la empresa' },
        { key: 'company_postal', label: 'Código postal de la empresa' },
        { key: 'company_town', label: 'Población de la empresa' },
        { key: 'company_province', label: 'Provincia de la empresa' },
        { key: 'company_phone', label: 'Teléfono de la empresa' },
        { key: 'company_mail', label: 'Mail de la empresa' },
        { key: 'payment_method', label: 'Forma de pago' },
        { key: 'vat_rate', label: 'Tipo de IVA' },
        { key: 'hide_vat', label: 'Ocultar IVA' },
        { key: 'withholding_enabled', label: 'Lleva retención' },
        { key: 'withholding_rate', label: 'Tipo de retención' },
        { key: 'invoice_type', label: 'Tipo de factura' },
        { key: 'observations', label: 'Observaciones' },
        { key: 'payment_detail', label: 'IBAN / dato de pago' },
        { key: 'payment_notes', label: 'Detalles de pago' },
        { key: 'invoice_number', label: isBudget ? 'Número de presupuesto' : 'Número de factura' },
        { key: 'invoice_date', label: isBudget ? 'Fecha de presupuesto' : 'Fecha de factura' },
        { key: 'client_name', label: 'Cliente' },
        { key: 'client_nif', label: 'NIF del cliente' },
        { key: 'client_address', label: 'Dirección del cliente' },
        { key: 'client_postal', label: 'Código postal del cliente' },
        { key: 'client_town', label: 'Población del cliente' },
        { key: 'client_province', label: 'Provincia del cliente' },
        { key: 'client_phone', label: 'Teléfono del cliente' },
        { key: 'client_mail', label: 'Mail del cliente' },
        { key: 'paid', label: 'Factura abonada' },
        { key: 'paid_amount', label: 'Cantidad ya abonada' },
        { key: 'base_total', label: 'Base imponible' }
    ];
    var CLIENT_FIELD_KEYS = ['client_name', 'client_nif', 'client_address', 'client_postal', 'client_town', 'client_province', 'client_phone', 'client_mail'];
    var BUDGET_EXCLUDED_KEYS = ['withholding_enabled', 'withholding_rate', 'paid', 'paid_amount'];
    var CLIENT_FIELD_DEFINITIONS = FIELD_DEFINITIONS.filter(function (field) { return CLIENT_FIELD_KEYS.indexOf(field.key) !== -1; });
    var COMPANY_FIELD_DEFINITIONS = FIELD_DEFINITIONS.filter(function (field) { return CLIENT_FIELD_KEYS.indexOf(field.key) === -1; });

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function parseNumber(value) {
        var normalized = String(value == null ? '' : value).replace(',', '.');
        var number = parseFloat(normalized);
        return isFinite(number) && number >= 0 ? number : 0;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value || 0);
    }

    function getFieldValue(id) {
        var field = document.getElementById(id);
        return field ? String(field.value || '').trim() : '';
    }

    function getSelectedValue(name) {
        var field = form.querySelector('input[name="' + name + '"]:checked');
        return field ? field.value : '';
    }

    function setSelectedValue(name, value) {
        form.querySelectorAll('input[name="' + name + '"]').forEach(function (field) {
            field.checked = field.value === String(value);
        });
    }

    function formatDate(value) {
        if (!value) return '-';
        var parts = String(value).split('-');
        return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : value;
    }

    function countWords(value) {
        var clean = String(value || '').trim();
        return clean ? clean.split(/\s+/).length : 0;
    }

    function limitWords(field, max, counter) {
        var value = String(field.value || '');
        var words = value.trim().split(/\s+/).filter(Boolean);
        if (words.length > max) {
            field.value = words.slice(0, max).join(' ');
            words = words.slice(0, max);
        }
        counter.textContent = words.length + '/' + max + ' palabras';
        counter.classList.toggle('text-rose-600', words.length >= max);
        counter.classList.toggle('text-teal-700', words.length < max);
    }

    function limitLineWords(field) {
        var value = String(field.value || '');
        var words = value.trim().split(/\s+/).filter(Boolean);
        var exceeded = value.length > MAX_LINE_CHARACTERS || words.length > MAX_LINE_WORDS;
        var row = field.closest('[data-line-row]');
        var error = row && row.querySelector('[data-line-error]');
        if (error) error.classList.toggle('hidden', !exceeded);
        if (!exceeded) return;
        var accepted = [];
        words.slice(0, MAX_LINE_WORDS).some(function (word) {
            var candidate = accepted.length ? accepted.join(' ') + ' ' + word : word;
            if (candidate.length > MAX_LINE_CHARACTERS) return true;
            accepted.push(word);
            return false;
        });
        if (!accepted.length && words.length) accepted.push(words[0].slice(0, MAX_LINE_CHARACTERS));
        field.value = accepted.join(' ');
    }

    function lineInputs(row) {
        return {
            description: row.querySelector('[data-line-field="description"]'),
            units: row.querySelector('[data-line-field="units"]'),
            price: row.querySelector('[data-line-field="price"]'),
            note: row.querySelector('[data-line-field="note"]')
        };
    }

    function updateLineRowState(row) {
        var inputs = lineInputs(row);
        var note = inputs.note.checked;
        inputs.units.disabled = note;
        inputs.price.disabled = note;
        if (note) {
            inputs.units.value = '';
            inputs.price.value = '';
        }
        row.classList.toggle('bg-slate-50', note);
        row.querySelector('[data-line-amount]').textContent = note ? 'Nota' : formatCurrency(parseNumber(inputs.units.value) * parseNumber(inputs.price.value));
    }

    function setUpDrag(row) {
        var handle = row.querySelector('[data-drag-handle]');
        handle.draggable = true;
        handle.addEventListener('dragstart', function (event) {
            row.classList.add('opacity-50');
            rowItemsBeingDragged = row;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', row.dataset.lineRow);
        });
        row.addEventListener('dragend', function () {
            row.classList.remove('opacity-50');
            rowItemsBeingDragged = null;
            lineItems.querySelectorAll('[data-line-row]').forEach(function (item) { item.classList.remove('border-teal-400'); });
        });
        row.addEventListener('dragover', function (event) {
            if (!rowItemsBeingDragged || rowItemsBeingDragged === row) return;
            event.preventDefault();
            row.classList.add('border-teal-400');
        });
        row.addEventListener('dragleave', function () { row.classList.remove('border-teal-400'); });
        row.addEventListener('drop', function (event) {
            event.preventDefault();
            row.classList.remove('border-teal-400');
            if (!rowItemsBeingDragged || rowItemsBeingDragged === row) return;
            var after = event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
            lineItems.insertBefore(rowItemsBeingDragged, after ? row.nextSibling : row);
            updateCalculations();
        });
    }

    function addLine(values) {
        if (lineItems.querySelectorAll('[data-line-row]').length >= MAX_LINES) return;
        lastLineId += 1;
        values = values || {};
        var row = document.createElement('tr');
        row.dataset.lineRow = String(lastLineId);
        row.className = 'border-t border-slate-100';
        row.innerHTML = '<td class="p-2"><div class="flex items-center gap-2"><span data-drag-handle draggable="true" title="Arrastra para reordenar" class="cursor-grab select-none text-slate-400 active:cursor-grabbing"><i class="fa-solid fa-grip-vertical"></i></span><input type="text" data-line-field="description" title="Máximo 15 palabras o 150 caracteres" class="field-input" placeholder="Concepto"></div><p data-line-error class="mt-1 hidden text-[10px] font-semibold text-rose-600">Máximo de caracteres permitidos, usa otra línea.</p><label class="mt-2 inline-flex items-center gap-2 text-[11px] text-slate-500"><input type="checkbox" data-line-field="note" class="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"><span>Marcar como nota</span></label></td>' +
            '<td class="p-2"><input type="number" data-line-field="units" min="0" step="0.01" class="field-input" placeholder="1"></td>' +
            '<td class="p-2"><input type="number" data-line-field="price" min="0" step="0.01" class="field-input" placeholder="0,00"></td>' +
            '<td data-line-amount class="p-2 text-right font-mono text-xs font-semibold text-slate-700">0,00 €</td>' +
            '<td class="p-2 text-right"><button type="button" data-remove-line class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Eliminar línea"><i class="fa-solid fa-trash-can"></i></button></td>';
        lineItems.appendChild(row);
        var inputs = lineInputs(row);
        inputs.description.value = values.description || '';
        inputs.units.value = values.units == null ? '' : values.units;
        inputs.price.value = values.price == null ? '' : values.price;
        inputs.note.checked = values.note === true || String(values.note || '').toLowerCase() === 'nota';
        setUpDrag(row);
        updateLineRowState(row);
        updateLineMeta();
    }

    function updateLineMeta() {
        var rows = lineItems.querySelectorAll('[data-line-row]');
        lineCount.textContent = rows.length + '/' + MAX_LINES + ' líneas';
        var addButton = document.getElementById('add-line');
        if (addButton) addButton.disabled = rows.length >= MAX_LINES;
        if (addButton) addButton.classList.toggle('opacity-50', rows.length >= MAX_LINES);
        rows.forEach(function (row) {
            limitLineWords(lineInputs(row).description);
            updateLineRowState(row);
        });
    }

    function collectLines() {
        return Array.prototype.slice.call(lineItems.querySelectorAll('[data-line-row]')).map(function (row) {
            var inputs = lineInputs(row);
            var units = parseNumber(inputs.units.value);
            var price = parseNumber(inputs.price.value);
            return {
                description: inputs.description.value.trim(),
                note: inputs.note.checked,
                units: units,
                price: price,
                amount: units * price
            };
        }).filter(function (line) {
            return line.description || line.units || line.price;
        });
    }

    function currentState() {
        var type = getSelectedValue('invoice_type') || 'lineas';
        var retentionEnabled = getSelectedValue('withholding_enabled') === 'si';
        var paid = getSelectedValue('paid') === 'si';
        return {
            company_name: getFieldValue('company-name'),
            company_nif: getFieldValue('company-nif'),
            company_address: getFieldValue('company-address'),
            company_postal: getFieldValue('company-postal'),
            company_town: getFieldValue('company-town'),
            company_province: getFieldValue('company-province'),
            company_phone: getFieldValue('company-phone'),
            company_mail: getFieldValue('company-mail'),
            invoice_number: getFieldValue('invoice-number'),
            invoice_date: getFieldValue('invoice-date'),
            client_name: getFieldValue('client-name'),
            client_nif: getFieldValue('client-nif'),
            client_address: getFieldValue('client-address'),
            client_postal: getFieldValue('client-postal'),
            client_town: getFieldValue('client-town'),
            client_province: getFieldValue('client-province'),
            client_phone: getFieldValue('client-phone'),
            client_mail: getFieldValue('client-mail'),
            invoice_type: type,
            long_description: descriptionField.value.trim(),
            lines: collectLines(),
            base_total: parseNumber(baseTotal.value),
            vat_rate: parseNumber(vatRate.value),
            withholding_enabled: retentionEnabled ? 'si' : 'no',
            withholding_rate: parseNumber(getFieldValue('withholding-rate')),
            paid: paid ? 'si' : 'no',
            paid_amount: parseNumber(getFieldValue('paid-amount')),
            payment_method: getFieldValue('payment-method'),
            payment_detail: getFieldValue('payment-detail'),
            hide_vat: Boolean(hideVat && hideVat.checked),
            payment_notes: paymentNotes && paymentNotesToggle && paymentNotesToggle.checked ? paymentNotes.value.trim() : '',
            observations: observationsField.value.trim()
        };
    }

    function updateCalculations() {
        var type = getSelectedValue('invoice_type') || 'lineas';
        var lines = collectLines();
        var base = type === 'lineas' ? lines.reduce(function (total, line) { return total + line.amount; }, 0) : parseNumber(baseTotal.value);
        baseTotal.readOnly = type === 'lineas';
        baseTotal.value = base.toFixed(2);
        lineSection.classList.toggle('hidden', type !== 'lineas');
        descriptionSection.classList.toggle('hidden', type !== 'descripcion');

        var retentionEnabled = getSelectedValue('withholding_enabled') === 'si';
        var paid = getSelectedValue('paid') === 'si';
        if (withholdingWrap) withholdingWrap.classList.toggle('hidden', !retentionEnabled);
        if (paidAmountWrap) paidAmountWrap.classList.toggle('hidden', !paid);

        var hideVatValue = Boolean(hideVat && hideVat.checked);
        var iva = hideVatValue ? 0 : base * parseNumber(vatRate.value) / 100;
        var retention = retentionEnabled ? base * parseNumber(getFieldValue('withholding-rate')) / 100 : 0;
        var total = base + iva - retention;
        var paidAmount = paid ? parseNumber(getFieldValue('paid-amount')) : 0;
        var due = Math.max(0, total - paidAmount);
        renderPreview({
            type: type,
            base: base,
            iva: iva,
            retention: retention,
            retentionEnabled: retentionEnabled,
            hideVat: hideVatValue,
            total: total,
            paid: paid,
            paidAmount: paidAmount,
            due: due,
            lines: lines
        });
    }

    function renderPreview(calculation) {
        var state = currentState();
        document.getElementById('preview-company').innerHTML = [
            state.company_name ? '<p class="font-bold text-slate-900">' + escapeHtml(state.company_name) + '</p>' : '',
            state.company_nif ? '<p>NIF: ' + escapeHtml(state.company_nif) + '</p>' : '',
            state.company_address || state.company_postal || state.company_town || state.company_province ? '<p>' + escapeHtml([state.company_address, state.company_postal, state.company_town, state.company_province].filter(Boolean).join(' · ')) + '</p>' : '',
            state.company_mail || state.company_phone ? '<p>' + escapeHtml([state.company_mail, state.company_phone].filter(Boolean).join(' · ')) + '</p>' : ''
        ].join('');
        document.getElementById('preview-number').textContent = state.invoice_number || '-';
        document.getElementById('preview-date').textContent = formatDate(state.invoice_date);

        document.getElementById('preview-client').innerHTML = [
            state.client_name ? '<p class="font-bold text-slate-900">' + escapeHtml(state.client_name) + '</p>' : '',
            state.client_nif ? '<p>NIF: ' + escapeHtml(state.client_nif) + '</p>' : '',
            state.client_address || state.client_postal || state.client_town || state.client_province ? '<p>' + escapeHtml([state.client_address, state.client_postal, state.client_town, state.client_province].filter(Boolean).join(' · ')) + '</p>' : '',
            state.client_mail || state.client_phone ? '<p>' + escapeHtml([state.client_mail, state.client_phone].filter(Boolean).join(' · ')) + '</p>' : ''
        ].join('') || '<p class="text-slate-400">Sin datos del cliente</p>';

        var linesWrap = document.getElementById('preview-lines-wrap');
        var descriptionWrap = document.getElementById('preview-description-wrap');
        if (calculation.type === 'lineas') {
            linesWrap.classList.remove('hidden');
            descriptionWrap.classList.add('hidden');
            document.getElementById('preview-lines').innerHTML = calculation.lines.length ? calculation.lines.map(function (line) {
                if (line.note) return '<tr><td colspan="4" class="py-2 italic text-slate-600">' + escapeHtml(line.description || 'Nota') + '</td></tr>';
                return '<tr><td class="py-2 font-medium text-slate-800">' + escapeHtml(line.description || 'Sin descripción') + '</td><td class="py-2 text-center">' + escapeHtml(line.units || '') + '</td><td class="py-2 text-right font-mono">' + formatCurrency(line.price) + '</td><td class="py-2 text-right font-mono font-semibold">' + formatCurrency(line.amount) + '</td></tr>';
            }).join('') : '<tr><td colspan="4" class="py-4 text-center text-slate-400">Añade al menos una línea</td></tr>';
        } else {
            linesWrap.classList.add('hidden');
            descriptionWrap.classList.toggle('hidden', !state.long_description);
            document.getElementById('preview-description').textContent = state.long_description;
        }

        var payment = [];
        if (state.payment_method) payment.push('<p><strong>Forma de pago:</strong> ' + escapeHtml(state.payment_method) + '</p>');
        if (state.payment_detail) payment.push('<p><strong>' + escapeHtml(paymentDetailLabel.textContent) + ':</strong> ' + escapeHtml(state.payment_detail) + '</p>');
        if (state.payment_notes) payment.push('<p class="whitespace-pre-wrap"><strong>Detalles de pago:</strong> ' + escapeHtml(state.payment_notes) + '</p>');
        document.getElementById('preview-payment').innerHTML = payment.join('');

        var hideBudgetBreakdown = isBudget && calculation.hideVat;
        var totals = hideBudgetBreakdown ? '' : '<div class="flex justify-between gap-4 text-slate-600"><span>Base imponible:</span><span>' + formatCurrency(calculation.base) + '</span></div>';
        if (!hideBudgetBreakdown && !calculation.hideVat) totals += '<div class="flex justify-between gap-4 text-slate-600"><span>+ ' + calculationVatLabel(state.vatRate, calculation.iva) + '</span><span>+' + formatCurrency(calculation.iva) + '</span></div>';
        if (!hideBudgetBreakdown && calculation.retentionEnabled) totals += '<div class="flex justify-between gap-4 text-rose-600"><span>- ' + parseNumber(getFieldValue('withholding-rate')) + '% Retención:</span><span>-' + formatCurrency(calculation.retention) + '</span></div>';
        totals += '<div class="mt-1 flex justify-between gap-4 border-t border-slate-300 pt-2 text-sm font-extrabold text-navy-900"><span>' + (isBudget ? 'TOTAL PRESUPUESTO:' : 'TOTAL FACTURA:') + '</span><span>' + formatCurrency(calculation.total) + '</span></div>';
        if (!hideBudgetBreakdown && calculation.paid) {
            totals += '<div class="mt-2 flex justify-between gap-4 text-slate-600"><span>Abonado:</span><span>-' + formatCurrency(calculation.paidAmount) + '</span></div>';
            totals += '<div class="flex justify-between gap-4 font-extrabold text-teal-700"><span>TOTAL A ABONAR:</span><span>' + formatCurrency(calculation.due) + '</span></div>';
        }
        document.getElementById('preview-totals').innerHTML = totals;

        var observationsWrap = document.getElementById('preview-observations-wrap');
        observationsWrap.classList.toggle('hidden', !state.observations);
        document.getElementById('preview-observations').textContent = state.observations;
    }

    function calculationVatLabel(rate, amount) {
        return parseNumber(vatRate.value) + '% IVA:';
    }

    function exportRows(fields) {
        var state = currentState();
        return fields.map(function (field) {
            var value = state[field.key];
            if (isBudget && BUDGET_EXCLUDED_KEYS.indexOf(field.key) !== -1) value = '';
            if (field.key === 'withholding_enabled' && value !== '') value = value === 'si' ? 'Sí' : 'No';
            if (field.key === 'paid' && value !== '') value = value === 'si' ? 'Sí' : 'No';
            if (field.key === 'hide_vat') value = value ? 'Sí' : 'No';
            if (field.key === 'invoice_type') value = value === 'descripcion' ? 'Descripción larga' : 'Por líneas';
            return [field.label, value == null ? '' : value];
        });
    }

    function setFieldValue(key, value) {
        value = value == null ? '' : String(value);
        if (key === 'invoice_type') {
            setSelectedValue('invoice_type', value === 'Descripción larga' || value === 'descripcion' ? 'descripcion' : 'lineas');
            return;
        }
        if (key === 'withholding_enabled') {
            setSelectedValue('withholding_enabled', value.toLowerCase() === 'sí' || value.toLowerCase() === 'si' ? 'si' : 'no');
            return;
        }
        if (key === 'paid') {
            setSelectedValue('paid', value.toLowerCase() === 'sí' || value.toLowerCase() === 'si' ? 'si' : 'no');
            return;
        }
        if (key === 'hide_vat') {
            if (hideVat) hideVat.checked = value.toLowerCase() === 'sí' || value.toLowerCase() === 'si';
            return;
        }
        if (key === 'payment_method') {
            var method = Array.prototype.find.call(paymentMethod.options, function (option) {
                return option.value.toLowerCase() === value.toLowerCase();
            });
            paymentMethod.value = method ? method.value : 'Transferencia bancaria';
            return;
        }
        if (key === 'payment_notes') {
            if (paymentNotes) paymentNotes.value = value;
            if (paymentNotesToggle) paymentNotesToggle.checked = Boolean(value);
            return;
        }
        var field = document.getElementById(key.replace(/_/g, '-'));
        if (field) field.value = value;
    }

    function updatePaymentFields() {
        var method = paymentMethod.value;
        var hasDetail = method === 'Transferencia bancaria' || method === 'Bizum';
        paymentDetailWrap.classList.toggle('hidden', !hasDetail);
        paymentDetail.required = hasDetail;
        if (method === 'Bizum') {
            paymentDetailLabel.textContent = 'Teléfono de Bizum';
            paymentDetail.type = 'tel';
            paymentDetail.placeholder = '600 000 000';
        } else {
            paymentDetailLabel.textContent = 'IBAN';
            paymentDetail.type = 'text';
            paymentDetail.placeholder = 'ES00 0000 0000 0000 0000 0000';
        }
        if (!hasDetail) paymentDetail.value = '';
    }

    var PAYMENT_SUGGESTION = '10% a la firma del presupuesto, 50% antes del inicio de los trabajos, 30% antes de terminar los trabajos, 10% a la entrega de los trabajos. Cualquier extra no contemplado en este presupuesto, será informado al cliente, que deberá aprobar el presupuesto separado con la antelación correspondiente';

    function updatePaymentNotes() {
        if (!paymentNotesToggle || !paymentNotesWrap) return;
        paymentNotesWrap.classList.toggle('hidden', !paymentNotesToggle.checked);
    }

    function copyPaymentSuggestionText() {
        if (!paymentNotes || !paymentSuggestionStatus) return;
        paymentNotes.value = PAYMENT_SUGGESTION;
        updateCalculations();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(PAYMENT_SUGGESTION).then(function () {
                paymentSuggestionStatus.textContent = 'Sugerencia copiada y añadida a los detalles de pago.';
            });
        } else {
            paymentSuggestionStatus.textContent = 'Sugerencia añadida a los detalles de pago.';
        }
    }

    function excelDateToInput(value) {
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
        if (window.XLSX && typeof value === 'number' && XLSX.SSF && XLSX.SSF.parse_date_code) {
            var date = XLSX.SSF.parse_date_code(value);
            if (date) return [date.y, String(date.m).padStart(2, '0'), String(date.d).padStart(2, '0')].join('-');
        }
        return String(value || '');
    }

    function saveWorkbook() {
        if (!window.XLSX) {
            setFileStatus('No se ha podido cargar el módulo de Excel.');
            return;
        }
        var state = currentState();
        var workbook = XLSX.utils.book_new();
        var companyRows = [['Campo', 'Valor']].concat(exportRows(COMPANY_FIELD_DEFINITIONS));
        var clientRows = [['Campo', 'Valor']].concat(exportRows(CLIENT_FIELD_DEFINITIONS));
        var linesRows = [['Tipo', 'Descripción', 'Unidades', 'Precio unitario', 'Importe']].concat(state.invoice_type === 'lineas' ? state.lines.map(function (line) { return [line.note ? 'Nota' : 'Importe', line.description, line.units, line.price, line.amount]; }) : []);
        var descriptionRows = [['Descripción']].concat(state.invoice_type === 'descripcion' && state.long_description ? [[state.long_description]] : []);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(companyRows), 'EMPRESA');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(clientRows), 'CLIENTE');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(linesRows), 'LINEAS');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(descriptionRows), 'DESCRIPCIÓN');
        var safeNumber = (state.invoice_number || 'sin-numero').replace(/[^a-z0-9_-]+/gi, '_');
        XLSX.writeFile(workbook, documentLabel + '_' + safeNumber + '.xlsx');
        setFileStatus('Fichero guardado correctamente.');
    }

    function setFileStatus(message) {
        fileStatus.textContent = message;
    }

    function downloadPdf() {
        var jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (typeof jsPDF !== 'function') {
            setFileStatus('No se ha podido cargar el módulo de PDF. Revisa tu conexión e inténtalo de nuevo.');
            return;
        }
        var state = currentState();
        var lines = state.lines;
        var base = state.invoice_type === 'lineas' ? lines.reduce(function (total, line) { return total + line.amount; }, 0) : state.base_total;
        var iva = state.hide_vat ? 0 : base * state.vat_rate / 100;
        var retention = state.withholding_enabled === 'si' ? base * state.withholding_rate / 100 : 0;
        var total = base + iva - retention;
        var paid = state.paid === 'si' ? state.paid_amount : 0;
        var due = Math.max(0, total - paid);
        var doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        var left = 15;
        var right = 195;
        var y = 16;

        function text(value) {
            return String(value == null ? '' : value).replace(/€/g, 'EUR');
        }

        function ensureSpace(height) {
            if (y + height > 280) {
                doc.addPage();
                y = 16;
            }
        }

        function writeLines(values, fontStyle, size) {
            doc.setFont('helvetica', fontStyle || 'normal');
            doc.setFontSize(size || 9);
            values.filter(Boolean).forEach(function (value) {
                doc.splitTextToSize(text(value), right - left).forEach(function (line) {
                    ensureSpace(5);
                    doc.text(line, left, y);
                    y += 4.5;
                });
            });
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.text(text(state.company_name || 'Factura'), left, y);
        doc.setFillColor(6, 32, 64);
        doc.roundedRect(right - 28, y - 6, 28, 7, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(isBudget ? 'PRESUPUESTO' : 'FACTURA', right - 14, y - 1.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        var headerY = y;
        var companyY = headerY + 5;
        [
            state.company_nif ? 'NIF: ' + state.company_nif : '',
            [state.company_address, state.company_postal, state.company_town, state.company_province].filter(Boolean).join(' · '),
            [state.company_mail, state.company_phone].filter(Boolean).join(' · ')
        ].filter(Boolean).forEach(function (value) {
            doc.text(text(value), left, companyY);
            companyY += 4.5;
        });
        var rightY = headerY + 6;
        doc.text(text('Nº ' + documentLabel + ': ' + (state.invoice_number || '-')), right, rightY, { align: 'right' });
        rightY += 5;
        doc.text(text('FECHA de ' + documentLabel.toUpperCase() + ': ' + (formatDate(state.invoice_date) || '-')), right, rightY, { align: 'right' });
        y = Math.max(companyY, rightY) + 2;
        doc.setDrawColor(148, 163, 184);
        doc.line(left, y + 2, right, y + 2);
        y += 10;

        doc.setTextColor(13, 148, 136);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('DATOS DEL CLIENTE / RECEPTOR', left, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        if (state.client_name) {
            doc.text(text(state.client_name), left, y);
            y += 4.5;
        }
        writeLines([
            state.client_nif ? 'NIF: ' + state.client_nif : '',
            [state.client_address, state.client_postal, state.client_town, state.client_province].filter(Boolean).join(' · '),
            [state.client_mail, state.client_phone].filter(Boolean).join(' · ')
        ], 'normal', 9);
        y += 4;

        if (state.invoice_type === 'lineas') {
            ensureSpace(12);
            doc.setFillColor(241, 245, 249);
            doc.rect(left, y - 4, right - left, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('Descripción', left + 2, y);
            doc.text('Unid.', 125, y, { align: 'right' });
            doc.text('Precio', 160, y, { align: 'right' });
            doc.text('Importe', right - 2, y, { align: 'right' });
            y += 8;
            lines.forEach(function (line) {
                var descriptionLines = doc.splitTextToSize(text(line.description || (line.note ? 'Nota' : 'Sin descripción')), 100);
                var rowHeight = Math.max(7, descriptionLines.length * 4 + 3);
                ensureSpace(rowHeight);
                doc.setFont('helvetica', line.note ? 'italic' : 'normal');
                doc.setFontSize(8.5);
                doc.text(descriptionLines, left + 2, y);
                if (!line.note) {
                    doc.setFont('helvetica', 'normal');
                    doc.text(text(line.units), 125, y, { align: 'right' });
                    doc.text(formatPdfCurrency(line.price), 160, y, { align: 'right' });
                    doc.text(formatPdfCurrency(line.amount), right - 2, y, { align: 'right' });
                }
                doc.setDrawColor(226, 232, 240);
                doc.line(left, y + rowHeight - 3, right, y + rowHeight - 3);
                y += rowHeight;
            });
        } else {
            ensureSpace(12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('DESCRIPCIÓN', left, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.splitTextToSize(text(state.long_description || 'Sin descripción'), right - left).forEach(function (line) {
                ensureSpace(5);
                doc.text(line, left, y);
                y += 4.5;
            });
        }

        y += 5;
        ensureSpace(38);
        var totalLeft = 125;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        var hideBudgetBreakdown = isBudget && state.hide_vat;
        if (!hideBudgetBreakdown) {
            doc.text('Base imponible:', totalLeft, y);
            doc.text(formatPdfCurrency(base), right, y, { align: 'right' });
            y += 5;
        }
        if (!hideBudgetBreakdown && !state.hide_vat) {
            doc.text('+ ' + state.vat_rate + '% IVA:', totalLeft, y);
            doc.text('+' + formatPdfCurrency(iva), right, y, { align: 'right' });
            y += 5;
        }
        if (!hideBudgetBreakdown && state.withholding_enabled === 'si') {
            doc.setTextColor(190, 24, 93);
            doc.text('- ' + state.withholding_rate + '% Retención:', totalLeft, y);
            doc.text('-' + formatPdfCurrency(retention), right, y, { align: 'right' });
            doc.setTextColor(0, 0, 0);
            y += 5;
        }
        doc.setDrawColor(148, 163, 184);
        doc.line(totalLeft, y - 2, right, y - 2);
        doc.setFont('helvetica', 'bold');
        doc.text(isBudget ? 'TOTAL PRESUPUESTO:' : 'TOTAL FACTURA:', totalLeft, y + 3);
        doc.text(formatPdfCurrency(total), right, y + 3, { align: 'right' });
        y += 9;
        if (!hideBudgetBreakdown && state.paid === 'si') {
            doc.setFont('helvetica', 'normal');
            doc.text('Abonado:', totalLeft, y);
            doc.text('-' + formatPdfCurrency(paid), right, y, { align: 'right' });
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(13, 148, 136);
            doc.text('TOTAL A ABONAR:', totalLeft, y);
            doc.text(formatPdfCurrency(due), right, y, { align: 'right' });
            doc.setTextColor(0, 0, 0);
        }

        y += 12;
        var paymentDetailLabelPdf = state.payment_method === 'Bizum' ? 'Teléfono de Bizum' : (state.payment_method === 'Transferencia bancaria' ? 'IBAN' : '');
        writeLines([
            state.payment_method ? 'Forma de pago: ' + state.payment_method : '',
            state.payment_detail && paymentDetailLabelPdf ? paymentDetailLabelPdf + ': ' + state.payment_detail : '',
            state.payment_notes ? 'Detalles de pago: ' + state.payment_notes : ''
        ], 'normal', 9);
        if (state.observations) {
            y += 5;
            ensureSpace(12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('OBSERVACIONES', left, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.splitTextToSize(text(state.observations), right - left).forEach(function (line) {
                ensureSpace(5);
                doc.text(line, left, y);
                y += 4.5;
            });
        }

        var safeNumber = (state.invoice_number || 'sin-numero').replace(/[^a-z0-9_-]+/gi, '_');
        doc.save(documentLabel + '_' + safeNumber + '.pdf');
    }

    function formatPdfCurrency(value) {
        return Number(value || 0).toFixed(2).replace('.', ',') + ' EUR';
    }

    function updatePrintAvailability() {
        var canPrint = printDisclaimer.checked && printLegal.checked;
        printButton.disabled = !canPrint;
        printButton.title = canPrint ? 'Guardar PDF' : 'Marca las dos casillas para poder guardar el PDF';
        printHelp.classList.toggle('hidden', canPrint);
    }

    function loadWorkbook(file) {
        if (!window.XLSX) {
            setFileStatus('No se ha podido cargar el módulo de Excel.');
            return;
        }
        var reader = new FileReader();
        reader.onload = function (event) {
            try {
                var workbook = XLSX.read(event.target.result, { type: 'array', cellDates: true });
                var companySheet = workbook.Sheets.EMPRESA;
                if (!companySheet) throw new Error('El fichero no contiene la pestaña EMPRESA.');
                var companyRows = XLSX.utils.sheet_to_json(companySheet, { header: 1, defval: '' });
                var labels = {};
                FIELD_DEFINITIONS.forEach(function (field) { labels[field.label] = field.key; });
                labels.IBAN = 'payment_detail';
                companyRows.slice(1).forEach(function (row) {
                    var key = labels[row[0]];
                    if (key) setFieldValue(key, key === 'invoice_date' ? excelDateToInput(row[1]) : row[1]);
                });
                var clientSheet = workbook.Sheets.CLIENTE;
                if (clientSheet) {
                    var clientRows = XLSX.utils.sheet_to_json(clientSheet, { header: 1, defval: '' });
                    clientRows.slice(1).forEach(function (row) {
                        var key = labels[row[0]];
                        if (key && CLIENT_FIELD_KEYS.indexOf(key) !== -1) setFieldValue(key, row[1]);
                    });
                }

                while (lineItems.firstElementChild) lineItems.removeChild(lineItems.firstElementChild);
                var linesSheet = workbook.Sheets.LINEAS;
                var rawLineRows = linesSheet ? XLSX.utils.sheet_to_json(linesSheet, { header: 1, defval: '' }) : [];
                var hasLineType = rawLineRows[0] && rawLineRows[0][0] === 'Tipo';
                var lineRows = rawLineRows.slice(1);
                lineRows.slice(0, MAX_LINES).forEach(function (row) {
                    addLine(hasLineType
                        ? { note: row[0] === 'Nota', description: row[1], units: row[2], price: row[3] }
                        : { description: row[0], units: row[1], price: row[2] });
                });
                if (!lineItems.children.length) addLine();

                var descriptionSheet = workbook.Sheets['DESCRIPCIÓN'];
                if (descriptionSheet) {
                    var descriptionRows = XLSX.utils.sheet_to_json(descriptionSheet, { header: 1, defval: '' });
                    if (descriptionRows[1]) descriptionField.value = descriptionRows[1][1] || descriptionRows[1][0] || '';
                }
                limitWords(descriptionField, MAX_DESCRIPTION_WORDS, document.getElementById('description-count'));
                limitWords(observationsField, MAX_OBSERVATION_WORDS, document.getElementById('observations-count'));
                updateLineMeta();
                updatePaymentFields();
                updatePaymentNotes();
                updateCalculations();
                setFileStatus('Fichero cargado correctamente.');
            } catch (error) {
                setFileStatus('No se ha podido cargar el fichero: ' + error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    document.getElementById('add-line').addEventListener('click', function () { addLine(); updateCalculations(); });
    lineItems.addEventListener('click', function (event) {
        var button = event.target.closest('[data-remove-line]');
        if (!button) return;
        var rows = lineItems.querySelectorAll('[data-line-row]');
        if (rows.length <= 1) {
            lineInputs(rows[0]).description.value = '';
            lineInputs(rows[0]).units.value = '';
            lineInputs(rows[0]).price.value = '';
        } else {
            button.closest('[data-line-row]').remove();
        }
        updateLineMeta();
        updateCalculations();
    });
    form.addEventListener('input', function () {
        limitWords(descriptionField, MAX_DESCRIPTION_WORDS, document.getElementById('description-count'));
        limitWords(observationsField, MAX_OBSERVATION_WORDS, document.getElementById('observations-count'));
        updateLineMeta();
        updateCalculations();
    });
    form.addEventListener('change', function () {
        updatePaymentFields();
        updateCalculations();
    });
    printDisclaimer.addEventListener('change', updatePrintAvailability);
    printLegal.addEventListener('change', updatePrintAvailability);
    if (paymentNotesToggle) paymentNotesToggle.addEventListener('change', function () {
        updatePaymentNotes();
        updateCalculations();
    });
    if (copyPaymentSuggestion) copyPaymentSuggestion.addEventListener('click', copyPaymentSuggestionText);
    document.getElementById('save-file').addEventListener('click', saveWorkbook);
    document.getElementById('upload-file-button').addEventListener('click', function () { uploadFile.click(); });
    uploadFile.addEventListener('change', function () { if (uploadFile.files[0]) loadWorkbook(uploadFile.files[0]); uploadFile.value = ''; });
    printButton.addEventListener('click', function () {
        if (printButton.disabled) return;
        updateCalculations();
        downloadPdf();
    });

    document.getElementById('invoice-date').value = new Date().toISOString().slice(0, 10);
    addLine();
    updatePaymentFields();
    updatePaymentNotes();
    updatePrintAvailability();
    updateCalculations();
})();
