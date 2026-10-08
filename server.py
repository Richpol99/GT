import os
import sys
import secrets
import urllib.request
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, session, redirect
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, 'database'))

import db

app = Flask(__name__, static_folder=BASE_DIR)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app, supports_credentials=True)

CAR_CACHE_DIR = os.path.join(BASE_DIR, 'assets', 'cars', 'cache')
os.makedirs(CAR_CACHE_DIR, exist_ok=True)

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

@app.route('/rangos.html')
@app.route('/rangos')
def redirect_rangos():
    return redirect('/paddock.html', code=302)

@app.route('/circuitos')
@app.route('/circuitos/')
@app.route('/circuitos.html')
def serve_circuitos():
    return send_from_directory(BASE_DIR, 'circuitos.html')

@app.route('/garaje')
@app.route('/garaje/')
@app.route('/garaje.html')
def serve_garaje():
    return send_from_directory(BASE_DIR, 'garaje.html')

@app.route('/<path:filename>')
def serve_file(filename):
    clean_name = filename.strip('/')
    file_path = os.path.join(BASE_DIR, clean_name)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(BASE_DIR, clean_name)
    # If ends without .html, check if .html exists
    if os.path.exists(file_path + '.html') and os.path.isfile(file_path + '.html'):
        return send_from_directory(BASE_DIR, clean_name + '.html')
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

@app.route('/api/paddock', methods=['GET'])
def get_paddock():
    try:
        drivers = db.get_paddock_drivers()
        return jsonify(drivers)
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
# API DE AUTOS GRAN TURISMO 6
# ==========================================

@app.route('/api/cars', methods=['GET'])
def api_get_cars():
    try:
        search = request.args.get('search')
        manufacturer = request.args.get('manufacturer')
        drivetrain = request.args.get('drivetrain')
        category = request.args.get('category')
        sort_by = request.args.get('sort_by', 'pp_desc')
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 24, type=int)

        data = db.get_cars(
            search=search,
            manufacturer=manufacturer,
            drivetrain=drivetrain,
            category=category,
            sort_by=sort_by,
            page=page,
            limit=limit
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cars/<int:car_id>', methods=['GET'])
def api_get_car_detail(car_id):
    try:
        car = db.get_car_by_id(car_id)
        if not car:
            return jsonify({'error': 'Auto no encontrado'}), 404
        return jsonify(car)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/car-image/<int:car_id>', methods=['GET'])
def api_get_car_image(car_id):
    """
    Reverse proxy and disk cache for Gran Turismo 6 car images.
    Eliminates Wikia hotlinking referer blocks, serves local assets,
    and caches downloaded images locally.
    """
    try:
        car = db.get_car_by_id(car_id)
        if not car:
            return send_from_directory(os.path.join(BASE_DIR, 'assets', 'cars'), 'default.jpg')

        # 1. Check if local dedicated image is registered and present on disk
        if car.get('local_image'):
            local_rel = car['local_image'].replace('assets/cars/', '').lstrip('/')
            local_full = os.path.join(BASE_DIR, 'assets', 'cars', local_rel)
            if os.path.exists(local_full):
                return send_from_directory(os.path.join(BASE_DIR, 'assets', 'cars'), local_rel)

        # 2. Check disk cache
        for ext in ['webp', 'jpg', 'png', 'jpeg']:
            cached_filename = f"{car_id}.{ext}"
            cache_path = os.path.join(CAR_CACHE_DIR, cached_filename)
            if os.path.exists(cache_path) and os.path.getsize(cache_path) > 500:
                mimetype = 'image/webp' if ext == 'webp' else ('image/jpeg' if ext in ['jpg', 'jpeg'] else 'image/png')
                return send_from_directory(CAR_CACHE_DIR, cached_filename, mimetype=mimetype)

        # 3. Check if image_url exists
        image_url = car.get('image_url')
        if not image_url:
            return send_from_directory(os.path.join(BASE_DIR, 'assets', 'cars'), 'default.jpg')

        # 4. Fetch from remote CDN without Referer header (to prevent 404 hotlink block)
        req = urllib.request.Request(
            image_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            content = response.read()
            content_type = response.headers.get_content_type() or 'image/webp'
            if len(content) > 500:
                ext = 'webp'
                if 'jpeg' in content_type or 'jpg' in content_type:
                    ext = 'jpg'
                elif 'png' in content_type:
                    ext = 'png'

                cached_filename = f"{car_id}.{ext}"
                cache_path = os.path.join(CAR_CACHE_DIR, cached_filename)
                with open(cache_path, 'wb') as f:
                    f.write(content)
                return send_from_directory(CAR_CACHE_DIR, cached_filename, mimetype=content_type)

        return send_from_directory(os.path.join(BASE_DIR, 'assets', 'cars'), 'default.jpg')
    except Exception as e:
        app.logger.warning(f"Error serving car image {car_id}: {e}")
        return send_from_directory(os.path.join(BASE_DIR, 'assets', 'cars'), 'default.jpg')

@app.route('/api/cars/manufacturers', methods=['GET'])
def api_get_manufacturers():
    try:
        manufacturers = db.get_car_manufacturers()
        return jsonify(manufacturers)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cars/stats', methods=['GET'])
def api_get_cars_stats():
    try:
        stats = db.get_cars_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# API DE CIRCUITOS GRAN TURISMO 6
# ==========================================

@app.route('/api/tracks', methods=['GET'])
def api_get_tracks():
    try:
        search = request.args.get('search')
        category = request.args.get('category')
        sort_by = request.args.get('sort_by', 'name_asc')
        tracks = db.get_tracks(search=search, category=category, sort_by=sort_by)
        return jsonify(tracks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tracks/<int:track_id>', methods=['GET'])
def api_get_track_detail(track_id):
    try:
        track = db.get_track_by_id(track_id)
        if not track:
            return jsonify({'error': 'Circuito no encontrado'}), 404
        return jsonify(track)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tracks/stats', methods=['GET'])
def api_get_tracks_stats():
    try:
        stats = db.get_tracks_stats()
        return jsonify(stats)
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
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
