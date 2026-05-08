const express = require('express');
const router = express.Router();
const { Plots } = require('../database/models');

router.get('/book/:bookId', (req, res) => {
  try {
    const plots = Plots.getByBookId(req.params.bookId);
    res.json(plots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/outline/:outlineId', (req, res) => {
  try {
    const plots = Plots.getByOutlineId(req.params.outlineId);
    res.json(plots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const plot = Plots.getById(req.params.id);
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    res.json(plot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const plot = Plots.create(req.body);
    res.status(201).json(plot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const plot = Plots.update(req.params.id, req.body);
    res.json(plot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    Plots.delete(req.params.id);
    res.json({ message: 'Plot deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
