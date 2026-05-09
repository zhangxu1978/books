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

router.post('/complete-character', async (req, res) => {
  try {
    const { character, book } = req.body;
    
    if (!character) {
      return res.status(400).json({ error: 'character is required' });
    }

    const { loadModelsConfig } = require('../services/aiService');
    const config = loadModelsConfig();
    const modelId = config.models[0]?.id || 'gpt-4';

    const emptyFields = [];
    const characterFields = [
      { key: 'description', label: '简介' },
      { key: 'appearance', label: '外貌' },
      { key: 'personality', label: '性格' },
      { key: 'background', label: '背景' },
      { key: 'motivation', label: '核心动机' },
      { key: 'arc', label: '成长弧线' },
      { key: 'goals', label: '目标' },
      { key: 'fears', label: '恐惧' },
      { key: 'strengths', label: '优点' },
      { key: 'weaknesses', label: '缺点' },
    ];

    characterFields.forEach(field => {
      if (!character[field.key] || String(character[field.key]).trim() === '') {
        emptyFields.push(field.label);
      }
    });

    if (emptyFields.length === 0) {
      return res.json(character);
    }

    let context = '';
    if (book) {
      context += `小说信息：\n`;
      context += `标题：${book.title}\n`;
      if (book.author) context += `作者：${book.author}\n`;
      if (book.description) context += `简介：${book.description}\n`;
    }

    context += `\n当前角色已有信息：\n`;
    context += `姓名：${character.name || '未命名'}\n`;
    context += `类型：${character.character_type || '人物'}\n`;
    
    characterFields.forEach(field => {
      if (character[field.key] && String(character[field.key]).trim() !== '') {
        context += `${field.label}：${character[field.key]}\n`;
      }
    });

    const prompt = `
你是一个小说角色策划助手。请根据以下小说世界观和已有角色信息，补全角色的未完成部分。

${context}

需要补全的部分：${emptyFields.join('、')}

请按照以下格式输出JSON，只输出JSON，不要输出其他内容：
{
  "description": "角色简介",
  "appearance": "外貌描述",
  "personality": "性格描述",
  "background": "背景故事",
  "motivation": "核心动机",
  "arc": "成长弧线",
  "goals": "目标",
  "fears": "恐惧",
  "strengths": "优点",
  "weaknesses": "缺点"
}
    `.trim();

    const { chatCompletion } = require('../services/aiService');
    const result = await chatCompletion(modelId, [
      { role: 'system', content: '你是一个专业的小说角色策划助手，擅长根据已有信息完善角色设定。' },
      { role: 'user', content: prompt }
    ]);

    const aiContent = result.choices?.[0]?.message?.content || '';
    
    let completedData;
    try {
      completedData = JSON.parse(aiContent);
    } catch {
      completedData = {};
    }

    const response = { ...character, ...completedData };
    res.json(response);

  } catch (error) {
    console.error('Complete character error:', error);
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
