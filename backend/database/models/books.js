const db = require('../db');

const Books = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO books (title, author, description, cover_image)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(data.title, data.author, data.description || null, data.cover_image || null);
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
      SET title = ?, author = ?, description = ?, cover_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(data.title, data.author, data.description || null, data.cover_image || null, id);
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM books WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = Books;
