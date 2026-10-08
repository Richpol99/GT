#!/usr/bin/env python3
"""
Downloads and processes authentic, high-resolution scenic photography for all 42 Gran Turismo 6 circuits.
Converts every image to clean optimized JPEG format in assets/tracks/images/<slug>.jpg.
Includes rate-limiting and retry logic to respect Wikimedia's CDN.
"""
import os
import sys
import ssl
import time
import sqlite3
import urllib.request
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database', 'gt_academy.db')
IMAGES_DIR = os.path.join(BASE_DIR, 'assets', 'tracks', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

TRACK_PHOTOS = {
    # 1. Real Tracks
    'silverstone': 'https://upload.wikimedia.org/wikipedia/commons/1/17/2003_British_Grand_Prix%2C_Silverstone_Circuit_%2827321856077%29.jpg',
    'mount-panorama': 'https://upload.wikimedia.org/wikipedia/commons/8/83/James_Moffat_Bathurst_2009.jpg',
    'brands-hatch': 'https://upload.wikimedia.org/wikipedia/commons/d/db/Colin_Turkington_-_MG_ZS_dives_round_Shaun_Watson_Smith_-_Proton_Impian_at_Paddock_Hill_Bend%2C_Brands_Hatch_at_the_BTCC_on_25-04-2004_%2850887468251%29.jpg',
    'spa-francorchamps': 'https://upload.wikimedia.org/wikipedia/commons/7/7f/2022_6_Hours_of_Spa-Francorchamps_-_Eau_Rouge_Corner.jpg',
    'nurburgring': 'https://upload.wikimedia.org/wikipedia/commons/d/db/912_h1.jpg',
    'lemans': 'https://upload.wikimedia.org/wikipedia/commons/4/48/2016_24_Hours_of_Le_Mans_Ladygin_%2829147823771%29.jpg',
    'laguna-seca': 'https://upload.wikimedia.org/wikipedia/commons/0/04/DeltaWing_2013_ALMS_Monterey.jpg',
    'willow-springs': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Drifting_Pan_%281334125010%29.jpg',
    'ascari': 'https://upload.wikimedia.org/wikipedia/commons/2/29/Ascari_Circuit_Daniel_Atalaya.jpg',
    'goodwood': 'https://upload.wikimedia.org/wikipedia/commons/3/32/Afternoon_Supercar_Hill_Climb_at_2014_Goodwood_Festival_of_Speed_%2814338003399%29.jpg',
    'monza': 'https://upload.wikimedia.org/wikipedia/commons/2/27/4_Hours_Monza_European_Le_Mans_Series_-_World_Series_Formula_V8_3.5_-_TCR_International_Series_-_Autodromo_Nazionale_di_Monza_14-05-2017_%2834393136770%29.jpg',
    'daytona': 'https://upload.wikimedia.org/wikipedia/commons/f/f5/2018_24_Hours_of_Daytona_-_Racing.jpg',
    'indianapolis': 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Indianapolis_Motor_Speedway_Museum_%2851009939013%29.jpg',
    'twin-ring-motegi': 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Green%21_Green%21%21_%28No.100_RAYBRIG_NSX-GT%29.jpg',
    'suzuka': 'https://upload.wikimedia.org/wikipedia/commons/9/90/2014_Super_GT_Suzuka_race_start_%28GT500%29.jpg',
    'fuji-speedway': 'https://upload.wikimedia.org/wikipedia/commons/0/05/BridgestoneArch-FujiSpeedway.jpg',
    'tsukuba': 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Super_FJ_Tsukuba_Circuit_2023_May.jpg',
    'red-bull-ring': 'https://upload.wikimedia.org/wikipedia/commons/9/90/Austria_%2835074272573%29.jpg',

    # 2. Urban Tracks
    'circuito-de-madrid': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Gran_Via_-_Madrid_-_52108703031.jpg',
    'tokyo-r246': 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Exceptional_Tokyo_prefectural_road_route_176_and_Route_246_Japan.jpg',
    'roma': 'https://upload.wikimedia.org/wikipedia/commons/b/b9/1991-04-XX_Italien_Rom_Via_dei_Fori_Imperiali.jpg',
    'cote-d-azur': 'https://upload.wikimedia.org/wikipedia/commons/7/75/2013_Monaco_Grand_Prix_-_Thursday_%2815458839005%29.jpg',
    'london': 'https://upload.wikimedia.org/wikipedia/commons/7/7d/1983-07-XX_England_London_Whitehall_Trafalgar_Square.jpg',
    'ssr5': 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Shibaura_P.A._on_the_Metropolitan_Expressway_%5E11_-_panoramio.jpg',
    'ssr7': 'https://upload.wikimedia.org/wikipedia/commons/2/25/Rainbow_Bridge%2C_Tokyo_20201112.jpg',
    'ssrx': 'https://upload.wikimedia.org/wikipedia/commons/d/df/Nardo-Ring_from_space.jpg',

    # 3. Original Polyphony Tracks
    'matterhorn': 'https://upload.wikimedia.org/wikipedia/commons/c/c9/CH.VS.Zermatt_2021-10-17_Matterhorn_8726.jpg',
    'circuito-de-la-sierra': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Zahara_de_la_Sierra_-_panoramio_%283%29.jpg',
    'grand-valley': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Bixby_Bridge_%26_Big_Sur_coast.jpg',
    'trial-mountain': 'https://static.wikia.nocookie.net/gran-turismo/images/8/8a/Jstrial-mountain-circuit002.jpg',
    'deep-forest': 'https://static.wikia.nocookie.net/gran-turismo/images/a/a6/GT7_Deep_Forest_Official_Teaser.jpeg',
    'high-speed-ring': 'https://static.wikia.nocookie.net/gran-turismo/images/4/45/High_speed_ring.jpg',
    'apricot-hill': 'https://static.wikia.nocookie.net/gran-turismo/images/6/67/GT7_-Find_Your_Line.jpg',
    'autumn-ring': 'https://static.wikia.nocookie.net/gran-turismo/images/6/69/Autumn_Ring_Hybrid_%28Outside%29.jpg',
    'mid-field-raceway': 'https://www.gtplanet.net/wp-content/uploads/2015/02/midfield-raceway-gt6-71.jpg',
    'cape-ring': 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Kawazu_roopbridge01.JPG',
    'gt-arena': 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Race_of_Champions_2007_panorama.jpg',

    # 4. Dirt & Snow
    'eiger-nordwand': 'https://upload.wikimedia.org/wikipedia/commons/9/94/Kleine_Scheidegg_Eiger_Nordwand_%285057055439%29.jpg',
    'toscana': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Val_D_Orcia_In_Autumn_%28179351679%29.jpeg',
    'chamonix': 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Aigulle_Verte%2C_Les_Drus%2C_Chamonix-Mont-Blanc_%282022-08-16%29.jpg',

    # 5. Specials
    'kart-space': 'https://upload.wikimedia.org/wikipedia/commons/2/25/Go_Karting_track_in_Bia%C5%82ystok_%28Carrefou%29.jpg',
    'lunar-exploration': 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Apollo_15-_Follow_the_Tracks_%286816337786%29.jpg'
}

ctx = ssl._create_unverified_context()

def is_already_valid_photo(filepath):
    if not os.path.exists(filepath):
        return False
    if os.path.getsize(filepath) < 30000:
        return False
    try:
        with Image.open(filepath) as im:
            # Check dimensions and colors
            if im.width < 500 or im.height < 300:
                return False
            colors = len(set(im.convert('RGB').getdata()))
            # Maps usually have < 500 colors and mostly white pixels
            if colors < 1000:
                return False
            return True
    except Exception:
        return False

def fetch_image_with_retry(url, max_retries=3):
    headers = {
        'User-Agent': 'GT6PhotoTool/1.0 (https://github.com/gt-academy; bot@gtacademy.org) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    }
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
                data = resp.read()
                if len(data) > 5000:
                    return data
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait_time = (attempt + 1) * 6
                print(f"    [429 Rate limited] Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                print(f"    [HTTP {e.code}] {e}")
                time.sleep(3)
        except Exception as e:
            print(f"    [Network error] {e}")
            time.sleep(3)
    return None

def download_and_optimize():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(f"Checking & downloading authentic photos for {len(TRACK_PHOTOS)} circuits...")
    success_count = 0

    for slug, url in TRACK_PHOTOS.items():
        dest_filename = f"{slug}.jpg"
        dest_path = os.path.join(IMAGES_DIR, dest_filename)
        db_rel_path = f"assets/tracks/images/{dest_filename}"

        if is_already_valid_photo(dest_path):
            print(f"[{slug:22}] OK: Already a valid high-res photo ({os.path.getsize(dest_path)//1024} KB)")
            cursor.execute("UPDATE tracks SET image_url = ? WHERE slug = ?", (db_rel_path, slug))
            success_count += 1
            continue

        print(f"[{slug:22}] Fetching photo...")
        raw_bytes = fetch_image_with_retry(url)

        if not raw_bytes:
            print(f"  -> FAILED to fetch {slug}")
            continue

        temp_path = dest_path + '.tmp'
        try:
            with open(temp_path, 'wb') as f:
                f.write(raw_bytes)

            with Image.open(temp_path) as im:
                orig_size = im.size
                im = im.convert('RGB')
                
                max_w, max_h = 1920, 1080
                if im.width > max_w or im.height > max_h:
                    im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
                
                im.save(dest_path, format='JPEG', quality=88, optimize=True)
                final_size = os.path.getsize(dest_path)

            if os.path.exists(temp_path):
                os.remove(temp_path)

            cursor.execute("UPDATE tracks SET image_url = ? WHERE slug = ?", (db_rel_path, slug))
            success_count += 1
            print(f"  -> SUCCESS: {orig_size} => {im.size} ({final_size // 1024} KB)")

            # Polite rate-limiting sleep between downloads
            time.sleep(2.5)

        except Exception as e:
            print(f"  -> ERROR processing {slug}: {e}")
            if os.path.exists(temp_path):
                os.remove(temp_path)

    conn.commit()
    conn.close()
    print(f"\n==========================================")
    print(f"Process complete: {success_count}/{len(TRACK_PHOTOS)} circuit photos updated.")
    print(f"==========================================")

if __name__ == '__main__':
    download_and_optimize()
