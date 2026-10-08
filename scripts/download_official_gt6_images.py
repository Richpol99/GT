import os
import sys
import io
import sqlite3
import cloudscraper
from PIL import Image

TRACK_SOURCES = {
    # Real Tracks
    "silverstone": "https://www.gran-turismo.com/images/c/i19pm07ZCPoENEE.jpg",
    "mount-panorama": "https://www.gran-turismo.com/images/c/i1ZoDaH4zQhcpuH.jpg",
    "brands-hatch": "https://www.gran-turismo.com/images/c/i1aYiItLnsJLX8c.jpg",
    "spa-francorchamps": "https://static.wikia.nocookie.net/gran-turismo/images/5/56/Eau_Rouge.jpg",
    "nurburgring": "https://static.wikia.nocookie.net/gran-turismo/images/9/95/Caracciola-Karussell_%281%29.jpg",
    "lemans": "https://static.wikia.nocookie.net/gran-turismo/images/4/43/Dunlop_Bridge.jpg",
    "laguna-seca": "https://static.wikia.nocookie.net/gran-turismo/images/7/7e/Corkscrew.jpg",
    "willow-springs": "https://www.gran-turismo.com/images/c/i1ByDzOOdBhzy.jpg",
    "ascari": "https://www.gran-turismo.com/images/c/i1IyY9Nv7W.jpg",
    "goodwood": "https://www.gran-turismo.com/images/c/i1tcgvbU3oaTREc.jpg",
    "monza": "https://static.wikia.nocookie.net/gran-turismo/images/7/78/Curva_Parabolica.jpg",
    "daytona": "https://static.wikia.nocookie.net/gran-turismo/images/7/74/Daytona_International_Speedway.jpg",
    "indianapolis": "https://static.wikia.nocookie.net/gran-turismo/images/7/79/Indianapolis_Motor_Speedway.jpg",
    "twin-ring-motegi": "https://static.wikia.nocookie.net/gran-turismo/images/2/28/Twin_Ring_Motegi_Road_Course.jpg",
    "suzuka": "https://www.gran-turismo.com/images/c/i1fz39iuPMMv1.jpg",
    "fuji-speedway": "https://static.wikia.nocookie.net/gran-turismo/images/9/9b/Fuji_Speedway_2005.jpg",
    "tsukuba": "https://static.wikia.nocookie.net/gran-turismo/images/7/7b/Tsukuba_Circuitrx71.jpg",
    "red-bull-ring": "https://www.gran-turismo.com/images/c/i16pcQxNBwFWThH.jpg",

    # Original Tracks
    "matterhorn": "https://www.gran-turismo.com/images/c/i1THEiP6Zjw5NEc.jpg",
    "circuito-de-la-sierra": "https://www.gran-turismo.com/images/c/i1Gfo9fys0MMcuB.jpg",
    "grand-valley": "https://static.wikia.nocookie.net/gran-turismo/images/8/8c/Grand_Valley_Hybrid.jpg",
    "trial-mountain": "https://static.wikia.nocookie.net/gran-turismo/images/8/8a/Jstrial-mountain-circuit002.jpg",
    "deep-forest": "https://static.wikia.nocookie.net/gran-turismo/images/1/1d/Deep_Forest_Raceway_1.jpg",
    "high-speed-ring": "https://static.wikia.nocookie.net/gran-turismo/images/d/d4/High_Speed_Ring.jpg",
    "apricot-hill": "https://www.gran-turismo.com/images/c/i1Sx6HiSAWwkOz.jpg",
    "autumn-ring": "https://static.wikia.nocookie.net/gran-turismo/images/b/b3/Autumn_Ring.jpg",
    "mid-field-raceway": "https://www.gran-turismo.com/images/c/i1akKOdcpKVCL.jpg",
    "cape-ring": "https://static.wikia.nocookie.net/gran-turismo/images/9/9d/Cape_Ring_Loop.png",
    "gt-arena": "https://www.gran-turismo.com/images/c/i1eEhtMcELeTp.jpg",

    # City / Urban Tracks
    "circuito-de-madrid": "https://static.wikia.nocookie.net/gran-turismo/images/4/4b/Circuito_de_Madrid.jpg",
    "tokyo-r246": "https://static.wikia.nocookie.net/gran-turismo/images/1/1c/Tokyo_Route_246.jpg",
    "roma": "https://static.wikia.nocookie.net/gran-turismo/images/c/c3/Rome_Circuit_%28GT5%29.jpg",
    "cote-d-azur": "https://static.wikia.nocookie.net/gran-turismo/images/2/2b/Cote_d%27Azur.jpg",
    "london": "https://static.wikia.nocookie.net/gran-turismo/images/f/f6/London.jpg",
    "ssr5": "https://static.wikia.nocookie.net/gran-turismo/images/5/5a/Special_Stage_Route_5.jpg",
    "ssr7": "https://static.wikia.nocookie.net/gran-turismo/images/d/db/Special_Stage_Route_7.jpg",
    "ssrx": "https://static.wikia.nocookie.net/gran-turismo/images/6/6d/Special_Stage_Route_X.jpg",

    # Dirt & Snow
    "eiger-nordwand": "https://static.wikia.nocookie.net/gran-turismo/images/e/e2/Eiger_Nordwand.png",
    "toscana": "https://static.wikia.nocookie.net/gran-turismo/images/0/0c/Toscana.jpg",
    "chamonix": "https://static.wikia.nocookie.net/gran-turismo/images/b/b1/Chamonix_%28GT5%29.jpg",

    # Special
    "kart-space": "https://static.wikia.nocookie.net/gran-turismo/images/6/6e/Kart_Space_I.jpg",
    "lunar-exploration": "https://www.gtplanet.net/wp-content/uploads/2013/12/LunarExploration_06_1385985392.jpg"
}

def main():
    scraper = cloudscraper.create_scraper()
    output_dir = "assets/tracks/images"
    os.makedirs(output_dir, exist_ok=True)
    
    conn = sqlite3.connect("database/gt_academy.db")
    c = conn.cursor()

    total = len(TRACK_SOURCES)
    success = 0

    print(f"Starting download of {total} official Polyphony Digital / GT6 course images...")

    for idx, (slug, url) in enumerate(TRACK_SOURCES.items(), 1):
        target_path = os.path.join(output_dir, f"{slug}.jpg")
        print(f"[{idx}/{total}] Fetching {slug} from {url[:60]}...")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://gran-turismo.fandom.com/" if "wikia" in url else "https://www.gran-turismo.com/"
        }

        try:
            r = scraper.get(url, headers=headers, timeout=20)
            if r.status_code != 200:
                print(f"  ERROR {r.status_code} for {slug}")
                continue

            img = Image.open(io.BytesIO(r.content))
            
            # Convert to RGB if RGBA or P
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # Resize if giant (e.g. 4K) to max 1920 width to keep fast loading while pristine quality
            if img.width > 1920:
                new_height = int(img.height * (1920 / img.width))
                img = img.resize((1920, new_height), Image.Resampling.LANCZOS)

            img.save(target_path, "JPEG", quality=92, optimize=True)
            file_size_kb = os.path.getsize(target_path) // 1024

            # Update database
            db_url = f"/assets/tracks/images/{slug}.jpg"
            c.execute("UPDATE tracks SET image_url = ? WHERE slug = ?", (db_url, slug))
            conn.commit()

            print(f"  OK: Saved {slug}.jpg ({img.width}x{img.height}, {file_size_kb} KB)")
            success += 1

        except Exception as e:
            print(f"  EXCEPTION for {slug}: {e}")

    conn.close()
    print(f"\nDone! Successfully updated {success}/{total} tracks with official GT6 images.")

if __name__ == "__main__":
    main()
