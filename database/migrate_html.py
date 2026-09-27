import os
import re
import sys

# Ensure db.py can be imported
sys.path.insert(0, os.path.dirname(__file__))
from db import init_db, get_db, create_admin_user_if_none

ROOT_DIR = os.path.dirname(os.path.dirname(__file__))

def migrate():
    print("Iniciando migración de datos HTML a SQLite...")
    init_db()
    create_admin_user_if_none(username='admin', password='password123')
    
    conn = get_db()
    cursor = conn.cursor()

    # 1. Crear temporadas
    cursor.execute("SELECT id FROM seasons WHERE name = 'Temporada 1'")
    row1 = cursor.fetchone()
    if not row1:
        cursor.execute("INSERT INTO seasons (name, is_active) VALUES ('Temporada 1', 0)")
        s1_id = cursor.lastrowid
    else:
        s1_id = row1['id']

    cursor.execute("SELECT id FROM seasons WHERE name = 'Temporada 2'")
    row2 = cursor.fetchone()
    if not row2:
        cursor.execute("INSERT INTO seasons (name, is_active) VALUES ('Temporada 2', 1)")
        s2_id = cursor.lastrowid
    else:
        s2_id = row2['id']

    print(f"Temporadas listas: Temporada 1 (ID {s1_id}), Temporada 2 (ID {s2_id})")

    # 2. Parsear rangos de rangos.html
    rangos_file = os.path.join(ROOT_DIR, 'rangos.html')
    driver_ranks = {}
    if os.path.exists(rangos_file):
        with open(rangos_file, 'r', encoding='utf-8') as f:
            html = f.read()
        sections = re.split(r'<h3>\s*RANGO\s*<span[^>]*>(.*?)</span>\s*</h3>', html, flags=re.IGNORECASE)
        for i in range(1, len(sections), 2):
            rank_name = sections[i].strip().lower()
            chunk = sections[i+1]
            tr_chunks = re.findall(r'<tr[^>]*>(.*?)</tr>', chunk, re.DOTALL)
            for tr in tr_chunks:
                tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
                if len(tds) < 2: continue
                psn = re.sub(r'<[^>]+>', '', tds[0]).strip()
                if psn and not psn.isdigit():
                    cm = re.search(r'assets/country/([a-zA-Z0-9_\-]+)\.png', tds[1])
                    country = cm.group(1).lower() if cm else 'pdi'
                    driver_ranks[psn.lower()] = {'psn': psn, 'country': country, 'rank': rank_name}

    # 3. Parsear ranking general de ranking.html
    ranking_file = os.path.join(ROOT_DIR, 'ranking.html')
    ranking_drivers = {}
    if os.path.exists(ranking_file):
        with open(ranking_file, 'r', encoding='utf-8') as f:
            rhtml = f.read()
        tr_chunks = re.findall(r'<tr[^>]*>(.*?)</tr>', rhtml, re.DOTALL)
        for tr in tr_chunks:
            tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
            if len(tds) < 4: continue
            pos_str = re.sub(r'<[^>]+>', '', tds[0]).strip()
            psn = re.sub(r'<[^>]+>', '', tds[1]).strip()
            if not pos_str.isdigit() or not psn: continue
            cm = re.search(r'assets/country/([a-zA-Z0-9_\-]+)\.png', tds[2])
            country = cm.group(1).lower() if cm else 'pdi'
            ranking_drivers[psn.lower()] = {'psn': psn, 'country': country}

    # 4. Insertar o actualizar pilotos conocidos
    all_drivers = {}
    all_drivers.update(ranking_drivers)
    for k, v in driver_ranks.items():
        if k in all_drivers:
            all_drivers[k]['rank'] = v['rank']
        else:
            all_drivers[k] = v

    for k, dinfo in all_drivers.items():
        psn = dinfo['psn']
        country = dinfo.get('country', 'pdi')
        rank = dinfo.get('rank', 'bronce')
        cursor.execute("SELECT id FROM drivers WHERE psn_id = ?", (psn,))
        d_row = cursor.fetchone()
        if not d_row:
            cursor.execute("INSERT INTO drivers (psn_id, country, rank) VALUES (?, ?, ?)", (psn, country, rank))
        else:
            cursor.execute("UPDATE drivers SET country = ?, rank = ? WHERE id = ?", (country, rank, d_row['id']))

    conn.commit()

    # 5. Parsear carreras de resultados.html
    res_file = os.path.join(ROOT_DIR, 'resultados.html')
    with open(res_file, 'r', encoding='utf-8') as f:
        res_html = f.read()

    races_raw = re.split(r'<h1>\s*(RACE\s*([0-9]+)\s*([^<]*))\s*</h1>', res_html)
    races_migrated = 0
    results_migrated = 0

    for i in range(1, len(races_raw), 4):
        full_title = races_raw[i].strip()
        round_num = int(races_raw[i+1].strip())
        car = races_raw[i+2].strip()
        chunk = races_raw[i+3]

        # Verificar si la carrera ya existe en Temporada 1
        cursor.execute("SELECT id FROM races WHERE season_id = ? AND round_number = ?", (s1_id, round_num))
        race_row = cursor.fetchone()
        if not race_row:
            cursor.execute("""
                INSERT INTO races (season_id, round_number, title, car, track)
                VALUES (?, ?, ?, ?, ?)
            """, (s1_id, round_num, full_title, car, 'Circuito Oficial'))
            race_id = cursor.lastrowid
        else:
            race_id = race_row['id']
            # Limpiar resultados previos para reinsertar
            cursor.execute("DELETE FROM race_results WHERE race_id = ?", (race_id,))

        races_migrated += 1

        tr_chunks = re.findall(r'<tr[^>]*>(.*?)</tr>', chunk, re.DOTALL)
        for tr in tr_chunks:
            tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
            if len(tds) < 4: continue
            pos_raw = re.sub(r'<[^>]+>', '', tds[0]).strip()
            psn_raw = re.sub(r'<[^>]+>', '', tds[1]).strip()
            if not pos_raw.isdigit() or not psn_raw: continue
            pos = int(pos_raw)

            cm = re.search(r'assets/country/([a-zA-Z0-9_\-]+)\.png', tds[2])
            country = cm.group(1).lower() if cm else 'pdi'

            pts_raw = re.sub(r'<[^>]+>', '', tds[-1]).replace('+', '').strip()
            pts = int(pts_raw) if pts_raw.isdigit() else 0

            # Notas / Tiempo si hay 6 columnas
            notes = ''
            if len(tds) >= 6:
                notes = re.sub(r'<[^>]+>', '', tds[4]).strip()

            # Obtener o insertar piloto
            cursor.execute("SELECT id FROM drivers WHERE psn_id = ?", (psn_raw,))
            dr = cursor.fetchone()
            if not dr:
                cursor.execute("INSERT INTO drivers (psn_id, country) VALUES (?, ?)", (psn_raw, country))
                driver_id = cursor.lastrowid
            else:
                driver_id = dr['id']

            cursor.execute("""
                INSERT INTO race_results (race_id, driver_id, position, points, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (race_id, driver_id, pos, pts, notes))
            results_migrated += 1

    conn.commit()
    conn.close()

    print(f"Migración completada con éxito:")
    print(f" - {len(all_drivers)} pilotos procesados.")
    print(f" - {races_migrated} carreras migradas a Temporada 1.")
    print(f" - {results_migrated} resultados individuales vinculados.")
    print(" - Usuario administrador inicial: admin / password123")

if __name__ == '__main__':
    migrate()
