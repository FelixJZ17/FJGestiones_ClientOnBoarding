# Backend del cuestionario y solicitudes de presupuesto

## Configuración local

1. Crear un entorno virtual e instalar dependencias:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Copiar `.env.example` como `.env` y completar `MAIL_PASSWORD` con una contraseña de aplicación de Gmail. No usar la contraseña normal de la cuenta.

3. Arrancar Flask:

```powershell
python app.py
```

4. Abrir `http://127.0.0.1:5000/`.

En local el backend guarda los envíos en `data/submissions.sqlite3` y envía un aviso a `MAIL_TO`. El directorio `data` se crea automáticamente.

El formulario de `presupuesto.html` utiliza el endpoint `/api/budget` y se guarda en la tabla `budget_requests` de SQLite o Supabase. La tabla se incluye en `supabase_schema.sql`; si el proyecto de Supabase ya estaba creado, hay que ejecutar también ese bloque nuevo en el SQL Editor.

El calendario PRO del área cliente utiliza `/api/pro/aeat-calendar` y la tabla `aeat_payment_events` de Supabase. Cada fila debe usar en `cliente` exactamente el mismo usuario que figura en `cliente_usuarios.username`; el backend filtra siempre por la sesión autenticada y nunca acepta el cliente desde el navegador. Para administrarlo inicialmente, usa el Table Editor de Supabase con MFA habilitado. `supabase_schema.sql` incluye los campos de vencimiento, importes, estado, plazos, comprobaciones y `fecha_pago`.

No abras `cuestionario.html` directamente con `file://` ni desde otro servidor de desarrollo: en ese caso `/api/questionnaire` no existe y el navegador mostrará `Failed to fetch`. Comprueba primero `http://127.0.0.1:5000/api/health`; debe devolver `{"ok": true}`. Si falla un envío, revisa la pestaña Network del navegador y la consola donde está ejecutándose Flask.

## Gmail

La cuenta `fjimenezgestiones@gmail.com` debe tener activada la verificación en dos pasos y una contraseña de aplicación para SMTP. Esa contraseña solo debe estar en `.env` o en las variables de entorno del servidor.

## Protección básica

- Límite de tamaño del JSON recibido.
- Validación de campos, email y consentimiento en servidor.
- Campo honeypot invisible para bots sencillos.
- Límite de cinco envíos por minuto y treinta por hora por IP.
- Límite adicional de cinco envíos por hora por dirección de email.
- Hash de la IP en SQLite, sin guardar la IP original.
- El origen puede restringirse con `ALLOWED_ORIGIN`.

Para producción, cambiar `RATELIMIT_STORAGE_URI` a Redis. El almacenamiento en memoria solo sirve para una instancia local o de pruebas. Para ataques volumétricos debe añadirse un CDN/WAF como Cloudflare delante de Flask; ningún límite dentro de Flask puede absorber por sí solo un DDoS grande.

## Datos y privacidad

El formulario contiene datos personales y de proyecto. La aplicación debe publicarse bajo HTTPS, mantener una política de privacidad accesible y limitar el acceso al archivo SQLite o sustituirlo por una base de datos gestionada con copias de seguridad.

## Producción en Vercel

Las páginas y `assets/` están dentro de `public/`, que Vercel sirve mediante CDN. Flask conserva las rutas `/api/*` y `vercel.json` configura la función Python.

SQLite solo se usa localmente. En producción se usa Supabase:

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase_schema.sql` desde el SQL Editor.
3. Copiar la URL del proyecto y la `service_role key` en las variables de Vercel. Esa clave nunca debe llegar al navegador.

Para el rate limit, crear Redis en Upstash desde Vercel Marketplace y guardar su URL `rediss://...` en `RATELIMIT_STORAGE_URI`.

Variables de Vercel:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RATELIMIT_STORAGE_URI
MAIL_USERNAME
MAIL_PASSWORD
MAIL_TO
IP_HASH_SALT
ALLOWED_ORIGIN=https://www.fjgestiones.com
```

En Vercel se debe importar el repositorio de GitHub y configurar las variables para `Preview` y `Production`. No se debe subir `.env` ni la base SQLite.

## Dominio y Cloudflare

Añade `fjgestiones.com` y `www.fjgestiones.com` en Vercel. Vercel mostrará los registros exactos que necesita cada dominio. Como Cloudflare gestiona el DNS, esos registros se añaden allí, no en GoDaddy.

Antes de cambiar nameservers o registros, conserva los registros MX/TXT actuales. Si no hay correo en el dominio, la configuración es más sencilla. Se recomienda usar `www.fjgestiones.com` como dominio principal y redirigir el dominio raíz desde Vercel. Para Cloudflare, activar `Full (strict)` cuando Vercel haya emitido el certificado.

## Hash de PIN de usuarios

Genera el hash localmente desde la raíz del proyecto:

```powershell
python -c "from getpass import getpass; from argon2 import PasswordHasher; print(PasswordHasher().hash(getpass('PIN: ')))"

Introduce el PIN cuando se solicite y copia el hash completo en la columna pin_hash de Supabase.
Importante:
- Nunca guardes el PIN original en Supabase.
- No incluyas hashes reales en el repositorio ni en este README.
- Trata el hash como información sensible.
- El mismo PIN generará hashes diferentes; es normal porque Argon2 usa una sal aleatoria.
- Copia el hash completo, empezando por $argon2id$.
- Guarda pin_hash como tipo text.
- No conviertas los PIN en números, porque podrían comenzar por 0.
