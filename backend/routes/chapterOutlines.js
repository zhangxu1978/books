const express = require('express');
const router = express.Router();
const ChapterOutlines = require('../database/models/chapterOutlines');
const Plots = require('../database/models/plots');

router.get('/book/:bookId', (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId);
    const outlines = ChapterOutlines.getByBookId(bookId);
    res.json(outlines);
  } catch (error) {
    console.error('Failed to get chapter outlines:', error);
    res.status(500).json({ error: 'Failed to get chapter outlines' });
  }
});

router.get('/plot/:plotId', (req, res) => {
  try {
    const plotId = parseInt(req.params.plotId);
    const outlines = ChapterOutlines.getByPlotId(plotId);
    res.json(outlines);
  } catch (error) {
    console.error('Failed to get chapter outlines:', error);
    res.status(500).json({ error: 'Failed to get chapter outlines' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const outline = ChapterOutlines.getById(id);
    if (!outline) {
      return res.status(404).json({ error: 'Chapter outline not found' });
    }
    res.json(outline);
  } catch (error) {
    console.error('Failed to get chapter outline:', error);
    res.status(500).json({ error: 'Failed to get chapter outline' });
  }
});

router.post('/', (req, res) => {
  try {
    const { book_id, plot_id, chapter_title, chapter_order, atmosphere, purpose, summary, plot_details, characters } = req.body;
    
    if (!book_id || !plot_id || !chapter_title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const newOutline = ChapterOutlines.create({
      book_id: parseInt(book_id),
      plot_id: parseInt(plot_id),
      chapter_title,
      chapter_order: parseInt(chapter_order) || 0,
      atmosphere,
      purpose,
      summary,
      plot_details,
      characters
    });
    
    res.json(newOutline);
  } catch (error) {
    console.error('Failed to create chapter outline:', error);
    res.status(500).json({ error: 'Failed to create chapter outline' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { chapter_title, chapter_order, atmosphere, purpose, summary, plot_details, characters } = req.body;
    
    const outline = ChapterOutlines.getById(id);
    if (!outline) {
      return res.status(404).json({ error: 'Chapter outline not found' });
    }
    
    const updatedOutline = ChapterOutlines.update(id, {
      chapter_title: chapter_title || outline.chapter_title,
      chapter_order: parseInt(chapter_order) || outline.chapter_order,
      atmosphere,
      purpose,
      summary,
      plot_details,
      characters
    });
    
    res.json(updatedOutline);
  } catch (error) {
    console.error('Failed to update chapter outline:', error);
    res.status(500).json({ error: 'Failed to update chapter outline' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const outline = ChapterOutlines.getById(id);
    if (!outline) {
      return res.status(404).json({ error: 'Chapter outline not found' });
    }
    
    ChapterOutlines.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chapter outline:', error);
    res.status(500).json({ error: 'Failed to delete chapter outline' });
  }
});

router.get('/plots/:plotId/chapters', (req, res) => {
  try {
    const plotId = parseInt(req.params.plotId);
    const plot = Plots.getById(plotId);
    
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    
    let chapters = [];
    if (plot.content) {
      try {
        const content = JSON.parse(plot.content);
        if (content.acts && Array.isArray(content.acts)) {
          content.acts.forEach((act, actIndex) => {
            if (act.chapters && Array.isArray(act.chapters)) {
              act.chapters.forEach((chapter, chapterIndex) => {
                chapters.push({
                  plot_id: plotId,
                  act_index: actIndex,
                  chapter_index: chapterIndex,
                  order_in_plot: chapters.length,
                  title: chapter.title || '',
                  content: chapter.content || '',
                  purpose: chapter.purpose || ''
                });
              });
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse plot content:', e);
      }
    }
    
    res.json(chapters);
  } catch (error) {
    console.error('Failed to get plot chapters:', error);
    res.status(500).json({ error: 'Failed to get plot chapters' });
  }
});

module.exports = router;