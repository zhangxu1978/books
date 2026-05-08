const express = require('express');
const router = express.Router();
const { Assistants } = require('../database/models');
const { defaultAssistants } = require('../services/assistantDefaults');

router.get('/', (req, res) => {
  try {
    const assistants = Assistants.getAll();
    res.json(assistants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const assistant = Assistants.getById(req.params.id);
    if (!assistant) {
      return res.status(404).json({ error: 'Assistant not found' });
    }
    res.json(assistant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const assistant = Assistants.create(req.body);
    res.status(201).json(assistant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const assistant = Assistants.update(req.params.id, req.body);
    res.json(assistant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    Assistants.delete(req.params.id);
    res.json({ message: 'Assistant deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/init-defaults', (req, res) => {
  try {
    const existing = Assistants.getAll();
    const existingTypes = new Set(existing.map(a => a.type));
    
    const created = [];
    for (const assistant of defaultAssistants) {
      if (!existingTypes.has(assistant.type)) {
        const newAssistant = Assistants.create(assistant);
        created.push(newAssistant);
      }
    }
    
    res.json({ 
      message: `Initialized ${created.length} default assistants`,
      created 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
