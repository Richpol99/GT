#!/usr/bin/env python3
"""
Downloads and caches all GT6 track images into assets/tracks/images/
and generates vector SVGs for circuits without one.
Updates database to point to local assets.
"""
import os
import sys
import sqlite3
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database', 'gt_academy.db')
IMAGES_DIR = os.path.join(BASE_DIR, 'assets', 'tracks', 'images')
TRACKS_DIR = os.path.join(BASE_DIR, 'assets', 'tracks')

os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(TRACKS_DIR, exist_ok=True)

# SVG templates for missing tracks
SVG_TEMPLATES = {
    "mount_panorama.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 120,480 L 320,480 C 340,480 350,470 360,450 L 400,360 C 410,340 430,310 450,290 L 520,220 C 535,205 550,180 540,160 C 530,140 500,130 470,140 L 380,170 C 360,180 340,195 320,210 L 260,260 C 240,280 230,300 240,320 L 280,360 L 580,480 C 620,500 660,510 700,480 C 720,460 710,430 680,420 L 520,380 L 150,440 C 130,445 110,460 120,480 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "monza.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <path d="M 100,380 L 520,380 C 560,380 580,370 590,340 C 600,310 590,290 560,280 L 420,240 C 400,235 390,220 395,200 C 400,180 420,170 450,170 L 640,170 C 680,170 710,190 730,220 C 750,250 750,300 720,340 C 680,390 620,420 540,430 L 140,430 C 90,430 70,410 100,380 Z" fill="none" stroke="#0f172a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "willow_springs.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 150,420 L 500,420 C 560,420 620,390 660,340 C 700,290 710,220 680,160 C 650,110 590,90 530,110 L 410,150 C 370,165 330,190 310,230 L 280,300 C 265,335 240,360 200,375 L 130,400 C 110,410 120,420 150,420 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "ascari.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 140,460 L 380,460 C 410,460 430,440 435,410 L 440,340 C 445,310 470,290 500,300 L 560,320 C 590,330 620,310 630,280 L 650,210 C 660,170 630,130 580,130 L 460,130 C 420,130 390,160 380,200 L 370,250 C 360,280 330,300 290,290 L 210,270 C 170,260 140,290 140,330 L 140,460 Z" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "goodwood.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 150,520 L 280,420 C 300,405 320,370 315,340 L 300,260 C 295,230 310,200 340,190 L 420,165 C 460,150 510,160 540,195 L 610,280 C 630,305 660,315 690,300 L 730,280" fill="none" stroke="#0f172a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "daytona.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <path d="M 120,360 C 80,320 80,180 120,140 C 160,100 280,100 400,120 L 680,160 C 740,170 760,240 730,300 L 460,380 C 420,390 380,390 340,380 L 120,360 Z" fill="none" stroke="#0f172a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "indianapolis.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <path d="M 160,380 L 640,380 C 690,380 720,350 720,300 L 720,200 C 720,150 690,120 640,120 L 160,120 C 110,120 80,150 80,200 L 80,300 C 80,350 110,380 160,380 Z" fill="none" stroke="#0f172a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "motegi.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 140,420 L 480,420 C 520,420 550,390 540,350 L 510,250 C 500,210 530,170 570,170 L 650,170 C 690,170 720,200 710,240 L 680,380 C 670,430 620,460 570,460 L 180,460 C 130,460 100,430 110,380 L 150,220 C 160,170 210,140 260,140 L 400,140 C 440,140 460,170 440,210 L 410,270 C 390,310 350,340 300,340 L 220,340 C 170,340 140,370 140,420 Z" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "fuji.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <path d="M 100,380 L 620,380 C 670,380 710,340 700,290 L 670,180 C 655,130 600,110 550,140 L 430,220 C 400,240 360,240 330,220 L 260,170 C 220,140 160,165 160,215 L 160,280 C 160,320 130,350 90,360 L 100,380 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "tsukuba.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <path d="M 180,360 L 520,360 C 570,360 620,330 640,280 C 660,230 630,160 570,150 L 380,120 C 320,110 260,140 240,190 L 220,240 C 200,290 150,310 110,290 C 80,270 90,210 130,190 L 200,160" fill="none" stroke="#0f172a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "red_bull_ring.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <path d="M 160,380 L 480,380 C 520,380 540,360 550,330 L 600,180 C 610,140 580,110 540,110 L 420,110 C 380,110 350,135 340,170 L 320,240 C 310,270 280,290 250,290 L 170,290 C 120,290 90,330 110,370 L 160,380 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "matterhorn.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 160,460 L 380,440 C 430,435 460,390 450,340 L 430,240 C 420,190 460,140 510,140 L 600,140 C 650,140 680,180 670,230 L 630,390 C 620,440 570,480 520,480 L 220,480 C 170,480 130,450 140,400 L 160,300 C 170,250 220,220 270,240 L 330,270" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "sierra.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 150,320 C 130,250 180,170 250,140 C 330,110 420,120 490,160 C 560,200 640,180 690,230 C 740,280 730,370 680,420 C 620,480 530,500 450,470 C 380,440 320,460 250,440 C 180,420 165,370 150,320 Z" fill="none" stroke="#0f172a" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "trial_mountain.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 150,440 L 460,440 C 500,440 530,410 540,370 L 560,260 C 570,210 540,160 490,160 L 380,160 C 340,160 310,190 310,230 L 310,290 C 310,330 270,360 230,350 L 160,330 C 120,320 90,360 110,400 L 150,440 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "deep_forest.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 140,400 L 480,400 C 530,400 570,360 560,310 L 540,210 C 530,160 480,130 430,150 L 320,200 C 280,220 240,210 220,170 L 200,130 C 180,90 120,110 110,160 L 100,300 C 90,360 110,400 140,400 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "high_speed_ring.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <path d="M 180,340 L 620,340 C 700,340 750,280 730,200 C 710,130 640,100 570,120 L 450,160 C 400,175 350,160 310,130 L 240,80 C 170,30 90,80 80,160 C 70,250 110,340 180,340 Z" fill="none" stroke="#0f172a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "apricot_hill.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <path d="M 140,360 L 480,360 C 530,360 570,320 570,270 L 570,180 C 570,130 520,95 470,115 L 340,170 C 300,185 260,170 240,130 L 210,80 C 180,30 110,60 110,120 L 110,260 C 110,320 120,360 140,360 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "autumn_ring.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 220,450 C 150,450 100,390 120,320 C 140,250 210,210 280,240 L 520,340 C 590,370 660,330 680,260 C 700,190 650,130 580,130 C 510,130 460,190 440,260 L 360,400 C 330,440 280,450 220,450 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "midfield.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="100%" height="100%">
  <path d="M 180,420 L 480,420 C 540,420 590,370 580,310 L 560,220 C 550,160 490,120 430,140 L 330,175 C 280,190 230,170 210,120 L 180,70 C 150,20 80,50 80,110 L 80,310 C 80,380 120,420 180,420 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "cape_ring.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 150,460 L 420,460 C 460,460 490,430 490,390 C 490,320 420,280 370,320 C 330,350 350,410 400,410 L 620,410 C 670,410 710,370 700,320 L 670,180 C 660,130 610,100 560,120 L 260,220 C 200,240 160,300 150,370 L 150,460 Z" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "gt_arena.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <rect x="120" y="100" width="560" height="300" rx="150" fill="none" stroke="#0f172a" stroke-width="22"/>
  <path d="M 280,250 L 520,250" fill="none" stroke="#0f172a" stroke-width="16" stroke-dasharray="20 15"/>
</svg>''',

    "madrid.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 180,460 L 450,460 C 490,460 520,430 520,390 L 520,300 C 520,260 550,230 590,230 L 660,230 C 700,230 730,190 710,150 L 680,100 C 660,60 600,60 570,90 L 480,180 C 450,210 400,220 360,200 L 250,150 C 200,130 150,170 150,230 L 150,390 C 150,430 160,460 180,460 Z" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "tokyo_r246.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 120,440 L 620,440 C 670,440 710,400 700,350 L 660,180 C 650,130 600,100 550,120 L 400,180 C 360,195 320,185 290,155 L 230,95 C 190,55 120,85 120,145 L 120,440 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "roma.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 160,460 L 500,460 C 550,460 590,420 580,370 L 560,250 C 550,200 580,160 630,160 L 690,160 C 730,160 750,120 720,90 L 670,40 C 630,10 570,30 550,80 L 500,200 C 480,240 440,260 400,250 L 260,210 C 200,190 150,240 150,300 L 150,420 C 150,440 155,460 160,460 Z" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "cote_dazur.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 140,460 L 460,460 C 500,460 530,430 525,390 L 515,310 C 510,270 540,240 580,250 L 640,270 C 680,285 720,260 720,215 L 720,150 C 720,110 680,80 640,100 L 480,180 C 440,200 390,190 360,155 L 320,110 C 280,65 210,95 210,155 L 210,240 C 210,280 180,310 140,320 L 120,330 C 90,345 100,460 140,460 Z" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "london.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 220,460 L 540,460 C 580,460 610,430 610,390 L 610,260 C 610,220 580,190 540,190 L 460,190 C 420,190 390,160 390,120 L 390,90 C 390,50 340,30 300,55 L 210,110 C 170,135 150,180 150,230 L 150,390 C 150,430 180,460 220,460 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "ssr5.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 140,460 L 580,460 C 630,460 670,420 660,370 L 640,270 C 630,220 590,180 540,180 L 460,180 C 420,180 390,150 390,110 L 390,80 C 390,40 330,20 290,50 L 190,130 C 150,160 130,210 130,260 L 130,420 C 130,440 135,460 140,460 Z" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "ssr7.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 350" width="100%" height="100%">
  <path d="M 80,240 L 720,240 C 760,240 780,200 760,160 L 730,120 C 710,90 670,90 640,110 L 560,150 L 240,150 L 140,90 C 110,70 70,80 50,110 L 40,160 C 20,200 40,240 80,240 Z" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "ssrx.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" width="100%" height="100%">
  <rect x="60" y="50" width="680" height="200" rx="100" fill="none" stroke="#0f172a" stroke-width="24"/>
</svg>''',

    "eiger.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 180,480 L 460,460 C 510,455 540,410 520,360 L 480,260 C 460,210 500,160 550,160 L 640,160 C 690,160 720,210 700,260 L 640,410 C 620,460 560,490 500,490 L 220,490 C 160,490 120,440 140,380 L 180,260 C 200,200 260,170 320,200 L 380,230" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "toscana.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 160,420 C 130,350 170,270 230,230 C 290,190 370,200 430,240 C 490,280 570,260 620,210 C 670,160 730,190 730,260 C 730,330 680,400 610,430 C 540,460 450,440 380,410 C 310,380 230,450 160,420 Z" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "chamonix.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <path d="M 180,460 L 420,460 C 470,460 500,420 490,370 L 470,280 C 460,230 490,190 540,190 L 620,190 C 670,190 700,230 690,280 L 650,420 C 640,470 590,500 540,500 L 220,500 C 160,500 120,450 140,390 L 180,270 C 200,210 260,180 320,200 L 390,230" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "kart_space.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="100%" height="100%">
  <path d="M 160,420 L 520,420 C 570,420 610,380 610,330 L 610,240 C 610,190 570,150 520,150 L 380,150 C 330,150 290,190 290,240 L 290,300 C 290,340 260,370 220,370 L 160,370 C 120,370 90,330 90,290 L 90,190 C 90,140 130,100 180,100 L 600,100" fill="none" stroke="#0f172a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',

    "lunar.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <!-- Hadley Rille Crater & Valley Path -->
  <path d="M 120,480 C 180,460 220,410 210,350 C 200,280 140,240 180,170 C 220,100 310,90 370,140 C 430,190 410,270 470,310 C 530,350 610,320 660,260 C 710,200 740,240 720,310 C 700,380 640,430 570,450 C 490,470 420,440 350,470 C 270,500 180,510 120,480 Z" fill="none" stroke="#0f172a" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="480" cy="240" r="45" fill="none" stroke="#0f172a" stroke-width="8" stroke-dasharray="10 8"/>
  <circle cx="280" cy="380" r="30" fill="none" stroke="#0f172a" stroke-width="8" stroke-dasharray="8 6"/>
</svg>'''
}

def create_missing_svgs():
    print("Generando mapas vectoriales SVG para circuitos...")
    for filename, content in SVG_TEMPLATES.items():
        filepath = os.path.join(TRACKS_DIR, filename)
        if not os.path.exists(filepath):
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  + Creado SVG: {filename}")
        else:
            print(f"  . Ya existente: {filename}")

def download_track_images():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, slug, image_url FROM tracks")
    tracks = cursor.fetchall()

    print(f"\nDescargando y verificando imágenes locales de {len(tracks)} circuitos...")
    updated = 0

    for tid, slug, remote_url in tracks:
        local_filename = f"{slug}.jpg"
        local_path = os.path.join(IMAGES_DIR, local_filename)
        rel_db_path = f"assets/tracks/images/{local_filename}"

        if not os.path.exists(local_path) or os.path.getsize(local_path) < 1000:
            if remote_url and remote_url.startswith('http'):
                try:
                    req = urllib.request.Request(
                        remote_url,
                        headers={
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                        }
                    )
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        content = resp.read()
                        if len(content) > 1000:
                            with open(local_path, 'wb') as f:
                                f.write(content)
                            print(f"  [OK] Descargado {slug} ({len(content)} bytes)")
                except Exception as e:
                    print(f"  [AVISO] No se pudo descargar {slug}: {e}")

        # Update DB with local path if local image exists
        if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
            cursor.execute("UPDATE tracks SET image_url = ? WHERE id = ?", (rel_db_path, tid))
            updated += 1

    conn.commit()
    conn.close()
    print(f"\nProceso finalizado: {updated} circuitos enlazados con imágenes locales.")

if __name__ == '__main__':
    create_missing_svgs()
    download_track_images()
