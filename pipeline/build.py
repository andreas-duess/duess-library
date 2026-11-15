"""Build web/public/books.json from the book list, cover metadata, blurbs and Andreas's own notes.

    python3 pipeline/prepare.py && python3 pipeline/build.py

data/notes.json holds Andreas's comments ({"B001": "..."}); they show under "My note".
"""
import colorsys, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data"

GERMAN = {"B019", "B024", "B069", "B072", "B073", "B078", "B079", "B082", "B083", "B086", "B091",
          "B094", "B101", "B102", "B103", "B106", "B169", "B257"}

# blurbs for books that couldn't be identified well enough, kept plain for a public page
BLURB_FIXES = {
    "B078": "A German-language book by Michael Roes, a writer and filmmaker whose novels and essays often grow out of long stays abroad.",
    "B094": "Schattenschwester is the German edition of The Shadow Sister, the third novel in Lucinda Riley's Seven Sisters series. Star D'Aplièse, one of six adopted sisters, follows clues about her origins to London and a story from the early twentieth century.",
    "B106": "A German-language illustrated book about cats.",
    "B169": "Strandkorbkrimis is a German-language anthology of short crime stories set on the Baltic coast, where the hooded beach chair, or Strandkorb, is a familiar sight.",
    "B209": "",
}


def spine_colour(hex_):
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = min(max(l, 0.2), 0.66)
    s = min(1.0, s * 1.3 + 0.05)
    return "#%02x%02x%02x" % tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, l, s))


def load(name, default):
    p = D / name
    return json.loads(p.read_text()) if p.exists() else default


books = load("books.json", [])
meta = load("meta.json", {})
notes = load("notes.json", {})
blurbs = {}
for i in (1, 2, 3):
    blurbs.update(load(f"blurbs-{i}.json", {}))
blurbs.update(BLURB_FIXES)

out = []
for b in books:
    m = meta.get(b["id"], {})
    cover = m.get("cover")
    if cover and not (ROOT / f"web/public/covers/{b['id']}.jpg").exists():
        cover = None
    out.append({
        "id": b["id"], "section": "Miscellany" if b["section"] == "Unsorted" else b["section"], "title": b["title"], "author": b["author"],
        "blurb": blurbs.get(b["id"], ""), "note": notes.get(b["id"], ""),
        "year": m.get("year"), "pages": m.get("pages"),
        "cover": {"w": cover["w"], "h": cover["h"]} if cover else None,
        "color": spine_colour(cover["color"]) if cover else None,
        "de": b["id"] in GERMAN,
    })

(ROOT / "web/public/books.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(len(out), "books,", sum(1 for b in out if b["cover"]), "covers,", sum(1 for b in out if b["blurb"]), "blurbs")
