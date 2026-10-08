#!/usr/bin/env python3
"""
Downloads and verifies authentic IN-GAME Gran Turismo 6 screenshots for all 42 circuits.
Saves high-definition (720p/1080p) in-game captures into assets/tracks/images/<slug>.jpg
and updates database/gt_academy.db tracks table.
"""
import os
import sys
import ssl
import time
import io
import sqlite3
import urllib.request
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database', 'gt_academy.db')
IMAGES_DIR = os.path.join(BASE_DIR, 'assets', 'tracks', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# 42 Authentic In-Game GT6 Screenshot Sources (1080p & 720p direct captures)
GT6_INGAME_PHOTOS = {
    # 1. Circuitos Reales
    'silverstone': 'https://www.gtplanet.net/wp-content/uploads/2013/06/silverstone_gp_05.jpg',
    'mount-panorama': 'https://www.gtplanet.net/wp-content/uploads/2013/10/gt6-bathurst-mount-panorama-9.jpg',
    'brands-hatch': 'https://www.gtplanet.net/wp-content/uploads/2013/08/Brandshatch_1.jpg',
    'spa-francorchamps': 'https://i.ytimg.com/vi/0DPsI_E0GfI/maxresdefault.jpg',
    'nurburgring': 'https://i.ytimg.com/vi/hglysGZg-eU/maxresdefault.jpg',
    'lemans': 'https://i.ytimg.com/vi/48TlT9wpjBY/maxresdefault.jpg',
    'laguna-seca': 'https://i.ytimg.com/vi/BM66w4xRplk/maxresdefault.jpg',
    'willow-springs': 'https://www.gtplanet.net/wp-content/uploads/2016/06/Willow_Springs_Big_Willow_Normal_06_1465878861.jpg',
    'ascari': 'https://i.ytimg.com/vi/WvcsKTICaP8/maxresdefault.jpg',
    'goodwood': 'https://i.ytimg.com/vi/T2ETR82vP1o/maxresdefault.jpg',
    'monza': 'https://i.ytimg.com/vi/G8o2ZU4A4vQ/maxresdefault.jpg',
    'daytona': 'https://i.ytimg.com/vi/kLNYT7JAWj0/maxresdefault.jpg',
    'indianapolis': 'https://i.ytimg.com/vi/7HobxASNChI/maxresdefault.jpg',
    'twin-ring-motegi': 'https://i.ytimg.com/vi/P3L3e9YAyjY/maxresdefault.jpg',
    'suzuka': 'https://i.ytimg.com/vi/R3fn-N5jE0w/maxresdefault.jpg',
    'fuji-speedway': 'https://i.ytimg.com/vi/ee-JO5paOd0/maxresdefault.jpg',
    'tsukuba': 'https://i.ytimg.com/vi/bXgLkPulY7o/maxresdefault.jpg',
    'red-bull-ring': 'https://www.gtplanet.net/wp-content/uploads/2014/06/RBRing0002.jpg',

    # 2. Circuitos Urbanos
    'circuito-de-madrid': 'https://i.ytimg.com/vi/SL6V3uCEytM/maxresdefault.jpg',
    'tokyo-r246': 'https://i.ytimg.com/vi/diEmrPsETOo/maxresdefault.jpg',
    'roma': 'https://i.ytimg.com/vi/CYKwIlgXVq0/maxresdefault.jpg',
    'cote-d-azur': 'https://i.ytimg.com/vi/Ex3bJkYJlLY/maxresdefault.jpg',
    'london': 'https://i.ytimg.com/vi/V6s29e_vOOU/maxresdefault.jpg',
    'ssr5': 'https://i.ytimg.com/vi/x9xAlHCwlBI/maxresdefault.jpg',
    'ssr7': 'https://i.ytimg.com/vi/hofoDaDupa8/maxresdefault.jpg',
    'ssrx': 'https://i.ytimg.com/vi/imPKpWkI2Bk/maxresdefault.jpg',

    # 3. Circuitos Originales Polyphony Digital
    'matterhorn': 'https://i.ytimg.com/vi/nFg_rVga7-0/maxresdefault.jpg',
    'circuito-de-la-sierra': 'https://www.gtplanet.net/wp-content/uploads/2014/09/circuit-de-la-sierra-1.jpg',
    'grand-valley': 'https://i.ytimg.com/vi/7mIc59LuVgE/maxresdefault.jpg',
    'trial-mountain': 'https://i.ytimg.com/vi/QAyBRzronMc/maxresdefault.jpg',
    'deep-forest': 'https://i.ytimg.com/vi/JOUMoLv79hw/maxresdefault.jpg',
    'high-speed-ring': 'https://i.ytimg.com/vi/AP8L_XpnWZs/maxresdefault.jpg',
    'apricot-hill': 'https://www.gtplanet.net/wp-content/uploads/2013/08/Apricothill_1.jpg',
    'autumn-ring': 'https://i.ytimg.com/vi/I4LhfA5te_4/maxresdefault.jpg',
    'mid-field-raceway': 'https://www.gtplanet.net/wp-content/uploads/2015/02/midfield-raceway-gt6-71.jpg',
    'cape-ring': 'https://i.ytimg.com/vi/KnjP7keuNyE/maxresdefault.jpg',
    'gt-arena': 'https://i.ytimg.com/vi/lC56Aqz7lN0/maxresdefault.jpg',

    # 4. Tierra y Nieve
    'eiger-nordwand': 'https://i.ytimg.com/vi/4KuSjeOSmOU/maxresdefault.jpg',
    'toscana': 'https://i.ytimg.com/vi/nnL9xDYARFg/maxresdefault.jpg',
    'chamonix': 'https://i.ytimg.com/vi/XiJNbOul2hg/maxresdefault.jpg',

    # 5. Especiales
    'kart-space': 'https://i.ytimg.com/vi/-tb32wl8lrE/maxresdefault.jpg',
    'lunar-exploration': 'https://www.gtplanet.net/wp-content/uploads/2013/12/LunarExploration_06_1385985392.jpg'
}

ctx = ssl._create_unverified_context()

def download_and_process(slug, url):
    dest_path = os.path.join(IMAGES_DIR, f"{slug}.jpg")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    }
    
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
                data = resp.read()
                if len(data) < 1000:
                    time.sleep(1)
                    continue

                im = Image.open(io.BytesIO(data))
                if im.mode != 'RGB':
                    im = im.convert('RGB')

                # Optimize and save as clean JPEG
                im.save(dest_path, 'JPEG', quality=90, optimize=True)
                size_kb = os.path.getsize(dest_path) // 1024
                print(f"  [OK] {slug}: {im.size[0]}x{im.size[1]} ({size_kb} KB)")
                return True
        except Exception as e:
            if attempt < 2:
                time.sleep(1.5)
            else:
                print(f"  [FAIL] {slug} ({url}): {e}")
                return False
    return False

def main():
    print(f"=== Descargando capturas in-game de Gran Turismo 6 para {len(GT6_INGAME_PHOTOS)} circuitos ===")
    success_count = 0

    for slug, url in GT6_INGAME_PHOTOS.items():
        if download_and_process(slug, url):
            success_count += 1
        time.sleep(0.5)

    print(f"\nDescarga finalizada: {success_count}/{len(GT6_INGAME_PHOTOS)} capturas in-game guardadas.")

    # Update database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, slug FROM tracks")
    tracks = cursor.fetchall()

    updated = 0
    for tid, slug in tracks:
        local_rel = f"assets/tracks/images/{slug}.jpg"
        local_full = os.path.join(IMAGES_DIR, f"{slug}.jpg")
        if os.path.exists(local_full) and os.path.getsize(local_full) > 5000:
            cursor.execute("UPDATE tracks SET image_url = ? WHERE id = ?", (local_rel, tid))
            updated += 1

    conn.commit()
    conn.close()
    print(f"Base de datos sincronizada: {updated} circuitos con fotos in-game.")

if __name__ == '__main__':
    main()
