const db = require('../db');

const Books = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO books (title, author, description, cover_image, estimated_chapters, estimated_words, words_per_chapter)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.title, 
      data.author, 
      data.description || null, 
      data.cover_image || null,
      data.estimated_chapters || 0,
      data.estimated_words || 0,
      data.words_per_chapter || 0
    );
    return this.getById(result.lastInsertRowid);
  },

  getAll: function() {
    const stmt = db.prepare('SELECT * FROM books ORDER BY updated_at DESC');
    return stmt.all();
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const stmt = db.prepare(`
      UPDATE books
      SET title = ?, author = ?, description = ?, cover_image = ?, estimated_chapters = ?, estimated_words = ?, words_per_chapter = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.title, 
      data.author, 
      data.description || null, 
      data.cover_image || null,
      data.estimated_chapters || 0,
      data.estimated_words || 0,
      data.words_per_chapter || 0,
      id
    );
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM books WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = Books;