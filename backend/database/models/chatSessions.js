const db = require('../db');

const ChatSessions = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO chat_sessions (title, assistant_id, book_id)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.title, data.assistant_id || null, data.book_id || null);
    return this.getById(result.lastInsertRowid);
  },

  getAll: function() {
    const stmt = db.prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC');
    return stmt.all();
  },

  getByAssistantId: function(assistantId) {
    const stmt = db.prepare('SELECT * FROM chat_sessions WHERE assistant_id = ? ORDER BY updated_at DESC');
    return stmt.all(assistantId);
  },

  getByBookId: function(bookId) {
    const stmt = db.prepare('SELECT * FROM chat_sessions WHERE book_id = ? ORDER BY updated_at DESC');
    return stmt.all(bookId);
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const session = this.getById(id);
    if (!session) return null;
    
    const stmt = db.prepare(`
      UPDATE chat_sessions
      SET title = ?, assistant_id = ?, book_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.title || session.title,
      data.assistant_id !== undefined ? data.assistant_id : session.assistant_id,
      data.book_id !== undefined ? data.book_id : session.book_id,
      id
    );
    return this.getById(id);
  },

  updateTimestamp: function(id) {
    const stmt = db.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM chat_sessions WHERE id = ?');
    return stmt.run(id);
  },

  deleteByAssistantId: function(assistantId) {
    const stmt = db.prepare('DELETE FROM chat_sessions WHERE assistant_id = ?');
    return stmt.run(assistantId);
  }
};

module.exports = ChatSessions;
