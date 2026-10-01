-- Schema D1 per Tally Room Reviews
CREATE TABLE IF NOT EXISTS ships (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  name_norm   TEXT NOT NULL UNIQUE,
  seed_rating REAL,                       -- voto iniziale importato dalla lista
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ship_id     INTEGER NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL,           -- 1..5, 0 se la tally room non è presente
  has_tally   INTEGER NOT NULL DEFAULT 1, -- 1 = tally room presente, 0 = assente
  amenities   TEXT NOT NULL,              -- JSON: {"power220":true,...}
  comment     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  ip_hash     TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id   INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  ship_id     INTEGER NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,
  content_type TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id   INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_ship ON reviews(ship_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_photos_review ON photos(review_id);
CREATE INDEX IF NOT EXISTS idx_reviews_ip ON reviews(ip_hash, created_at);
