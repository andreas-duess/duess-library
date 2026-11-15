# duess-library

library.duess.com: Andreas's home library as a bookshelf. One shelf per section, spines drawn in code; click a spine and the book comes off the shelf, turns to its cover, and a short note sits beside it.

## Where things are

- `data/library.csv`: the book list. Its source is the vault, `~/Claude/Personal/Library/2026-11-15-library.csv`; copy it over after changes there.
- `data/notes.json`: Andreas's own comments, `{"B001": "text"}`. They show under "My note" beside the blurb.
- `data/blurbs-*.json`: two-sentence neutral descriptions. `BLURB_FIXES` in `pipeline/build.py` overrides single books.
- `data/meta.json`: cover size, colour, page count and first-publication year per book, written by `fetch_covers.py`.
- `web/public/`: the site (plain HTML, CSS and JS). `covers/` holds our own copies of the covers, 500px wide.

## Rebuild

    python3 pipeline/prepare.py                          # CSV -> data/books.json (drops duplicate copies)
    uv run --with pillow pipeline/fetch_covers.py        # new books only; covers from Open Library
    uv run --with pillow pipeline/build.py               # -> web/public/books.json (spine colours from covers)

Covers come from Open Library, matched on title and author. Google Books is used only to find an ISBN when the Open Library search misses; the image always comes from Open Library. Books without a cover get a generated one (title and author on the spine colour). To fix a wrong cover, drop a JPEG at `web/public/covers/<ID>.jpg` and set its `cover` entry in `data/meta.json`.

German books (`GERMAN` in `build.py`) get spines that read bottom to top.

## Deploy

Cloudflare Workers static assets, Andreas@duess.com account, custom domain `library.duess.com` (`wrangler.jsonc`).

    npx wrangler@4 deploy

Wrangler on the Mac Mini is logged in to that account (OAuth).

Local preview: `cd web/public && python3 -m http.server 8765`.
