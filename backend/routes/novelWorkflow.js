const express = require('express');
const router = express.Router();
const { parseEditorResponse, saveWorldview, saveStorylines, saveOutline, saveCharacter } = require('../services/novelWorkflowService');

// 解析主编响应
router.post('/parse', (req, res) => {
  try {
    const { response } = req.body;
    if (!response) {
      return res.status(400).json({ error: '缺少 response 参数' });
    }
    
    const parsed = parseEditorResponse(response);
    res.json(parsed);
  } catch (error) {
    console.error('解析主编响应失败:', error);
    res.status(500).json({ error: '解析失败' });
  }
});

// 保存世界观
router.post('/save-worldview', async (req, res) => {
  try {
    const worldData = req.body;
    if (!worldData) {
      return res.status(400).json({ error: '缺少世界观数据' });
    }
    
    const result = await saveWorldview(worldData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('保存世界观失败:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

// 保存故事线
router.post('/save-storylines', async (req, res) => {
  try {
    const storylinesData = req.body;
    if (!storylinesData) {
      return res.status(400).json({ error: '缺少故事线数据' });
    }
    
    const result = await saveStorylines(storylinesData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('保存故事线失败:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

// 保存大纲
router.post('/save-outline', async (req, res) => {
  try {
    const outlineData = req.body;
    if (!outlineData) {
      return res.status(400).json({ error: '缺少大纲数据' });
    }
    
    const result = await saveOutline(outlineData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('保存大纲失败:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

// 保存角色
router.post('/save-character', async (req, res) => {
  try {
    const characterData = req.body;
    if (!characterData) {
      return res.status(400).json({ error: '缺少角色数据' });
    }
    
    const result = await saveCharacter(characterData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('保存角色失败:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

module.exports = router;
