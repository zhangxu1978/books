const { Chapters, ChapterHistory } = require('../database/models');
const { chatCompletion } = require('./aiService');
const { loadModelsConfig } = require('./aiService');

async function summarizeText(content, targetLevel) {
  const config = loadModelsConfig();
  if (!config.models || config.models.length === 0) {
    throw new Error('No AI models configured');
  }
  
  const modelId = config.models[0].id;
  
  let prompt = '';
  if (targetLevel === 'l2') {
    prompt = `请将以下文本精简为约原长度的50%，保留核心情节和关键信息，去除细节描写：

${content}`;
  } else if (targetLevel === 'l3') {
    prompt = `请将以下文本进一步精简为约原长度的30%，只保留最核心的故事梗概：

${content}`;
  }
  
  const messages = [
    { role: 'system', content: '你是一个专业的文学编辑，擅长文本精简和摘要。请用中文回复，只返回精简后的文本，不要有其他说明。' },
    { role: 'user', content: prompt }
  ];
  
  const result = await chatCompletion(modelId, messages, { temperature: 0.3 });
  return result.choices[0].message.content;
}

async function generateChapterLevels(chapterId) {
  const chapter = Chapters.getById(chapterId);
  if (!chapter) {
    throw new Error('Chapter not found');
  }
  
  const updates = {};
  
  if (chapter.l1 && !chapter.l2) {
    try {
      updates.l2 = await summarizeText(chapter.l1, 'l2');
    } catch (error) {
      console.error('Failed to generate l2:', error);
    }
  }
  
  if (chapter.l2 || updates.l2) {
    const l2Content = updates.l2 || chapter.l2;
    try {
      updates.l3 = await summarizeText(l2Content, 'l3');
    } catch (error) {
      console.error('Failed to generate l3:', error);
    }
  }
  
  if (Object.keys(updates).length > 0) {
    return Chapters.update(chapterId, { ...chapter, ...updates });
  }
  
  return chapter;
}

async function createHistoryFromChapter(chapter) {
  const latestVersion = ChapterHistory.getLatestVersion(chapter.id);
  return ChapterHistory.create({
    chapter_id: chapter.id,
    title: chapter.title,
    l1: chapter.l1,
    l2: chapter.l2,
    l3: chapter.l3,
    version: latestVersion + 1
  });
}

async function rollbackToHistory(historyId) {
  const history = ChapterHistory.getById(historyId);
  if (!history) {
    throw new Error('History not found');
  }
  
  const chapter = Chapters.getById(history.chapter_id);
  if (!chapter) {
    throw new Error('Chapter not found');
  }
  
  await createHistoryFromChapter(chapter);
  
  return Chapters.update(chapter.id, {
    title: history.title,
    l1: history.l1,
    l2: history.l2,
    l3: history.l3,
    word_count: (history.l1 || '').replace(/<[^>]*>/g, '').length
  });
}

async function applyDegradationStrategy(bookId, interval = 3) {
  const chapters = Chapters.getByBookId(bookId);
  
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const isDegraded = (i + 1) % interval !== 0;
    
    if (isDegraded && chapter.l3) {
      await Chapters.update(chapter.id, {
        ...chapter,
        l1: chapter.l3,
        l2: null,
        l3: null,
        word_count: chapter.l3.replace(/<[^>]*>/g, '').length
      });
    }
  }
  
  return Chapters.getByBookId(bookId);
}

module.exports = {
  summarizeText,
  generateChapterLevels,
  createHistoryFromChapter,
  rollbackToHistory,
  applyDegradationStrategy
};
