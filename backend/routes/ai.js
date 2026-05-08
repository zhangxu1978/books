const express = require('express');
const router = express.Router();
const { loadModelsConfig, chatCompletion, chatCompletionStream } = require('../services/aiService');

router.get('/models', (req, res) => {
  try {
    const config = loadModelsConfig();
    res.json({ models: config.models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { modelId, messages, options } = req.body;
    
    if (!modelId || !messages) {
      return res.status(400).json({ error: 'modelId and messages are required' });
    }

    const result = await chatCompletion(modelId, messages, options);
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat/stream', (req, res) => {
  try {
    const { modelId, messages, options } = req.body;
    
    if (!modelId || !messages) {
      return res.status(400).json({ error: 'modelId and messages are required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    chatCompletionStream(
      modelId,
      messages,
      options,
      (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      },
      () => {
        res.write('data: [DONE]\n\n');
        res.end();
      },
      (error) => {
        console.error('Stream error:', error);
        res.write(`data: {"error": "${error.message}"}\n\n`);
        res.end();
      }
    );
  } catch (error) {
    console.error('Stream setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
