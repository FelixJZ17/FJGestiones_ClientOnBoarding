import hashlib
import json
import os
import re
import smtplib
import sqlite3
import ssl
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

try:
    from supabase import create_client
except ImportError:
    create_client = None


ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / 'public'
load_dotenv(ROOT / '.env')

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024

RATE_LIMIT_STORAGE_URI = os.getenv('RATELIMIT_STORAGE_URI', '').strip()
if os.getenv('VERCEL') and not RATE_LIMIT_STORAGE_URI:
    raise RuntimeError('RATELIMIT_STORAGE_URI es obligatoria en Vercel')

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri=RATE_LIMIT_STORAGE_URI or 'memory://',
    default_limits=[],
)

DATA_DIR = ROOT / 'data'
DATABASE_PATH = Path(os.getenv('DATABASE_PATH', DATA_DIR / 'submissions.sqlite3'))
SUPABASE_URL = os.getenv('SUPABASE_URL', '').strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()
SUPABASE_TABLE = 'questionnaire_submissions'
SUPABASE_CLIENT = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and create_client
    else None
)
MAIL_HOST = 'smtp.gmail.com'
MAIL_PORT = 465
MAIL_USERNAME = os.getenv('MAIL_USERNAME', '').strip()
MAIL_PASSWORD = ''.join(os.getenv('MAIL_PASSWORD', '').split())
MAIL_TO = os.getenv('MAIL_TO', 'fjimenezgestiones@gmail.com').strip()
IP_HASH_SALT = os.getenv('IP_HASH_SALT', 'change-this-salt')
ALLOWED_ORIGIN = os.getenv('ALLOWED_ORIGIN', '').rstrip('/')

ALLOWED_PAGES = {
    'index', 'obligaciones', 'alta-autonomos', 'calendario', 'gastos',
    'guia-trabajadores', 'factura', 'checklist', 'cuestionario', 'contacto',
}

REQUIRED_FIELDS = (
    'nombre', 'email', 'telefono', 'actividad', 'alta', 'local', 'trabajadores',
    'vision', 'formacion', 'experiencia', 'horario', 'contabilidad', 'paro',
    'preocupacion', 'canal', 'expectativas',
)

QUIZ_CORRECT = {
    'q_trimestres': 'a',
    'q_modelo115': 'a',
    'q_contrato': 'a',
    'q_plazos': 'a',
    'q_gastos': 'a',
    'q_factura': 'a',
    'q_documentos': 'a',
    'q_fecha_factura': 'a',
    'q_baja_medica': 'a',
    'q_roi': 'a',
}

FIELD_LABELS = {
    'actividad': 'Actividad',
    'alta': 'Alta fiscal',
    'local': 'Local u oficina',
    'trabajadores': 'Trabajadores',
    'vision': 'Visión a 1 año',
    'formacion': 'Formación en el sector',
    'experiencia': 'Experiencia previa',
    'horario': 'Horario previsto',
    'contabilidad': 'Contabilidad / facturación',
    'facturacion': 'Facturación esperada',
    'beneficio': 'Beneficio esperado',
    'inversion': 'Inversión inicial',
    'paro': 'Prestación por desempleo pendiente',
    'paroCantidad': 'Cantidad de prestación pendiente',
    'preocupacion': 'Preocupación principal',
    'canal': 'Canal preferido',
    'expectativas': 'Qué espera de la asesoría',
    'observaciones': 'Observaciones',
}

QUIZ_LABELS = {
    'q_trimestres': 'Calendario trimestral',
    'q_modelo115': 'Modelo 115',
    'q_contrato': 'Contratación',
    'q_plazos': 'Plazos de entrega',
    'q_gastos': 'Gastos deducibles',
    'q_factura': 'Factura correcta',
    'q_documentos': 'Documentación de facturas',
    'q_fecha_factura': 'Fecha y numeración de facturas',
    'q_baja_medica': 'Baja médica',
    'q_roi': 'Operaciones intracomunitarias',
}


def init_database():
    if SUPABASE_CLIENT:
        return
    if os.getenv('VERCEL'):
        raise RuntimeError('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias en Vercel')
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            '''
            CREATE TABLE IF NOT EXISTS questionnaire_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                quiz_score TEXT NOT NULL,
                consent INTEGER NOT NULL,
                ip_hash TEXT NOT NULL,
                payload_json TEXT NOT NULL
            )
            '''
        )
        connection.commit()


def save_submission(normalized, created_at):
    record = {
        'created_at': created_at,
        'name': normalized['nombre'],
        'email': normalized['email'],
        'phone': normalized['telefono'],
        'quiz_score': normalized['quiz_score'],
        'consent': True,
        'ip_hash': hash_ip(),
        'payload_json': normalized,
    }

    if SUPABASE_CLIENT:
        response = SUPABASE_CLIENT.table(SUPABASE_TABLE).insert(record).execute()
        row = response.data[0] if response.data else {}
        return row.get('id')

    with sqlite3.connect(DATABASE_PATH, timeout=30) as connection:
        cursor = connection.execute(
            '''
            INSERT INTO questionnaire_submissions
                (created_at, name, email, phone, quiz_score, consent, ip_hash, payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                created_at,
                normalized['nombre'],
                normalized['email'],
                normalized['telefono'],
                normalized['quiz_score'],
                1,
                hash_ip(),
                json.dumps(normalized, ensure_ascii=False),
            ),
        )
        connection.commit()
        return cursor.lastrowid


def clean_text(value, limit=2000):
    if value is None:
        return ''
    value = str(value).strip()
    if len(value) > limit:
        raise ValueError('Campo demasiado largo')
    return value


def valid_email(value):
    return bool(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value))


def request_origin_allowed():
    if not ALLOWED_ORIGIN:
        return True
    origin = request.headers.get('Origin', '').rstrip('/')
    return not origin or origin == ALLOWED_ORIGIN


def hash_ip():
    address = get_remote_address() or 'unknown'
    return hashlib.sha256((IP_HASH_SALT + address).encode('utf-8')).hexdigest()


def email_rate_key():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get('email', '')).strip().lower()
    return f'email:{email}' if email else f'ip:{get_remote_address()}'


def calculate_quiz_score(answers):
    correct = sum(answers.get(name) == expected for name, expected in QUIZ_CORRECT.items())
    return correct, len(QUIZ_CORRECT)


def build_email_body(payload, submission_id, correct, total):
    lines = [
        f'Nuevo cuestionario recibido (ID {submission_id})',
        f'Fecha: {datetime.now(timezone.utc).isoformat()}',
        '',
        f'Nombre: {payload.get("nombre", "")}',
        f'Email: {payload.get("email", "")}',
        f'Teléfono / WhatsApp: {payload.get("telefono", "")}',
        '',
        'DATOS DEL PROYECTO',
    ]

    for key, label in FIELD_LABELS.items():
        lines.append(f'{label}: {payload.get(key, "")}')

    lines.extend(['', 'CONTENIDO A REPASAR'])
    review_topics = payload.get('quiz_review_topics', [])
    if review_topics:
        lines.extend(f'- {topic}' for topic in review_topics)
    else:
        lines.append('No hay contenidos pendientes de repaso.')

    lines.extend(['', 'RECOMENDACIONES'])
    recommendations = payload.get('recommendations', [])
    if recommendations:
        lines.extend(f'- {recommendation}' for recommendation in recommendations)
    else:
        lines.append('Sin recomendaciones adicionales.')

    lines.extend(['', 'RESPUESTAS DEL CUESTIONARIO'])
    answers_text = payload.get('quiz_answers_text', {})
    for key, value in payload.get('quiz_answers', {}).items():
        answer = answers_text.get(key) or f'opción {value.upper()}'
        lines.append(f'{QUIZ_LABELS.get(key, key)}: {answer}')

    return '\n'.join(lines)


def send_notification(payload, submission_id, correct, total):
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        app.logger.warning('Gmail no configurado: se ha guardado el formulario %s sin enviar email', submission_id)
        return False

    message = EmailMessage()
    message['Subject'] = 'Nuevo cuestionario de proyecto'
    message['From'] = MAIL_USERNAME
    message['To'] = MAIL_TO
    message['Reply-To'] = payload['email']
    message.set_content(build_email_body(payload, submission_id, correct, total))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(MAIL_HOST, MAIL_PORT, context=context, timeout=20) as server:
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        server.send_message(message)
    return True


@app.get('/')
def home():
    return send_from_directory(PUBLIC_DIR, 'index.html')


@app.get('/<page>.html')
def page(page):
    if page not in ALLOWED_PAGES:
        return jsonify({'error': 'Página no encontrada'}), 404
    return send_from_directory(PUBLIC_DIR, f'{page}.html')


@app.get('/assets/<path:filename>')
def assets(filename):
    return send_from_directory(PUBLIC_DIR / 'assets', filename)


@app.get('/api/health')
def health():
    response = {
        'ok': True,
        'mail_configured': bool(MAIL_USERNAME and MAIL_PASSWORD),
        'database': 'supabase' if SUPABASE_CLIENT else 'sqlite',
        'database_ok': True,
    }
    if SUPABASE_CLIENT:
        try:
            SUPABASE_CLIENT.table(SUPABASE_TABLE).select('id').limit(1).execute()
        except Exception:
            app.logger.exception('La comprobación de Supabase ha fallado')
            response['database_ok'] = False
            return jsonify(response), 503
    return jsonify(response)


@app.post('/api/questionnaire')
@limiter.limit('5 per minute')
@limiter.limit('30 per hour')
@limiter.limit('5 per hour', key_func=email_rate_key)
def receive_questionnaire():
    app.logger.info('POST /api/questionnaire origin=%s content_type=%s', request.headers.get('Origin'), request.content_type)
    if not request_origin_allowed():
        return jsonify({'error': 'Origen no permitido'}), 403

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({'error': 'Formato de datos no válido'}), 400

    try:
        # El campo trampa evita que los bots habituales lleguen a la base de datos.
        if clean_text(payload.get('website')):
            return jsonify({'ok': True}), 202

        if payload.get('consent') is not True:
            return jsonify({'error': 'Es necesario aceptar la política de privacidad'}), 400

        normalized = {
            key: clean_text(value)
            for key, value in payload.items()
            if key not in {'quiz_answers', 'quiz_answers_text', 'quiz_review_topics', 'recommendations'}
        }
        for field in REQUIRED_FIELDS:
            if not normalized.get(field):
                return jsonify({'error': f'Falta el campo {field}'}), 400

        if not valid_email(normalized['email']):
            return jsonify({'error': 'El email no es válido'}), 400

        answers = payload.get('quiz_answers')
        if not isinstance(answers, dict):
            return jsonify({'error': 'Faltan las respuestas del cuestionario'}), 400

        answers = {clean_text(key, 80): clean_text(value, 20) for key, value in answers.items()}
        answer_texts = payload.get('quiz_answers_text', {})
        if not isinstance(answer_texts, dict):
            answer_texts = {}
        answer_texts = {clean_text(key, 80): clean_text(value) for key, value in answer_texts.items()}
        review_topics = payload.get('quiz_review_topics', [])
        if not isinstance(review_topics, list):
            review_topics = []
        review_topics = [clean_text(value, 200) for value in review_topics]
        recommendations = payload.get('recommendations', [])
        if not isinstance(recommendations, list):
            recommendations = []
        recommendations = [clean_text(value, 1000) for value in recommendations]
        correct, total = calculate_quiz_score(answers)
        normalized['quiz_answers'] = answers
        normalized['quiz_answers_text'] = answer_texts
        normalized['quiz_review_topics'] = review_topics
        normalized['recommendations'] = recommendations
        normalized['quiz_score'] = f'{correct}/{total}'
        normalized['consent'] = True
        normalized.pop('website', None)
    except ValueError as error:
        return jsonify({'error': str(error)}), 400

    created_at = datetime.now(timezone.utc).isoformat()
    try:
        submission_id = save_submission(normalized, created_at)
    except Exception:
        app.logger.exception('No se pudo guardar el formulario en %s', 'Supabase' if SUPABASE_CLIENT else 'SQLite')
        return jsonify({'error': 'No se pudo guardar el formulario en la base de datos'}), 500

    try:
        mail_sent = send_notification(normalized, submission_id, correct, total)
    except (OSError, smtplib.SMTPException) as error:
        app.logger.exception('No se pudo enviar el email del formulario %s: %s', submission_id, error)
        mail_sent = False

    return jsonify({'ok': True, 'id': submission_id, 'mail_sent': mail_sent}), 201


@app.errorhandler(413)
def request_too_large(error):
    return jsonify({'error': 'El formulario supera el tamaño permitido'}), 413


@app.errorhandler(429)
def rate_limited(error):
    return jsonify({'error': 'Demasiados intentos. Espera unos minutos antes de volver a enviar.'}), 429


@app.errorhandler(500)
def internal_error(error):
    app.logger.exception('Error interno procesando la petición')
    return jsonify({'error': 'Error interno del servidor'}), 500


init_database()

if __name__ == '__main__':
    app.run(host=os.getenv('FLASK_HOST', '127.0.0.1'), port=int(os.getenv('FLASK_PORT', '5000')))
