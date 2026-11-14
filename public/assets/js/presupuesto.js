(function () {
    'use strict';

    var form = document.getElementById('budget-form');
    if (!form) return;

    var services = Array.prototype.slice.call(form.querySelectorAll('input[name="servicios"]'));
    var servicesError = document.getElementById('services-error');
    var result = document.getElementById('budget-result');
    var resultIcon = document.getElementById('budget-result-icon');
    var resultTitle = document.getElementById('budget-result-title');
    var resultMessage = document.getElementById('budget-result-message');
    var fallback = document.getElementById('budget-fallback');
    var whatsapp = document.getElementById('budget-whatsapp');
    var copyButton = document.getElementById('budget-copy');
    var copyStatus = document.getElementById('budget-copy-status');
    var submitButton = form.querySelector('button[type="submit"]');
    var lastSummaryText = '';

    function selectedServices() {
        return services.filter(function (service) { return service.checked; }).map(function (service) { return service.value; });
    }

    function validateServices() {
        var valid = selectedServices().length > 0;
        services.forEach(function (service) { service.setCustomValidity(valid ? '' : 'Selecciona al menos un servicio.'); });
        if (servicesError) servicesError.classList.toggle('hidden', valid);
        return valid;
    }

    function showResult(state, message) {
        var success = state === 'success';
        var pending = state === 'pending';
        result.className = success
            ? 'rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 sm:p-6'
            : (pending ? 'rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 sm:p-6' : 'rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900 sm:p-6');
        resultIcon.className = success
            ? 'fa-solid fa-circle-check mt-0.5 text-xl text-emerald-600'
            : (pending ? 'fa-solid fa-spinner fa-spin mt-0.5 text-xl text-amber-600' : 'fa-solid fa-circle-exclamation mt-0.5 text-xl text-rose-600');
        resultTitle.className = success ? 'text-base font-bold text-emerald-900' : (pending ? 'text-base font-bold text-amber-900' : 'text-base font-bold text-rose-900');
        resultMessage.className = success ? 'mt-1 text-sm leading-relaxed text-emerald-900' : (pending ? 'mt-1 text-sm leading-relaxed text-amber-900' : 'mt-1 text-sm leading-relaxed text-rose-900');
        resultTitle.textContent = success ? 'Solicitud recibida' : (pending ? 'Enviando solicitud' : 'No se ha podido completar el envío');
        resultMessage.textContent = message;
        if (fallback) fallback.classList.toggle('hidden', !(!success && !pending));
        result.classList.remove('hidden');
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function getFieldValue(name) {
        var field = form.elements[name];
        if (!field) return '';
        if (field.tagName === 'SELECT') {
            return field.value ? field.options[field.selectedIndex].text : '';
        }
        return (field.value || '').trim();
    }

    function buildSummary() {
        return [
            'SOLICITUD DE PRESUPUESTO',
            '',
            'Nombre y apellidos: ' + getFieldValue('nombre'),
            'Correo electrónico: ' + getFieldValue('email'),
            'Teléfono / WhatsApp: ' + getFieldValue('telefono'),
            'Situación: ' + getFieldValue('perfil'),
            'Servicios solicitados: ' + selectedServices().join(', '),
            'Canal preferido: ' + getFieldValue('canal'),
            '',
            'Descripción:',
            getFieldValue('descripcion'),
            '',
            'La gestión solicitada tiene coste. El importe se comunicará tras estudiar el caso.'
        ].join('\n');
    }

    function fallbackCopy() {
        var textarea = document.createElement('textarea');
        textarea.value = lastSummaryText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            copyStatus.textContent = 'Mensaje copiado al portapapeles.';
        } catch (error) {
            copyStatus.textContent = 'No se pudo copiar automáticamente. Selecciona el texto del mensaje.';
        }

        document.body.removeChild(textarea);
    }

    function copySummary() {
        if (!lastSummaryText || !copyStatus) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(lastSummaryText).then(function () {
                copyStatus.textContent = 'Mensaje copiado al portapapeles.';
            }).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    }

    function buildPayload() {
        var payload = {};
        Array.prototype.slice.call(form.elements).forEach(function (field) {
            if (!field.name || field.name === 'servicios' || field.type === 'submit' || field.type === 'button') return;
            if (field.type === 'checkbox') {
                payload[field.name] = field.checked;
            } else {
                payload[field.name] = field.value.trim();
            }
        });
        payload.servicios = selectedServices();
        payload.consent = Boolean(document.getElementById('privacy-consent').checked);
        return payload;
    }

    services.forEach(function (service) { service.addEventListener('change', validateServices); });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!validateServices() || !form.reportValidity()) return;

        lastSummaryText = buildSummary();
        if (whatsapp) whatsapp.href = 'https://wa.me/34624410832?text=' + encodeURIComponent(lastSummaryText);
        if (copyStatus) copyStatus.textContent = '';
        if (submitButton) submitButton.disabled = true;
        showResult('pending', 'Estamos revisando y enviando tus datos...');

        fetch('/api/budget', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload())
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok) throw new Error(data.error || 'No se pudo enviar la solicitud.');
                    return data;
                });
            })
            .then(function (data) {
                if (data.mail_sent === false) {
                    showResult('error', 'La solicitud se ha guardado, pero no se ha podido enviar el aviso por correo. Puedes escribir directamente a fjimenezgestiones@gmail.com.');
                    return;
                }
                showResult('success', 'Gracias. Estudiaré tu caso y te informaré del coste a la mayor brevedad posible.');
                form.reset();
            })
            .catch(function (error) {
                showResult('error', error.message || 'No se pudo enviar la solicitud. Inténtalo de nuevo o escribe a fjimenezgestiones@gmail.com.');
            })
            .finally(function () {
                if (submitButton) submitButton.disabled = false;
            });
    });

    if (copyButton) copyButton.addEventListener('click', copySummary);
})();
