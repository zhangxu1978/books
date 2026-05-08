const express = require('express');
const router = express.Router();
const { Outlines } = require('../database/models');

router.get('/book/:bookId', (req, res) => {
  try {
    const outlines = Outlines.getByBookId(req.params.bookId);
    res.json(outlines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const outline = Outlines.getById(req.params.id);
    if (!outline) {
      return res.status(404).json({ error: 'Outline not found' });
    }
    res.json(outline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const outline = Outlines.create(req.body);
    res.status(201).json(outline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const outline = Outlines.update(req.params.id, req.body);
    res.json(outline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    Outlines.delete(req.params.id);
    res.json({ message: 'Outline deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
