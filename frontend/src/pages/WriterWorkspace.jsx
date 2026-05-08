import { useState, useEffect } from 'react';
import axios from 'axios';
import ChapterEditor from '../components/ChapterEditor';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:3001/api';

function WriterWorkspace() {
  const [books, setBooks] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [chapterTitle, setChapterTitle] = useState('');
  const [writerInstances, setWriterInstances] = useState([]);
  const [viewMode, setViewMode] = useState('columns');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeInstance, setActiveInstance] = useState(0);

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
      const response = await axios.post(`${API_BASE}/ai/chat`, {
        modelId: instance.assistant?.config?.modelId || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: instance.assistant?.config?.systemPrompt || '你是一位专业的小说写手，请根据要求创作章节内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const generatedContent = response.data.choices?.[0]?.message?.content || '';
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
    prompt += `章节标题：${chapterTitle}\n\n`;
    
    if (selectedChapter) {
      prompt += `参考章节内容：${selectedChapter.l1 || selectedChapter.l2 || selectedChapter.l3}\n\n`;
    }
    
    prompt += '请创作完整的章节内容，语言流畅，情节丰富。';
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

  useEffect(() => {
    if (writerInstances.length === 0) {
      createWriterInstance();
    }
  }, [assistants]);

  return (
    <div className="writer-workspace">
      {/* Workflow Navigation */}
      <div className="workflow-nav-container">
        <div className="workflow-nav">
          {workflowSteps.map((step, index) => (
            <Link 
              key={step.path} 
              to={step.path}
              className={`workflow-nav-item ${step.active ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
            >
              <div className="workflow-nav-icon">{step.icon}</div>
              <div className="workflow-nav-content">
                <div className="workflow-nav-title">{step.title}</div>
              </div>
              {index < workflowSteps.length - 1 && <div className="workflow-nav-arrow">→</div>}
            </Link>
          ))}
        </div>
      </div>

      <div className="page-header">
        <h1>✍️ 写手多版本创作</h1>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>

      {message && <div className="notification-message">{message}</div>}

      <div className="workspace-layout">
        <div className="sidebar">
          <div className="sidebar-section">
            <h3>选择书籍</h3>
            <select
              value={selectedBook?.id || ''}
              onChange={(e) => {
                const book = books.find(b => b.id === parseInt(e.target.value));
                setSelectedBook(book);
                handleCreateNewChapter();
              }}
              className="book-select"
            >
              <option value="">请选择书籍</option>
              {books.map(book => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
          </div>

          {selectedBook && (
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
                <div className="chapter-title-row">
                  <input
                    type="text"
                    placeholder="输入章节标题..."
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    className="chapter-title-input"
                  />
                </div>

                <div className="view-controls">
                  <button
                    className={`view-btn ${viewMode === 'columns' ? 'active' : ''}`}
                    onClick={() => setViewMode('columns')}
                  >
                    分栏视图
                  </button>
                  <button
                    className={`view-btn ${viewMode === 'tabs' ? 'active' : ''}`}
                    onClick={() => setViewMode('tabs')}
                  >
                    标签页
                  </button>
                  <button className="btn-add" onClick={createWriterInstance}>
                    + 添加写手
                  </button>
                </div>
              </div>

              {viewMode === 'tabs' && writerInstances.length > 0 && (
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

              <div className={`writers-container ${viewMode}`}>
                {(viewMode === 'columns' ? writerInstances : [writerInstances[activeInstance]]).map((inst, index) => (
                  <div key={inst.id} className="writer-panel">
                    <div className="panel-header">
                      <div className="panel-info">
                        <input
                          type="text"
                          value={inst.name}
                          onChange={(e) => updateInstanceName(inst.id, e.target.value)}
                          className="writer-name-input"
                        />
                        <input
                          type="text"
                          value={inst.versionName}
                          onChange={(e) => updateVersionName(inst.id, e.target.value)}
                          className="version-name-input"
                          placeholder="版本名称"
                        />
                      </div>
                      <div className="panel-actions">
                        <button
                          onClick={() => duplicateVersion(inst.id)}
                          className="btn-small"
                          title="复制版本"
                        >
                          📋
                        </button>
                        {viewMode === 'columns' && (
                          <button
                            onClick={() => removeWriterInstance(inst.id)}
                            className="btn-small btn-danger"
                            title="删除"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="panel-controls">
                      <button
                        onClick={() => generateContent(inst.id)}
                        disabled={inst.isGenerating}
                        className="btn-primary"
                      >
                        {inst.isGenerating ? '生成中...' : '🤖 生成内容'}
                      </button>
                      <button
                        onClick={() => saveAsChapter(inst.id)}
                        disabled={loading}
                        className="btn-success"
                      >
                        💾 保存为章节
                      </button>
                    </div>

                    <div className="editor-wrapper">
                      <ChapterEditor
                        value={inst.content}
                        onChange={(content) => updateInstanceContent(inst.id, content)}
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
