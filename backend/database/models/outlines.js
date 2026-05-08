const db = require('../db');

const Outlines = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO outlines (book_id, title, content)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.book_id, data.title, data.content || null);
    return this.getById(result.lastInsertRowid);
  },

  getByBookId: function(bookId) {
    const stmt = db.prepare('SELECT * FROM outlines WHERE book_id = ? ORDER BY created_at DESC');
    return stmt.all(bookId);
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM outlines WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const stmt = db.prepare(`
      UPDATE outlines
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(data.title, data.content || null, id);
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM outlines WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = Outlines;
