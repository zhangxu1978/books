const db = require('../db');

const Conversations = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO conversations (session_id, role, content)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.session_id, data.role, data.content);
    return this.getById(result.lastInsertRowid);
  },

  createBatch: function(messages) {
    const results = [];
    for (const msg of messages) {
      results.push(this.create(msg));
    }
    return results;
  },

  getBySessionId: function(sessionId) {
    const stmt = db.prepare('SELECT * FROM conversations WHERE session_id = ? ORDER BY created_at ASC');
    return stmt.all(sessionId);
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const stmt = db.prepare('UPDATE conversations SET content = ? WHERE id = ?');
    stmt.run(data.content, id);
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM conversations WHERE id = ?');
    return stmt.run(id);
  },

  deleteBySessionId: function(sessionId) {
    const stmt = db.prepare('DELETE FROM conversations WHERE session_id = ?');
    return stmt.run(sessionId);
  }
};

module.exports = Conversations;
