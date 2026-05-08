const db = require('./db');

console.log('Migrating database...');

try {
  db.exec(`
    ALTER TABLE chapter_history ADD COLUMN title TEXT;
    ALTER TABLE chapter_history ADD COLUMN l1 TEXT;
    ALTER TABLE chapter_history ADD COLUMN l2 TEXT;
    ALTER TABLE chapter_history ADD COLUMN l3 TEXT;
  `);
  console.log('Migration completed successfully!');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('Columns already exist, skipping migration.');
  } else {
    console.error('Migration failed:', error);
  }
}

module.exports = db;
