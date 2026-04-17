-- IGOTU: New modules migration (SQLite)
-- Adds tables for AI chat, PHQ-9, exercises, cognitive restructuring, mood tracking

-- AI Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '新对话',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

-- AI Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- PHQ-9 Assessment Results
CREATE TABLE IF NOT EXISTS phq9_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 27),
  severity TEXT NOT NULL,
  answers TEXT NOT NULL,
  functional_impact INTEGER CHECK (functional_impact >= 0 AND functional_impact <= 3),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_phq9_user ON phq9_results(user_id);
CREATE INDEX IF NOT EXISTS idx_phq9_date ON phq9_results(user_id, created_at);

-- Exercise Logs (Breathing + Grounding)
CREATE TABLE IF NOT EXISTS exercise_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('breathing', 'grounding')),
  technique TEXT,
  data TEXT DEFAULT '{}',
  completed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exercise_user ON exercise_logs(user_id);

-- Cognitive Restructuring Records
CREATE TABLE IF NOT EXISTS cognitive_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thought TEXT NOT NULL,
  emotions TEXT DEFAULT '[]',
  distortions TEXT DEFAULT '[]',
  intensity_before INTEGER CHECK (intensity_before >= 1 AND intensity_before <= 10),
  supporting_evidence TEXT,
  counter_evidence TEXT,
  balanced_thought TEXT,
  intensity_after INTEGER CHECK (intensity_after >= 1 AND intensity_after <= 10),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cognitive_user ON cognitive_records(user_id);

-- Mood Entries (Enhanced)
CREATE TABLE IF NOT EXISTS mood_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
  mood_emoji TEXT NOT NULL,
  mood_label TEXT NOT NULL,
  note TEXT,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_date ON mood_entries(user_id, recorded_at);
