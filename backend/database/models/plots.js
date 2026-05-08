const db = require('../db');

const Plots = {
  create: function(data) {
    const stmt = db.prepare(`
      INSERT INTO plots (book_id, outline_id, title, content, target, obstacle, reward, suspense, estimated_chapters, start_time, end_time, time_confirmed, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.book_id, 
      data.outline_id || null, 
      data.title, 
      data.content || null,
      data.target || null,
      data.obstacle || null,
      data.reward || null,
      data.suspense || null,
      data.estimated_chapters || 0,
      data.start_time || null,
      data.end_time || null,
      data.time_confirmed || false,
      data.order_num || 0
    );
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
      SET outline_id = ?, title = ?, content = ?, target = ?, obstacle = ?, reward = ?, suspense = ?, estimated_chapters = ?, start_time = ?, end_time = ?, time_confirmed = ?, order_num = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.outline_id || null, 
      data.title, 
      data.content || null,
      data.target || null,
      data.obstacle || null,
      data.reward || null,
      data.suspense || null,
      data.estimated_chapters || 0,
      data.start_time || null,
      data.end_time || null,
      data.time_confirmed || false,
      data.order_num || 0,
      id
    );
    return this.getById(id);
  },

  delete: function(id) {
    const stmt = db.prepare('DELETE FROM plots WHERE id = ?');
    return stmt.run(id);
  },

  checkTimeConflict: function(bookId, newStartTime, newEndTime, excludePlotId = null) {
    let query = 'SELECT * FROM plots WHERE book_id = ? AND time_confirmed = 1';
    let params = [bookId];

    if (excludePlotId !== null) {
      query += ' AND id != ?';
      params.push(excludePlotId);
    }

    const stmt = db.prepare(query);
    const existingPlots = stmt.all(...params);

    const conflicts = [];
    
    for (const plot of existingPlots) {
      const existingStart = plot.start_time;
      const existingEnd = plot.end_time;

      if (!existingStart || !newStartTime) continue;

      const newStartNum = parseFloat(newStartTime) || 0;
      const newEndNum = parseFloat(newEndTime) || Infinity;
      const existingStartNum = parseFloat(existingStart) || 0;
      const existingEndNum = parseFloat(existingEnd) || Infinity;

      if ((newStartNum < existingEndNum && newEndNum > existingStartNum)) {
        conflicts.push({
          id: plot.id,
          title: plot.title,
          start_time: plot.start_time,
          end_time: plot.end_time
        });
      }
    }

    return conflicts;
  }
};

module.exports = Plots;