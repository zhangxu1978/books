const db = require('../db');

const Assistants = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO assistants (name, type, config)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.name, data.type, data.config || null);
    return this.getById(result.lastInsertRowid);
  },

  getAll: function() {
    const stmt = db.prepare('SELECT * FROM assistants ORDER BY created_at DESC');
    return stmt.all();
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM assistants WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const stmt = db.prepare(`
      UPDATE assistants
      SET name = ?, type = ?, config = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(data.name, data.type, data.config || null, id);
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM assistants WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = Assistants;
