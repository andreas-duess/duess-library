"""Second try for books without a usable cover: ISBNs from Google Books, image from Open Library.
Candidates land in data/cover-candidates/ for a visual check; accept them with --accept ID ID ...

    uv run --with pillow pipeline/retry_covers.py B014 B050 ...      # fetch candidates
    uv run --with pillow pipeline/retry_covers.py --accept B014 ...  # move into web/public/covers
"""
import json, pathlib, shutil, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from fetch_covers import ROOT, META, google_isbns, save_cover, get

CAND = ROOT / "data/cover-candidates"
books = {b["id"]: b for b in json.loads((ROOT / "data/books.json").read_text())}
meta = json.loads(META.read_text())


def edition_isbns(olkey):
    """ISBNs of every edition of the Open Library work, English first."""
    if not olkey:
        return []
    res = get(f"https://openlibrary.org{olkey}/editions.json?limit=60") or {}
    eng, other = [], []
    for e in res.get("entries", []):
        isbns = e.get("isbn_13", []) + e.get("isbn_10", [])
        langs = [l.get("key", "") for l in e.get("languages", [])]
        (eng if any("eng" in l for l in langs) or not langs else other).extend(isbns)
    return eng + other


def try_one(i):
    b = books[i]
    isbns, _ = google_isbns(b["title"], b["author"])
    isbns = list(dict.fromkeys(edition_isbns(meta.get(i, {}).get("ol")) + isbns))
    for isbn in isbns[:25]:
        c = save_cover(f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false", CAND / f"{i}.jpg")
        if c:
            return i, c, isbn
    return i, None, None


if sys.argv[1] == "--accept":
    for i in sys.argv[2:]:
        shutil.move(CAND / f"{i}.jpg", ROOT / f"web/public/covers/{i}.jpg")
        meta[i]["cover"] = json.loads((CAND / f"{i}.json").read_text())
    META.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
else:
    CAND.mkdir(exist_ok=True)
    with ThreadPoolExecutor(6) as pool:
        for i, c, isbn in pool.map(try_one, sys.argv[1:]):
            if c:
                (CAND / f"{i}.json").write_text(json.dumps(c))
            print(i, isbn or "-----", books[i]["title"], flush=True)
