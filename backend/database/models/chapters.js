const db = require('../db');

const Chapters = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO chapters (book_id, plot_id, title, l1, l2, l3, order_num, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.book_id,
      data.plot_id || null,
      data.title,
      data.l1 || null,
      data.l2 || null,
      data.l3 || null,
      data.order_num || 0,
      data.word_count || 0
    );
    return this.getById(result.lastInsertRowid);
  },

  getByBookId: function(bookId) {
    const stmt = db.prepare('SELECT * FROM chapters WHERE book_id = ? ORDER BY order_num ASC, created_at ASC');
    return stmt.all(bookId);
  },

  getByPlotId: function(plotId) {
    const stmt = db.prepare('SELECT * FROM chapters WHERE plot_id = ? ORDER BY order_num ASC, created_at ASC');
    return stmt.all(plotId);
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM chapters WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const stmt = db.prepare(`
      UPDATE chapters
      SET plot_id = ?, title = ?, l1 = ?, l2 = ?, l3 = ?, order_num = ?, word_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.plot_id || null,
      data.title,
      data.l1 || null,
      data.l2 || null,
      data.l3 || null,
      data.order_num || 0,
      data.word_count || 0,
      id
    );
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM chapters WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = Chapters;
