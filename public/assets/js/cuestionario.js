(function () {
    'use strict';

    var form = document.getElementById('final-form');
    if (!form) return;

    var result = document.getElementById('form-result');
    var scoreEl = document.getElementById('result-score');
    var badgeEl = document.getElementById('result-badge');
    var feedbackEl = document.getElementById('result-feedback');
    var recommendationsEl = document.getElementById('result-recommendations');
    var summaryEl = document.getElementById('result-summary');
    var mailtoEl = document.getElementById('result-mailto');
    var whatsappEl = document.getElementById('result-whatsapp');
    var copyBtn = document.getElementById('result-copy');
    var copyStatus = document.getElementById('copy-status');
    var submitButton = form.querySelector('button[type="submit"]');
    var outcomeEl = document.getElementById('submission-outcome');
    var outcomeIconEl = document.getElementById('submission-outcome-icon');
    var outcomeTitleEl = document.getElementById('submission-outcome-title');
    var outcomeMessageEl = document.getElementById('submission-outcome-message');
    var restartFlow = document.getElementById('restart-flow');

    var PROJECT_FIELDS = [
        { name: 'nombre', label: 'Nombre y apellidos' },
        { name: 'email', label: 'Correo electrónico' },
        { name: 'telefono', label: 'Teléfono / WhatsApp' },
        { name: 'actividad', label: 'Actividad' },
        { name: 'alta', label: 'Alta fiscal' },
        { name: 'local', label: 'Local u oficina' },
        { name: 'trabajadores', label: 'Trabajadores' },
        { name: 'vision', label: 'Visión a 1 año' },
        { name: 'formacion', label: 'Formación en el sector' },
        { name: 'experiencia', label: 'Experiencia previa' },
        { name: 'horario', label: 'Horario previsto' },
        { name: 'contabilidad', label: 'Contabilidad / facturación' },
        { name: 'facturacion', label: 'Facturación esperada' },
        { name: 'beneficio', label: 'Beneficio esperado' },
        { name: 'inversion', label: 'Inversión inicial' },
        { name: 'paro', label: 'Prestación por desempleo pendiente' },
        { name: 'paroCantidad', label: 'Cantidad de prestación pendiente' },
        { name: 'preocupacion', label: 'Preocupación principal' },
        { name: 'canal', label: 'Canal preferido' },
        { name: 'expectativas', label: 'Qué espera de la asesoría' },
        { name: 'observaciones', label: 'Observaciones' }
    ];

    var FORM_STATE_KEY = 'fjg_questionnaire_v1';
    var lastSummaryText = '';

    function arrangeQuizAnswers() {
        var correctPositions = [2, 1, 3, 0, 2, 1, 3, 2, 0, 1];

        form.querySelectorAll('[data-quiz]').forEach(function (fieldset, index) {
            var container = fieldset.querySelector('.mt-3');
            var labels = container ? Array.prototype.slice.call(container.querySelectorAll('label')) : [];
            var correct = labels.find(function (label) {
                return label.querySelector('input[data-correct="true"]');
            });

            if (!container || !correct || labels.length < 2) return;

            var wrong = labels.filter(function (label) { return label !== correct; });
            var target = Math.min(correctPositions[index] || 0, labels.length - 1);
            var ordered = [];
            var wrongIndex = 0;

            for (var position = 0; position < labels.length; position++) {
                ordered.push(position === target ? correct : wrong[wrongIndex++]);
            }

            ordered.forEach(function (label) { container.appendChild(label); });
        });
    }

    function saveFormState() {
        var state = {};

        Array.prototype.slice.call(form.elements).forEach(function (field) {
            if (!field.name || field.type === 'submit' || field.type === 'button') return;

            if (field.type === 'radio' || field.type === 'checkbox') {
                if (field.checked) state[field.name] = field.value;
            } else {
                state[field.name] = field.value;
            }
        });

        try {
            sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(state));
        } catch (error) {
            /* El almacenamiento puede no estar disponible (modo privado). */
        }
    }

    function restoreFormState() {
        var state;

        try {
            state = JSON.parse(sessionStorage.getItem(FORM_STATE_KEY) || '{}');
        } catch (error) {
            state = {};
        }

        Array.prototype.slice.call(form.elements).forEach(function (field) {
            if (!field.name || !Object.prototype.hasOwnProperty.call(state, field.name)) return;

            if (field.type === 'radio' || field.type === 'checkbox') {
                field.checked = field.value === state[field.name];
            } else {
                field.value = state[field.name];
            }
        });
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function getFieldValue(name) {
        var field = form.elements[name];
        if (!field) return '';
        if (field.tagName === 'SELECT') {
            return field.value ? field.options[field.selectedIndex].text : '';
        }
        return (field.value || '').trim();
    }

    function buildRecommendations(scorePercent) {
        var recommendations = [];
        var activity = getFieldValue('actividad');
        var local = getFieldValue('local');
        var workers = getFieldValue('trabajadores');
        var training = getFieldValue('formacion');
        var experience = getFieldValue('experiencia');
        var accounting = getFieldValue('contabilidad');
        var alta = getFieldValue('alta');
        var concern = getFieldValue('preocupacion');
        var paro = getFieldValue('paro');

        if (local.indexOf('Sí') === 0) {
            recommendations.push('Si finalmente alquilas un local, tendrás que gestionar la retención del alquiler mediante el modelo 115.');
        }
        if (workers.indexOf('Sí') === 0) {
            recommendations.push('Con trabajadores en plantilla o profesionales con retención, el modelo 111 será una de tus obligaciones habituales.');
        }
        if (training === 'Ninguna' || experience === 'Ninguna') {
            recommendations.push('Empezar sin formación o experiencia previa no es un problema: te acompañaremos trimestre a trimestre con un lenguaje claro.');
        }
        if (accounting === 'Nunca' || accounting === 'Solo con ayuda de una gestoría') {
            recommendations.push('Te daremos un sistema sencillo para organizar facturas y extractos; dedicar unos minutos al mes evita sustos.');
        }
        if (alta === 'No aún' || alta === 'En trámite') {
            recommendations.push('Antes de empezar revisaremos el alta censal (036/037) y el régimen fiscal más adecuado para tu actividad.');
        }
        if (paro === 'Sí' || paro === 'No lo sé todavía') {
            recommendations.push('Revisaremos la prestación pendiente y las opciones disponibles antes del alta para evitar perder derechos o tomar una decisión precipitada.');
        }
        if (concern) {
            recommendations.push('Tu principal preocupación ("' + concern + '") la abordaremos en la primera reunión.');
        }
        if (activity) {
            recommendations.push('Prepararemos una primera orientación específica para tu actividad: ' + activity + '.');
        }
        if (scorePercent < 70) {
            recommendations.push('Dedica unos minutos a repasar los pasos marcados arriba antes de la reunión; no es un examen, pero te ayudará a sacar más partido.');
        }
        if (!recommendations.length) {
            recommendations.push('Con la información facilitada prepararemos una primera reunión centrada en tus prioridades.');
        }

        return recommendations.slice(0, 6);
    }

    function collectQuizResult() {
        var quizFields = Array.prototype.slice.call(form.querySelectorAll('[data-quiz]'));
        var total = quizFields.length;
        var correct = 0;
        var wrong = [];

        quizFields.forEach(function (fieldset) {
            var selected = fieldset.querySelector('input[type="radio"]:checked');
            if (selected && selected.dataset.correct === 'true') {
                correct++;
            } else {
                wrong.push({
                    topic: fieldset.dataset.topic,
                    review: fieldset.dataset.review
                });
            }
        });

        return { total: total, correct: correct, wrong: wrong };
    }

    function renderResult() {
        var quizResult = collectQuizResult();
        var total = quizResult.total;
        var correct = quizResult.correct;
        var wrong = quizResult.wrong;

        var percent = total > 0 ? Math.round((correct / total) * 100) : 0;
        var level;
        var badgeClasses;
        var feedbackText;

        if (percent === 100) {
            level = 'Dominio completo';
            badgeClasses = 'bg-emerald-100 text-emerald-800';
            feedbackText = 'Excelente. Tienes claros los conceptos fundamentales del kit y el papel de cada modelo fiscal.';
        } else if (percent >= 70) {
            level = 'Buen nivel';
            badgeClasses = 'bg-teal-100 text-teal-800';
            feedbackText = 'Buen punto de partida. Tienes una base sólida; solo queda afinar un par de conceptos antes de la reunión.';
        } else if (percent >= 40) {
            level = 'Vas por buen camino';
            badgeClasses = 'bg-amber-100 text-amber-800';
            feedbackText = 'Vas por buen camino. Algunos conceptos conviene repasarlos con calma; para eso está el kit.';
        } else {
            level = 'A repasar';
            badgeClasses = 'bg-rose-100 text-rose-800';
            feedbackText = 'No te preocupes: es normal al empezar. Dedica unos minutos a repasar los pasos señalados y volvemos a hablar en la reunión.';
        }

        scoreEl.textContent = 'Diagnóstico del cuestionario';
        badgeEl.className = 'inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-bold ' + badgeClasses;
        badgeEl.innerHTML = '<i class="fa-solid fa-gauge-high"></i><span>' + level + '</span>';

        var feedbackHtml = '<p class="leading-relaxed">' + feedbackText + '</p>';
        if (wrong.length) {
            feedbackHtml += '<p class="mt-3 font-semibold text-slate-800">Conceptos a repasar:</p>';
            feedbackHtml += '<ul class="mt-1 list-inside list-disc space-y-1">';
            wrong.forEach(function (item) {
                feedbackHtml += '<li><a href="' + item.review + '" class="font-semibold text-teal-700 underline-offset-2 hover:underline">' + escapeHtml(item.topic) + '</a></li>';
            });
            feedbackHtml += '</ul>';
        } else {
            feedbackHtml += '<p class="mt-3 font-semibold text-emerald-700">No hay conceptos pendientes de repaso.</p>';
        }
        feedbackEl.innerHTML = feedbackHtml;

        var recommendations = buildRecommendations(percent);
        recommendationsEl.innerHTML = recommendations.map(function (recommendation) {
            return '<li>' + escapeHtml(recommendation) + '</li>';
        }).join('');

        summaryEl.innerHTML = PROJECT_FIELDS.map(function (field) {
            var value = getFieldValue(field.name) || 'No indicado';
            return '<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">' +
                '<dt class="text-[10px] font-bold uppercase tracking-wide text-slate-500">' + escapeHtml(field.label) + '</dt>' +
                '<dd class="mt-1 text-sm text-slate-800">' + escapeHtml(value) + '</dd>' +
                '</div>';
        }).join('');

        var lines = ['RESUMEN DE MI PROYECTO', ''];
        PROJECT_FIELDS.forEach(function (field) {
            lines.push(field.label + ': ' + (getFieldValue(field.name) || 'No indicado'));
        });
        lines.push('', 'DIAGNÓSTICO DEL CUESTIONARIO');
        lines.push('CONTENIDO A REPASAR');
        if (wrong.length) {
            lines.push('A repasar: ' + wrong.map(function (item) { return item.topic; }).join(', '));
        } else {
            lines.push('No hay contenidos pendientes de repaso.');
        }
        lines.push('', 'RECOMENDACIONES');
        recommendations.forEach(function (recommendation) {
            lines.push('- ' + recommendation);
        });
        lastSummaryText = lines.join('\n');

        mailtoEl.href = 'mailto:fjimenezgestiones@gmail.com?subject=' +
            encodeURIComponent('Resumen de mi proyecto - Kit de bienvenida') +
            '&body=' + encodeURIComponent(lastSummaryText);
        if (whatsappEl) whatsappEl.href = 'https://wa.me/?text=' + encodeURIComponent(lastSummaryText);

        result.classList.remove('hidden');
        copyStatus.textContent = '';
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(function () {
            result.focus({ preventScroll: true });
        }, 350);
    }

    arrangeQuizAnswers();
    restoreFormState();
    form.addEventListener('input', saveFormState);
    form.addEventListener('change', saveFormState);

    function buildSubmissionPayload() {
        var payload = {};
        var quizAnswers = {};
        var quizAnswerTexts = {};
        var quizResult = collectQuizResult();

        PROJECT_FIELDS.forEach(function (field) {
            payload[field.name] = getFieldValue(field.name);
        });

        form.querySelectorAll('[data-quiz]').forEach(function (fieldset) {
            var selected = fieldset.querySelector('input[type="radio"]:checked');
            var firstInput = fieldset.querySelector('input[type="radio"]');
            if (firstInput) {
                quizAnswers[firstInput.name] = selected ? selected.value : '';
                quizAnswerTexts[firstInput.name] = selected ? selected.closest('label').textContent.trim() : '';
            }
        });

        payload.quiz_answers = quizAnswers;
        payload.quiz_answers_text = quizAnswerTexts;
        payload.quiz_score = quizResult.correct + '/' + quizResult.total;
        payload.quiz_review_topics = quizResult.wrong.map(function (item) { return item.topic; });
        payload.recommendations = buildRecommendations(Math.round((quizResult.correct / quizResult.total) * 100));
        payload.consent = Boolean(document.getElementById('privacy-consent') && document.getElementById('privacy-consent').checked);
        payload.website = document.getElementById('website') ? document.getElementById('website').value : '';
        return payload;
    }

    function sendSubmission() {
        if (submitButton) submitButton.disabled = true;
        showSubmissionOutcome('pending', 'Estamos enviando el formulario...');

        fetch('/api/questionnaire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildSubmissionPayload())
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok) throw new Error(data.error || 'No se pudo enviar el formulario.');
                    return data;
                });
            })
            .then(function (data) {
                if (data.mail_sent === false) {
                    showSubmissionOutcome('error', 'El formulario se ha guardado, pero el correo no se ha podido enviar. Usa los botones siguientes para remitirnos el resumen por otra vía.');
                    return;
                }

                showSubmissionOutcome('success', 'Formulario recibido correctamente. Pronto nos pondremos en contacto contigo.');
                clearSessionState();
            })
            .catch(function (error) {
                console.error('No se pudo enviar el cuestionario:', error);
                var endpoint = new URL('/api/questionnaire', window.location.href).href;
                var message = error.name === 'TypeError'
                    ? 'No se pudo conectar con ' + endpoint + '. Abre esta página desde Flask, no desde file:// ni otro servidor.'
                    : (error.message || 'No se pudo enviar el formulario.');
                showSubmissionOutcome('error', message);
            })
            .finally(function () {
                if (submitButton) submitButton.disabled = false;
            });
    }

    function showSubmissionOutcome(state, message) {
        if (!outcomeEl) return;
        var success = state === 'success';
        var pending = state === 'pending';
        outcomeEl.className = success
            ? 'rounded-2xl border border-emerald-200 bg-emerald-50 p-5'
            : (pending ? 'rounded-2xl border border-amber-200 bg-amber-50 p-5' : 'rounded-2xl border border-rose-200 bg-rose-50 p-5');
        outcomeIconEl.className = success
            ? 'fa-solid fa-circle-check mt-0.5 text-xl text-emerald-600'
            : (pending ? 'fa-solid fa-spinner fa-spin mt-0.5 text-xl text-amber-600' : 'fa-solid fa-circle-exclamation mt-0.5 text-xl text-rose-600');
        outcomeTitleEl.className = success
            ? 'text-base font-bold text-emerald-900'
            : (pending ? 'text-base font-bold text-amber-900' : 'text-base font-bold text-rose-900');
        outcomeMessageEl.className = success
            ? 'mt-1 text-sm leading-relaxed text-emerald-900'
            : (pending ? 'mt-1 text-sm leading-relaxed text-amber-900' : 'mt-1 text-sm leading-relaxed text-rose-900');
        outcomeTitleEl.textContent = success ? 'Envío realizado' : (pending ? 'Enviando formulario' : 'No se ha podido completar el envío');
        outcomeMessageEl.textContent = message;
    }

    function clearSessionState() {
        try {
            sessionStorage.clear();
        } catch (error) {
            /* El almacenamiento puede no estar disponible (modo privado). */
        }
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        renderResult();
        sendSubmission();
    });

    if (restartFlow) restartFlow.addEventListener('click', clearSessionState);

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
            copyStatus.textContent = 'Resumen copiado al portapapeles.';
        } catch (error) {
            copyStatus.textContent = 'No se pudo copiar automáticamente. Selecciona el texto del resumen.';
        }

        document.body.removeChild(textarea);
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            if (!lastSummaryText) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(lastSummaryText).then(function () {
                    copyStatus.textContent = 'Resumen copiado al portapapeles.';
                }).catch(fallbackCopy);
            } else {
                fallbackCopy();
            }
        });
    }
})();
