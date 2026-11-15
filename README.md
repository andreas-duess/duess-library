# duess-library

whatiamreading.com (formerly library.duess.com): Andreas's home library as a bookshelf. White shelves wall to wall, sections packed onto them, spines drawn in code from each book's format and cover colours; click a spine and the book comes off the shelf, turns to its cover, and a short note sits beside it. Search by title, author or section, and a "Recommend a book" form.

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

## Recommendations

`worker.js` answers `POST /api/recommend` (everything else is static files). Each recommendation is stored in D1 (`whatiamreading`, table `recommendations`, schema in `migrations/`) and emailed to andreas@duess.com from library@whatiamreading.com, Reply-To the visitor when they gave an address. Email needs Email Routing switched on for whatiamreading.com; until then rows are stored with `emailed = 0`.

Spam checks, invisible to visitors: Turnstile in invisible mode (widget "whatiamreading", secret in the Worker secret `TURNSTILE_SECRET`, test keys locally via `.dev.vars`), a hidden honeypot field, at least three seconds with the form open, length limits, and five per visitor an hour (salted IP hash).

Read them: `npx wrangler@4 d1 execute whatiamreading --remote --command "SELECT created_at, title, author, note, name, email FROM recommendations ORDER BY id DESC"`

Local: `npx wrangler@4 d1 execute whatiamreading --local --file migrations/0001_recommendations.sql`, then `npx wrangler@4 dev`.

## Deploy

Cloudflare Worker with static assets, Andreas@duess.com account, custom domains `whatiamreading.com` and `www.whatiamreading.com` (`wrangler.jsonc`).

    npx wrangler@4 deploy

Wrangler on the Mac Mini is logged in to that account (OAuth).

Local preview: `npx wrangler@4 dev` (serves the site and the Worker).

Social card: `web/public/social-card.jpg`, rendered from the page by `pipeline/social-card.mjs` (instructions at its top). Re-render after visible design changes.
