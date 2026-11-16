"""Add a cover from a local image (a photo of Andreas's own copy, or a cleaner scan) for one book.
Crop and straighten a phone photo first; this only resizes it to 500px wide and records it.

    uv run --with pillow pipeline/add_cover.py B174 ~/Downloads/cover.png [source]
    uv run --with pillow pipeline/build.py
"""
import json, pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
META = ROOT / "data/meta.json"

book_id, src = sys.argv[1], pathlib.Path(sys.argv[2]).expanduser()
source = sys.argv[3] if len(sys.argv) > 3 else "andreas"
img = Image.open(src).convert("RGB")
if img.width > 500:
    img = img.resize((500, round(img.height * 500 / img.width)), Image.LANCZOS)
img.save(ROOT / f"web/public/covers/{book_id}.jpg", "JPEG", quality=82, optimize=True)
avg = img.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
meta = json.loads(META.read_text())
meta.setdefault(book_id, {"pages": None, "year": None, "ol": None})
meta[book_id]["cover"] = {"w": img.width, "h": img.height, "color": "#%02x%02x%02x" % avg, "source": source}
META.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
print(book_id, img.size)
