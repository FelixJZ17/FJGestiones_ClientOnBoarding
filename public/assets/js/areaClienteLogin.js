const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const pinInput = document.getElementById('pin');
const togglePinButton = document.getElementById('togglePin');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');

function showMessage(message, type = 'error') {
    loginMessage.textContent = message;
    loginMessage.className = `rounded-xl px-4 py-3 text-sm font-semibold ${type === 'info'
        ? 'bg-blue-50 text-blue-800'
        : 'bg-red-50 text-red-700'}`;
}

function showBlockedMessage(message) {
    loginMessage.replaceChildren();
    loginMessage.append(document.createTextNode(message + ' '));
    const contactLink = document.createElement('a');
    contactLink.href = 'contacto.html';
    contactLink.textContent = 'Contactar con el administrador';
    contactLink.className = 'font-extrabold underline underline-offset-2';
    loginMessage.appendChild(contactLink);
    loginMessage.className = 'rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700';
}

function clearMessage() {
    loginMessage.textContent = '';
    loginMessage.className = 'hidden rounded-xl px-4 py-3 text-sm font-semibold';
}

function setLoading(isLoading) {
    loginButton.disabled = isLoading;
    loginButton.querySelector('i').className = isLoading
        ? 'fa-solid fa-spinner fa-spin'
        : 'fa-solid fa-right-to-bracket';
    loginButton.querySelector('span').textContent = isLoading
        ? 'Comprobando acceso...'
        : 'Entrar al área cliente';
}

async function redirectIfAuthenticated() {
    setLoading(true);
    showMessage('Comprobando sesión activa...', 'info');

    try {
        const response = await fetch('/api/cliente/me', { credentials: 'same-origin' });
        if (response.ok) {
            window.location.replace('area-cliente.html');
            return;
        }
        clearMessage();
    } catch (error) {
        clearMessage();
    } finally {
        setLoading(false);
    }
}

togglePinButton.addEventListener('click', () => {
    const showing = pinInput.type === 'text';
    pinInput.type = showing ? 'password' : 'text';
    togglePinButton.setAttribute('aria-label', showing ? 'Mostrar PIN' : 'Ocultar PIN');
    togglePinButton.setAttribute('aria-pressed', String(!showing));
    togglePinButton.querySelector('i').className = showing
        ? 'fa-solid fa-eye'
        : 'fa-solid fa-eye-slash';
});

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();

    if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
    }

    const username = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    setLoading(true);

    try {
        const response = await fetch('/api/cliente/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, pin }),
        });
        const payload = await response.json().catch(() => ({}));

        if (response.status === 404 || response.status === 501) {
            showMessage('El acceso de clientes todavía está en preparación.', 'info');
            return;
        }

        if (!response.ok) {
            if (payload.blocked) {
                showBlockedMessage(payload.error || 'El acceso está bloqueado.');
                return;
            }
            throw new Error(payload.error || 'No se ha podido validar el acceso.');
        }

        if (!payload.redirect) {
            throw new Error('El servidor no ha indicado el destino del área cliente.');
        }

        window.location.assign(payload.redirect);
    } catch (error) {
        if (error instanceof TypeError) {
            showMessage('No se puede conectar con el servidor. Inténtalo de nuevo en unos instantes.');
        } else {
            showMessage(error.message || 'No se ha podido validar el acceso.');
        }
    } finally {
        setLoading(false);
    }
});

redirectIfAuthenticated();
