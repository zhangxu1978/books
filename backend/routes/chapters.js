const express = require('express');
const router = express.Router();
const { Chapters, ChapterHistory } = require('../database/models');
const chapterService = require('../services/chapterService');

router.get('/book/:bookId', (req, res) => {
  try {
    const chapters = Chapters.getByBookId(req.params.bookId);
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/plot/:plotId', (req, res) => {
  try {
    const chapters = Chapters.getByPlotId(req.params.plotId);
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const chapter = Chapters.getById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const chapter = Chapters.create(req.body);
    await chapterService.createHistoryFromChapter(chapter);
    res.status(201).json(chapter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existingChapter = Chapters.getById(req.params.id);
    if (existingChapter) {
      await chapterService.createHistoryFromChapter(existingChapter);
    }
    const chapter = Chapters.update(req.params.id, req.body);
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    Chapters.delete(req.params.id);
    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/generate-levels', async (req, res) => {
  try {
    const chapter = await chapterService.generateChapterLevels(req.params.id);
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/save-history', async (req, res) => {
  try {
    const chapter = Chapters.getById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    const history = await chapterService.createHistoryFromChapter(chapter);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/book/:bookId/apply-degradation', async (req, res) => {
  try {
    const { interval = 3 } = req.body;
    const chapters = await chapterService.applyDegradationStrategy(req.params.bookId, interval);
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
