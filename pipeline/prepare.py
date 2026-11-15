"""Turn the vault CSV into data/books.json: one entry per title, keyed on the book ID.

Duplicate copies are dropped (the first ID wins). Shelf location and photo stay private:
they are not copied into books.json.
"""
import csv, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DROP = {"B166", "B283"}  # second copies of In Cold Blood and The Algebraist

books = []
with open(ROOT / "data/library.csv", encoding="utf-8-sig", newline="") as f:
    for r in csv.DictReader(f):
        if r["ID"] in DROP:
            continue
        books.append({
            "id": r["ID"],
            "group": r["Group"],
            "section": r["Section"],
            "title": r["Title"],
            "author": r["Author"],
        })

(ROOT / "data/books.json").write_text(json.dumps(books, indent=1, ensure_ascii=False) + "\n")
print(len(books), "books")
