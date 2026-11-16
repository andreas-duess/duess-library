"""Second round for books still without a cover, trying more sources. Candidates go to
data/cover-candidates/ (with a .json beside each saying where it came from) for a visual check;
accept good ones with retry_covers.py --accept ID ...

Order of sources, first hit wins:
  1. Open Library, looser: title without subtitle, title alone, and the author's works matched by title
  2. Apple Books (the public iTunes search, e-book editions), sharp covers up to 800x1200
  3. Deutsche Nationalbibliothek cover service by ISBN (German books)
  4. Goodreads covers through bookcover.longitood.com, as a last resort
Google Books is left out: without an API key it refuses after a few requests.

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


def apple(b):
    """Cover images from Apple Books (the public iTunes search), for e-book editions whose title and author match."""
    author = first_author(b)
    term = f'{b["title"].split(":")[0]} {author.split()[-1] if author else ""}'.strip()
    res = get("https://itunes.apple.com/search?" + urllib.parse.urlencode({"term": term, "media": "ebook", "limit": 15})) or {}
    out = []
    for r in res.get("results", []):
        score = max(title_score(b["title"], r.get("trackName")), title_score(b["title"].split(":")[0], r.get("trackName")))
        same_author = bool(author) and author.split()[-1].lower() in (r.get("artistName") or "").lower()
        if r.get("artworkUrl100") and (score >= 0.9 or (score >= 0.5 and same_author)) and (same_author or not author):
            out.append((score, r["artworkUrl100"].replace("100x100bb", "800x1200bb")))
    out.sort(key=lambda x: -x[0])
    return [u for _, u in out]


def bookcover_api(b):
    """Goodreads covers through the bookcover.longitood.com service."""
    q = {"book_title": b["title"].split(":")[0], "author_name": first_author(b)}
    res = get("https://bookcover.longitood.com/bookcover?" + urllib.parse.urlencode(q)) or {}
    return [res["url"]] if res.get("url") else []


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
    for url in apple(b)[:3]:
        if keep(url, "apple"):
            return "apple"
    isbns = [isbn for _, _, ib in ol_candidates(b) for isbn in ib] if b.get("de") else []
    for isbn in isbns[:8]:
        if keep(f"https://portal.dnb.de/opac/mvb/cover?isbn={isbn}", "dnb"):
            return "dnb"
    if b["author"]:
        for url in bookcover_api(b):
            if keep(url, "goodreads"):
                return "goodreads"
    return None


if __name__ == "__main__":
    CAND.mkdir(exist_ok=True)
    ids = sys.argv[1:] or [i for i, m in meta.items() if not m.get("cover") and i in books and not (CAND / f"{i}.jpg").exists()]
    for i in ids:
        print(i, try_one(i) or "-----", books[i]["title"], flush=True)
