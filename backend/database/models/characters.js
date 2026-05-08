const db = require('../db');

const Characters = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO characters (book_id, name, description, image, personality, background, motivation, arc, relationships, appearance, goals, fears, strengths, weaknesses)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.book_id,
      data.name,
      data.description || null,
      data.image || null,
      data.personality || null,
      data.background || null,
      data.motivation || null,
      data.arc || null,
      Array.isArray(data.relationships) ? JSON.stringify(data.relationships) : (data.relationships || null),
      data.appearance || null,
      data.goals || null,
      data.fears || null,
      data.strengths || null,
      data.weaknesses || null
    );
    return this.getById(result.lastInsertRowid);
  },

  getByBookId: function(bookId) {
    const stmt = db.prepare('SELECT * FROM characters WHERE book_id = ? ORDER BY created_at DESC');
    const results = stmt.all(bookId);
    return results.map(row => {
      try {
        if (row.relationships) {
          row.relationships = JSON.parse(row.relationships);
        }
      } catch (e) {}
      return row;
    });
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM characters WHERE id = ?');
    const row = stmt.get(id);
    if (row) {
      try {
        if (row.relationships) {
          row.relationships = JSON.parse(row.relationships);
        }
      } catch (e) {}
    }
    return row;
  },

  update: function(id, data) {
    const stmt = db.prepare(`
      UPDATE characters
      SET name = ?, description = ?, image = ?, personality = ?, background = ?, 
          motivation = ?, arc = ?, relationships = ?, appearance = ?, goals = ?, 
          fears = ?, strengths = ?, weaknesses = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.name,
      data.description || null,
      data.image || null,
      data.personality || null,
      data.background || null,
      data.motivation || null,
      data.arc || null,
      Array.isArray(data.relationships) ? JSON.stringify(data.relationships) : (data.relationships || null),
      data.appearance || null,
      data.goals || null,
      data.fears || null,
      data.strengths || null,
      data.weaknesses || null,
      id
    );
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM characters WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = Characters;
