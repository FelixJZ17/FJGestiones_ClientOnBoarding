(function () {
    'use strict';

    var search = document.getElementById('expense-search');
    var cards = document.querySelectorAll('.expense-card');
    var pills = document.querySelectorAll('[data-exp-cat]');
    var currentCat = 'all';

    var activePill = ['bg-navy-900', 'text-white', 'font-semibold', 'border-navy-900'];
    var inactivePill = ['bg-slate-100', 'text-slate-700', 'font-medium', 'border-slate-200', 'hover:bg-slate-200'];

    function updateCategoryCounts() {
        var counts = {};

        cards.forEach(function (card) {
            var category = card.dataset.cat;
            counts[category] = (counts[category] || 0) + 1;
        });

        pills.forEach(function (btn) {
            var category = btn.dataset.expCat;
            var label = btn.dataset.expLabel || btn.textContent.trim();
            var count = category === 'all' ? cards.length : (counts[category] || 0);

            btn.dataset.expLabel = label;
            btn.textContent = label + ' (' + count + ')';
        });
    }

    function applyPillStyles() {
        pills.forEach(function (btn) {
            var isActive = btn.dataset.expCat === currentCat;
            activePill.forEach(function (cls) { btn.classList.toggle(cls, isActive); });
            inactivePill.forEach(function (cls) { btn.classList.toggle(cls, !isActive); });
        });
    }

    function filterExpenses() {
        var query = (search ? search.value : '').toLowerCase().trim();

        cards.forEach(function (card) {
            var cat = card.dataset.cat;
            var tags = (card.dataset.tags || '').toLowerCase();
            var text = card.innerText.toLowerCase();
            var matchesCat = currentCat === 'all' || cat === currentCat;
            var matchesQuery = query === '' || tags.indexOf(query) !== -1 || text.indexOf(query) !== -1;
            card.classList.toggle('hidden', !(matchesCat && matchesQuery));
        });
    }

    pills.forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentCat = btn.dataset.expCat;
            applyPillStyles();
            filterExpenses();
        });
    });

    if (search) search.addEventListener('input', filterExpenses);

    updateCategoryCounts();
    applyPillStyles();
    filterExpenses();
})();
