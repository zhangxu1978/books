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
