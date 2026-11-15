"""Second round for books still without a cover, trying more sources. Candidates go to
data/cover-candidates/ (with a .json beside each saying where it came from) for a visual check;
accept good ones with retry_covers.py --accept ID ...

Order of sources, first hit wins:
  1. Open Library, looser: title without subtitle, title alone, and the author's works matched by title
  2. ISBNs from Google Books (asked slowly), cover from Open Library by ISBN
  3. Deutsche Nationalbibliothek cover service by ISBN (German books)
  4. Google Books' own cover image, as a last resort (marked source "google")

    uv run --with pillow pipeline/fill_covers.py            # every book without a cover
    uv run --with pillow pipeline/fill_covers.py B010 B232  # just these
"""
import json, pathlib, sys, time, urllib.parse
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from fetch_covers import ROOT, META, get, save_cover, title_score

CAND = ROOT / "data/cover-candidates"
books = {b["id"]: b for b in json.loads((ROOT / "data/books.json").read_text())}
meta = json.loads(META.read_text())


def first_author(b):
    return (b["author"] or "").split(";")[0].replace("(ed.)", "").strip()


def ol_docs(**q):
    q.update(fields="key,title,author_name,cover_i,isbn,language", limit=25)
    return (get("https://openlibrary.org/search.json?" + urllib.parse.urlencode(q)) or {}).get("docs", [])


def ol_candidates(b):
    """Cover ids from looser Open Library searches, best title match first."""
    title, author = b["title"], first_author(b)
    short = title.split(":")[0].strip()
    found = []
    for q in ([{"title": short, "author": author}] if author else []) + [{"title": short}] + ([{"author": author}] if author else []):
        for d in ol_docs(**q):
            score = max(title_score(title, d.get("title")), title_score(short, d.get("title")))
            authors = " ".join(d.get("author_name") or []).lower()
            same_author = bool(author) and author.split()[-1].lower() in authors
            if d.get("cover_i") and (score >= 0.9 or (score >= 0.5 and same_author)) and (same_author or not author):
                found.append((score, d["cover_i"], d.get("isbn", [])[:6]))
        time.sleep(0.4)
    found.sort(key=lambda x: -x[0])
    return found


def google(b):
    """ISBNs and the best cover image URL from Google Books for the matching volumes."""
    q = f'intitle:"{b["title"].split(":")[0]}"' + (f' inauthor:"{first_author(b)}"' if b["author"] else "")
    res = None
    for attempt in range(4):
        res = get("https://www.googleapis.com/books/v1/volumes?" + urllib.parse.urlencode({"q": q, "maxResults": 10, "printType": "books"}))
        if res is not None:
            break
        time.sleep(5 + attempt * 5)
    isbns, images = [], []
    for item in (res or {}).get("items", []):
        v = item.get("volumeInfo", {})
        full = v.get("title", "") + (": " + v["subtitle"] if v.get("subtitle") else "")
        if max(title_score(b["title"], full), title_score(b["title"].split(":")[0], v.get("title", ""))) < 0.9:
            continue
        isbns += [i["identifier"] for i in v.get("industryIdentifiers", []) if i["type"].startswith("ISBN")]
        if v.get("imageLinks"):
            images.append(f"https://books.google.com/books/content?id={item['id']}&printsec=frontcover&img=1&zoom=0")
    return isbns, images


def try_one(i):
    b = books[i]
    out = CAND / f"{i}.jpg"

    def keep(url, source):
        c = save_cover(url, out)
        if c:
            (CAND / f"{i}.json").write_text(json.dumps({**c, "source": source, "url": url}))
        return c

    for score, cid, _ in ol_candidates(b)[:4]:
        if keep(f"https://covers.openlibrary.org/b/id/{cid}-L.jpg", "openlibrary"):
            return "openlibrary"
    isbns, images = google(b)
    time.sleep(1.5)
    for isbn in isbns[:8]:
        if keep(f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false", "openlibrary-isbn"):
            return "openlibrary-isbn"
    if b.get("de") or any(isbn.startswith(("3", "9783")) for isbn in isbns):
        for isbn in isbns[:8]:
            if keep(f"https://portal.dnb.de/opac/mvb/cover?isbn={isbn}", "dnb"):
                return "dnb"
    for url in images[:3]:
        if keep(url, "google"):
            return "google"
    return None


if __name__ == "__main__":
    CAND.mkdir(exist_ok=True)
    ids = sys.argv[1:] or [i for i, m in meta.items() if not m.get("cover") and i in books]
    for i in ids:
        print(i, try_one(i) or "-----", books[i]["title"], flush=True)
