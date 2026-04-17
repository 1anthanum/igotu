-- IGOTU Initial Schema (SQLite)
-- 一站式抑郁应对平台数据库结构

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  timezone TEXT DEFAULT 'Asia/Shanghai',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Achievement templates (quick-select options)
CREATE TABLE IF NOT EXISTS achievement_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  emoji TEXT,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, title)
);

-- Logged achievements (core data)
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES achievement_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  emoji TEXT,
  category TEXT,
  note TEXT,
  recorded_date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Mood check-ins (optional, legacy from microwins)
CREATE TABLE IF NOT EXISTS mood_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  note TEXT,
  recorded_date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'zh',
  show_streak INTEGER DEFAULT 1,
  daily_reminder_enabled INTEGER DEFAULT 0,
  daily_reminder_time TEXT DEFAULT '20:00',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_achievements_user_date
  ON achievements(user_id, recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_achievements_user_category
  ON achievements(user_id, category);

CREATE INDEX IF NOT EXISTS idx_templates_user
  ON achievement_templates(user_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_mood_user_date
  ON mood_checkins(user_id, recorded_date DESC);
