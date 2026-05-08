const db = require('../db');

const Plots = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO plots (book_id, outline_id, title, content, order_num)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.book_id, data.outline_id || null, data.title, data.content || null, data.order_num || 0);
    return this.getById(result.lastInsertRowid);
  },

  getByBookId: function(bookId) {
    const stmt = db.prepare('SELECT * FROM plots WHERE book_id = ? ORDER BY order_num ASC, created_at ASC');
    return stmt.all(bookId);
  },

  getByOutlineId: function(outlineId) {
    const stmt = db.prepare('SELECT * FROM plots WHERE outline_id = ? ORDER BY order_num ASC, created_at ASC');
    return stmt.all(outlineId);
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM plots WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const stmt = db.prepare(`
      UPDATE plots
      SET outline_id = ?, title = ?, content = ?, order_num = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(data.outline_id || null, data.title, data.content || null, data.order_num || 0, id);
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM plots WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = Plots;
