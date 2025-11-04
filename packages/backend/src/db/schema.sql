-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL
);

-- Vocabulary units table
CREATE TABLE IF NOT EXISTS vocabulary_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- Vocabulary items table
CREATE TABLE IF NOT EXISTS vocabulary_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL,
  korean TEXT NOT NULL,
  english TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (unit_id) REFERENCES vocabulary_units(id) ON DELETE CASCADE
);

-- User sessions table (stores session state per unit per user)
CREATE TABLE IF NOT EXISTS user_sessions (
  user_id INTEGER NOT NULL,
  unit_id INTEGER NOT NULL,
  session_state TEXT NOT NULL, -- JSON blob
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, unit_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES vocabulary_units(id) ON DELETE CASCADE
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY,
  prompt_side TEXT NOT NULL DEFAULT 'korean',
  typing_mode INTEGER NOT NULL DEFAULT 0, -- SQLite boolean as 0/1
  large_list_text INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User progress table (tracks which cards are marked as easy/mastered)
CREATE TABLE IF NOT EXISTS user_progress (
  user_id INTEGER NOT NULL,
  vocab_item_id INTEGER NOT NULL,
  is_easy INTEGER NOT NULL DEFAULT 0, -- SQLite boolean as 0/1
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, vocab_item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vocab_item_id) REFERENCES vocabulary_items(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vocabulary_items_unit_id ON vocabulary_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);

