const express = require('express');
const router = express.Router();
const { Characters } = require('../database/models');

router.get('/book/:bookId', (req, res) => {
  try {
    const characters = Characters.getByBookId(req.params.bookId);
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const character = Characters.getById(req.params.id);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const character = Characters.create(req.body);
    res.status(201).json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', (req, res) => {
  try {
    const { book_id, plot_id, characters } = req.body;
    
    if (!book_id || !Array.isArray(characters)) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const results = [];
    const existingCharacters = Characters.getByBookId(book_id);
    
    for (const char of characters) {
      const existingChar = existingCharacters.find(c => c.name === char.name);
      
      if (existingChar) {
        const updatedChar = Characters.update(existingChar.id, {
          ...char,
          book_id,
          plot_id: char.plot_id || plot_id
        });
        results.push({ ...updatedChar, action: 'updated' });
      } else {
        const newChar = Characters.create({
          ...char,
          book_id,
          plot_id: char.plot_id || plot_id
        });
        results.push({ ...newChar, action: 'created' });
      }
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const character = Characters.update(req.params.id, req.body);
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    Characters.delete(req.params.id);
    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
