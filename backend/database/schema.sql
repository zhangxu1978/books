-- 书籍表
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 世界观表
CREATE TABLE IF NOT EXISTS worlds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  player_name TEXT,
  book_name TEXT,
  narrative_mode TEXT,
  world_name TEXT,
  world_type TEXT,
  world_desc TEXT,
  world_tags TEXT,
  atmosphere TEXT,
  power_system TEXT,
  society_structure TEXT,
  special_element TEXT,
  player_background TEXT,
  storylines TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 大纲表
CREATE TABLE IF NOT EXISTS outlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 剧情表
CREATE TABLE IF NOT EXISTS plots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  outline_id INTEGER,
  title TEXT NOT NULL,
  content TEXT,
  order_num INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (outline_id) REFERENCES outlines(id) ON DELETE SET NULL
);

-- 章节表
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  plot_id INTEGER,
  title TEXT NOT NULL,
  l1 TEXT,
  l2 TEXT,
  l3 TEXT,
  order_num INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE SET NULL
);

-- 角色表
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  personality TEXT,
  background TEXT,
  motivation TEXT,
  arc TEXT,
  relationships TEXT,
  appearance TEXT,
  goals TEXT,
  fears TEXT,
  strengths TEXT,
  weaknesses TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 助手表
CREATE TABLE IF NOT EXISTS assistants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  assistant_id INTEGER,
  book_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE SET NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 对话历史表
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- 章节历史表
CREATE TABLE IF NOT EXISTS chapter_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL,
  title TEXT,
  l1 TEXT,
  l2 TEXT,
  l3 TEXT,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_books_id ON books(id);
CREATE INDEX IF NOT EXISTS idx_worlds_book_id ON worlds(book_id);
CREATE INDEX IF NOT EXISTS idx_outlines_book_id ON outlines(book_id);
CREATE INDEX IF NOT EXISTS idx_plots_book_id ON plots(book_id);
CREATE INDEX IF NOT EXISTS idx_plots_outline_id ON plots(outline_id);
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_chapters_plot_id ON chapters(plot_id);
CREATE INDEX IF NOT EXISTS idx_characters_book_id ON characters(book_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_assistant_id ON chat_sessions(assistant_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_book_id ON chat_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chapter_history_chapter_id ON chapter_history(chapter_id);
