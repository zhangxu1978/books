const express = require('express');
const router = express.Router();
const { Worlds } = require('../database/models');

router.get('/book/:bookId', (req, res) => {
  try {
    const worlds = Worlds.getByBookId(req.params.bookId);
    res.json(worlds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const world = Worlds.getById(req.params.id);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    res.json(world);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const world = Worlds.create(req.body);
    res.status(201).json(world);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const world = Worlds.update(req.params.id, req.body);
    res.json(world);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    Worlds.delete(req.params.id);
    res.json({ message: 'World deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
