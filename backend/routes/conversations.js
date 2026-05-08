const express = require('express');
const router = express.Router();
const { ChatSessions, Conversations } = require('../database/models');

// 会话相关接口

router.get('/sessions', (req, res) => {
  try {
    const { assistant_id, book_id } = req.query;
    let sessions;
    if (assistant_id) {
      sessions = ChatSessions.getByAssistantId(assistant_id);
    } else if (book_id) {
      sessions = ChatSessions.getByBookId(book_id);
    } else {
      sessions = ChatSessions.getAll();
    }
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id', (req, res) => {
  try {
    const session = ChatSessions.getById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions', (req, res) => {
  try {
    const session = ChatSessions.create(req.body);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id', (req, res) => {
  try {
    const session = ChatSessions.update(req.params.id, req.body);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id', (req, res) => {
  try {
    ChatSessions.delete(req.params.id);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id/plot', (req, res) => {
  try {
    const { plot_id } = req.body;
    const session = ChatSessions.updatePlotId(req.params.id, plot_id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 消息相关接口

router.get('/sessions/:sessionId/messages', (req, res) => {
  try {
    const messages = Conversations.getBySessionId(req.params.sessionId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:sessionId/messages', (req, res) => {
  try {
    const message = Conversations.create({
      session_id: req.params.sessionId,
      role: req.body.role,
      content: req.body.content
    });
    ChatSessions.updateTimestamp(req.params.sessionId);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/messages/:id', (req, res) => {
  try {
    const message = Conversations.update(req.params.id, req.body);
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/messages/:id', (req, res) => {
  try {
    Conversations.delete(req.params.id);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
