const db = require('../db');

const Characters = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO characters (book_id, plot_id, name, description, image, personality, background, motivation, arc, relationships, appearance, goals, fears, strengths, weaknesses, influence_scope, character_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.book_id,
      data.plot_id || null,
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
      data.influence_scope || '本剧情',
      data.character_type || '人物'
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
          fears = ?, strengths = ?, weaknesses = ?, plot_id = ?, influence_scope = ?, 
          character_type = ?, updated_at = CURRENT_TIMESTAMP
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
      data.plot_id || null,
      data.influence_scope || '本剧情',
      data.character_type || '人物',
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
