const greeting = document.getElementById('greeting');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const logoutButton = document.getElementById('logoutButton');
const proTools = document.getElementById('proTools');

function formatDisplayName(username) {
    return String(username || '').trim().toLocaleLowerCase('es-ES').replace(/(^|[\s-])([^\s-])/g, (match, separator, letter) => {
        return separator + letter.toLocaleUpperCase('es-ES');
    });
}

async function loadClientSession() {
    try {
        const response = await fetch('/api/cliente/me', { credentials: 'same-origin' });
        const payload = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.location.replace('Area-cliente-login.html');
            return;
        }

        if (!response.ok) {
            throw new Error(payload.error || 'No se pudo comprobar la sesión.');
        }

        greeting.textContent = `Hola ${formatDisplayName(payload.username)}`;
        greeting.hidden = false;
        loadingMessage.hidden = true;
        if (proTools) proTools.classList.remove('hidden');
    } catch (error) {
        loadingMessage.hidden = true;
        errorMessage.textContent = error.message || 'No se pudo cargar el área cliente.';
        errorMessage.hidden = false;
    }
}

logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
        await fetch('/api/cliente/logout', {
            method: 'POST',
            credentials: 'same-origin',
        });
    } finally {
        window.location.replace('Area-cliente-login.html');
    }
});

loadClientSession();
