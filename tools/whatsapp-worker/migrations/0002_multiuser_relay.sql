CREATE TABLE relay_control (id INTEGER PRIMARY KEY CHECK(id=1),binding TEXT NOT NULL,paused INTEGER NOT NULL DEFAULT 1);
CREATE TABLE relay_lanes (id TEXT PRIMARY KEY,lease TEXT,lease_until INTEGER NOT NULL DEFAULT 0,window INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE relay_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  lane TEXT NOT NULL REFERENCES relay_lanes(id),
  state TEXT NOT NULL,
  payload TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  next_attempt INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX relay_due ON relay_events(next_attempt,seq) WHERE state IN ('pending','answered');
CREATE INDEX relay_lane_pending ON relay_events(lane,seq) WHERE state IN ('pending','answered');
