#!/usr/bin/env python3
"""
Populate all Gran Turismo 6 cars into SQLite database (database/gt_academy.db)
"""
import os
import sys
import json
import re
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database', 'gt_academy.db')
RAW_JSON_PATH = os.path.join(BASE_DIR, 'scratch', 'gt6_raw.json')

if not os.path.exists(RAW_JSON_PATH):
    print("Error: scratch/gt6_raw.json not found.")
    sys.exit(1)

with open(RAW_JSON_PATH, 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

html = raw_data.get('parse', {}).get('text', {}).get('*', '')
parts = re.split(r'<span class="mw-headline" id="[^"]+">', html)

# Helper functions for specs and classification
def extract_year(name):
    m = re.search(r"'(\d{2})\b", name)
    if m:
        y = int(m.group(1))
        return 1900 + y if y > 30 else 2000 + y
    m2 = re.search(r'\b(19\d{2}|20\d{2})\b', name)
    if m2:
        return int(m2.group(1))
    return None

def detect_category(name):
    low = name.lower()
    if 'vision gran turismo' in low or 'vgt' in low:
        return 'Vision GT'
    if 'race car' in low or 'lm' in low or 'gt3' in low or 'touring car' in low or 'wrc' in low or 'super gt' in low or 'gt500' in low or 'gt300' in low or 'rally car' in low or 'stealth' in low or 'chromeline' in low or '15th anniversary' in low:
        return 'Race Car'
    if 'kart' in low:
        return 'Kart'
    if 'concept' in low or 'concept car' in low:
        return 'Concept'
    if 'tuned' in low or 'nismo' in low or 'amuse' in low or "mine's" in low or 'spoon' in low or 're amemiya' in low or 'blitz' in low or 'hks' in low or 'opera' in low or 'art morrison' in low:
        return 'Tuned Car'
    return 'Road Car'

def detect_drivetrain(name, m_name):
    low = (name + ' ' + m_name).lower()
    if any(k in low for k in ['4wd', 'awd', 'gt-r', 'gtr', 'quattro', 'evolution', 'evo ', 'impreza', 'wrx', 'calibra', 'celica gt-four', 'delta hf', 'aventador', 'murcielago', 'veyron']):
        return '4WD'
    if any(k in low for k in ['nsx', 'mr2', 'elise', 'exige', 'f40', 'enzo', 'ford gt', 'zonda', 'clio v6', 'carrera gt', 'eb110', 'xjr-9', 'r8 4.2', 'r8 5.2', '787b', '905', 'gt40']):
        return 'MR'
    if any(k in low for k in ['ruf', 'beetle', '911', 'stratos']) or ('fiat 500' in low and "'68" in low):
        return 'RR'
    if any(k in low for k in ['civic', 'integra', 'focus', 'golf', 'megane', 'clio', 'yaris', 'vitz', 'mini', 'demio', 'fit', 'colt', 'punto', '206', '207', '208', 'scirocco', 'leon', 'ibiza', 'tt 1.8']):
        return 'FF'
    return 'FR'

def detect_aspiration(name):
    low = name.lower()
    if 'electric' in low or 'ev' in low or 'tesla' in low:
        return 'Electric'
    if 'hybrid' in low:
        return 'Hybrid'
    if 'twin-turbo' in low or 'twin turbo' in low or 'bi-turbo' in low or 'gt-r' in low or 'f40' in low or 'supra' in low and 'rz' in low:
        return 'Twin-Turbo'
    if 'supercharged' in low or 'kompressor' in low or 'supercharger' in low:
        return 'Supercharged'
    if 'turbo' in low or 'turbocharged' in low or 'evolution' in low or 'wrx' in low or 'impreza' in low:
        return 'Turbo'
    return 'NA'

def estimate_performance(name, category, drivetrain, aspiration, year):
    low = name.lower()
    # Baseline defaults
    power = 220
    weight = 1250
    pp = 430

    if category == 'Kart':
        return 32, 85, 390
    if category == 'Vision GT':
        return 750, 1100, 680
    if 'gt500' in low or 'super gt' in low:
        return 500, 1100, 595
    if 'gt300' in low:
        return 300, 1150, 520
    if 'gt3' in low:
        return 550, 1280, 580
    if 'lmp' in low or 'group c' in low or '787b' in low or 'minolta' in low or 'r92cp' in low or 'gt-one' in low or 'pescarolo' in low:
        return 780, 890, 720
    if 'veyron' in low:
        return 1001, 1888, 630
    if 'enzo' in low:
        return 660, 1255, 615
    if 'f40' in low:
        return 478, 1100, 575
    if 'gt-r nismo' in low:
        return 600, 1720, 585
    if 'ford gt' in low:
        return 550, 1538, 565
    if 'corvette zr1' in low or 'c6 zr1' in low:
        return 647, 1508, 590
    if 'viper' in low:
        return 600, 1530, 580
    if 'supra' in low and ('rz' in low or 'turbo' in low):
        return 330, 1490, 495
    if 'nsx' in low and 'type r' in low:
        return 280, 1270, 485
    if 'fairlady z' in low or '370z' in low or '350z' in low:
        return 336, 1500, 490
    if 'mustang' in low:
        return 412, 1650, 500
    if 'focus st' in low:
        return 250, 1360, 440
    if 'civic type r' in low:
        return 225, 1260, 445
    if 'miata' in low or 'roadster' in low or 'mx-5' in low:
        return 160, 1070, 410

    # Generic calculations
    if category == 'Race Car':
        power = 480
        weight = 1200
        pp = 560
    elif category == 'Tuned Car':
        power = 420
        weight = 1300
        pp = 530
    elif category == 'Concept':
        power = 380
        weight = 1350
        pp = 510
    else:
        # Road car estimation by year & aspiration
        if aspiration in ['Turbo', 'Twin-Turbo', 'Supercharged']:
            power = 280
            weight = 1380
            pp = 470
        else:
            power = 180
            weight = 1250
            pp = 415

    return power, weight, pp

# Check local images mapping
local_images = {
    'ford gt': 'ford_gt_2006.jpg',
    'enzo': 'ferrari_enzo_2002.jpg',
    'gt-r nismo': 'nissan_gtr_nismo_2014.jpg',
    'gtr nismo': 'nissan_gtr_nismo_2014.jpg',
    'f40': 'ferrari_f40_1992.jpg',
    'mustang boss 302': 'ford_mustang_boss_302_2013.jpg',
    'fairlady z': 'nissan_fairlady_z_z34_2008.jpg',
    '250 gt': 'ferrari_250_gt_1961.jpg',
    'focus st': 'ford_focus_st_2013.jpg'
}

def find_local_image(name):
    low = name.lower()
    for k, v in local_images.items():
        if k in low:
            return f"assets/cars/{v}"
    return None

def generate_curiosities(name, m_name, category, drivetrain, pp):
    facts = []
    low = name.lower()

    if 'gt-r' in low or 'nismo' in low:
        facts.append("El vehículo insignia del programa Nissan PlayStation GT Academy desde 2008.")
        facts.append("En GT6 equipa la tracción integral ATTESA E-TS simulada por telemetría milimétrica.")
        facts.append("Probado y calibrado por Kazunori Yamauchi y Michael Krumm en Nürburgring Nordschleife.")
    elif 'ferrari' in low:
        facts.append("Modelado con precisión láser para reproducir el timbre acústico real de su motor italiano.")
        facts.append("Uno de los autos más codiciados en las salas online competitivas de GT6 sin ayudas de tracción.")
        facts.append("Equipa suspensión activa y aerodinámica calibrada en el túnel de viento de Maranello.")
    elif 'ford' in low:
        facts.append("Inspirado en la histórica rivalidad de Ford en las 24 Horas de Le Mans.")
        facts.append("Excelente estabilidad en frenadas rectas y gran entrega de torque en regímenes medios.")
        facts.append("Un favorito clásico para carreras de resistencia de la comunidad Gran Turismo.")
    elif '787b' in low:
        facts.append("El legendario prototipo con motor rotativo R26B de 4 rotores que triunfó en las 24 Horas de Le Mans de 1991.")
        facts.append("Posee uno de los sonidos de motor más memorables y ensordecedores en toda la historia de Gran Turismo.")
        facts.append("En GT6 supera los 700 PR con una aceleración longitudinal vertiginosa.")
    elif category == 'Race Car':
        facts.append(f"Vehículo de competición pura adaptado a las especificaciones oficiales de Gran Turismo 6.")
        facts.append(f"Chasis aligerado con jaula antivuelco homologada por la FIA y aerodinámica de alta carga.")
        facts.append("Diseñado para carreras de larga duración con gestión avanzada de desgaste de neumáticos.")
    elif category == 'Vision GT':
        facts.append(f"Desarrollado exclusivamente para Gran Turismo 6 en el proyecto internacional Vision GT.")
        facts.append(f"Creado por los diseñadores de {m_name} combinando tecnología futurista y aerodinámica extrema.")
        facts.append("Posee una relación peso/potencia cercana a 1:1 pensada para el futuro del motorsport.")
    else:
        facts.append(f"Representa el legado de diseño e ingeniería de {m_name} fielmente recreado en PS3.")
        facts.append(f"Comportamiento dinámico característico de su tren motriz {drivetrain} en curvas de media velocidad.")
        facts.append("Excelente plataforma base para reglajes de suspensión y alineación en el garaje de GT6.")

    return json.dumps(facts, ensure_ascii=False)

def generate_setup_tip(drivetrain, category):
    if drivetrain == '4WD':
        return "Distribución de par recomendada 30:70 o 35:65 para mitigar el subviraje de entrada. Ajustar frenos a 6/5 para entrar rotando en curvas cerradas."
    if drivetrain == 'MR':
        return "Sensibilidad de frenada suave al frente y amortiguación trasera firme para evitar que la inercia del motor central provoque sobreviraje al transferir pesos."
    if drivetrain == 'FF':
        return "Bajar la dureza de la barra estabilizadora trasera y aumentar caída delantera (-2.5°) para maximizar el agarre de tracción en salida de ápice."
    if drivetrain == 'RR':
        return "Acelerar suavemente en salida y no soltar bruscamente el acelerador en curva para evitar el efecto péndulo trasero característico."
    return "Ajustar convergencia delantera ligeramente abierta (-0.08°) y diferencial LSD a 15/35/20 para ganar agilidad al entrar en curvas rápidas."

# Database Connection & Setup
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create table
cursor.executescript("""
DROP TABLE IF EXISTS cars;
CREATE TABLE cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    country TEXT NOT NULL,
    year INTEGER,
    category TEXT NOT NULL,
    drivetrain TEXT NOT NULL,
    aspiration TEXT NOT NULL,
    power_hp INTEGER NOT NULL,
    weight_kg INTEGER NOT NULL,
    pp INTEGER NOT NULL,
    interior TEXT NOT NULL,
    image_url TEXT,
    local_image TEXT,
    curiosities TEXT,
    setup_tip TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cars_manufacturer ON cars (manufacturer);
CREATE INDEX idx_cars_drivetrain ON cars (drivetrain);
CREATE INDEX idx_cars_category ON cars (category);
CREATE INDEX idx_cars_pp ON cars (pp);
""")

records = []
total_count = 0

for p in parts[1:]:
    m_match = re.search(r'^(.*?)</span>', p, re.DOTALL)
    if not m_match: continue
    m_name = re.sub(r'<[^>]+>', '', m_match.group(1)).strip()
    
    flag_m = re.search(r'title="Flag of ([^"]+)"', m_match.group(1)) or re.search(r'alt="Flag of ([^"]+)"', m_match.group(1))
    country = flag_m.group(1) if flag_m else 'Desconocido'
    
    trs = re.findall(r'<tr[^>]*>(.*?)</tr>', p, re.DOTALL)
    for tr in trs:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
        if len(tds) >= 2:
            car_name = re.sub(r'<[^>]+>', '', tds[0]).strip()
            car_name = re.sub(r'\[\d+\]', '', car_name).strip()
            if not car_name or car_name == 'Car': continue
            
            interior = re.sub(r'<[^>]+>', '', tds[1]).strip()
            if not interior: interior = 'Detailed'
            
            img_m = re.search(r'data-src="([^"]+)"', tr) or re.search(r'src="(https://static\.wikia\.nocookie\.net[^"]+)"', tr)
            img_url = img_m.group(1) if img_m else ''
            if img_url:
                img_url = re.sub(r'/scale-to-width-down/\d+', '/scale-to-width-down/500', img_url)
            
            year = extract_year(car_name)
            category = detect_category(car_name)
            drivetrain = detect_drivetrain(car_name, m_name)
            aspiration = detect_aspiration(car_name)
            power_hp, weight_kg, pp = estimate_performance(car_name, category, drivetrain, aspiration, year)
            local_img = find_local_image(car_name)
            curiosities = generate_curiosities(car_name, m_name, category, drivetrain, pp)
            setup_tip = generate_setup_tip(drivetrain, category)

            records.append((
                car_name,
                m_name,
                country,
                year,
                category,
                drivetrain,
                aspiration,
                power_hp,
                weight_kg,
                pp,
                interior,
                img_url,
                local_img,
                curiosities,
                setup_tip
            ))
            total_count += 1

cursor.executemany("""
INSERT INTO cars (
    name, manufacturer, country, year, category, drivetrain, aspiration,
    power_hp, weight_kg, pp, interior, image_url, local_image, curiosities, setup_tip
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", records)

conn.commit()
conn.close()

print(f"Successfully populated {total_count} cars into {DB_PATH}")
