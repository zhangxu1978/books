const express = require('express');
const router = express.Router();
const { ChapterHistory } = require('../database/models');
const chapterService = require('../services/chapterService');

router.get('/chapter/:chapterId', (req, res) => {
  try {
    const history = ChapterHistory.getByChapterId(req.params.chapterId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const history = ChapterHistory.getById(req.params.id);
    if (!history) {
      return res.status(404).json({ error: 'Chapter history not found' });
    }
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const history = ChapterHistory.create(req.body);
    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/rollback', async (req, res) => {
  try {
    const chapter = await chapterService.rollbackToHistory(req.params.id);
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    ChapterHistory.delete(req.params.id);
    res.json({ message: 'Chapter history deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/chapter/:chapterId', (req, res) => {
  try {
    ChapterHistory.deleteByChapterId(req.params.chapterId);
    res.json({ message: 'Chapter history deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
