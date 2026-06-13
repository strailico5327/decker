INSERT OR IGNORE INTO decks (
  id,
  title,
  source_name,
  created_at,
  updated_at
) VALUES (
  'deck_sample',
  'Sample Deck',
  'Demo',
  '2026-06-13T00:00:00Z',
  '2026-06-13T00:00:00Z'
);

INSERT OR IGNORE INTO phrases (
  id,
  deck_id,
  phrase,
  type,
  meaning,
  example,
  pattern,
  trap,
  tags_json,
  created_at,
  updated_at
) VALUES
(
  'phrase_run_into_001',
  'deck_sample',
  'run into',
  'phrv',
  'meet someone by chance',
  'I ran into an old friend at the station.',
  'run into + person',
  'Similar to come across, but often used for meeting people.',
  '["daily","B1"]',
  '2026-06-13T00:00:00Z',
  '2026-06-13T00:00:00Z'
),
(
  'phrase_close_shave_001',
  'deck_sample',
  'close shave',
  'idiom',
  'a narrow escape from danger',
  'That was a close shave.',
  NULL,
  NULL,
  '["idiom","B2"]',
  '2026-06-13T00:00:00Z',
  '2026-06-13T00:00:00Z'
),
(
  'phrase_take_into_account_001',
  'deck_sample',
  'take something into account',
  'fixed',
  'consider something when making a decision',
  'We need to take the weather into account.',
  'take sth into account',
  'The preposition is into, not in or for.',
  '["pattern","writing"]',
  '2026-06-13T00:00:00Z',
  '2026-06-13T00:00:00Z'
);