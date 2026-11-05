/* ==========================================================================
   Elementos compartidos: cabecera, menú móvil, hero, progreso y pie.
   Para añadir un paso nuevo basta con agregarlo a STEPS y crear su HTML.
   ========================================================================== */
(function () {
    'use strict';

    var STEPS = [
        { id: 'bienvenida', file: 'index.html', num: 1, label: 'Bienvenida', short: 'Inicio', nav: 'Bienvenida', icon: 'fa-handshake' },
        { id: 'obligaciones', file: 'obligaciones.html', num: 2, label: 'Obligaciones Fiscales', short: 'Impuestos', nav: 'Obligaciones', icon: 'fa-scale-balanced' },
        { id: 'alta-autonomos', file: 'alta-autonomos.html', num: 3, label: 'Alta y Cuota de Autónomos', short: 'Alta', nav: 'Alta y cuota', icon: 'fa-user-tie' },
        { id: 'calendario', file: 'calendario.html', num: 4, label: 'Calendario & Plazos', short: 'Plazos', nav: 'Calendario', icon: 'fa-calendar-days' },
        { id: 'gastos', file: 'gastos.html', num: 5, label: 'Gastos Deducibles', short: 'Gastos', nav: 'Gastos', icon: 'fa-calculator' },
        { id: 'guia-trabajadores', file: 'guia-trabajadores.html', num: 6, label: 'Guía Trabajadores', short: 'Equipo', nav: 'Trabajadores', icon: 'fa-users-gear' },
        { id: 'factura', file: 'factura.html', num: 7, label: 'Guía de Facturación', short: 'Facturar', nav: 'Facturación', icon: 'fa-file-invoice-dollar' },
        { id: 'checklist', file: 'checklist.html', num: 8, label: 'Checklist de Inicio', short: 'Checklist', nav: 'Checklist', icon: 'fa-list-check' },
        { id: 'cuestionario', file: 'cuestionario.html', num: 9, label: 'Cuestionario Final', short: 'Test', nav: 'Cuestionario', icon: 'fa-clipboard-check' }
    ];

    var HERO_COPY = {
        bienvenida: {
            badge: 'Paso 1 · Bienvenida',
            title: '¡Bienvenido a tu tranquilidad fiscal!',
            subtitle: 'Esta guía interactiva contiene las pautas para trabajar juntos de forma eficiente, cumplir con la AEAT sin estrés y optimizar tus impuestos.'
        },
        obligaciones: {
            badge: 'Paso 2 — Obligaciones fiscales',
            title: 'Los impuestos, explicados sin rodeos',
            subtitle: 'Modelos 115, 111, 130 e IVA, y los informativos 347 y 349.'
        },
        'alta-autonomos': {
            badge: 'Paso 3 · Alta de autónomos',
            title: 'Tu alta, sin pasos en falso',
            subtitle: 'Elige bien tu epígrafe en la AEAT y entiende la cuota y la tarifa plana de la TGSS.'
        },
        calendario: {
            badge: 'Paso 4 · Calendario',
            title: 'Tus plazos, siempre bajo control',
            subtitle: 'Consulta fechas internas y plazos oficiales, y aprende a aplazar impuestos con la AEAT.'
        },
        gastos: {
            badge: 'Paso 5 · Gastos',
            title: 'Deduce con criterio y seguridad',
            subtitle: 'Comprueba qué gastos son deducibles, en qué porcentaje y qué documentación necesitas conservar.'
        },
        'guia-trabajadores': {
            badge: 'Paso 6 · Guía Trabajadores',
            title: 'Contratar con números claros',
            subtitle: 'Entiende los costes, los plazos y la rentabilidad antes de incorporar a tu primer trabajador.'
        },
        factura: {
            badge: 'Paso 7 · Facturación',
            title: 'Facturas bien emitidas, gastos sin problemas',
            subtitle: 'Recorre los elementos obligatorios de una factura para evitar rechazos y deducciones perdidas.'
        },
        checklist: {
            badge: 'Paso 8 · Onboarding',
            title: 'Prepara tu documentación inicial',
            subtitle: 'Marca los documentos que ya tienes listos y completa tu ficha de cliente sin olvidar nada.'
        },
        cuestionario: {
            badge: 'Paso 9 · Cuestionario final',
            title: 'Comprobemos lo aprendido',
            subtitle: 'Responde unas preguntas rápidas y cuéntanos tu proyecto para preparar una primera reunión más útil.'
        },
        contacto: {
            badge: 'Soporte',
            title: 'Tu equipo fiscal, a un clic',
            subtitle: 'Contacta directamente con las personas que gestionan tu contabilidad y tus impuestos.'
        }
    };

    var CHECK_KEY = 'fjg_checklist_v2';
    var CHECKLIST_TOTAL_KEY = 'fjg_checklist_total_v2';
    var DEFAULT_CHECKLIST_TOTAL = 7;
    var activeId = document.body.dataset.page || 'bienvenida';

    function loadVercelAnalytics() {
        if (window.location.protocol === 'file:' || document.querySelector('[data-vercel-analytics]')) return;

        window.va = window.va || function () {
            (window.vaq = window.vaq || []).push(arguments);
        };

        var script = document.createElement('script');
        script.defer = true;
        script.src = '/_vercel/insights/script.js';
        script.dataset.vercelAnalytics = 'true';
        document.head.appendChild(script);
    }

    /* ---------------------------------------------------------------------
       Estado del checklist (solo durante la sesión del navegador)
       --------------------------------------------------------------------- */
    function getChecklistState() {
        try {
            var raw = sessionStorage.getItem(CHECK_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            return {};
        }
    }

    function saveChecklistState(state) {
        try {
            sessionStorage.setItem(CHECK_KEY, JSON.stringify(state));
        } catch (error) {
            /* El almacenamiento puede no estar disponible (modo privado). */
        }
    }

    function countChecked(state) {
        return Object.keys(state).filter(function (key) {
            return state[key] === true;
        }).length;
    }

    function getChecklistTotal() {
        try {
            var total = parseInt(sessionStorage.getItem(CHECKLIST_TOTAL_KEY), 10);
            return isFinite(total) && total > 0 ? total : DEFAULT_CHECKLIST_TOTAL;
        } catch (error) {
            return DEFAULT_CHECKLIST_TOTAL;
        }
    }

    function saveChecklistTotal(total) {
        try {
            sessionStorage.setItem(CHECKLIST_TOTAL_KEY, String(total));
        } catch (error) {
            /* El almacenamiento puede no estar disponible (modo privado). */
        }
    }

    /* ---------------------------------------------------------------------
       Cabecera y navegación
       --------------------------------------------------------------------- */
    function stepLink(step, mobile) {
        var isActive = step.id === activeId;
        var base = mobile
            ? 'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition'
            : 'tab-btn flex items-center gap-1 whitespace-nowrap rounded-t-lg border-b-2 px-2 py-3 text-xs font-medium transition lg:gap-1.5 lg:px-2.5 lg:text-xs xl:gap-2 xl:px-4 xl:py-3.5 xl:text-sm';
        var state = isActive
            ? (mobile ? 'bg-white/10 text-white' : 'border-teal-500 bg-white/5 text-white')
            : (mobile ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white');
        var number = mobile
            ? '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-300">' + step.num + '</span>'
            : '';
        var icon = mobile ? '' : '<i class="fa-solid ' + step.icon + ' text-teal-400"></i>';
        var label = mobile
            ? '<span>' + step.label + '</span>'
            : '<span class="xl:hidden">' + step.short + '</span><span class="hidden xl:inline">' + step.nav + '</span>';
        var fullLabel = step.label.replace(/&/g, '&amp;');

        return '<a href="' + step.file + '" class="' + base + ' ' + state + '" title="' + step.num + '. ' + fullLabel + '" aria-label="Paso ' + step.num + ': ' + fullLabel + '"' +
            (isActive ? ' aria-current="page"' : '') + '>' +
            number + icon + label +
            '</a>';
    }

    function renderHeader() {
        var desktopNav = STEPS.map(function (step) { return stepLink(step, false); }).join('');
        var mobileNav = STEPS.map(function (step) { return stepLink(step, true); }).join('');
        var contactActive = activeId === 'contacto';
        var contactExtra = contactActive ? ' ring-2 ring-teal-300 ring-offset-2 ring-offset-navy-900' : '';
        var contactAria = contactActive ? ' aria-current="page"' : '';
        var target = document.getElementById('site-header');
        if (!target) return;

        target.innerHTML =
            '<header class="sticky top-0 z-50 border-b border-slate-800 bg-navy-900 text-white shadow-md">' +
                '<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">' +
                    '<div class="flex h-16 items-center justify-between gap-3 md:h-20">' +
                        '<a href="index.html" class="flex min-w-0 items-center gap-3">' +
                            '<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-lg font-black text-navy-900 shadow-md md:h-11 md:w-11 md:text-xl">' +
                                '<i class="fa-solid fa-chart-pie"></i>' +
                            '</span>' +
                            '<span class="min-w-0">' +
                                '<span class="block text-[10px] font-semibold uppercase tracking-wider text-teal-400 sm:text-xs">Portal de Onboarding</span>' +
                                '<span class="block truncate text-base font-bold tracking-tight text-white sm:text-lg md:text-xl">Asesoría Fiscal &amp; Contable</span>' +
                            '</span>' +
                        '</a>' +
                        '<div class="flex items-center gap-2">' +
                            '<a href="contacto.html" class="hidden items-center gap-2 rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-md transition hover:bg-teal-600 sm:inline-flex' + contactExtra + '"' + contactAria + '>' +
                                '<i class="fa-solid fa-headset"></i><span>Tu Asesor</span>' +
                            '</a>' +
                            '<a href="contacto.html" class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500 text-navy-900 shadow-md transition hover:bg-teal-600 sm:hidden' + contactExtra + '" aria-label="Contactar con tu asesor"' + contactAria + '>' +
                                '<i class="fa-solid fa-headset"></i>' +
                            '</a>' +
                            '<button id="menu-toggle" type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-navy-700 text-slate-200 transition hover:bg-slate-800 md:hidden" aria-label="Abrir menú de pasos" aria-controls="mobile-menu" aria-expanded="false">' +
                                '<i class="fa-solid fa-bars"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<nav class="no-print hidden border-t border-slate-800 bg-navy-900/95 md:block" aria-label="Pasos del kit">' +
                    '<div class="scrollbar-none mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 text-slate-300 sm:px-6 lg:px-8">' +
                        desktopNav +
                    '</div>' +
                '</nav>' +
            '</header>' +
            '<div id="mobile-menu" class="fixed inset-0 z-[60] hidden md:hidden" role="dialog" aria-modal="true" aria-label="Menú de pasos">' +
                '<div id="mobile-backdrop" class="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"></div>' +
                '<div class="absolute right-0 top-0 flex h-full w-[86%] max-w-xs flex-col bg-navy-900 p-5 text-white shadow-2xl">' +
                    '<div class="mb-5 flex items-center justify-between">' +
                        '<span class="text-xs font-semibold uppercase tracking-wider text-teal-400">Pasos del kit</span>' +
                        '<button id="menu-close" type="button" class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-navy-700 text-slate-200 transition hover:bg-slate-800" aria-label="Cerrar menú">' +
                            '<i class="fa-solid fa-xmark"></i>' +
                        '</button>' +
                    '</div>' +
                    '<nav class="flex-1 space-y-1 overflow-y-auto" aria-label="Pasos del kit (móvil)">' +
                        mobileNav +
                    '</nav>' +
                    '<div class="mt-5 space-y-3 border-t border-slate-800 pt-5">' +
                        '<div class="rounded-xl border border-slate-700 bg-slate-800/70 p-3">' +
                            '<div class="mb-1 flex items-center justify-between text-xs">' +
                                '<span class="font-medium text-slate-300">Onboarding</span>' +
                                '<span class="font-mono text-teal-400" data-progress-count>0/' + getChecklistTotal() + '</span>' +
                            '</div>' +
                            '<div class="h-2 w-full overflow-hidden rounded-full bg-slate-700">' +
                                '<div class="h-full bg-teal-500 transition-all duration-500" style="width:0%" data-progress-bar></div>' +
                            '</div>' +
                        '</div>' +
                        '<a href="contacto.html" class="flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-teal-600' + contactExtra + '"' + contactAria + '>' +
                            '<i class="fa-solid fa-headset"></i><span>Contactar con tu asesor</span>' +
                        '</a>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    /* ---------------------------------------------------------------------
       Hero con tarjeta de progreso
       --------------------------------------------------------------------- */
    function renderHero() {
        var copy = HERO_COPY[activeId] || HERO_COPY.bienvenida;
        var target = document.getElementById('site-hero');
        if (!target) return;

        target.innerHTML =
            '<section class="border-b border-teal-500/20 bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8">' +
                '<div class="mx-auto flex max-w-7xl flex-col items-stretch justify-between gap-5 md:flex-row md:items-center md:gap-6">' +
                    '<div class="max-w-2xl space-y-2">' +
                        '<span class="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-300 sm:text-xs">' +
                            '<i class="fa-solid fa-shield-halved text-teal-400"></i>' +
                            '<span>' + copy.badge + '</span>' +
                        '</span>' +
                        '<h1 class="text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">' + copy.title + '</h1>' +
                        '<p class="max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">' + copy.subtitle + '</p>' +
                    '</div>' +
                    '<div class="w-full rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-xl md:w-auto md:min-w-[280px]">' +
                        '<div class="mb-1 text-xs font-medium text-slate-400">Documentación inicial</div>' +
                        '<div class="mb-2 flex items-center justify-between gap-3">' +
                            '<span class="text-sm font-semibold text-white" data-progress-percent>0% Preparado</span>' +
                            '<span class="font-mono text-xs text-teal-400" data-progress-count data-progress-suffix=" Documentos">0/' + getChecklistTotal() + ' Documentos</span>' +
                        '</div>' +
                        '<div class="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-700">' +
                            '<div class="h-full bg-teal-500 transition-all duration-500" style="width:0%" data-progress-bar></div>' +
                        '</div>' +
                        '<a href="checklist.html" class="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/20 px-3 py-1.5 text-xs font-semibold text-teal-300 transition hover:bg-teal-500/30">' +
                            '<i class="fa-solid fa-arrow-right-to-bracket"></i>' +
                            '<span>Quiero un presupuesto ya!</span>' +
                        '</a>' +
                    '</div>' +
                '</div>' +
            '</section>';
    }

    /* ---------------------------------------------------------------------
       Pie de página
       --------------------------------------------------------------------- */
    function renderFooter() {
        var target = document.getElementById('site-footer');
        if (!target) return;

        var activeIndex = STEPS.findIndex(function (step) { return step.id === activeId; });
        var previousStep = activeIndex > 0 ? STEPS[activeIndex - 1] : null;
        var nextStep = activeIndex >= 0 && activeIndex < STEPS.length - 1 ? STEPS[activeIndex + 1] : null;

        if (activeId === 'contacto') previousStep = STEPS[STEPS.length - 1];

        var previousControl = previousStep
            ? '<a href="' + previousStep.file + '" class="inline-flex min-w-0 items-center justify-start gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-left text-xs font-semibold text-slate-300 transition hover:border-teal-500 hover:text-white sm:px-4">' +
                '<i class="fa-solid fa-arrow-left text-teal-400"></i><span class="truncate"><span class="block text-[10px] uppercase tracking-wide text-slate-500">Anterior</span>' + previousStep.label + '</span>' +
              '</a>'
            : '<span class="inline-flex min-w-0 items-center justify-start gap-2 rounded-xl border border-slate-800 px-3 py-2.5 text-left text-xs font-semibold text-slate-600 opacity-60 sm:px-4"><i class="fa-solid fa-arrow-left"></i><span><span class="block text-[10px] uppercase tracking-wide">Anterior</span>Inicio</span></span>';

        var nextControl = nextStep
            ? '<a href="' + nextStep.file + '" class="inline-flex min-w-0 items-center justify-end gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-right text-xs font-semibold text-slate-300 transition hover:border-teal-500 hover:text-white sm:px-4">' +
                '<span class="truncate"><span class="block text-[10px] uppercase tracking-wide text-slate-500">Siguiente</span>' + nextStep.label + '</span><i class="fa-solid fa-arrow-right text-teal-400"></i>' +
              '</a>'
            : '<span class="inline-flex min-w-0 items-center justify-end gap-2 rounded-xl border border-slate-800 px-3 py-2.5 text-right text-xs font-semibold text-slate-600 opacity-60 sm:px-4"><span><span class="block text-[10px] uppercase tracking-wide">Siguiente</span>Fin del recorrido</span><i class="fa-solid fa-arrow-right"></i></span>';

        target.innerHTML =
            '<footer class="no-print border-t border-slate-800 bg-navy-900 py-8 text-xs text-slate-400">' +
                '<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">' +
                    '<div class="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-800 pb-8 sm:gap-4">' +
                        previousControl +
                        '<button type="button" data-open-navigation class="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-500/50 bg-teal-500/10 px-3 py-3 text-xs font-bold text-teal-300 transition hover:bg-teal-500/20 sm:px-5" aria-label="Abrir navegación del kit">' +
                            '<i class="fa-solid fa-bars"></i><span class="hidden sm:inline">Navegación</span>' +
                        '</button>' +
                        nextControl +
                    '</div>' +
                    '<div class="flex flex-col items-center justify-between gap-4 sm:flex-row">' +
                    '<div class="flex items-center gap-2">' +
                        '<i class="fa-solid fa-shield-halved text-base text-teal-400"></i>' +
                        '<span class="font-medium text-slate-300">Asesoría Fiscal, Contable &amp; Mercantil © 2026</span>' +
                    '</div>' +
                    '<div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-400">' +
                        '<a href="#" class="transition hover:text-white">Política de Privacidad</a>' +
                        '<a href="#" class="transition hover:text-white">Seguridad RGPD</a>' +
                        '<a href="#" class="transition hover:text-white">Portal del Cliente</a>' +
                    '</div>' +
                    '</div>' +
                '</div>' +
            '</footer>';
    }

    /* ---------------------------------------------------------------------
       Progreso del checklist
       --------------------------------------------------------------------- */
    function updateProgress() {
        var state = getChecklistState();
        var checked = countChecked(state);
        var total = getChecklistTotal();
        var percent = total > 0 ? Math.round((checked / total) * 100) : 0;

        document.querySelectorAll('[data-progress-percent]').forEach(function (el) {
            el.textContent = percent + '% Preparado';
        });
        document.querySelectorAll('[data-progress-count]').forEach(function (el) {
            el.textContent = checked + '/' + total + (el.dataset.progressSuffix || '');
        });
        document.querySelectorAll('[data-progress-bar]').forEach(function (el) {
            el.style.width = percent + '%';
        });
    }

    /* ---------------------------------------------------------------------
       Menú móvil
       --------------------------------------------------------------------- */
    function setupMobileMenu() {
        var toggle = document.getElementById('menu-toggle');
        var menu = document.getElementById('mobile-menu');
        var close = document.getElementById('menu-close');
        var backdrop = document.getElementById('mobile-backdrop');
        if (!toggle || !menu) return;

        function openMenu() {
            menu.classList.remove('hidden');
            document.body.classList.add('menu-open');
            toggle.setAttribute('aria-expanded', 'true');
            var firstLink = menu.querySelector('a');
            if (firstLink) firstLink.focus({ preventScroll: true });
        }

        function closeMenu() {
            menu.classList.add('hidden');
            document.body.classList.remove('menu-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.focus({ preventScroll: true });
        }

        toggle.addEventListener('click', openMenu);
        document.querySelectorAll('[data-open-navigation]').forEach(function (button) {
            button.addEventListener('click', openMenu);
        });
        if (close) close.addEventListener('click', closeMenu);
        if (backdrop) backdrop.addEventListener('click', closeMenu);
        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !menu.classList.contains('hidden')) {
                closeMenu();
            }
        });
    }

    /* ---------------------------------------------------------------------
       API pública para los scripts de cada página
       --------------------------------------------------------------------- */
    window.KitApp = {
        STEPS: STEPS,
        CHECK_KEY: CHECK_KEY,
        CHECKLIST_TOTAL_KEY: CHECKLIST_TOTAL_KEY,
        getChecklistState: getChecklistState,
        saveChecklistState: saveChecklistState,
        getChecklistTotal: getChecklistTotal,
        saveChecklistTotal: saveChecklistTotal,
        updateProgress: updateProgress
    };

    loadVercelAnalytics();
    renderHeader();
    renderHero();
    renderFooter();
    setupMobileMenu();
    updateProgress();
})();
