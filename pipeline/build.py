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
    "B178": "Dispatches from the Front is David Halton's biography of his father, Matthew Halton, the CBC correspondent whose radio reports from the Second World War made him one of the best-known voices in Canada.",
    "B255": "The Get is a crime novel by the Canadian author Dietrich Kalteis, published by ECW Press.",
    "B070": "Montenegro is a 1997 novel by Starling Lawrence, an American editor and writer. Its story is set in the Balkans in the years before the First World War.",
    "B214": "The Prairie Dog Conspiracy is a mystery for young readers by the Canadian author Eric Wilson, part of his series about the young detectives Tom and Liz Austen.",
    "B301": "Necrophenia is a comic novel by Robert Rankin, set in the absurd version of Brentford, the west London suburb, that runs through many of his books.",
}

# first-publication years where Open Library's first match gave an edition or translation year (None hides it)
YEAR_FIXES = {
    "B306": 1842, "B093": 1836, "B278": 1835, "B083": 2001, "B063": 1994, "B275": 1991, "B308": 1998,
    "B228": 2010, "B235": 1958, "B050": 2005, "B033": 1993, "B253": 1994, "B326": 1955, "B162": 1943,
    "B217": 2005, "B288": 2017, "B164": 1999, "B299": 1994, "B145": 2002,
    "B091": None, "B069": None, "B061": None, "B240": None, "B245": None, "B130": None, "B106": None,
    "B209": None, "B159": None, "B101": None, "B301": None,
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
        "year": YEAR_FIXES.get(b["id"], m.get("year")), "pages": m.get("pages"),
        "cover": {"w": cover["w"], "h": cover["h"]} if cover else None,
        "color": spine_colour(cover["color"]) if cover else None,
        "de": b["id"] in GERMAN,
    })

(ROOT / "web/public/books.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(len(out), "books,", sum(1 for b in out if b["cover"]), "covers,", sum(1 for b in out if b["blurb"]), "blurbs")
