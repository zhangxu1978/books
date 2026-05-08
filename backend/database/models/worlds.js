const db = require('../db');

const Worlds = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO worlds (book_id, player_name, book_name, narrative_mode, world_name, world_type, world_desc, world_tags, atmosphere, power_system, society_structure, special_element, player_background, storylines)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.book_id != null ? data.book_id : null,
      data.player_name != null ? data.player_name : null,
      data.book_name != null ? data.book_name : null,
      data.narrative_mode != null ? data.narrative_mode : null,
      data.world_name != null ? data.world_name : null,
      data.world_type != null ? data.world_type : null,
      data.world_desc != null ? data.world_desc : null,
      data.world_tags != null ? data.world_tags : null,
      data.atmosphere != null ? data.atmosphere : null,
      data.power_system != null ? data.power_system : null,
      data.society_structure != null ? data.society_structure : null,
      data.special_element != null ? data.special_element : null,
      data.player_background != null ? data.player_background : null,
      data.storylines != null ? (typeof data.storylines === 'object' ? JSON.stringify(data.storylines) : data.storylines) : null
    );
    return this.getById(result.lastInsertRowid);
  },

  getByBookId: function(bookId) {
    const stmt = db.prepare('SELECT * FROM worlds WHERE book_id = ? ORDER BY created_at DESC');
    return stmt.all(bookId);
  },

  getById: function(id) {
    const stmt = db.prepare('SELECT * FROM worlds WHERE id = ?');
    return stmt.get(id);
  },

  update: function(id, data) {
    const stmt = db.prepare(`
      UPDATE worlds
      SET player_name = ?, book_name = ?, narrative_mode = ?, world_name = ?, world_type = ?, world_desc = ?, world_tags = ?, atmosphere = ?, power_system = ?, society_structure = ?, special_element = ?, player_background = ?, storylines = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.player_name || null,
      data.book_name || null,
      data.narrative_mode || null,
      data.world_name || null,
      data.world_type || null,
      data.world_desc || null,
      data.world_tags || null,
      data.atmosphere || null,
      data.power_system || null,
      data.society_structure || null,
      data.special_element || null,
      data.player_background || null,
      data.storylines || null,
      id
    );
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM worlds WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = Worlds;
