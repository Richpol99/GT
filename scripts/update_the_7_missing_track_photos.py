import os
import io
import sqlite3
import cloudscraper
from PIL import Image

UPDATED_7_TRACKS = {
    "daytona": "https://www.gtplanet.net/wp-content/uploads/2021/12/gt7-bts-ps5-20211216.jpg",
    "fuji-speedway": "https://www.gtplanet.net/wp-content/uploads/2018/09/Gran-Turismo-6-Toyota-TS020-Fuji-Speedway-Man-of-Mister.jpg",
    "indianapolis": "https://static.wikia.nocookie.net/gran-turismo/images/1/1d/Indianapolis_Road_Course-BMW_Z4_GT3.jpg",
    "twin-ring-motegi": "https://www.gtplanet.net/wp-content/uploads/2012/06/twin-ring-motegi-gt5-1.jpg",
    "autumn-ring": "https://www.gtplanet.net/wp-content/uploads/2015/02/13813645163_9e33a0d70c_b.jpg",
    "grand-valley": "https://www.gtplanet.net/wp-content/uploads/2023/02/image-1-3.jpg",
    "high-speed-ring": "https://www.gtplanet.net/wp-content/uploads/2021/09/gt7-highspeedring-20210909.jpg"
}

def main():
    scraper = cloudscraper.create_scraper()
    output_dir = "assets/tracks/images"
    os.makedirs(output_dir, exist_ok=True)
    
    conn = sqlite3.connect("database/gt_academy.db")
    c = conn.cursor()

    print(f"Updating the 7 tracks with real in-game photography...")

    for slug, url in UPDATED_7_TRACKS.items():
        target_path = os.path.join(output_dir, f"{slug}.jpg")
        print(f"Fetching in-game photo for {slug}...")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://gran-turismo.fandom.com/" if "wikia" in url else "https://www.gtplanet.net/"
        }

        try:
            r = scraper.get(url, headers=headers, timeout=20)
            if r.status_code != 200:
                print(f"  ERROR {r.status_code} for {slug}")
                continue

            img = Image.open(io.BytesIO(r.content))
            
            if img.mode != "RGB":
                img = img.convert("RGB")

            # Resize if excessive to 1920 width
            if img.width > 1920:
                new_height = int(img.height * (1920 / img.width))
                img = img.resize((1920, new_height), Image.Resampling.LANCZOS)

            img.save(target_path, "JPEG", quality=92, optimize=True)
            file_size_kb = os.path.getsize(target_path) // 1024

            db_url = f"/assets/tracks/images/{slug}.jpg"
            c.execute("UPDATE tracks SET image_url = ? WHERE slug = ?", (db_url, slug))
            conn.commit()

            print(f"  SUCCESS: {slug}.jpg replaced with in-game photo ({img.width}x{img.height}, {file_size_kb} KB)")

        except Exception as e:
            print(f"  EXCEPTION for {slug}: {e}")

    conn.close()
    print("\nAll 7 track images successfully replaced with real in-game photography!")

if __name__ == "__main__":
    main()
