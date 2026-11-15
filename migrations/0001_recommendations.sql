-- Books visitors recommend through the "Recommend a book" form.
CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  title TEXT NOT NULL,
  author TEXT,
  note TEXT,
  name TEXT,
  email TEXT,
  country TEXT,
  ip_hash TEXT NOT NULL,   -- salted hash, only for the per-visitor limit
  emailed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS recommendations_ip_time ON recommendations (ip_hash, created_at);
