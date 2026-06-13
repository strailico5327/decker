CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phrases (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  phrase TEXT NOT NULL,
  type TEXT NOT NULL,
  meaning TEXT NOT NULL,
  example TEXT,
  pattern TEXT,
  trap TEXT,
  tags_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (deck_id) REFERENCES decks(id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  phrase_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  selected_answer TEXT,
  correct INTEGER NOT NULL,
  rating TEXT,
  answered_at TEXT NOT NULL,
  device_id TEXT,
  FOREIGN KEY (phrase_id) REFERENCES phrases(id)
);

CREATE TABLE IF NOT EXISTS phrase_progress (
  phrase_id TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  hesitated_count INTEGER NOT NULL DEFAULT 0,
  mastery INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  last_reviewed_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (phrase_id) REFERENCES phrases(id)
);