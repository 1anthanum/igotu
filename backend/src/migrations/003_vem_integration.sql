-- VEM Integration: outbox, health snapshots, micro feedback
-- Supports event bridging to VEM Engine

-- Outbox for reliable event delivery to VEM
CREATE TABLE IF NOT EXISTS vem_outbox (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  delivered INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vem_outbox_pending
  ON vem_outbox(delivered, attempts, created_at);

-- Apple Health daily snapshots (forwarded to VEM)
CREATE TABLE IF NOT EXISTS health_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hrv_ms REAL,
  sleep_hours REAL,
  sleep_deep_pct REAL,
  resting_hr REAL,
  steps INTEGER,
  workout_min REAL,
  cycle_day INTEGER,
  recorded_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_health_user_date
  ON health_snapshots(user_id, recorded_date DESC);

-- Micro feedback from VEM prompts
CREATE TABLE IF NOT EXISTS micro_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL,
  chip_id TEXT NOT NULL,
  context TEXT,
  source TEXT NOT NULL DEFAULT 'igotu_home',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_micro_feedback_user
  ON micro_feedback(user_id, created_at DESC);