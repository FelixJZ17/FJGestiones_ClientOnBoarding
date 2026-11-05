(function () {
    'use strict';

    var buttons = document.querySelectorAll('[data-cal-filter]');
    var rows = document.querySelectorAll('.cal-row');
    if (!buttons.length || !rows.length) return;

    function filterCalendar(type) {
        rows.forEach(function (row) {
            var show = type === 'all' || row.classList.contains(type);
            row.classList.toggle('hidden', !show);
        });

        buttons.forEach(function (btn) {
            var isActive = btn.dataset.calFilter === type;
            btn.classList.toggle('bg-white', isActive);
            btn.classList.toggle('text-navy-900', isActive);
            btn.classList.toggle('shadow-sm', isActive);
            btn.classList.toggle('font-semibold', isActive);
            btn.classList.toggle('text-slate-600', !isActive);
            btn.classList.toggle('font-medium', !isActive);
        });
    }

    buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            filterCalendar(btn.dataset.calFilter);
        });
    });
})();
