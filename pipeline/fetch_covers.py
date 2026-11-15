"""Find a cover and page count for every book in data/books.json and save covers to web/public/covers/.

Open Library first (search by title and author). Google Books only to find an ISBN when Open Library's
search misses; the image itself always comes from Open Library, so we host our own copy legally.
Results go to data/meta.json; books already there are skipped, so the script can be re-run.

    uv run --with pillow pipeline/fetch_covers.py
"""
from concurrent.futures import ThreadPoolExecutor
import io, json, re, unicodedata, pathlib, time, urllib.parse, urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
COVERS = ROOT / "web/public/covers"
META = ROOT / "data/meta.json"
UA = {"User-Agent": "library.duess.com cover fetch (andreas@duess.com)"}


def get(url, raw=False):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
                data = r.read()
                return data if raw else json.loads(data)
        except Exception:
            time.sleep(2 + attempt * 3)
    return None


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()).strip()


def title_score(ours, theirs):
    """1.0 for the same title, less for extras like 'Home Made Christmas' against 'Home Made'."""
    a, b = norm(ours), norm(theirs or "")
    if a == b:
        return 1.0
    a_main, b_main = norm(ours.split(":")[0]), norm((theirs or "").split(":")[0])
    if a_main == b_main:
        return 0.9
    if b.startswith(a) or a.startswith(b):
        return 0.5
    return 0.2 if set(a.split()) & set(b.split()) else 0.0


def ol_search(title, author):
    q = {"title": title, "fields": "key,title,author_name,cover_i,number_of_pages_median,isbn,first_publish_year", "limit": 10}
    if author:
        q["author"] = author.split(";")[0].replace("(ed.)", "").strip()
    res = get("https://openlibrary.org/search.json?" + urllib.parse.urlencode(q))
    docs = (res or {}).get("docs", [])
    if not docs and author:  # retry on title alone
        q.pop("author")
        res = get("https://openlibrary.org/search.json?" + urllib.parse.urlencode(q))
        docs = (res or {}).get("docs", [])
    # best title match first; a partial match ("Food52 Genius Recipes") only counts when the author matched too
    floor = 0.5 if "author" in q else 0.9
    docs = sorted((d for d in docs if title_score(title, d.get("title")) >= floor),
                  key=lambda d: (-title_score(title, d.get("title")), not d.get("cover_i")))
    return docs[0] if docs else None


def google_isbns(title, author):
    q = f'intitle:"{title}"' + (f' inauthor:"{author.split(";")[0].replace("(ed.)", "").strip()}"' if author else "")
    res = get("https://www.googleapis.com/books/v1/volumes?" + urllib.parse.urlencode({"q": q, "maxResults": 5}))
    out, pages = [], None
    for item in (res or {}).get("items", []):
        v = item.get("volumeInfo", {})
        if title_score(title, v.get("title", "") + (": " + v["subtitle"] if v.get("subtitle") else "")) < 0.9:
            continue
        pages = pages or v.get("pageCount")
        out += [i["identifier"] for i in v.get("industryIdentifiers", []) if i["type"].startswith("ISBN")]
    return out, pages


def save_cover(url, path):
    data = get(url, raw=True)
    if not data or len(data) < 2000:  # Open Library returns a 1x1 gif or tiny image when it has none
        return None
    img = Image.open(io.BytesIO(data)).convert("RGB")
    if img.width < 100:
        return None
    if img.width > 500:
        img = img.resize((500, round(img.height * 500 / img.width)), Image.LANCZOS)
    img.save(path, "JPEG", quality=82, optimize=True)
    small = img.resize((1, 1), Image.LANCZOS).getpixel((0, 0))  # average colour, for the spine
    return {"w": img.width, "h": img.height, "color": "#%02x%02x%02x" % small}


def fetch_one(b):
    doc = ol_search(b["title"], b["author"])
    m = {"pages": (doc or {}).get("number_of_pages_median"), "year": (doc or {}).get("first_publish_year"),
         "ol": (doc or {}).get("key"), "ol_title": (doc or {}).get("title"), "cover": None}
    path = COVERS / f"{b['id']}.jpg"
    if doc and doc.get("cover_i"):
        m["cover"] = save_cover(f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-L.jpg", path)
    if not m["cover"]:
        isbns, pages = google_isbns(b["title"], b["author"])
        m["pages"] = m["pages"] or pages
        for isbn in isbns[:4]:
            m["cover"] = save_cover(f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false", path)
            if m["cover"]:
                break
    return b, m


def main():
    books = json.loads((ROOT / "data/books.json").read_text())
    meta = json.loads(META.read_text()) if META.exists() else {}
    COVERS.mkdir(parents=True, exist_ok=True)
    todo = [b for b in books if b["id"] not in meta]
    with ThreadPoolExecutor(max_workers=6) as pool:
        for b, m in pool.map(fetch_one, todo):
            meta[b["id"]] = m
            META.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
            print(b["id"], "cover" if m["cover"] else "-----", m["pages"], b["title"], flush=True)
    found = sum(1 for b in books if meta[b["id"]]["cover"])
    print(f"{found}/{len(books)} covers")


if __name__ == "__main__":
    main()
