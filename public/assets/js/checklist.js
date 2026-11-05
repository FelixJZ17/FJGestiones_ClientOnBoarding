(function () {
    'use strict';

    if (!window.KitApp) return;

    var checkboxes = document.querySelectorAll('.chk-item');
    var previousItems = Array.prototype.slice.call(document.querySelectorAll('[data-history-item] .chk-item'));
    var historyToggle = document.getElementById('never-autonomo');
    var historyNote = document.getElementById('history-note');
    var historyKey = 'fjg_checklist_never_autonomo_v1';
    if (!checkboxes.length) return;

    function getHistoryPreference() {
        try {
            return sessionStorage.getItem(historyKey) === 'true';
        } catch (error) {
            return false;
        }
    }

    function saveHistoryPreference(value) {
        try {
            sessionStorage.setItem(historyKey, String(value));
        } catch (error) {
            /* El almacenamiento puede no estar disponible (modo privado). */
        }
    }

    function updateItemStyle(chk) {
        var label = chk.closest('label');
        if (!label) return;

        label.classList.toggle('border-teal-300', chk.checked);
        label.classList.toggle('bg-teal-50', chk.checked);
        label.classList.toggle('border-slate-200', !chk.checked);
        label.classList.toggle('bg-slate-50', !chk.checked);

        var title = label.querySelector('[data-item-title]');
        if (title) {
            title.classList.toggle('line-through', chk.checked);
            title.classList.toggle('text-slate-500', chk.checked);
        }
    }

    function syncHistoryItems() {
        var skipHistory = Boolean(historyToggle && historyToggle.checked);

        if (skipHistory) {
            var state = window.KitApp.getChecklistState();
            previousItems.forEach(function (chk) {
                chk.checked = false;
                delete state[chk.dataset.id];
            });
            window.KitApp.saveChecklistState(state);
        }

        previousItems.forEach(function (chk) {
            var label = chk.closest('label');
            chk.disabled = skipHistory;
            updateItemStyle(chk);

            if (label) {
                label.setAttribute('aria-disabled', String(skipHistory));
                label.classList.toggle('cursor-not-allowed', skipHistory);
                label.classList.toggle('opacity-60', skipHistory);
                label.classList.toggle('border-slate-300', skipHistory);
                label.classList.toggle('border-slate-200', !skipHistory);
                label.classList.toggle('bg-slate-100', skipHistory);
                label.classList.toggle('bg-slate-50', !skipHistory);
                label.classList.toggle('hover:bg-slate-50', !skipHistory);
            }
        });

        if (historyNote) historyNote.classList.toggle('hidden', !skipHistory);
        window.KitApp.saveChecklistTotal(skipHistory ? checkboxes.length - previousItems.length : checkboxes.length);
        window.KitApp.updateProgress();
    }

    var state = window.KitApp.getChecklistState();
    if (historyToggle) historyToggle.checked = getHistoryPreference();

    checkboxes.forEach(function (chk) {
        var id = chk.dataset.id;
        chk.checked = state[id] === true;

        chk.addEventListener('change', function () {
            var next = window.KitApp.getChecklistState();
            next[id] = chk.checked;
            window.KitApp.saveChecklistState(next);
            updateItemStyle(chk);
            window.KitApp.updateProgress();
        });

        updateItemStyle(chk);
    });

    if (historyToggle) {
        historyToggle.addEventListener('change', function () {
            saveHistoryPreference(historyToggle.checked);
            syncHistoryItems();
        });
    }

    syncHistoryItems();
})();
