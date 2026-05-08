const db = require('../db');

const ChapterHistory = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO chapter_history (chapter_id, title, l1, l2, l3, version)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.chapter_id,
      data.title || null,
      data.l1 || null,
      data.l2 || null,
      data.l3 || null,
      data.version || 1
    );
    return this.getById(result.lastInsertRowid);
  },

  getByChapterId: function(chapterId) {
    const stmt = db.prepare('SELECT * FROM chapter_history WHERE chapter_id = ? ORDER BY created_at DESC');
    return stmt.all(chapterId);
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM chapter_history WHERE id = ?');
    return stmt.get(id);
  },

  getLatestVersion: function(chapterId) {
    const stmt = db.prepare('SELECT MAX(version) as max_version FROM chapter_history WHERE chapter_id = ?');
    const result = stmt.get(chapterId);
    return result?.max_version || 0;
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM chapter_history WHERE id = ?');
    return stmt.run(id);
  },

  deleteByChapterId: function(chapterId) {
    const stmt = db.prepare('DELETE FROM chapter_history WHERE chapter_id = ?');
    return stmt.run(chapterId);
  }
};

module.exports = ChapterHistory;
