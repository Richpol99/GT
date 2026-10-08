#!/usr/bin/env python3
"""
Pre-caches all 1,280 Gran Turismo 6 car images locally in assets/cars/cache.
Ensures instant loading, offline availability, and eliminates hotlink blocks.
"""
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, 'database'))

import db

CACHE_DIR = os.path.join(BASE_DIR, 'assets', 'cars', 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

def fetch_car_image(car):
    car_id = car['id']
    # Check if already cached
    for ext in ['webp', 'jpg', 'png', 'jpeg']:
        p = os.path.join(CACHE_DIR, f"{car_id}.{ext}")
        if os.path.exists(p) and os.path.getsize(p) > 500:
            return 'cached'

    image_url = car.get('image_url')
    if not image_url:
        return 'no_url'

    try:
        req = urllib.request.Request(
            image_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read()
            content_type = response.headers.get_content_type() or 'image/webp'
            if len(content) > 500:
                ext = 'webp'
                if 'jpeg' in content_type or 'jpg' in content_type:
                    ext = 'jpg'
                elif 'png' in content_type:
                    ext = 'png'
                
                out_path = os.path.join(CACHE_DIR, f"{car_id}.{ext}")
                with open(out_path, 'wb') as f:
                    f.write(content)
                return 'downloaded'
    except Exception as e:
        return f'error: {e}'

    return 'failed'

def main():
    conn = db.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, image_url, local_image FROM cars ORDER BY id ASC")
    cars = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total = len(cars)
    print(f"Iniciando descarga y caché de {total} autos de Gran Turismo 6...")

    start_time = time.time()
    downloaded = 0
    already_cached = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=10) as executor:
        for res in executor.map(fetch_car_image, cars):
            if res == 'downloaded':
                downloaded += 1
            elif res == 'cached':
                already_cached += 1
            else:
                errors += 1

    elapsed = time.time() - start_time
    print(f"Finalizado en {elapsed:.1f}s.")
    print(f"Descargados nuevos: {downloaded} | Ya en caché: {already_cached} | Fallos: {errors} | Total: {total}")

if __name__ == '__main__':
    main()
