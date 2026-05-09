import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

function ChapterOutlinePage() {
  const [books, setBooks] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksRes, assistantsRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/assistants`)
      ]);
      setBooks(booksRes.data);
      
      // 只显示章节构建和自定义助手
      const chapterAssistants = assistantsRes.data.filter(a => 
        a.type === 'chapter_planner' || a.name.includes('章节') || a.type === 'custom'
      );
      
      // 排序：自定义助手排在下面
      const sortedAssistants = [...(chapterAssistants.length > 0 ? chapterAssistants : [])].sort((a, b) => {
        const aIsCustom = a.type === 'custom' || a.name.includes('自定义');
        const bIsCustom = b.type === 'custom' || b.name.includes('自定义');
        if (aIsCustom && !bIsCustom) return 1;
        if (!aIsCustom && bIsCustom) return -1;
        return 0;
      });
      
      setAssistants(sortedAssistants.length > 0 ? sortedAssistants : assistantsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    if (assistants.length > 0) {
      setSelectedAssistant(assistants[0]);
      setShowChat(true);
    }
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedBook(null);
    setSelectedAssistant(null);
  };

  if (loading) {
    return (
      <div className="chapter-outline-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (showChat && selectedAssistant && selectedBook) {
    return (
      <ChapterOutlineChatInterface
        assistant={selectedAssistant}
        allAssistants={assistants}
        book={selectedBook}
        onBack={handleBack}
        onDataSaved={loadData}
        onAssistantChange={(newAssistant) => {
          setSelectedAssistant(newAssistant);
        }}
      />
    );
  }

  return (
    <div className="chapter-outline-page">
      <div className="page-header">
        <h1>📝 章节构建</h1>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>

      <div className="workflow-intro">
        <h2>构建章节故事细纲</h2>
        <p>为每个章节创建详细的故事细纲，包括氛围渲染、情节发展和角色表现</p>
      </div>

      {books.length > 0 ? (
        <div className="books-section">
          <h3>选择小说开始章节构建</h3>
          <div className="books-grid">
            {books.map((book) => (
              <div key={book.id} className="book-card" onClick={() => handleSelectBook(book)}>
                <h4>{book.title}</h4>
                <p className="book-author">作者: {book.author}</p>
                {book.description && <p className="book-desc">{book.description}</p>}
                {(book.estimated_chapters > 0 || book.estimated_words > 0) && (
                  <div className="book-meta">
                    <span>预计 {book.estimated_chapters} 章 / {book.estimated_words.toLocaleString()} 字</span>
                  </div>
                )}
                <div className="book-date">更新于: {new Date(book.updated_at).toLocaleDateString('zh-CN')}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="warning-message">
          <p>没有找到小说，请先在主编工作流中创建</p>
          <Link to="/editor-workflow" className="button-link">去创建小说 →</Link>
        </div>
      )}

      {assistants.length === 0 && (
        <div className="warning-message">
          <p>没有找到章节构建助手，请先在助手管理中创建</p>
          <Link to="/assistants" className="button-link">去创建助手 →</Link>
        </div>
      )}
    </div>
  );
}

function ChapterOutlineChatInterface({ assistant, book, onBack, onDataSaved, allAssistants, onAssistantChange }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useStream, setUseStream] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [plots, setPlots] = useState([]);
  const [chapterOutlines, setChapterOutlines] = useState([]);
  const [worldview, setWorldview] = useState(null);
  const [expandedPlotIds, setExpandedPlotIds] = useState(new Set());
  const [expandedActIds, setExpandedActIds] = useState(new Set());
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [currentAssistant, setCurrentAssistant] = useState(assistant);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (currentAssistant && book) {
      loadSessions();
      loadPlots();
      loadChapterOutlines();
      loadWorldview();
    }
  }, [currentAssistant, book]);

  const handleAssistantChange = (assistantId) => {
    // 处理类型不匹配的问题（字符串 vs 数字）
    const newAssistant = allAssistants.find(a => String(a.id) === String(assistantId));
    if (newAssistant) {
      setCurrentAssistant(newAssistant);
      setCurrentSession(null);
      setMessages([]);
      if (onAssistantChange) {
        onAssistantChange(newAssistant);
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/conversations/sessions`, {
        params: { assistant_id: currentAssistant.id, book_id: book.id }
      });
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadPlots = async () => {
    try {
      const response = await axios.get(`${API_BASE}/plots/book/${book.id}`);
      const parsedPlots = response.data.map(plot => {
        try {
          return {
            ...plot,
            content: plot.content ? JSON.parse(plot.content) : { acts: [] }
          };
        } catch (e) {
          return { ...plot, content: { acts: [] } };
        }
      });
      setPlots(parsedPlots);
    } catch (error) {
      console.error('Failed to load plots:', error);
    }
  };

  const loadChapterOutlines = async () => {
    try {
      const response = await axios.get(`${API_BASE}/chapter-outlines/book/${book.id}`);
      setChapterOutlines(response.data);
    } catch (error) {
      console.error('Failed to load chapter outlines:', error);
    }
  };

  const loadWorldview = async () => {
    try {
      const response = await axios.get(`${API_BASE}/worlds/book/${book.id}`);
      if (response.data.length > 0) {
        setWorldview(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load worldview:', error);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE}/conversations/sessions/${sessionId}/messages`);
      const loadedMessages = response.data;
      
      const processedMessages = await Promise.all(loadedMessages.map(async (msg) => {
        if (msg.role === 'assistant') {
          try {
            const parseResponse = await axios.post(`${API_BASE}/novel-workflow/parse`, {
              response: msg.content
            });
            return { ...msg, parsed: parseResponse.data };
          } catch (e) {
            return msg;
          }
        }
        return msg;
      }));
      
      setMessages(processedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const selectSession = async (session) => {
    setCurrentSession(session);
    await loadSessionMessages(session.id);
  };

  const createNewSession = async () => {
    try {
      const response = await axios.post(`${API_BASE}/conversations/sessions`, {
        title: '章节构建新对话',
        assistant_id: currentAssistant.id,
        book_id: book.id
      });
      const newSession = response.data;
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/conversations/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const saveMessage = async (sessionId, role, content) => {
    try {
      await axios.post(`${API_BASE}/conversations/sessions/${sessionId}/messages`, {
        role,
        content
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const parseResponse = async (responseText) => {
    try {
      const response = await axios.post(`${API_BASE}/novel-workflow/parse`, {
        response: responseText
      });
      return response.data;
    } catch (error) {
      console.error('Failed to parse response:', error);
      return { text: responseText, options: [], ready: false };
    }
  };

  const saveOutline = async (outlineData) => {
    try {
      const response = await axios.post(`${API_BASE}/chapter-outlines`, {
        book_id: book.id,
        plot_id: selectedPlot?.id || 1,
        chapter_title: outlineData.title || selectedChapter?.title || '未命名章节',
        chapter_order: selectedChapter?.order_in_plot || 0,
        atmosphere: outlineData.atmosphere,
        purpose: outlineData.purpose,
        summary: outlineData.summary,
        plot_details: outlineData.plot_details,
        characters: Array.isArray(outlineData.characters) ? JSON.stringify(outlineData.characters) : outlineData.characters
      });
      if (response.data) {
        loadChapterOutlines();
        if (onDataSaved) onDataSaved();
      }
    } catch (error) {
      console.error('Failed to save chapter outline:', error);
    }
  };

  const buildContext = () => {
    let context = '';
    
    if (worldview?.content) {
      context += `【世界观设定】\n${worldview.content}\n\n`;
    }
    
    if (selectedPlot) {
      context += `【当前剧情】\n标题: ${selectedPlot.title}\n`;
      if (selectedPlot.content?.summary) {
        context += `概要: ${selectedPlot.content.summary}\n`;
      }
      context += '\n';
    }
    
    if (selectedChapter) {
      context += `【当前推演章节】\n标题: ${selectedChapter.title}\n`;
      if (selectedChapter.content) {
        context += `概要: ${selectedChapter.content}\n`;
      }
      if (selectedChapter.purpose) {
        context += `本章作用: ${selectedChapter.purpose}\n`;
      }
      context += '\n';
    }
    
    return context;
  };

  const sendMessage = async (text = null) => {
    let messageText = text || inputText;
    if (typeof messageText === 'object' && messageText !== null) {
      if (messageText instanceof HTMLElement || messageText.nodeType) {
        console.warn('Attempted to send a DOM element as message');
        return;
      }
      const hasTextProperty = typeof messageText.text === 'string' && messageText.text.trim();
      const hasContentProperty = typeof messageText.content === 'string' && messageText.content.trim();
      messageText = hasTextProperty ? messageText.text : hasContentProperty ? messageText.content : JSON.stringify(messageText);
    }
    const safeMessageText = String(messageText).trim();
    
    if (!safeMessageText || isLoading) {
      return;
    }
    
    let sessionId = currentSession?.id;
    if (!sessionId) {
      try {
        const response = await axios.post(`${API_BASE}/conversations/sessions`, {
          title: safeMessageText.substring(0, 30) + (safeMessageText.length > 30 ? '...' : ''),
          assistant_id: assistant.id,
          book_id: book.id
        });
        const newSession = response.data;
        setSessions([newSession, ...sessions]);
        setCurrentSession(newSession);
        sessionId = newSession.id;
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }

    const userMessage = { role: 'user', content: safeMessageText, isOption: !!text };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    const assistantConfig = JSON.parse(currentAssistant.config || '{}');
    const modelId = assistantConfig.model || assistantConfig.modelId || 'gpt-4';

    const messagesForAI = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
    
    if (assistantConfig.systemPrompt) {
      let systemPrompt = assistantConfig.systemPrompt;
      const context = buildContext();
      if (context) {
        systemPrompt = systemPrompt + '\n\n【上下文信息】\n' + context;
      }
      messagesForAI.unshift({ role: 'system', content: systemPrompt });
    }

    try {
      let assistantContent = '';
      if (useStream) {
        abortControllerRef.current = new AbortController();
        
        const response = await fetch(`${API_BASE}/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId,
            messages: messagesForAI
          })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') break;
              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta?.content || '';
                assistantContent += delta;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantContent };
                  return newMessages;
                });
              } catch (e) {
              }
            }
          }
        }
      } else {
        const response = await axios.post(`${API_BASE}/chat`, {
          modelId,
          messages: messagesForAI
        });
        
        assistantContent = response.data.choices?.[0]?.message?.content || '';
        const assistantMessage = { role: 'assistant', content: assistantContent };
        setMessages(prev => [...prev, assistantMessage]);
      }

      const parsedResponse = await parseResponse(assistantContent);
      
      if (parsedResponse.ready && parsedResponse.chapterOutline) {
        await saveOutline(parsedResponse.chapterOutline);
      }

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        lastMsg.parsed = parsedResponse;
        return newMessages;
      });

      await saveMessage(sessionId, 'user', userMessage.content);
      await saveMessage(sessionId, 'assistant', assistantContent);

      loadSessions();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const togglePlotExpand = (plotId) => {
    const newExpanded = new Set(expandedPlotIds);
    if (newExpanded.has(plotId)) {
      newExpanded.delete(plotId);
    } else {
      newExpanded.add(plotId);
    }
    setExpandedPlotIds(newExpanded);
    setSelectedPlot(plots.find(p => p.id === plotId));
  };

  const toggleActExpand = (actKey) => {
    const newExpanded = new Set(expandedActIds);
    if (newExpanded.has(actKey)) {
      newExpanded.delete(actKey);
    } else {
      newExpanded.add(actKey);
    }
    setExpandedActIds(newExpanded);
  };

  const handleSelectChapter = (chapter, plotId, actIndex, chapterIndex) => {
    setSelectedChapter({
      ...chapter,
      plot_id: plotId,
      act_index: actIndex,
      chapter_index: chapterIndex,
      order_in_plot: chapterIndex
    });
    setSelectedPlot(plots.find(p => p.id === plotId));
  };

  const renderMessage = (msg, index) => {
    const displayText = msg.parsed && msg.parsed.narrative ? msg.parsed.narrative : msg.content;
    
    return (
      <div key={index} className={`message ${msg.role}`}>
        <div className="message-avatar">{msg.role === 'user' ? '👤' : '📝'}</div>
        <div className="message-content">
          <div className="message-text">{displayText}</div>
          {msg.role === 'assistant' && msg.parsed && msg.parsed.options && msg.parsed.options.length > 0 && (
            <div className="options-container">
              {msg.parsed.options.map((option, optIndex) => {
                const optionText = typeof option === 'object' && option !== null ? option.text : option;
                return (
                  <div key={optIndex} className="option-button-wrapper">
                    <button className="option-button" onClick={() => sendMessage(optionText)} disabled={isLoading}>
                      {optionText}
                    </button>
                    <button className="option-edit-button" onClick={(e) => {
                      e.stopPropagation();
                      setInputText(optionText);
                    }} title="编辑选项内容">✏️</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-interface chapter-outline-chat">
      <div className="combined-sidebar">
        <div className="sidebar-header">
          <button className="back-button" onClick={onBack}>← 返回</button>
          {allAssistants && allAssistants.length > 0 ? (
            <select 
              value={currentAssistant?.id} 
              onChange={(e) => handleAssistantChange(e.target.value)}
              className="assistant-selector"
            >
              {allAssistants.map(a => (
                <option key={a.id} value={a.id}>📝 {a.name}</option>
              ))}
            </select>
          ) : (
            <h3>📝 {currentAssistant?.name || '章节构建师'}</h3>
          )}
        </div>
        
        <div className="book-info">
          <h4>{book.title}</h4>
          <p className="book-author">作者: {book.author}</p>
          {(book.estimated_chapters > 0 || book.estimated_words > 0) && (
            <p className="book-stats-info">预计: {book.estimated_chapters} 章 / {book.estimated_words.toLocaleString()} 字</p>
          )}
        </div>

        {/* 剧情结构部分 */}
        <div className="plots-tree-section">
          <div className="section-header">
            <h3>📚 剧情结构</h3>
          </div>
          <div className="plots-tree">
            {plots.length === 0 ? (
              <div className="empty-tree">暂无剧情</div>
            ) : (
              plots.map((plot) => (
                <div key={plot.id} className="plot-item">
                  <div className="plot-header" onClick={() => togglePlotExpand(plot.id)}>
                    <span className="expand-icon">{expandedPlotIds.has(plot.id) ? '▼' : '▶'}</span>
                    <span className="plot-title">{plot.title}</span>
                    {selectedPlot?.id === plot.id && <span className="selected-indicator">●</span>}
                  </div>
                  
                  {expandedPlotIds.has(plot.id) && plot.content?.acts && plot.content.acts.length > 0 && (
                    <div className="acts-list">
                      {plot.content.acts.map((act, actIndex) => {
                        const actKey = `${plot.id}-${actIndex}`;
                        return (
                          <div key={actKey} className="act-item">
                            <div className="act-header" onClick={() => toggleActExpand(actKey)}>
                              <span className="expand-icon">{expandedActIds.has(actKey) ? '▼' : '▶'}</span>
                              <span className="act-title">第{act.act || actIndex + 1}幕</span>
                            </div>
                            
                            {expandedActIds.has(actKey) && act.chapters && act.chapters.length > 0 && (
                              <div className="chapters-list">
                                {act.chapters.map((chapter, chapterIndex) => (
                                  <div 
                                    key={`${actKey}-${chapterIndex}`}
                                    className={`chapter-item ${selectedChapter?.chapter_index === chapterIndex && selectedChapter?.plot_id === plot.id ? 'selected' : ''}`}
                                    onClick={() => handleSelectChapter(chapter, plot.id, actIndex, chapterIndex)}
                                  >
                                    <span className="chapter-number">第{chapterIndex + 1}章</span>
                                    <span className="chapter-title">{chapter.title || '未命名章节'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 会话列表部分 */}
        <div className="sessions-section">
          <div className="section-header">
            <h3>💬 对话历史</h3>
            <button className="new-chat-button" onClick={createNewSession}>+ 新对话</button>
          </div>
          <div className="sessions-list">
            {sessions.map(session => (
              <div key={session.id} className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`} onClick={() => selectSession(session)}>
                <span className="session-title">{session.title}</span>
                <button className="delete-session-button" onClick={(e) => deleteSession(session.id, e)}>×</button>
                <span className="session-date">{formatDate(session.updated_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <div className="tabs">
            <button className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
              💬 对话
            </button>
            <button className={`tab-button ${activeTab === 'outlines' ? 'active' : ''}`} onClick={() => setActiveTab('outlines')}>
              📝 章节细纲 ({chapterOutlines.length})
            </button>
          </div>
          <div className="stream-toggle">
            <label>
              <input type="checkbox" checked={useStream} onChange={(e) => setUseStream(e.target.checked)} />
              流式输出
            </label>
          </div>
        </div>

        {selectedChapter && (
          <div className="selected-chapter-info">
            <div className="chapter-badge">
              <span>📖 当前推演章节:</span>
              <span className="chapter-name">{selectedChapter.title || '未命名章节'}</span>
            </div>
            {selectedChapter.content && <p className="chapter-summary">{selectedChapter.content}</p>}
            {selectedChapter.purpose && <p className="chapter-purpose">本章作用: {selectedChapter.purpose}</p>}
          </div>
        )}

        {activeTab === 'chat' && (
          <>
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="welcome-message">
                  <h3>开始与章节构建师对话</h3>
                  <p>章节构建师将引导您为每个章节创建详细的故事细纲</p>
                  <div className="book-reference">
                    <strong>参考信息:</strong>
                    <p>书名: {book.title}</p>
                    <p>预计章节: {book.estimated_chapters || '未设置'} 章</p>
                    <p>预计字数: {book.estimated_words.toLocaleString() || '未设置'} 字</p>
                    {selectedChapter && (
                      <>
                        <p><strong>当前章节:</strong> {selectedChapter.title}</p>
                        {selectedChapter.content && <p>章节概要: {selectedChapter.content}</p>}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => renderMessage(msg, index))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
              <textarea
                className="chat-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="输入消息..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={isLoading}
              />
              <button className="send-button" onClick={isLoading ? stopGeneration : () => sendMessage()}>
                {isLoading ? '停止' : '发送'}
              </button>
            </div>
          </>
        )}

        {activeTab === 'outlines' && (
          <ChapterOutlinesManager outlines={chapterOutlines} bookId={book.id} />
        )}
      </div>
    </div>
  );
}

function ChapterOutlinesManager({ outlines, bookId }) {
  const [showForm, setShowForm] = useState(false);
  const [newOutline, setNewOutline] = useState({ 
    chapter_title: '', atmosphere: '', purpose: '', summary: '', plot_details: '', characters: '' 
  });

  const handleSaveNew = async (e) => {
    e.preventDefault();
    if (!newOutline.chapter_title.trim()) return;
    try {
      await axios.post(`${API_BASE}/chapter-outlines`, {
        book_id: bookId,
        plot_id: 1,
        chapter_title: newOutline.chapter_title,
        chapter_order: 0,
        atmosphere: newOutline.atmosphere,
        purpose: newOutline.purpose,
        summary: newOutline.summary,
        plot_details: newOutline.plot_details,
        characters: newOutline.characters
      });
      setNewOutline({ chapter_title: '', atmosphere: '', purpose: '', summary: '', plot_details: '', characters: '' });
      setShowForm(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to save outline:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个章节细纲吗？')) return;
    try {
      await axios.delete(`${API_BASE}/chapter-outlines/${id}`);
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete outline:', error);
    }
  };

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h3>章节细纲管理</h3>
        <button className="add-button" onClick={() => setShowForm(!showForm)}>+ 添加细纲</button>
      </div>

      {showForm && (
        <form className="item-form" onSubmit={handleSaveNew}>
          <input type="text" placeholder="章节标题" value={newOutline.chapter_title} onChange={(e) => setNewOutline({ ...newOutline, chapter_title: e.target.value })} />
          <textarea placeholder="写作氛围渲染" value={newOutline.atmosphere} onChange={(e) => setNewOutline({ ...newOutline, atmosphere: e.target.value })} />
          <textarea placeholder="本章作用" value={newOutline.purpose} onChange={(e) => setNewOutline({ ...newOutline, purpose: e.target.value })} />
          <textarea placeholder="章节内容概要" value={newOutline.summary} onChange={(e) => setNewOutline({ ...newOutline, summary: e.target.value })} />
          <textarea placeholder="本章情节（不少于10个细节点，约1000字）" value={newOutline.plot_details} onChange={(e) => setNewOutline({ ...newOutline, plot_details: e.target.value })} />
          <textarea placeholder="本章角色（用逗号分隔）" value={newOutline.characters} onChange={(e) => setNewOutline({ ...newOutline, characters: e.target.value })} />
          <div className="form-actions">
            <button type="submit" className="save-button">保存</button>
            <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </form>
      )}

      <div className="items-list">
        {outlines.length === 0 ? (
          <div className="empty-state">暂无章节细纲</div>
        ) : (
          outlines.map((outline) => (
            <div key={outline.id} className="item-card">
              <h4>{outline.chapter_title}</h4>
              {outline.atmosphere && (
                <div className="outline-detail">
                  <span className="detail-label">氛围:</span>
                  <span>{outline.atmosphere}</span>
                </div>
              )}
              {outline.purpose && (
                <div className="outline-detail">
                  <span className="detail-label">作用:</span>
                  <span>{outline.purpose}</span>
                </div>
              )}
              {outline.summary && (
                <div className="outline-detail">
                  <span className="detail-label">概要:</span>
                  <span>{outline.summary}</span>
                </div>
              )}
              {outline.plot_details && (
                <div className="outline-detail">
                  <span className="detail-label">情节:</span>
                  <span>{outline.plot_details}</span>
                </div>
              )}
              {outline.characters && (
                <div className="outline-detail">
                  <span className="detail-label">角色:</span>
                  <span>{outline.characters}</span>
                </div>
              )}
              <div className="item-actions">
                <button className="delete-button" onClick={() => handleDelete(outline.id)}>删除</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChapterOutlinePage;