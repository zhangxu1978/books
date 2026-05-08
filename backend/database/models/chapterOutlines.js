const db = require('../db');

const ChapterOutlines = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO chapter_outlines (book_id, plot_id, chapter_title, chapter_order, atmosphere, purpose, summary, plot_details, characters)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.book_id,
      data.plot_id,
      data.chapter_title,
      data.chapter_order || 0,
      data.atmosphere || null,
      data.purpose || null,
      data.summary || null,
      data.plot_details || null,
      data.characters || null
    );
    return this.getById(result.lastInsertRowid);
  },

  getByBookId: function(bookId) {
    const stmt = db.prepare('SELECT * FROM chapter_outlines WHERE book_id = ? ORDER BY plot_id ASC, chapter_order ASC, created_at ASC');
    return stmt.all(bookId);
  },

  getByPlotId: function(plotId) {
    const stmt = db.prepare('SELECT * FROM chapter_outlines WHERE plot_id = ? ORDER BY chapter_order ASC, created_at ASC');
    return stmt.all(plotId);
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM chapter_outlines WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const stmt = db.prepare(`
      UPDATE chapter_outlines
      SET chapter_title = ?, chapter_order = ?, atmosphere = ?, purpose = ?, summary = ?, plot_details = ?, characters = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.chapter_title,
      data.chapter_order || 0,
      data.atmosphere || null,
      data.purpose || null,
      data.summary || null,
      data.plot_details || null,
      data.characters || null,
      id
    );
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM chapter_outlines WHERE id = ?');
    return stmt.run(id);
  },

  deleteByPlotId: function(plotId) {
    const stmt = db.prepare('DELETE FROM chapter_outlines WHERE plot_id = ?');
    return stmt.run(plotId);
  }
};

module.exports = ChapterOutlines;