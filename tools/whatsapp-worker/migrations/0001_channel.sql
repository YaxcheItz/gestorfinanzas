CREATE TABLE channel (
  id INTEGER PRIMARY KEY CHECK(id=1),
  binding TEXT NOT NULL,
  paused INTEGER NOT NULL DEFAULT 1,
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  refresh_pending INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  verified_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE secrets (name TEXT PRIMARY KEY, ciphertext TEXT NOT NULL);
CREATE TABLE events (
  key TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  state TEXT NOT NULL,
  payload TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  next_attempt INTEGER NOT NULL DEFAULT 0,
  replied INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX events_due ON events(next_attempt,state,received_at);
CREATE INDEX events_audio ON events(source,state);
CREATE INDEX events_actionable ON events(next_attempt,received_at) WHERE state IN ('pending','ready','audio_wait','probe') OR (replied=0 AND state IN ('answered','saved','inbox','audio_review'));
