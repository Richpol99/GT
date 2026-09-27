import os
import sys
import secrets
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, 'database'))

import db

app = Flask(__name__, static_folder=BASE_DIR)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app, supports_credentials=True)

# Auth decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_user'):
            return jsonify({'error': 'No autorizado. Inicie sesión como administrador.'}), 401
        return f(*args, **kwargs)
    return decorated_function

# ==========================================
# RUTAS ESTÁTICAS Y VISTAS
# ==========================================

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/admin')
@app.route('/admin/')
def admin_panel():
    if not session.get('admin_user'):
        return send_from_directory(os.path.join(BASE_DIR, 'admin'), 'login.html')
    return send_from_directory(os.path.join(BASE_DIR, 'admin'), 'index.html')

@app.route('/admin/<path:filename>')
def admin_assets(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'admin'), filename)

@app.route('/<path:filename>')
def serve_file(filename):
    file_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(BASE_DIR, filename)
    # If ends without .html, check if .html exists
    if os.path.exists(file_path + '.html'):
        return send_from_directory(BASE_DIR, filename + '.html')
    return send_from_directory(BASE_DIR, '404.html'), 404

# ==========================================
# API PÚBLICA DE TORNEO
# ==========================================

@app.route('/api/seasons', methods=['GET'])
def get_seasons():
    try:
        seasons = db.get_seasons()
        return jsonify(seasons)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/seasons/<int:season_id>/standings', methods=['GET'])
def get_season_standings(season_id):
    try:
        standings = db.get_standings(season_id)
        return jsonify(standings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/seasons/<int:season_id>/races', methods=['GET'])
def get_season_races(season_id):
    try:
        races = db.get_races(season_id)
        return jsonify(races)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/drivers', methods=['GET'])
def get_drivers():
    q = request.args.get('q', None)
    try:
        drivers = db.get_drivers(q)
        return jsonify(drivers)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/drivers/<psn_id>', methods=['GET'])
def get_driver_profile(psn_id):
    try:
        conn = db.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, psn_id, country, rank FROM drivers WHERE psn_id = ?", (psn_id.strip(),))
        driver = cursor.fetchone()
        if not driver:
            conn.close()
            return jsonify({'error': 'Piloto no encontrado'}), 404
        
        driver_data = dict(driver)
        # Get race history
        cursor.execute("""
            SELECT 
                r.id as race_id,
                r.title as race_title,
                r.round_number,
                r.car,
                s.name as season_name,
                rr.position,
                rr.points,
                rr.notes
            FROM race_results rr
            JOIN races r ON r.id = rr.race_id
            JOIN seasons s ON s.id = r.season_id
            WHERE rr.driver_id = ?
            ORDER BY r.season_id DESC, r.round_number DESC
        """, (driver['id'],))
        driver_data['history'] = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(driver_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# API DE ADMINISTRACIÓN
# ==========================================

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Usuario y contraseña requeridos'}), 400

    conn = db.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, salt FROM admin_users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()

    if not user or not db.verify_password(password, user['password_hash'], user['salt']):
        return jsonify({'error': 'Credenciales incorrectas'}), 401

    session['admin_user'] = user['username']
    session['admin_id'] = user['id']
    return jsonify({'status': 'ok', 'user': user['username']})

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.clear()
    return jsonify({'status': 'ok', 'message': 'Sesión cerrada'})

@app.route('/api/admin/check-auth', methods=['GET'])
def admin_check_auth():
    if session.get('admin_user'):
        return jsonify({'authenticated': True, 'user': session.get('admin_user')})
    return jsonify({'authenticated': False}), 401

@app.route('/api/admin/races', methods=['POST'])
@admin_required
def create_race():
    data = request.get_json() or {}
    season_id = data.get('season_id')
    round_number = data.get('round_number')
    title = data.get('title', '').strip()
    car = data.get('car', '').strip()
    track = data.get('track', '').strip()
    race_date = data.get('race_date', '').strip()
    results = data.get('results', [])

    if not season_id or not round_number or not title:
        return jsonify({'error': 'Campos temporada, ronda y título son obligatorios'}), 400

    try:
        race_id = db.create_race_with_results(
            season_id=int(season_id),
            round_number=int(round_number),
            title=title,
            car=car,
            track=track,
            race_date=race_date,
            results=results
        )
        return jsonify({'status': 'ok', 'race_id': race_id, 'message': 'Carrera guardada con éxito'}), 201
    except Exception as e:
        return jsonify({'error': f'Error guardando carrera: {str(e)}'}), 500

@app.route('/api/admin/races/<int:race_id>', methods=['DELETE'])
@admin_required
def delete_race(race_id):
    try:
        db.delete_race(race_id)
        return jsonify({'status': 'ok', 'message': 'Carrera eliminada'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/drivers', methods=['POST'])
@admin_required
def update_driver():
    data = request.get_json() or {}
    driver_id = data.get('driver_id')
    psn_id = data.get('psn_id', '').strip()
    country = data.get('country', 'pdi').strip().lower()
    rank = data.get('rank', 'bronce').strip().lower()

    if not psn_id:
        return jsonify({'error': 'ID de PSN es obligatorio'}), 400

    conn = db.get_db()
    cursor = conn.cursor()
    try:
        if driver_id:
            cursor.execute("UPDATE drivers SET psn_id = ?, country = ?, rank = ? WHERE id = ?",
                           (psn_id, country, rank, driver_id))
        else:
            cursor.execute("INSERT INTO drivers (psn_id, country, rank) VALUES (?, ?, ?)",
                           (psn_id, country, rank))
        conn.commit()
        return jsonify({'status': 'ok', 'message': 'Piloto actualizado con éxito'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/seasons', methods=['POST'])
@admin_required
def create_season():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    is_active = 1 if data.get('is_active', True) else 0

    if not name:
        return jsonify({'error': 'Nombre de temporada requerido'}), 400

    conn = db.get_db()
    cursor = conn.cursor()
    try:
        if is_active:
            cursor.execute("UPDATE seasons SET is_active = 0")
        cursor.execute("INSERT INTO seasons (name, is_active) VALUES (?, ?)", (name, is_active))
        conn.commit()
        return jsonify({'status': 'ok', 'message': 'Temporada creada con éxito'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/seasons/<int:season_id>/activate', methods=['PUT'])
@admin_required
def activate_season(season_id):
    conn = db.get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE seasons SET is_active = 0")
        cursor.execute("UPDATE seasons SET is_active = 1 WHERE id = ?", (season_id,))
        conn.commit()
        return jsonify({'status': 'ok', 'message': 'Temporada activada'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    # Initialize DB and ensure tables exist
    db.init_db()
    port = int(os.environ.get('PORT', 3000))
    print(f"Servidor GT Academy iniciado en http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
