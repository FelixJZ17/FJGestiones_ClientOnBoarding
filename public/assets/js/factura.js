(function () {
    'use strict';

    var hotspotData = {
        1: {
            title: '1. Numeración, Serie y Fecha de Emisión',
            desc: 'Toda factura debe tener una numeración correlativa y sin saltos dentro de su misma serie anual (ej. F2026-0001). La fecha de expedición determina en qué trimestre se liquida el impuesto ante Hacienda.',
            extra: 'Importante: no se pueden emitir facturas con fechas anteriores a la última registrada en la misma serie.'
        },
        2: {
            title: '2. Identificación Completa de Emisor y Receptor',
            desc: 'Es obligatorio incluir Nombre/Razón Social completo, NIF/CIF válido y domicilio fiscal tanto del emisor como del cliente receptor. Un ticket o factura simplificada sin NIF no sirve para deducir el gasto.',
            extra: 'Error habitual: usar el nombre comercial en lugar de la Razón Social o NIF del cliente.'
        },
        3: {
            title: '3. Descripción Detallada de la Operación',
            desc: 'Se deben especificar claramente los servicios prestados o productos vendidos. Evita conceptos ambiguos como "Servicios Varios" o "Trabajos Realizados".',
            extra: 'Consejo: Hacienda puede rechazar gastos si el concepto no demuestra su relación con tu actividad económica.'
        },
        4: {
            title: '4. Desglose de Tipos Impositivos (IVA e IRPF)',
            desc: 'Debe desglosarse la Base Imponible, el porcentaje de IVA aplicado (generalmente 21%) y la retención del IRPF (15% o 7% para nuevos autónomos) cuando proceda emitir a otros profesionales o empresas en España.',
            extra: 'Retenciones IRPF: aplican si eres profesional autónomo y facturas a otra empresa o autónomo radicado en España.'
        }
    };

    var titleEl = document.getElementById('hotspot-title');
    var descEl = document.getElementById('hotspot-desc');
    var extraEl = document.getElementById('hotspot-extra');
    var triggers = document.querySelectorAll('[data-hotspot]');
    if (!titleEl || !descEl || !extraEl || !triggers.length) return;

    triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function () {
            var data = hotspotData[trigger.dataset.hotspot];
            if (!data) return;

            titleEl.textContent = data.title;
            descEl.textContent = data.desc;
            extraEl.textContent = data.extra;
            extraEl.classList.remove('hidden');
        });
    });
})();
