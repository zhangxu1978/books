import { useState, useEffect } from 'react';
import axios from 'axios';
import ChapterEditor from '../components/ChapterEditor';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:3022/api';

// 将纯文本换行符转换为 HTML 标签
function convertNewlinesToHTML(text) {
  if (!text) return '';
  // 首先将 \r\n 转换为 \n，然后处理换行
  let html = text.replace(/\r\n/g, '\n');
  // 将两个或更多换行符转换为段落
  html = html.replace(/\n\n+/g, '</p><p>');
  // 将单个换行符转换为 <br>
  html = html.replace(/\n/g, '<br>');
  // 包装在段落标签中
  return `<p>${html}</p>`;
}

function WriterWorkspace() {
  const [books, setBooks] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [chapterTitle, setChapterTitle] = useState('');
  const [targetWordCount, setTargetWordCount] = useState(0);
  const [writerInstances, setWriterInstances] = useState([]);
  const [viewMode, setViewMode] = useState('columns');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeInstance, setActiveInstance] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [maximizedInstance, setMaximizedInstance] = useState(null);
  const [plots, setPlots] = useState([]);
  const [chapterOutlines, setChapterOutlines] = useState([]);
  const [worldview, setWorldview] = useState(null);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [selectedOutline, setSelectedOutline] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const workflowSteps = [
    { 
      title: '主编规划',
      path: '/editor-workflow',
      active: false,
      completed: true,
      icon: '📖'
    },
    { 
      title: '剧情策划',
      path: '/plot-planning',
      active: false,
      completed: true,
      icon: '📚'
    },
    { 
      title: '角色策划',
      path: '/character-planning',
      active: false,
      completed: true,
      icon: '🎭'
    },
    { 
      title: '章节构建',
      path: '/chapter-outline',
      active: false,
      completed: true,
      icon: '📝'
    },
    { 
      title: '写手创作',
      path: '/writer-workspace',
      active: true,
      completed: false,
      icon: '✍️'
    }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedBook) {
      fetchChapters(selectedBook.id);
      fetchPlots(selectedBook.id);
      fetchChapterOutlines(selectedBook.id);
      fetchWorldview(selectedBook.id);
      // 设置目标字数为书籍的 words_per_chapter 字段
      if (selectedBook.words_per_chapter) {
        setTargetWordCount(selectedBook.words_per_chapter);
      } else {
        setTargetWordCount(2000); // 如果书籍没有设置，则使用默认值
      }
    }
  }, [selectedBook]);

  const fetchInitialData = async () => {
    try {
      const [booksRes, assistantsRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/assistants`)
      ]);
      setBooks(booksRes.data);
      const writerAssistants = assistantsRes.data.filter(a => 
        a.type === 'writer' || a.name.includes('写手') || a.name.includes('作者')
      );
      setAssistants(writerAssistants.length > 0 ? writerAssistants : assistantsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchChapters = async (bookId) => {
    try {
      const response = await axios.get(`${API_BASE}/chapters/book/${bookId}`);
      setChapters(response.data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchPlots = async (bookId) => {
    try {
      const response = await axios.get(`${API_BASE}/plots/book/${bookId}`);
      const parsedPlots = response.data.map(plot => ({
        ...plot,
        content: plot.content ? JSON.parse(plot.content) : { acts: [] }
      }));
      setPlots(parsedPlots);
    } catch (error) {
      console.error('Error fetching plots:', error);
    }
  };

  const fetchChapterOutlines = async (bookId) => {
    try {
      const response = await axios.get(`${API_BASE}/chapter-outlines/book/${bookId}`);
      setChapterOutlines(response.data);
    } catch (error) {
      console.error('Error fetching chapter outlines:', error);
    }
  };

  const fetchWorldview = async (bookId) => {
    try {
      const response = await axios.get(`${API_BASE}/worlds/book/${bookId}`);
      if (response.data.length > 0) {
        setWorldview(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching worldview:', error);
    }
  };

  const createWriterInstance = () => {
    const assistant = assistants.length > 0 ? assistants[0] : null;
    const newInstance = {
      id: Date.now(),
      name: `写手 ${writerInstances.length + 1}`,
      assistant: assistant,
      content: '',
      isGenerating: false,
      versionName: `版本 ${writerInstances.length + 1}`
    };
    setWriterInstances([...writerInstances, newInstance]);
    if (writerInstances.length === 0) {
      setActiveInstance(0);
    }
  };

  const removeWriterInstance = (instanceId) => {
    if (writerInstances.length <= 1) {
      setMessage('至少保留一个写手实例');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const newInstances = writerInstances.filter(inst => inst.id !== instanceId);
    setWriterInstances(newInstances);
    if (activeInstance >= newInstances.length) {
      setActiveInstance(Math.max(0, newInstances.length - 1));
    }
  };

  const updateInstanceContent = (instanceId, content) => {
    setWriterInstances(writerInstances.map(inst =>
      inst.id === instanceId ? { ...inst, content } : inst
    ));
  };

  const updateInstanceName = (instanceId, name) => {
    setWriterInstances(writerInstances.map(inst =>
      inst.id === instanceId ? { ...inst, name } : inst
    ));
  };

  const updateVersionName = (instanceId, versionName) => {
    setWriterInstances(writerInstances.map(inst =>
      inst.id === instanceId ? { ...inst, versionName } : inst
    ));
  };

  const generateContent = async (instanceId) => {
    const instance = writerInstances.find(inst => inst.id === instanceId);
    if (!instance) return;

    if (!selectedBook) {
      setMessage('请先选择一本书');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!instance.assistant) {
      setMessage('请先选择一个助手');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!chapterTitle.trim()) {
      setMessage('请输入章节标题');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setWriterInstances(writerInstances.map(inst =>
      inst.id === instanceId ? { ...inst, isGenerating: true } : inst
    ));

    try {
      const prompt = buildGenerationPrompt(instance);
      const assistantConfig = typeof instance.assistant.config === 'string' 
        ? JSON.parse(instance.assistant.config || '{}') 
        : (instance.assistant.config || {});
      const modelId = assistantConfig.model || assistantConfig.modelId || 'deepseek-chat';
      const systemPrompt = assistantConfig.systemPrompt || '你是一位专业的小说写手，请根据要求创作章节内容。';
      
      const response = await axios.post(`${API_BASE}/chat`, {
        modelId,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      let generatedContent = response.data.choices?.[0]?.message?.content || '';
      // 如果生成的内容不是 HTML，则转换换行符为 HTML
      if (!generatedContent.includes('<p') && !generatedContent.includes('<br')) {
        generatedContent = convertNewlinesToHTML(generatedContent);
      }
      setWriterInstances(writerInstances.map(inst =>
        inst.id === instanceId ? { ...inst, content: generatedContent, isGenerating: false } : inst
      ));
    } catch (error) {
      console.error('Error generating content:', error);
      setWriterInstances(writerInstances.map(inst =>
        inst.id === instanceId ? { ...inst, isGenerating: false } : inst
      ));
      setMessage('生成内容失败，请重试');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const buildGenerationPrompt = (instance) => {
    let prompt = `请为小说《${selectedBook.title}》创作章节内容。\n\n`;
    prompt += `章节标题：${chapterTitle}\n`;
    prompt += `目标字数：约 ${targetWordCount} 字\n\n`;
    
    // 添加完整的世界观参考
    if (worldview) {
      prompt += `【世界观设定】\n`;
      if (worldview.world_name) {
        prompt += `世界名称：${worldview.world_name}\n`;
      }
      if (worldview.world_type) {
        prompt += `世界类型：${worldview.world_type}\n`;
      }
      if (worldview.world_desc) {
        prompt += `世界描述：${worldview.world_desc}\n`;
      }
      if (worldview.atmosphere) {
        prompt += `氛围基调：${worldview.atmosphere}\n`;
      }
      if (worldview.power_system) {
        prompt += `力量体系：${worldview.power_system}\n`;
      }
      if (worldview.society_structure) {
        prompt += `社会结构：${worldview.society_structure}\n`;
      }
      if (worldview.special_element) {
        prompt += `特殊元素：${worldview.special_element}\n`;
      }
      if (worldview.player_background) {
        prompt += `主角背景：${worldview.player_background}\n`;
      }
      if (worldview.world_tags) {
        prompt += `标签：${worldview.world_tags}\n`;
      }
      if (worldview.content) {
        prompt += `补充说明：${worldview.content}\n`;
      }
      prompt += '\n';
    }
    
    // 添加当前剧情参考
    if (selectedPlot) {
      prompt += `【当前剧情】\n标题: ${selectedPlot.title}\n`;
      if (selectedPlot.content?.summary) {
        prompt += `概要: ${selectedPlot.content.summary}\n`;
      }
      if (selectedPlot.target) {
        prompt += `目标: ${selectedPlot.target}\n`;
      }
      if (selectedPlot.obstacle) {
        prompt += `障碍: ${selectedPlot.obstacle}\n`;
      }
      prompt += '\n';
    }
    
    // 添加当前细纲参考
    if (selectedOutline) {
      prompt += `【当前细纲】\n标题: ${selectedOutline.chapter_title}\n`;
      if (selectedOutline.atmosphere) {
        prompt += `氛围: ${selectedOutline.atmosphere}\n`;
      }
      if (selectedOutline.purpose) {
        prompt += `本章作用: ${selectedOutline.purpose}\n`;
      }
      if (selectedOutline.summary) {
        prompt += `章节概要: ${selectedOutline.summary}\n`;
      }
      if (selectedOutline.plot_details) {
        prompt += `情节细节: ${selectedOutline.plot_details}\n`;
      }
      if (selectedOutline.characters) {
        prompt += `出场角色: ${selectedOutline.characters}\n`;
      }
      prompt += '\n';
    }
    
    // 添加以前章节内容参考
    if (selectedChapter) {
      prompt += `【参考章节】\n${selectedChapter.l1 || selectedChapter.l2 || selectedChapter.l3 || '暂无内容'}\n\n`;
    }
    
    prompt += `请创作完整的章节内容，语言流畅，情节丰富，符合上述参考信息。请确保章节约 ${targetWordCount} 字左右，段落清晰，层次分明。`;
    return prompt;
  };

  const saveAsChapter = async (instanceId) => {
    const instance = writerInstances.find(inst => inst.id === instanceId);
    if (!instance) return;

    if (!selectedBook) {
      setMessage('请先选择一本书');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!chapterTitle.trim()) {
      setMessage('请输入章节标题');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!instance.content.trim()) {
      setMessage('请先生成或编辑内容');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const chapterData = {
        book_id: selectedBook.id,
        title: chapterTitle,
        l1: instance.content,
        word_count: instance.content.replace(/<[^>]*>/g, '').length,
        order_num: selectedChapter ? selectedChapter.order_num : chapters.length
      };

      if (selectedChapter) {
        await axios.put(`${API_BASE}/chapters/${selectedChapter.id}`, chapterData);
        setMessage('章节更新成功！');
      } else {
        await axios.post(`${API_BASE}/chapters`, chapterData);
        setMessage('章节创建成功！');
      }

      fetchChapters(selectedBook.id);
    } catch (error) {
      console.error('Error saving chapter:', error);
      setMessage('保存失败，请重试');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSelectChapter = (chapter) => {
    setSelectedChapter(chapter);
    setChapterTitle(chapter.title);
    if (writerInstances.length > 0) {
      setWriterInstances(writerInstances.map(inst => ({
        ...inst,
        content: chapter.l1 || ''
      })));
    }
  };

  const handleCreateNewChapter = () => {
    setSelectedChapter(null);
    setChapterTitle('');
    setWriterInstances(writerInstances.map(inst => ({
      ...inst,
      content: ''
    })));
  };

  const duplicateVersion = (instanceId) => {
    const sourceInstance = writerInstances.find(inst => inst.id === instanceId);
    if (!sourceInstance) return;

    const newInstance = {
      id: Date.now(),
      name: `${sourceInstance.name} (副本)`,
      assistant: sourceInstance.assistant,
      content: sourceInstance.content,
      isGenerating: false,
      versionName: `${sourceInstance.versionName} 副本`
    };
    setWriterInstances([...writerInstances, newInstance]);
  };

  const updateInstanceAssistant = (instanceId, assistantId) => {
    const assistant = assistants.find(a => String(a.id) === String(assistantId));
    setWriterInstances(writerInstances.map(inst =>
      inst.id === instanceId ? { ...inst, assistant } : inst
    ));
  };

  const toggleMaximize = (instanceId) => {
    if (maximizedInstance === instanceId) {
      setMaximizedInstance(null);
    } else {
      setMaximizedInstance(instanceId);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && maximizedInstance !== null) {
        setMaximizedInstance(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [maximizedInstance]);

  useEffect(() => {
    if (writerInstances.length === 0) {
      createWriterInstance();
    }
  }, [assistants]);

  return (
    <div className={`writer-workspace ${maximizedInstance ? 'maximized-mode' : ''}`}>
      <div className="page-header">
        <h1>✍️ 写手多版本创作</h1>
        <div className="header-selectors">
          <select
            value={selectedBook?.id || ''}
            onChange={(e) => {
              const book = books.find(b => b.id === parseInt(e.target.value));
              setSelectedBook(book);
              setSelectedPlot(null);
              setSelectedOutline(null);
              handleCreateNewChapter();
            }}
            className="book-select"
          >
            <option value="">请选择书籍</option>
            {books.map(book => (
              <option key={book.id} value={book.id}>{book.title}</option>
            ))}
          </select>
          <select
            value={selectedPlot?.id || ''}
            onChange={(e) => {
              const plot = plots.find(p => p.id === parseInt(e.target.value));
              setSelectedPlot(plot);
            }}
            className="plot-select"
            disabled={!selectedBook}
          >
            <option value="">选择剧情</option>
            {plots.map(plot => (
              <option key={plot.id} value={plot.id}>{plot.title}</option>
            ))}
          </select>
          <select
            value={selectedOutline?.id || ''}
            onChange={(e) => {
              const outline = chapterOutlines.find(o => o.id === parseInt(e.target.value));
              setSelectedOutline(outline);
              if (outline && outline.chapter_title) {
                setChapterTitle(outline.chapter_title);
              }
            }}
            className="outline-select"
            disabled={!selectedBook}
          >
            <option value="">选择细纲</option>
            {chapterOutlines.map(outline => (
              <option key={outline.id} value={outline.id}>{outline.chapter_title}</option>
            ))}
          </select>
        </div>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>

      {message && <div className="notification-message">{message}</div>}

      <div className={`workspace-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {!sidebarCollapsed ? (
            <>
              <div className="sidebar-header">
                <button 
                  onClick={() => setSidebarCollapsed(true)}
                  className="sidebar-toggle-btn"
                  title="折叠侧边栏"
                >
                  ◀
                </button>
              </div>
              {selectedBook ? (
                <div className="sidebar-section">
                  <div className="section-header">
                    <h3>章节列表</h3>
                    <button onClick={handleCreateNewChapter} className="btn-small">
                      + 新建章节
                    </button>
                  </div>
                  <div className="chapters-list">
                    {chapters.length === 0 ? (
                      <p className="empty-list">暂无章节</p>
                    ) : (
                      chapters.map(chapter => (
                        <div
                          key={chapter.id}
                          className={`chapter-item ${selectedChapter?.id === chapter.id ? 'active' : ''}`}
                        >
                          <div className="chapter-item-content" onClick={() => handleSelectChapter(chapter)}>
                            <span className="chapter-title">{chapter.title}</span>
                            {chapter.word_count > 0 && (
                              <span className="word-count">{chapter.word_count} 字</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="sidebar-section">
                  <p className="empty-list">请先选择书籍</p>
                </div>
              )}
            </>
          ) : (
            <button 
              onClick={() => setSidebarCollapsed(false)}
              className="sidebar-expand-btn"
              title="展开侧边栏"
            >
              ▶
            </button>
          )}
        </div>

        <div className="main-content">
          {!selectedBook ? (
            <div className="placeholder">
              <h2>请先选择一本书</h2>
              <p>从左侧选择一本书开始多版本创作</p>
            </div>
          ) : (
            <>
              <div className="workspace-controls">
                <input
                  type="text"
                  placeholder="输入章节标题..."
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="chapter-title-input"
                />
                <select
                  value={writerInstances[activeInstance]?.assistant?.id || ''}
                  onChange={(e) => {
                    if (writerInstances[activeInstance]) {
                      updateInstanceAssistant(writerInstances[activeInstance].id, e.target.value);
                    }
                  }}
                  className="assistant-select"
                  disabled={!selectedBook}
                >
                  <option value="">选择助手</option>
                  {assistants.map(assistant => (
                    <option key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </option>
                  ))}
                </select>
                <input
                type="text"
                value={writerInstances[activeInstance]?.versionName || ''}
                onChange={(e) => {
                  if (writerInstances[activeInstance]) {
                    updateVersionName(writerInstances[activeInstance].id, e.target.value);
                  }
                }}
                className="version-name-input"
                placeholder="版本名称"
              />
              <input
                type="number"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 2000)}
                className="target-word-count-input"
                placeholder="目标字数"
                min="100"
                max="20000"
              />
                <div className="action-menu-wrapper">
                  <button
                    className="action-menu-button"
                    onClick={() => setShowActionMenu(!showActionMenu)}
                  >
                    ⚙️ 操作
                  </button>
                  {showActionMenu && (
                    <div className="action-menu">
                      <button
                        className={`action-menu-item ${viewMode === 'columns' ? 'active' : ''}`}
                        onClick={() => {
                          setViewMode('columns');
                          setShowActionMenu(false);
                        }}
                      >
                        📊 分栏视图
                      </button>
                      <button
                        className={`action-menu-item ${viewMode === 'tabs' ? 'active' : ''}`}
                        onClick={() => {
                          setViewMode('tabs');
                          setShowActionMenu(false);
                        }}
                      >
                        📑 标签页视图
                      </button>
                      <div className="action-menu-divider"></div>
                      <button
                        className="action-menu-item"
                        onClick={() => {
                          createWriterInstance();
                          setShowActionMenu(false);
                        }}
                      >
                        ➕ 添加写手
                      </button>
                      {writerInstances[activeInstance] && (
                        <>
                          <button
                            className="action-menu-item"
                            onClick={() => {
                              generateContent(writerInstances[activeInstance].id);
                              setShowActionMenu(false);
                            }}
                            disabled={writerInstances[activeInstance]?.isGenerating}
                          >
                            {writerInstances[activeInstance]?.isGenerating ? '⏳ 生成中...' : '🤖 生成内容'}
                          </button>
                          <button
                            className="action-menu-item"
                            onClick={() => {
                              saveAsChapter(writerInstances[activeInstance].id);
                              setShowActionMenu(false);
                            }}
                            disabled={loading}
                          >
                            💾 保存为章节
                          </button>
                          <button
                            className="action-menu-item"
                            onClick={() => {
                              toggleMaximize(writerInstances[activeInstance].id);
                              setShowActionMenu(false);
                            }}
                          >
                            {maximizedInstance === writerInstances[activeInstance].id ? '⬜ 还原' : '⛶ 最大化'}
                          </button>
                          <button
                            className="action-menu-item"
                            onClick={() => {
                              duplicateVersion(writerInstances[activeInstance].id);
                              setShowActionMenu(false);
                            }}
                          >
                            📋 复制版本
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {viewMode === 'tabs' && writerInstances.length > 0 && !maximizedInstance && (
                <div className="tabs-header">
                  {writerInstances.map((inst, index) => (
                  <div
                    key={inst.id}
                    className={`tab-item ${activeInstance === index ? 'active' : ''}`}
                    onClick={() => setActiveInstance(index)}
                  >
                    <span className="tab-name">{inst.name}</span>
                    <button
                      className="tab-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWriterInstance(inst.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                </div>
              )}

              <div className={`writers-container ${viewMode} ${maximizedInstance ? 'maximized' : ''}`}>
                {(maximizedInstance ? 
                  [writerInstances.find(inst => inst.id === maximizedInstance)] : 
                  (viewMode === 'columns' ? writerInstances : [writerInstances[activeInstance]])
                ).filter(Boolean).map((inst, index) => (
                  <div key={inst.id} className={`writer-panel ${maximizedInstance === inst.id ? 'maximized' : ''}`}>
                    <div className="panel-header-mini">
                      <span className="panel-name">{inst.name}</span>
                      {viewMode === 'columns' && !maximizedInstance && (
                        <button
                          onClick={() => removeWriterInstance(inst.id)}
                          className="btn-small btn-danger"
                          title="删除"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    <div className="editor-wrapper">
                      <ChapterEditor
                        value={inst.content}
                        onChange={(content) => updateInstanceContent(inst.id, content)}
                        assistants={assistants}
                        defaultAssistant={inst.assistant}
                      />
                    </div>

                    <div className="word-count">
                      {inst.content.replace(/<[^>]*>/g, '').length} 字
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WriterWorkspace;
