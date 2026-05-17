const { Worlds, Books, Outlines, Characters, Plots } = require('../database/models');

/**
 * 从文本中提取 JSON
 */
function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  
  text = text.trim();
  
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1];
  }
  
  let start = text.indexOf('{');
  let end = text.lastIndexOf('}');
  
  if (start === -1 || end === -1 || start >= end) {
    start = text.indexOf('[');
    end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || start >= end) return null;
  }
  
  let jsonStr = text.slice(start, end + 1);
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const repaired = tryRepairJSON(jsonStr);
    if (repaired) {
      try {
        return JSON.parse(repaired);
      } catch (e2) {}
    }
    return null;
  }
}

/**
 * 修复损坏的 JSON 字符串
 */
function tryRepairJSON(jsonStr) {
  jsonStr = jsonStr.replace(/[\u0000-\u001F]+/g, ' ');
  
  let fixed = jsonStr;
  let iterations = 0;
  const maxIterations = 10;
  
  while (iterations < maxIterations) {
    let before = fixed;
    
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    fixed = fixed.replace(/([{[])\s*,/g, '$1');
    fixed = fixed.replace(/([{,]\s*)"(\w+)":/g, '$1"$2":');
    
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (e) {}
    
    fixed = tryFixUnescapedQuotes(fixed);
    
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (e) {}
    
    if (before === fixed) break;
    iterations++;
  }
  
  return null;
}

/**
 * 智能修复未转义的引号
 */
function tryFixUnescapedQuotes(jsonStr) {
  let inString = false;
  let escaped = false;
  let result = '';
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        inString = true;
        result += char;
      } else {
        const nextNonSpace = jsonStr.slice(i + 1).match(/^\s*(.)/);
        const nextChar = nextNonSpace ? nextNonSpace[1] : '';
        if (nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === ':') {
          inString = false;
          result += char;
        } else {
          result += '\\"';
        }
      }
    } else {
      result += char;
    }
  }
  
  return result;
}

/**
 * 解析主编/角色策划响应，提取选项、世界观信息、故事线、大纲、角色信息等
 */
function parseEditorResponse(response) {
  const result = {
    text: response,
    narrative: null,
    options: [],
    worldInfo: null,
    storylines: null,
    outlineInfo: null,
    plotInfo: null,
    characterInfo: null,
    ready: false,
    storylinesReady: false,
    outlineReady: false,
    plotReady: false,
    characterReady: false
  };

  const jsonData = extractJsonFromText(response);
  console.log('Extracted JSON data:', jsonData);
  
  if (jsonData) {
    if (jsonData.narrative) {
      result.narrative = jsonData.narrative;
    }
    if (jsonData.options) {
      result.options = jsonData.options;
    }
    // 支持用户提到的格式：ready, playerName, bookName, etc.
    if (jsonData.ready === true) {
      result.ready = true;
      if (jsonData.plot && typeof jsonData.plot === 'object') {
        console.log('=== plot detected ===');
        console.log('plot data:', JSON.stringify(jsonData.plot, null, 2));
        result.plotReady = true;
        result.plotInfo = jsonData.plot;
      } else {
        result.worldInfo = {
          player_name: jsonData.playerName,
          book_name: jsonData.bookName,
          narrative_mode: jsonData.narrativeMode,
          world_name: jsonData.worldName,
          world_type: jsonData.worldType,
          world_desc: jsonData.worldDesc,
          world_tags: jsonData.worldTags,
          atmosphere: jsonData.atmosphere,
          power_system: jsonData.powerSystem,
          society_structure: jsonData.societyStructure,
          special_element: jsonData.specialElement,
          player_background: jsonData.playerBackground,
          storylines: jsonData.storylines
        };
      }
      console.log('Built worldInfo:', result.worldInfo);
    }
    if (jsonData.worldInfo) {
      result.worldInfo = jsonData.worldInfo;
    }
    if (jsonData.storylines) {
      result.storylines = jsonData.storylines;
    }
    if (jsonData.outlineInfo) {
      result.outlineInfo = jsonData.outlineInfo;
    }
    if (jsonData.character) {
      result.characterInfo = jsonData.character;
    }
    if (jsonData.storylinesReady === true) {
      result.storylinesReady = true;
    }
    if (jsonData.outlineReady === true) {
      result.outlineReady = true;
    }
    if (jsonData.ready === true && jsonData.character) {
      result.characterReady = true;
    }
    if (jsonData.chapterOutline && typeof jsonData.chapterOutline === 'object') {
      result.chapterOutline = jsonData.chapterOutline;
      console.log('=== chapterOutline detected ===');
      console.log('chapterOutline data:', JSON.stringify(jsonData.chapterOutline, null, 2));
    }
  }

  console.log('Final parse result:', result);
  return result;
}

/**
 * 保存世界观信息
 */
async function saveWorldview(worldData, sessionId = null) {
  try {
    console.log('saveWorldview called with:', { worldData, sessionId });
    
    let book;
    if (worldData.book_id) {
      console.log('Updating existing book with id:', worldData.book_id);
      book = Books.update(worldData.book_id, {
        title: worldData.book_name,
        author: worldData.player_name || '匿名作者',
        description: worldData.world_desc
      });
    } else {
      console.log('Creating new book');
      book = Books.create({
        title: worldData.book_name || '未命名小说',
        author: worldData.player_name || '匿名作者',
        description: worldData.world_desc
      });
    }
    
    console.log('Book after create/update:', book);
    
    if (!book || !book.id) {
      throw new Error('Failed to create or update book');
    }
    
    // 如果提供了 session_id，更新会话的 book_id
    if (sessionId) {
      console.log('Updating session:', sessionId, 'with book_id:', book.id);
      const ChatSessions = require('../database/models/chatSessions');
      ChatSessions.update(sessionId, { book_id: book.id });
    }

    const existingWorlds = Worlds.getByBookId(book.id);
    let world;
    
    if (existingWorlds && existingWorlds.length > 0) {
      world = Worlds.update(existingWorlds[0].id, {
        book_id: book.id,
        player_name: worldData.player_name,
        book_name: worldData.book_name,
        narrative_mode: worldData.narrative_mode,
        world_name: worldData.world_name,
        world_type: worldData.world_type,
        world_desc: worldData.world_desc,
        world_tags: Array.isArray(worldData.world_tags) ? worldData.world_tags.join(',') : worldData.world_tags,
        atmosphere: worldData.atmosphere,
        power_system: worldData.power_system,
        society_structure: worldData.society_structure,
        special_element: worldData.special_element,
        player_background: worldData.player_background,
        storylines: Array.isArray(worldData.storylines) ? JSON.stringify(worldData.storylines) : worldData.storylines
      });
    } else {
      const worldCreateData = {
        book_id: book.id,
        player_name: worldData.player_name,
        book_name: worldData.book_name,
        narrative_mode: worldData.narrative_mode,
        world_name: worldData.world_name,
        world_type: worldData.world_type,
        world_desc: worldData.world_desc,
        world_tags: Array.isArray(worldData.world_tags) ? worldData.world_tags.join(',') : worldData.world_tags,
        atmosphere: worldData.atmosphere,
        power_system: worldData.power_system,
        society_structure: worldData.society_structure,
        special_element: worldData.special_element,
        player_background: worldData.player_background,
        storylines: Array.isArray(worldData.storylines) ? JSON.stringify(worldData.storylines) : worldData.storylines
      };
      console.log('Creating world with data:', worldCreateData);
      world = Worlds.create(worldCreateData);
    }

    return {
      success: true,
      book: book,
      world: world
    };
  } catch (error) {
    console.error('保存世界观失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 保存故事线信息
 */
async function saveStorylines(storylinesData) {
  try {
    if (!storylinesData.book_id) {
      return { success: false, error: '缺少 book_id' };
    }

    const existingWorlds = Worlds.getByBookId(storylinesData.book_id);
    if (existingWorlds && existingWorlds.length > 0) {
      Worlds.update(existingWorlds[0].id, {
        storylines: Array.isArray(storylinesData.storylines) 
          ? JSON.stringify(storylinesData.storylines) 
          : storylinesData.storylines
      });
    }

    return {
      success: true,
      storylines: storylinesData.storylines
    };
  } catch (error) {
    console.error('保存故事线失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 保存大纲信息
 */
async function saveOutline(outlineData) {
  console.log('Saving outline:', outlineData);
  try {
    if (!outlineData.book_id) {
      return { success: false, error: '缺少 book_id' };
    }

    const existingOutlines = Outlines.getByBookId(outlineData.book_id);
    let outline;
    
    if (existingOutlines && existingOutlines.length > 0) {
      outline = Outlines.update(existingOutlines[0].id, {
        title: outlineData.title || '剧情大纲',
        content: JSON.stringify(outlineData)
      });
    } else {
      outline = Outlines.create({
        book_id: outlineData.book_id,
        title: outlineData.title || '剧情大纲',
        content: JSON.stringify(outlineData)
      });
    }

    return {
      success: true,
      outline: outline
    };
  } catch (error) {
    console.error('保存大纲失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 保存剧情信息
 */
async function savePlot(plotData) {
  console.log('=== savePlot called ===');
  console.log('plotData received:', JSON.stringify(plotData, null, 2));
  
  try {
    if (!plotData.book_id) {
      console.error('savePlot failed: 缺少 book_id');
      return { success: false, error: '缺少 book_id' };
    }

    const existingPlots = Plots.getByBookId(plotData.book_id);
    console.log('existingPlots for book_id', plotData.book_id, ':', existingPlots);
    
    let plot;
    
    // 将 acts、foreshadowing、climax 等复杂数据转为 JSON 存储在 content 字段
    const content = {
      structure: plotData.structure,
      acts: plotData.acts || [],
      foreshadowing: plotData.foreshadowing || [],
      climax: plotData.climax || ''
    };
    console.log('content to save:', JSON.stringify(content, null, 2));

    if (existingPlots && existingPlots.length > 0) {
      console.log('Updating existing plot with id:', existingPlots[0].id);
      plot = Plots.update(existingPlots[0].id, {
        title: plotData.title || '未命名剧情',
        content: JSON.stringify(content),
        target: plotData.target || null,
        obstacle: plotData.obstacle || null,
        reward: plotData.reward || null,
        suspense: plotData.suspense || null,
        estimated_chapters: plotData.estimatedChapters || 0,
        start_time: plotData.startTime || null,
        end_time: plotData.endTime || null,
        order_num: plotData.order_num || existingPlots.length
      });
    } else {
      console.log('Creating new plot');
      plot = Plots.create({
        book_id: plotData.book_id,
        title: plotData.title || '未命名剧情',
        content: JSON.stringify(content),
        target: plotData.target || null,
        obstacle: plotData.obstacle || null,
        reward: plotData.reward || null,
        suspense: plotData.suspense || null,
        estimated_chapters: plotData.estimatedChapters || 0,
        start_time: plotData.startTime || null,
        end_time: plotData.endTime || null,
        order_num: 0
      });
    }
    
    console.log('savePlot result:', plot);

    return {
      success: true,
      plot: plot
    };
  } catch (error) {
    console.error('保存剧情失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 保存角色信息
 */
async function saveCharacter(characterData) {
  try {
    if (!characterData.book_id) {
      return {
        success: false,
        error: '缺少书籍ID'
      };
    }

    const charData = {
      book_id: characterData.book_id,
      name: characterData.name || '未命名角色',
      description: characterData.description,
      image: characterData.image,
      personality: characterData.personality,
      background: characterData.background,
      motivation: characterData.motivation,
      arc: characterData.arc,
      relationships: characterData.relationships,
      appearance: characterData.appearance,
      goals: characterData.goals,
      fears: characterData.fears,
      strengths: characterData.strengths,
      weaknesses: characterData.weaknesses
    };

    // 检查是否已存在同角色，或者新建
    let character;
    if (characterData.id) {
      character = Characters.update(characterData.id, charData);
    } else {
      character = Characters.create(charData);
    }

    return {
      success: true,
      character: character
    };
  } catch (error) {
    console.error('保存角色失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  extractJsonFromText,
  parseEditorResponse,
  saveWorldview,
  saveStorylines,
  saveOutline,
  savePlot,
  saveCharacter
};
