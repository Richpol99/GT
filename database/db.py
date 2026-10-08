import os
import json
import sqlite3
import hashlib
import secrets

DB_PATH = os.path.join(os.path.dirname(__file__), 'gt_academy.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def hash_password(password: str, salt: bytes = None):
    if salt is None:
        salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000
    )
    return key.hex(), salt.hex()

def verify_password(password: str, stored_hash: str, salt_hex: str) -> bool:
    salt = bytes.fromhex(salt_hex)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000
    )
    return secrets.compare_digest(key.hex(), stored_hash)

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        psn_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
        country TEXT NOT NULL DEFAULT 'pdi',
        rank TEXT NOT NULL DEFAULT 'bronce',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS races (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        round_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        car TEXT NOT NULL,
        track TEXT DEFAULT '',
        race_date TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS race_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        race_id INTEGER NOT NULL,
        driver_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        is_pole INTEGER DEFAULT 0,
        is_fastest_lap INTEGER DEFAULT 0,
        penalty_pts INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
        UNIQUE(race_id, driver_id),
        UNIQUE(race_id, position)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_races_season ON races(season_id);
    CREATE INDEX IF NOT EXISTS idx_results_race ON race_results(race_id);
    CREATE INDEX IF NOT EXISTS idx_results_driver ON race_results(driver_id);

    CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        country TEXT NOT NULL,
        country_code TEXT NOT NULL,
        location TEXT NOT NULL,
        length_km REAL NOT NULL,
        turns INTEGER NOT NULL,
        elevation_m REAL NOT NULL,
        longest_straight_m REAL NOT NULL,
        layouts_count INTEGER NOT NULL DEFAULT 1,
        time_progression INTEGER NOT NULL DEFAULT 0,
        weather_change INTEGER NOT NULL DEFAULT 0,
        laser_scanned INTEGER NOT NULL DEFAULT 0,
        first_game TEXT NOT NULL,
        record_lap TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        svg_path TEXT DEFAULT '',
        history_gt TEXT NOT NULL,
        history_real TEXT NOT NULL,
        driving_tips TEXT NOT NULL,
        curiosities TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_category ON tracks(category);
    CREATE INDEX IF NOT EXISTS idx_tracks_country ON tracks(country);
    """)

    conn.commit()
    conn.close()

def create_admin_user_if_none(username='admin', password='password123'):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM admin_users WHERE username = ?", (username,))
    row = cursor.fetchone()
    if not row:
        pwd_hash, salt = hash_password(password)
        cursor.execute(
            "INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)",
            (username, pwd_hash, salt)
        )
        conn.commit()
    conn.close()

def get_seasons():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, is_active FROM seasons ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_active_season():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, is_active FROM seasons WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT id, name, is_active FROM seasons ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_standings(season_id: int):
    conn = get_db()
    cursor = conn.cursor()
    query = """
    SELECT 
        d.id AS driver_id,
        d.psn_id,
        d.country,
        d.rank,
        COALESCE(SUM(rr.points), 0) AS total_points,
        COUNT(rr.id) AS races_completed,
        SUM(CASE WHEN rr.position = 1 THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN rr.position BETWEEN 1 AND 3 THEN 1 ELSE 0 END) AS podiums
    FROM drivers d
    INNER JOIN race_results rr ON rr.driver_id = d.id
    INNER JOIN races r ON r.id = rr.race_id AND r.season_id = ?
    GROUP BY d.id
    ORDER BY total_points DESC, wins DESC, podiums DESC, d.psn_id ASC
    """
    cursor.execute(query, (season_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    for i, r in enumerate(rows, start=1):
        r['position'] = i
    conn.close()
    return rows

def get_races(season_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, season_id, round_number, title, car, track, race_date 
        FROM races 
        WHERE season_id = ? 
        ORDER BY round_number DESC, id DESC
    """, (season_id,))
    races = [dict(r) for r in cursor.fetchall()]

    for race in races:
        cursor.execute("""
            SELECT 
                rr.position,
                rr.points,
                rr.is_pole,
                rr.is_fastest_lap,
                rr.penalty_pts,
                rr.notes,
                d.id AS driver_id,
                d.psn_id,
                d.country,
                d.rank
            FROM race_results rr
            JOIN drivers d ON d.id = rr.driver_id
            WHERE rr.race_id = ?
            ORDER BY rr.position ASC
        """, (race['id'],))
        race['results'] = [dict(res) for res in cursor.fetchall()]

    conn.close()
    return races

def get_drivers(query=None):
    conn = get_db()
    cursor = conn.cursor()
    if query:
        search = f"%{query.strip()}%"
        cursor.execute("SELECT id, psn_id, country, rank FROM drivers WHERE psn_id LIKE ? OR country LIKE ? ORDER BY psn_id ASC", (search, search))
    else:
        cursor.execute("SELECT id, psn_id, country, rank FROM drivers ORDER BY psn_id ASC")
    drivers = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return drivers

def get_paddock_drivers():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            d.id AS driver_id,
            d.psn_id,
            d.country,
            d.rank,
            COALESCE(SUM(rr.points), 0) AS total_points,
            COUNT(rr.id) AS races_count,
            SUM(CASE WHEN rr.position = 1 THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN rr.position BETWEEN 1 AND 3 THEN 1 ELSE 0 END) AS podiums,
            SUM(CASE WHEN rr.is_pole = 1 THEN 1 ELSE 0 END) AS poles,
            SUM(CASE WHEN rr.is_fastest_lap = 1 THEN 1 ELSE 0 END) AS fastest_laps
        FROM drivers d
        LEFT JOIN race_results rr ON rr.driver_id = d.id
        GROUP BY d.id
        ORDER BY total_points DESC, wins DESC, podiums DESC, d.psn_id ASC
    """)
    drivers = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT 
            rr.driver_id,
            r.car,
            COUNT(rr.id) as races_count,
            SUM(CASE WHEN rr.position = 1 THEN 1 ELSE 0 END) as wins_count,
            MIN(rr.position) as best_pos
        FROM race_results rr
        JOIN races r ON r.id = rr.race_id
        GROUP BY rr.driver_id, r.car
        ORDER BY rr.driver_id, wins_count DESC, best_pos ASC, races_count DESC
    """)
    car_rows = cursor.fetchall()
    driver_signature_cars = {}
    for cr in car_rows:
        d_id = cr['driver_id']
        if d_id not in driver_signature_cars:
            driver_signature_cars[d_id] = cr['car']

    for d in drivers:
        d['signature_car'] = driver_signature_cars.get(d['driver_id'], 'Ford GT 2006')

    conn.close()
    return drivers

def create_race_with_results(season_id: int, round_number: int, title: str, car: str, track: str, race_date: str, results: list):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO races (season_id, round_number, title, car, track, race_date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (season_id, round_number, title, car, track, race_date))
        race_id = cursor.lastrowid

        for item in results:
            psn_id = item.get('psn_id', '').strip()
            driver_id = item.get('driver_id')
            country = item.get('country', 'pdi').strip().lower()

            if not psn_id and driver_id:
                cursor.execute("SELECT psn_id, country FROM drivers WHERE id = ?", (driver_id,))
                d_row = cursor.fetchone()
                if d_row:
                    psn_id = d_row['psn_id']
                    if not item.get('country'):
                        country = d_row['country'] or 'pdi'

            if not psn_id:
                continue

            position = int(item['position'])
            points = int(item.get('points', 0))
            is_pole = 1 if item.get('is_pole') else 0
            is_fastest_lap = 1 if item.get('is_fastest_lap') else 0
            penalty_pts = int(item.get('penalty_pts', 0))
            notes = item.get('notes', '')

            # Get or create driver
            cursor.execute("SELECT id FROM drivers WHERE psn_id = ?", (psn_id,))
            driver_row = cursor.fetchone()
            if driver_row:
                driver_id = driver_row['id']
                if country and country != 'pdi':
                    cursor.execute("UPDATE drivers SET country = ? WHERE id = ?", (country, driver_id))
            else:
                cursor.execute("INSERT INTO drivers (psn_id, country) VALUES (?, ?)", (psn_id, country))
                driver_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO race_results (race_id, driver_id, position, points, is_pole, is_fastest_lap, penalty_pts, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (race_id, driver_id, position, points, is_pole, is_fastest_lap, penalty_pts, notes))

        conn.commit()
        return race_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def delete_race(race_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM races WHERE id = ?", (race_id,))
    conn.commit()
    conn.close()

def update_driver(driver_id: int, psn_id: str, country: str, rank: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE drivers 
        SET psn_id = ?, country = ?, rank = ? 
        WHERE id = ?
    """, (psn_id.strip(), country.strip().lower(), rank.strip().lower(), driver_id))
    conn.commit()
    conn.close()

# ==========================================
# GRAN TURISMO 6 - CARS DATABASE HELPERS
# ==========================================

def get_cars(search=None, manufacturer=None, drivetrain=None, category=None, sort_by='pp_desc', page=1, limit=24):
    conn = get_db()
    cursor = conn.cursor()

    conditions = []
    params = []

    if search:
        search_term = f"%{search.strip()}%"
        conditions.append("(name LIKE ? OR manufacturer LIKE ?)")
        params.extend([search_term, search_term])

    if manufacturer and manufacturer.lower() != 'all':
        conditions.append("manufacturer = ?")
        params.append(manufacturer.strip())

    if drivetrain and drivetrain.lower() != 'all':
        conditions.append("drivetrain = ?")
        params.append(drivetrain.strip().upper())

    if category and category.lower() != 'all':
        conditions.append("category = ?")
        params.append(category.strip())

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Sort options
    sort_dict = {
        'pp_desc': 'pp DESC, power_hp DESC',
        'pp_asc': 'pp ASC, power_hp ASC',
        'power_desc': 'power_hp DESC, pp DESC',
        'power_asc': 'power_hp ASC, pp ASC',
        'weight_asc': 'weight_kg ASC',
        'weight_desc': 'weight_kg DESC',
        'name_asc': 'name ASC',
        'name_desc': 'name DESC',
        'year_desc': 'year DESC',
        'year_asc': 'year ASC'
    }
    order_clause = f"ORDER BY {sort_dict.get(sort_by, 'pp DESC')}"

    # Count total matching rows
    count_query = f"SELECT COUNT(*) FROM cars {where_clause}"
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]

    # Calculate pagination
    page = max(1, int(page))
    limit = max(1, min(100, int(limit)))
    offset = (page - 1) * limit
    total_pages = max(1, (total_count + limit - 1) // limit)

    # Fetch cars
    query = f"""
        SELECT id, name, manufacturer, country, year, category, drivetrain, aspiration,
               power_hp, weight_kg, pp, interior, image_url, local_image, curiosities, setup_tip
        FROM cars
        {where_clause}
        {order_clause}
        LIMIT ? OFFSET ?
    """
    cursor.execute(query, params + [limit, offset])
    rows = cursor.fetchall()

    cars_list = []
    for r in rows:
        car = dict(r)
        try:
            car['curiosities'] = json.loads(car['curiosities']) if car.get('curiosities') else []
        except Exception:
            car['curiosities'] = []
        cars_list.append(car)

    conn.close()

    return {
        'cars': cars_list,
        'total': total_count,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    }

def get_car_by_id(car_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, manufacturer, country, year, category, drivetrain, aspiration,
               power_hp, weight_kg, pp, interior, image_url, local_image, curiosities, setup_tip
        FROM cars
        WHERE id = ?
    """, (car_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    car = dict(row)
    try:
        car['curiosities'] = json.loads(car['curiosities']) if car.get('curiosities') else []
    except Exception:
        car['curiosities'] = []
    return car

def get_car_manufacturers():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT manufacturer, country, COUNT(*) as car_count
        FROM cars
        GROUP BY manufacturer
        ORDER BY car_count DESC, manufacturer ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_cars_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            COUNT(*) as total_cars,
            COUNT(DISTINCT manufacturer) as total_manufacturers,
            MAX(power_hp) as max_hp,
            MAX(pp) as max_pp,
            MIN(pp) as min_pp,
            ROUND(AVG(pp), 1) as avg_pp
        FROM cars
    """)
    stats = dict(cursor.fetchone())

    # Drivetrain breakdown
    cursor.execute("""
        SELECT drivetrain, COUNT(*) as count
        FROM cars
        GROUP BY drivetrain
        ORDER BY count DESC
    """)
    stats['drivetrains'] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return stats

# ==========================================
# CIRCUITOS GRAN TURISMO 6
# ==========================================

def get_tracks(search=None, category=None, sort_by='name_asc'):
    conn = get_db()
    cursor = conn.cursor()

    conditions = []
    params = []

    if search and search.strip():
        term = f"%{search.strip()}%"
        conditions.append("(name LIKE ? OR country LIKE ? OR location LIKE ?)")
        params.extend([term, term, term])

    if category and category != 'all':
        conditions.append("category = ?")
        params.append(category)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    sort_dict = {
        'name_asc': 'name ASC',
        'name_desc': 'name DESC',
        'length_desc': 'length_km DESC',
        'length_asc': 'length_km ASC',
        'elevation_desc': 'elevation_m DESC',
        'turns_desc': 'turns DESC'
    }
    order_clause = f"ORDER BY {sort_dict.get(sort_by, 'name ASC')}"

    query = f"""
        SELECT id, name, slug, category, country, country_code, location,
               length_km, turns, elevation_m, longest_straight_m, layouts_count,
               time_progression, weather_change, laser_scanned, first_game,
               record_lap, image_url, svg_path, history_gt, history_real,
               driving_tips, curiosities
        FROM tracks
        {where_clause}
        {order_clause}
    """
    cursor.execute(query, params)
    rows = cursor.fetchall()

    tracks_list = []
    for r in rows:
        track = dict(r)
        try:
            track['curiosities'] = json.loads(track['curiosities']) if track.get('curiosities') else []
        except Exception:
            track['curiosities'] = []
        tracks_list.append(track)

    conn.close()
    return tracks_list

def get_track_by_id(track_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, slug, category, country, country_code, location,
               length_km, turns, elevation_m, longest_straight_m, layouts_count,
               time_progression, weather_change, laser_scanned, first_game,
               record_lap, image_url, svg_path, history_gt, history_real,
               driving_tips, curiosities
        FROM tracks
        WHERE id = ?
    """, (track_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    track = dict(row)
    try:
        track['curiosities'] = json.loads(track['curiosities']) if track.get('curiosities') else []
    except Exception:
        track['curiosities'] = []
    return track

def get_tracks_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            COUNT(*) as total_tracks,
            COUNT(DISTINCT country) as total_countries,
            COALESCE(SUM(layouts_count), 0) as total_layouts,
            ROUND(COALESCE(SUM(length_km), 0), 1) as total_km,
            COALESCE(MAX(length_km), 0) as max_length_km,
            COALESCE(MAX(elevation_m), 0) as max_elevation_m,
            COALESCE(SUM(CASE WHEN laser_scanned = 1 THEN 1 ELSE 0 END), 0) as laser_scanned_count,
            COALESCE(SUM(CASE WHEN weather_change = 1 THEN 1 ELSE 0 END), 0) as weather_count,
            COALESCE(SUM(CASE WHEN time_progression = 1 THEN 1 ELSE 0 END), 0) as time_progression_count
        FROM tracks
    """)
    stats = dict(cursor.fetchone())

    # Category breakdown
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM tracks
        GROUP BY category
        ORDER BY count DESC
    """)
    stats['categories'] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return stats


