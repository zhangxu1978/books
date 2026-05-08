import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

function PlotPlanningPage() {
  const [books, setBooks] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState('plots');
  const [loading, setLoading] = useState(true);

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
      active: true,
      completed: false,
      icon: '📚'
    },
    { 
      title: '角色策划',
      path: '/character-planning',
      active: false,
      completed: false,
      icon: '🎭'
    },
    { 
      title: '章节构建',
      path: '/chapter-outline',
      active: false,
      completed: false,
      icon: '📝'
    },
    { 
      title: '写手创作',
      path: '/writer-workspace',
      active: false,
      completed: false,
      icon: '✍️'
    }
  ];
  
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
      
      const plotPlannerAssistants = assistantsRes.data.filter(a => 
        a.type === 'plot_planner' || a.name.includes('剧情策划')
      );
      setAssistants(plotPlannerAssistants.length > 0 ? plotPlannerAssistants : assistantsRes.data);
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
      <div className="plot-planning-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (showChat && selectedAssistant && selectedBook) {
    return (
      <PlotChatInterface
        assistant={selectedAssistant}
        book={selectedBook}
        onBack={handleBack}
        onDataSaved={loadData}
      />
    );
  }

  return (
    <div className="plot-planning-page">
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
        <h1>📚 剧情策划</h1>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>

      <div className="workflow-intro">
        <h2>剧情与角色规划</h2>
        <p>让剧情策划助手帮助您设计精彩的故事情节和立体的人物角色</p>
      </div>

      {books.length > 0 ? (
        <div className="books-section">
          <h3>选择小说开始剧情策划</h3>
          <div className="books-grid">
            {books.map((book) => (
              <div 
                key={book.id} 
                className="book-card"
                onClick={() => handleSelectBook(book)}
              >
                <h4>{book.title}</h4>
                <p className="book-author">作者: {book.author}</p>
                {book.description && (
                  <p className="book-desc">{book.description}</p>
                )}
                {(book.estimated_chapters > 0 || book.estimated_words > 0) && (
                  <div className="book-meta">
                    <span>预计 {book.estimated_chapters} 章 / {book.estimated_words.toLocaleString()} 字</span>
                  </div>
                )}
                <div className="book-date">
                  更新于: {new Date(book.updated_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="warning-message">
          <p>没有找到小说，请先在主编工作流中创建</p>
          <Link to="/editor-workflow" className="button-link">
            去创建小说 →
          </Link>
        </div>
      )}

      {assistants.length === 0 && (
        <div className="warning-message">
          <p>没有找到剧情策划助手，请先在助手管理中创建</p>
          <Link to="/assistants" className="button-link">
            去创建助手 →
          </Link>
        </div>
      )}
    </div>
  );
}

function PlotChatInterface({ assistant, book, onBack, onDataSaved }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useStream, setUseStream] = useState(false);
  const [plots, setPlots] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [worldInfo, setWorldInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [timeConflict, setTimeConflict] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (assistant && book) {
      loadSessions();
      loadPlots();
      loadCharacters();
      loadExistingData();
    }
  }, [assistant, book]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadExistingData = async () => {
    try {
      const worldsRes = await axios.get(`${API_BASE}/worlds/book/${book.id}`);
      if (worldsRes.data && worldsRes.data.length > 0) {
        setWorldInfo(worldsRes.data[0]);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/conversations/sessions`, {
        params: { assistant_id: assistant.id, book_id: book.id }
      });
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadPlots = async () => {
    try {
      const response = await axios.get(`${API_BASE}/plots/book/${book.id}`);
      setPlots(response.data);
    } catch (error) {
      console.error('Failed to load plots:', error);
    }
  };

  const loadCharacters = async () => {
    try {
      const response = await axios.get(`${API_BASE}/characters/book/${book.id}`);
      setCharacters(response.data);
    } catch (error) {
      console.error('Failed to load characters:', error);
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
        title: '剧情策划新对话',
        assistant_id: assistant.id,
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

  const parsePlotResponse = async (responseText) => {
    console.log('=== parsePlotResponse called ===');
    console.log('responseText length:', responseText?.length);
    console.log('responseText preview:', responseText?.substring(0, 300));
    
    try {
      const response = await axios.post(`${API_BASE}/novel-workflow/parse`, {
        response: responseText
      });
      console.log('✅ parsePlotResponse success');
      console.log('response.data:', response.data);
      console.log('Has ready:', response.data?.ready);
      console.log('Has plot:', response.data?.plot);
      console.log('Has character:', response.data?.character);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to parse response:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      return { text: responseText, options: [], ready: false };
    }
  };

  const sendMessage = async (text = null) => {
    console.log('🔵 sendMessage called');
    console.log('text param:', text);
    console.log('inputText:', inputText);
    console.log('isLoading:', isLoading);
    
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
    console.log('safeMessageText:', safeMessageText);
    
    if (!safeMessageText || isLoading) {
      console.log('⚠️ Early return: empty message or isLoading');
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

    const assistantConfig = JSON.parse(assistant.config || '{}');
    const modelId = assistantConfig.model || assistantConfig.modelId || 'gpt-4';

    const messagesForAI = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
    if (assistantConfig.systemPrompt) {
      let systemPrompt = assistantConfig.systemPrompt;
      
      if (worldInfo) {
        const worldContext = `\n\n## 当前书籍世界观信息\n当前正在为书籍「${worldInfo.book_name}」进行剧情策划。\n- 世界名称: ${worldInfo.world_name}\n- 世界类型: ${worldInfo.world_type}\n- 世界描述: ${worldInfo.world_desc}\n- 叙事模式: ${worldInfo.narrative_mode}\n- 氛围: ${worldInfo.atmosphere || '未设置'}\n- 力量体系: ${worldInfo.power_system || '未设置'}\n- 社会结构: ${worldInfo.society_structure || '未设置'}\n- 特殊元素: ${worldInfo.special_element || '未设置'}\n- 主角背景: ${worldInfo.player_background || '未设置'}\n\n请基于以上世界观信息进行剧情策划。`;
        systemPrompt = systemPrompt + worldContext;
      }

      if (book) {
        const bookContext = `\n\n## 当前书籍信息\n- 书籍名称: ${book.title}\n- 预计章节数: ${book.estimated_chapters || '未设置'}\n- 预计总字数: ${book.estimated_words || '未设置'}\n- 每章字数: ${book.words_per_chapter || '未设置'}\n\n请根据书籍篇幅调整剧情节奏：短篇(<5章或<2万字)节奏要快，长篇(>15章或>10万字)可以缓缓进入。`;
        systemPrompt = systemPrompt + bookContext;
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

      console.log('✅ Received AI response');
      console.log('assistantContent length:', assistantContent?.length);
      console.log('assistantContent preview:', assistantContent?.substring(0, 500));
      
      const parsedResponse = await parsePlotResponse(assistantContent);
      
      console.log('=== Checking parsedResponse ===');
      console.log('parsedResponse.ready:', parsedResponse.ready);
      console.log('parsedResponse.plot:', parsedResponse.plot);
      console.log('parsedResponse.plotInfo:', parsedResponse.plotInfo);
      console.log('parsedResponse.character:', parsedResponse.character);
      console.log('parsedResponse.characterInfo:', parsedResponse.characterInfo);
      console.log('parsedResponse.full:', parsedResponse);

      if (parsedResponse.ready) {
        if (parsedResponse.plot || parsedResponse.plotInfo) {
          console.log('📝 About to save plot');
          await savePlot(parsedResponse.plot || parsedResponse.plotInfo);
          console.log('✅ Plot saved successfully');
        }
        if (parsedResponse.character || parsedResponse.characterInfo) {
          console.log('📝 About to save character');
          await saveCharacter(parsedResponse.character || parsedResponse.characterInfo);
          console.log('✅ Character saved successfully');
        }
      } else {
        console.log('⚠️ parsedResponse.ready is false, skipping save');
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

  const checkTimeConflict = async (plotData) => {
    if (!plotData.startTime && !plotData.endTime) return [];
    
    try {
      const response = await axios.post(`${API_BASE}/plots/check-time-conflict`, {
        book_id: book.id,
        start_time: plotData.startTime,
        end_time: plotData.endTime
      });
      return response.data.conflicts || [];
    } catch (error) {
      console.error('Failed to check time conflict:', error);
      return [];
    }
  };

  const savePlot = async (plotData) => {
    console.log('=== savePlot called ===');
    console.log('plotData:', plotData);
    console.log('book.id:', book.id);
    
    try {
      const conflicts = await checkTimeConflict(plotData);
      if (conflicts.length > 0) {
        console.log('⚠️ Time conflicts detected:', conflicts);
        setTimeConflict({
          message: `检测到时间冲突！以下剧情与当前剧情时间重叠：`,
          conflicts: conflicts
        });
        return;
      }

      const content = {
        structure: plotData.structure,
        acts: plotData.acts || [],
        foreshadowing: plotData.foreshadowing || [],
        climax: plotData.climax || ''
      };
      
      console.log('📤 Sending plot to backend...');
      console.log('Data to send:', {
        book_id: book.id,
        title: plotData.title || '新剧情',
        content: JSON.stringify(content),
        target: plotData.target || null,
        obstacle: plotData.obstacle || null,
        reward: plotData.reward || null,
        suspense: plotData.suspense || null,
        estimated_chapters: plotData.estimatedChapters || 0,
        start_time: plotData.startTime || null,
        end_time: plotData.endTime || null,
        time_confirmed: plotData.startTime ? 1 : 0,
        order_num: plots.length
      });
      
      const response = await axios.post(`${API_BASE}/plots`, {
        book_id: book.id,
        title: plotData.title || '新剧情',
        content: JSON.stringify(content),
        target: plotData.target || null,
        obstacle: plotData.obstacle || null,
        reward: plotData.reward || null,
        suspense: plotData.suspense || null,
        estimated_chapters: plotData.estimatedChapters || 0,
        start_time: plotData.startTime || null,
        end_time: plotData.endTime || null,
        time_confirmed: plotData.startTime ? 1 : 0,
        order_num: plots.length
      });
      
      console.log('✅ Plot saved to backend');
      console.log('Response:', response.data);
      
      setLastSavedPlotId(response.data.id);
      loadPlots();
      if (onDataSaved) onDataSaved();
    } catch (error) {
      console.error('❌ Failed to save plot:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error stack:', error.stack);
      console.error('Failed to save plot:', error);
    }
  };

  const updatePlot = async (plotId, data) => {
    try {
      if (data.start_time || data.end_time) {
        const conflicts = await checkTimeConflict({ startTime: data.start_time, endTime: data.end_time });
        if (conflicts.length > 0) {
          setTimeConflict({
            message: `检测到时间冲突！以下剧情与当前剧情时间重叠：`,
            conflicts: conflicts
          });
          return;
        }
      }

      await axios.put(`${API_BASE}/plots/${plotId}`, data);
      loadPlots();
    } catch (error) {
      console.error('Failed to update plot:', error);
    }
  };

  const deletePlot = async (plotId) => {
    try {
      await axios.delete(`${API_BASE}/plots/${plotId}`);
      loadPlots();
    } catch (error) {
      console.error('Failed to delete plot:', error);
    }
  };

  const saveCharacter = async (characterData) => {
    try {
      await axios.post(`${API_BASE}/characters`, {
        book_id: book.id,
        name: characterData.name || '新角色',
        description: characterData.description,
        image: characterData.image,
        personality: characterData.personality,
        background: characterData.background
      });
      loadCharacters();
      if (onDataSaved) onDataSaved();
    } catch (error) {
      console.error('Failed to save character:', error);
    }
  };

  const updateCharacter = async (characterId, data) => {
    try {
      await axios.put(`${API_BASE}/characters/${characterId}`, data);
      loadCharacters();
    } catch (error) {
      console.error('Failed to update character:', error);
    }
  };

  const deleteCharacter = async (characterId) => {
    try {
      await axios.delete(`${API_BASE}/characters/${characterId}`);
      loadCharacters();
    } catch (error) {
      console.error('Failed to delete character:', error);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const [extractingCharacters, setExtractingCharacters] = useState(false);
  const [lastSavedPlotId, setLastSavedPlotId] = useState(null);

  const extractCharacters = async () => {
    if (!lastSavedPlotId || extractingCharacters) return;
    
    setExtractingCharacters(true);
    
    try {
      const response = await axios.get(`${API_BASE}/plots/${lastSavedPlotId}`);
      const plot = response.data;
      const plotContent = plot.content ? JSON.parse(plot.content) : {};
      const plotText = `${plot.title}\n${plot.target || ''}\n${plot.obstacle || ''}\n${plot.reward || ''}\n${plot.suspense || ''}\n${plotContent.structure || ''}\n${JSON.stringify(plotContent.acts || [], null, 2)}`;
      
      const extractorAssistants = await axios.get(`${API_BASE}/assistants`);
      const extractorAssistant = extractorAssistants.data.find(a => 
        a.type === 'character_extractor' || a.name.includes('角色提取')
      );
      
      if (!extractorAssistant) {
        alert('未找到角色提取助手');
        return;
      }
      
      const assistantConfig = JSON.parse(extractorAssistant.config || '{}');
      const modelId = assistantConfig.model || 'gpt-4';
      
      const extractResponse = await axios.post(`${API_BASE}/chat`, {
        modelId,
        messages: [
          { role: 'system', content: assistantConfig.systemPrompt },
          { role: 'user', content: plotText }
        ]
      });
      
      const extractedContent = extractResponse.data.choices?.[0]?.message?.content || '';
      let characters = [];
      try {
        characters = JSON.parse(extractedContent);
      } catch (e) {
        console.error('Failed to parse extracted characters:', e);
        alert('提取角色失败，请重试');
        return;
      }
      
      if (!Array.isArray(characters) || characters.length === 0) {
        alert('未提取到角色');
        return;
      }
      
      const saveResponse = await axios.post(`${API_BASE}/characters/batch`, {
        book_id: book.id,
        plot_id: lastSavedPlotId,
        characters: characters
      });
      
      if (saveResponse.data.success) {
        alert(`成功提取并保存 ${saveResponse.data.data.length} 个角色！`);
        loadCharacters();
      } else {
        alert('保存角色失败');
      }
    } catch (error) {
      console.error('Failed to extract characters:', error);
      alert('提取角色失败，请重试');
    } finally {
      setExtractingCharacters(false);
    }
  };

  const renderMessage = (msg, index) => {
    const displayText = msg.parsed && msg.parsed.narrative ? msg.parsed.narrative : msg.content;
    const isPlotReady = msg.parsed && msg.parsed.ready && (msg.parsed.plot || msg.parsed.plotInfo);
    
    return (
      <div key={index} className={`message ${msg.role}`}>
        <div className="message-avatar">
          {msg.role === 'user' ? '👤' : '📚'}
        </div>
        <div className="message-content">
          <div className="message-text">{displayText}</div>
          
          {isPlotReady && (
            <div className="plot-complete-container">
              <div className="plot-complete-message">✅ 剧情已经生成，可以提取角色了</div>
              <button 
                className="extract-characters-button"
                onClick={extractCharacters}
                disabled={extractingCharacters}
              >
                {extractingCharacters ? '提取中...' : '📤 提取角色'}
              </button>
            </div>
          )}
          
          {msg.role === 'assistant' && msg.parsed && msg.parsed.options && msg.parsed.options.length > 0 && !isPlotReady && (
            <div className="options-container">
              {msg.parsed.options.map((option, optIndex) => {
                const optionText = typeof option === 'object' && option !== null ? option.text : option;
                return (
                  <div key={optIndex} className="option-button-wrapper">
                    <button
                      className="option-button"
                      onClick={() => sendMessage(optionText)}
                      disabled={isLoading}
                    >
                      {optionText}
                    </button>
                    <button
                      className="option-edit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInputText(optionText);
                      }}
                      title="编辑选项内容"
                    >
                      ✏️
                    </button>
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
    <div className="chat-interface plot-chat">
      {timeConflict && (
        <div className="time-conflict-modal">
          <div className="modal-content">
            <h3>⚠️ 时间冲突警告</h3>
            <p>{timeConflict.message}</p>
            <ul>
              {timeConflict.conflicts.map((conflict, index) => (
                <li key={index}>
                  <strong>{conflict.title}</strong> (时间: {conflict.start_time} - {conflict.end_time || '未结束'})
                </li>
              ))}
            </ul>
            <button className="modal-close" onClick={() => setTimeConflict(null)}>确定</button>
          </div>
        </div>
      )}
      
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <button className="back-button" onClick={onBack}>← 返回</button>
          <h3>📚 {assistant?.name || '剧情策划'}</h3>
        </div>
        <div className="book-info">
          <h4>{book.title}</h4>
          <p className="book-author">作者: {book.author}</p>
          {(book.estimated_chapters > 0 || book.estimated_words > 0) && (
            <p className="book-stats-info">
              预计: {book.estimated_chapters} 章 / {book.estimated_words.toLocaleString()} 字
            </p>
          )}
        </div>
        <button className="new-chat-button" onClick={createNewSession}>
          + 新对话
        </button>
        <div className="sessions-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
              onClick={() => selectSession(session)}
            >
              <span className="session-title">{session.title}</span>
              <button
                className="delete-session-button"
                onClick={(e) => deleteSession(session.id, e)}
              >
                ×
              </button>
              <span className="session-date">{formatDate(session.updated_at)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 对话
            </button>
            <button
              className={`tab-button ${activeTab === 'plots' ? 'active' : ''}`}
              onClick={() => setActiveTab('plots')}
            >
              📖 剧情 ({plots.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'characters' ? 'active' : ''}`}
              onClick={() => setActiveTab('characters')}
            >
              👥 角色 ({characters.length})
            </button>
          </div>
          <div className="stream-toggle">
            <label>
              <input
                type="checkbox"
                checked={useStream}
                onChange={(e) => setUseStream(e.target.checked)}
              />
              流式输出
            </label>
          </div>
        </div>

        {activeTab === 'chat' && (
          <>
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="welcome-message">
                  <h3>开始与剧情策划助手对话</h3>
                  <p>剧情策划助手将引导您设计精彩的故事情节和人物角色</p>
                  <div className="book-reference">
                    <strong>参考书籍信息:</strong>
                    <p>书名: {book.title}</p>
                    <p>预计章节: {book.estimated_chapters || '未设置'} 章</p>
                    <p>预计字数: {book.estimated_words.toLocaleString() || '未设置'} 字</p>
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
              <button
                className="send-button"
                onClick={isLoading ? stopGeneration : () => sendMessage()}
              >
                {isLoading ? '停止' : '发送'}
              </button>
            </div>
          </>
        )}

        {activeTab === 'plots' && (
          <PlotsManager
            plots={plots}
            bookId={book.id}
            onSave={savePlot}
            onUpdate={updatePlot}
            onDelete={deletePlot}
          />
        )}

        {activeTab === 'characters' && (
          <CharactersManager
            characters={characters}
            bookId={book.id}
            onSave={saveCharacter}
            onUpdate={updateCharacter}
            onDelete={deleteCharacter}
          />
        )}
      </div>
    </div>
  );
}

function PlotsManager({ plots, bookId, onSave, onUpdate, onDelete }) {
  const [editingPlot, setEditingPlot] = useState(null);
  const [newPlot, setNewPlot] = useState({ title: '', content: '', target: '', obstacle: '', reward: '', suspense: '', estimated_chapters: 0, start_time: '', end_time: '' });
  const [showForm, setShowForm] = useState(false);

  const handleSaveNewPlot = async (e) => {
    e.preventDefault();
    if (!newPlot.title.trim()) return;
    await onSave({
      title: newPlot.title,
      content: newPlot.content,
      target: newPlot.target,
      obstacle: newPlot.obstacle,
      reward: newPlot.reward,
      suspense: newPlot.suspense,
      estimatedChapters: parseInt(newPlot.estimated_chapters) || 0,
      startTime: newPlot.start_time,
      endTime: newPlot.end_time
    });
    setNewPlot({ title: '', content: '', target: '', obstacle: '', reward: '', suspense: '', estimated_chapters: 0, start_time: '', end_time: '' });
    setShowForm(false);
  };

  const handleUpdatePlot = async (e) => {
    e.preventDefault();
    if (!editingPlot || !editingPlot.title.trim()) return;
    await onUpdate(editingPlot.id, editingPlot);
    setEditingPlot(null);
  };

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h3>剧情管理</h3>
        <button className="add-button" onClick={() => setShowForm(!showForm)}>
          + 添加剧情
        </button>
      </div>

      {showForm && (
        <form className="item-form" onSubmit={handleSaveNewPlot}>
          <input
            type="text"
            placeholder="剧情标题"
            value={newPlot.title}
            onChange={(e) => setNewPlot({ ...newPlot, title: e.target.value })}
          />
          <textarea
            placeholder="剧情内容"
            value={newPlot.content}
            onChange={(e) => setNewPlot({ ...newPlot, content: e.target.value })}
          />
          <div className="plot-factors">
            <div className="factor-item">
              <label>🎯 目标</label>
              <textarea
                placeholder="主角在这段剧情中想要达成什么"
                value={newPlot.target}
                onChange={(e) => setNewPlot({ ...newPlot, target: e.target.value })}
              />
            </div>
            <div className="factor-item">
              <label>🚧 阻碍</label>
              <textarea
                placeholder="阻止主角达成目标的障碍和冲突"
                value={newPlot.obstacle}
                onChange={(e) => setNewPlot({ ...newPlot, obstacle: e.target.value })}
              />
            </div>
            <div className="factor-item">
              <label>🎁 奖励</label>
              <textarea
                placeholder="达成目标后获得的回报"
                value={newPlot.reward}
                onChange={(e) => setNewPlot({ ...newPlot, reward: e.target.value })}
              />
            </div>
            <div className="factor-item">
              <label>❓ 悬念</label>
              <textarea
                placeholder="留下的未解之谜"
                value={newPlot.suspense}
                onChange={(e) => setNewPlot({ ...newPlot, suspense: e.target.value })}
              />
            </div>
          </div>
          <div className="plot-meta">
            <div className="meta-item">
              <label>预估章节数:</label>
              <input
                type="number"
                value={newPlot.estimated_chapters}
                onChange={(e) => setNewPlot({ ...newPlot, estimated_chapters: e.target.value })}
              />
            </div>
            <div className="meta-item">
              <label>开始时间:</label>
              <input
                type="text"
                placeholder="主角年龄或世界时间"
                value={newPlot.start_time}
                onChange={(e) => setNewPlot({ ...newPlot, start_time: e.target.value })}
              />
            </div>
            <div className="meta-item">
              <label>结束时间:</label>
              <input
                type="text"
                placeholder="主角年龄或世界时间"
                value={newPlot.end_time}
                onChange={(e) => setNewPlot({ ...newPlot, end_time: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="save-button">保存</button>
            <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </form>
      )}

      <div className="items-list">
        {plots.length === 0 ? (
          <div className="empty-state">暂无剧情</div>
        ) : (
          plots.map((plot) => (
            <div key={plot.id} className="item-card">
              {editingPlot?.id === plot.id ? (
                <form onSubmit={handleUpdatePlot}>
                  <input
                    type="text"
                    value={editingPlot.title}
                    onChange={(e) => setEditingPlot({ ...editingPlot, title: e.target.value })}
                  />
                  <textarea
                    value={editingPlot.content || ''}
                    onChange={(e) => setEditingPlot({ ...editingPlot, content: e.target.value })}
                  />
                  <div className="plot-factors">
                    <div className="factor-item">
                      <label>🎯 目标</label>
                      <textarea
                        value={editingPlot.target || ''}
                        onChange={(e) => setEditingPlot({ ...editingPlot, target: e.target.value })}
                      />
                    </div>
                    <div className="factor-item">
                      <label>🚧 阻碍</label>
                      <textarea
                        value={editingPlot.obstacle || ''}
                        onChange={(e) => setEditingPlot({ ...editingPlot, obstacle: e.target.value })}
                      />
                    </div>
                    <div className="factor-item">
                      <label>🎁 奖励</label>
                      <textarea
                        value={editingPlot.reward || ''}
                        onChange={(e) => setEditingPlot({ ...editingPlot, reward: e.target.value })}
                      />
                    </div>
                    <div className="factor-item">
                      <label>❓ 悬念</label>
                      <textarea
                        value={editingPlot.suspense || ''}
                        onChange={(e) => setEditingPlot({ ...editingPlot, suspense: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="plot-meta">
                    <div className="meta-item">
                      <label>预估章节数:</label>
                      <input
                        type="number"
                        value={editingPlot.estimated_chapters || 0}
                        onChange={(e) => setEditingPlot({ ...editingPlot, estimated_chapters: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="meta-item">
                      <label>开始时间:</label>
                      <input
                        type="text"
                        value={editingPlot.start_time || ''}
                        onChange={(e) => setEditingPlot({ ...editingPlot, start_time: e.target.value })}
                      />
                    </div>
                    <div className="meta-item">
                      <label>结束时间:</label>
                      <input
                        type="text"
                        value={editingPlot.end_time || ''}
                        onChange={(e) => setEditingPlot({ ...editingPlot, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="save-button">保存</button>
                    <button type="button" className="cancel-button" onClick={() => setEditingPlot(null)}>取消</button>
                  </div>
                </form>
              ) : (
                <>
                  <h4>{plot.title}</h4>
                  {plot.content && <p className="item-content">{plot.content}</p>}
                  
                  {(plot.target || plot.obstacle || plot.reward || plot.suspense) && (
                    <div className="plot-factors-display">
                      {plot.target && <div className="factor-display"><span className="factor-icon">🎯</span><span className="factor-label">目标:</span><span>{plot.target}</span></div>}
                      {plot.obstacle && <div className="factor-display"><span className="factor-icon">🚧</span><span className="factor-label">阻碍:</span><span>{plot.obstacle}</span></div>}
                      {plot.reward && <div className="factor-display"><span className="factor-icon">🎁</span><span className="factor-label">奖励:</span><span>{plot.reward}</span></div>}
                      {plot.suspense && <div className="factor-display"><span className="factor-icon">❓</span><span className="factor-label">悬念:</span><span>{plot.suspense}</span></div>}
                    </div>
                  )}
                  
                  {(plot.estimated_chapters > 0 || plot.start_time) && (
                    <div className="plot-meta-display">
                      {plot.estimated_chapters > 0 && (
                        <span className="meta-item">📑 预估 {plot.estimated_chapters} 章</span>
                      )}
                      {plot.start_time && (
                        <span className="meta-item">⏰ {plot.start_time} - {plot.end_time || '未结束'}</span>
                      )}
                      {plot.time_confirmed && (
                        <span className="meta-item confirmed">✓ 时间已确认</span>
                      )}
                    </div>
                  )}
                  
                  <div className="item-actions">
                    <button className="edit-button" onClick={() => setEditingPlot(plot)}>编辑</button>
                    <button className="delete-button" onClick={() => onDelete(plot.id)}>删除</button>
                  </div>
                  <div className="item-date">
                    {new Date(plot.updated_at).toLocaleDateString('zh-CN')}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CharactersManager({ characters, bookId, onSave, onUpdate, onDelete }) {
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [newCharacter, setNewCharacter] = useState({ name: '', description: '', image: '', personality: '', background: '', relationships: [], influence_scope: '本剧情', character_type: '人物' });
  const [showForm, setShowForm] = useState(false);
  const [showRelationships, setShowRelationships] = useState(null);

  const handleSaveNewCharacter = async (e) => {
    e.preventDefault();
    if (!newCharacter.name.trim()) return;
    await onSave(newCharacter);
    setNewCharacter({ name: '', description: '', image: '', personality: '', background: '', relationships: [] });
    setShowForm(false);
  };

  const handleUpdateCharacter = async (e) => {
    e.preventDefault();
    if (!editingCharacter || !editingCharacter.name.trim()) return;
    await onUpdate(editingCharacter.id, editingCharacter);
    setEditingCharacter(null);
  };

  const addRelationship = (character, targetId, type) => {
    const target = characters.find(c => c.id === targetId);
    if (!target) return;
    
    const newRelationship = {
      characterId: targetId,
      characterName: target.name,
      type: type,
      description: ''
    };
    
    const updatedCharacter = {
      ...character,
      relationships: [...(character.relationships || []), newRelationship]
    };
    
    if (editingCharacter?.id === character.id) {
      setEditingCharacter(updatedCharacter);
    } else {
      onUpdate(character.id, updatedCharacter);
    }
  };

  const removeRelationship = (character, index) => {
    const updatedRelationships = [...(character.relationships || [])];
    updatedRelationships.splice(index, 1);
    
    const updatedCharacter = {
      ...character,
      relationships: updatedRelationships
    };
    
    if (editingCharacter?.id === character.id) {
      setEditingCharacter(updatedCharacter);
    } else {
      onUpdate(character.id, updatedCharacter);
    }
  };

  const updateRelationshipDescription = (character, index, description) => {
    const updatedRelationships = [...(character.relationships || [])];
    updatedRelationships[index].description = description;
    
    const updatedCharacter = {
      ...character,
      relationships: updatedRelationships
    };
    
    if (editingCharacter?.id === character.id) {
      setEditingCharacter(updatedCharacter);
    } else {
      onUpdate(character.id, updatedCharacter);
    }
  };

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h3>角色管理</h3>
        <button className="add-button" onClick={() => setShowForm(!showForm)}>
          + 添加角色
        </button>
      </div>

      {showForm && (
        <form className="item-form" onSubmit={handleSaveNewCharacter}>
          <input
            type="text"
            placeholder="角色名称"
            value={newCharacter.name}
            onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
          />
          <textarea
            placeholder="角色简介"
            value={newCharacter.description}
            onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
          />
          <textarea
            placeholder="形象描述"
            value={newCharacter.image}
            onChange={(e) => setNewCharacter({ ...newCharacter, image: e.target.value })}
          />
          <textarea
            placeholder="性格特点"
            value={newCharacter.personality}
            onChange={(e) => setNewCharacter({ ...newCharacter, personality: e.target.value })}
          />
          <textarea
            placeholder="背景故事"
            value={newCharacter.background}
            onChange={(e) => setNewCharacter({ ...newCharacter, background: e.target.value })}
          />
          <div className="character-meta">
            <div className="meta-item">
              <label>角色类型:</label>
              <select
                value={newCharacter.character_type}
                onChange={(e) => setNewCharacter({ ...newCharacter, character_type: e.target.value })}
              >
                <option value="人物">人物</option>
                <option value="物品">物品</option>
                <option value="组织">组织</option>
              </select>
            </div>
            <div className="meta-item">
              <label>影响范围:</label>
              <select
                value={newCharacter.influence_scope}
                onChange={(e) => setNewCharacter({ ...newCharacter, influence_scope: e.target.value })}
              >
                <option value="本剧情">本剧情</option>
                <option value="整个小说">整个小说</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="save-button">保存</button>
            <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </form>
      )}

      <div className="items-list">
        {characters.length === 0 ? (
          <div className="empty-state">暂无角色</div>
        ) : (
          characters.map((character) => (
            <div key={character.id} className="item-card">
              {editingCharacter?.id === character.id ? (
                <form onSubmit={handleUpdateCharacter}>
                  <input
                    type="text"
                    value={editingCharacter.name}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  />
                  <textarea
                    placeholder="角色简介"
                    value={editingCharacter.description || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })}
                  />
                  <textarea
                    placeholder="形象描述"
                    value={editingCharacter.image || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, image: e.target.value })}
                  />
                  <textarea
                    placeholder="性格特点"
                    value={editingCharacter.personality || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, personality: e.target.value })}
                  />
                  <textarea
                    placeholder="背景故事"
                    value={editingCharacter.background || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, background: e.target.value })}
                  />
                  
                  <div className="character-meta">
                    <div className="meta-item">
                      <label>角色类型:</label>
                      <select
                        value={editingCharacter.character_type || '人物'}
                        onChange={(e) => setEditingCharacter({ ...editingCharacter, character_type: e.target.value })}
                      >
                        <option value="人物">人物</option>
                        <option value="物品">物品</option>
                        <option value="组织">组织</option>
                      </select>
                    </div>
                    <div className="meta-item">
                      <label>影响范围:</label>
                      <select
                        value={editingCharacter.influence_scope || '本剧情'}
                        onChange={(e) => setEditingCharacter({ ...editingCharacter, influence_scope: e.target.value })}
                      >
                        <option value="本剧情">本剧情</option>
                        <option value="整个小说">整个小说</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="relationships-section">
                    <h5>角色关系</h5>
                    {(editingCharacter.relationships || []).map((rel, idx) => (
                      <div key={idx} className="relationship-item">
                        <span className="relationship-type">{rel.type}</span>
                        <span className="relationship-name">{rel.characterName}</span>
                        <textarea
                          placeholder="关系描述"
                          value={rel.description || ''}
                          onChange={(e) => {
                            const updatedRels = [...(editingCharacter.relationships || [])];
                            updatedRels[idx].description = e.target.value;
                            setEditingCharacter({ ...editingCharacter, relationships: updatedRels });
                          }}
                        />
                        <button 
                          type="button"
                          className="delete-small-button"
                          onClick={() => {
                            const updatedRels = [...(editingCharacter.relationships || [])];
                            updatedRels.splice(idx, 1);
                            setEditingCharacter({ ...editingCharacter, relationships: updatedRels });
                          }}
                        >×</button>
                      </div>
                    ))}
                    
                    {characters.filter(c => c.id !== editingCharacter.id).length > 0 && (
                      <div className="add-relationship">
                        <select 
                          id={`target-${editingCharacter.id}`}
                          defaultValue=""
                        >
                          <option value="">选择角色</option>
                          {characters.filter(c => c.id !== editingCharacter.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <select 
                          id={`type-${editingCharacter.id}`}
                          defaultValue=""
                        >
                          <option value="">关系类型</option>
                          <option value="朋友">朋友</option>
                          <option value="敌人">敌人</option>
                          <option value="家人">家人</option>
                          <option value="恋人">恋人</option>
                          <option value="导师">导师</option>
                          <option value="对手">对手</option>
                          <option value="盟友">盟友</option>
                          <option value="其他">其他</option>
                        </select>
                        <button
                          type="button"
                          className="add-small-button"
                          onClick={() => {
                            const targetId = parseInt(document.getElementById(`target-${editingCharacter.id}`).value);
                            const type = document.getElementById(`type-${editingCharacter.id}`).value;
                            if (targetId && type) {
                              const target = characters.find(c => c.id === targetId);
                              const newRel = {
                                characterId: targetId,
                                characterName: target.name,
                                type: type,
                                description: ''
                              };
                              setEditingCharacter({
                                ...editingCharacter,
                                relationships: [...(editingCharacter.relationships || []), newRel]
                              });
                            }
                          }}
                        >添加</button>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="save-button">保存</button>
                    <button type="button" className="cancel-button" onClick={() => setEditingCharacter(null)}>取消</button>
                  </div>
                </form>
              ) : (
                <>
                  <h4>{character.name}</h4>
                  <div className="character-tags">
                    <span className="tag character-type">{character.character_type || '人物'}</span>
                    <span className="tag influence-scope">{character.influence_scope || '本剧情'}</span>
                  </div>
                  {character.description && <p className="item-content">{character.description}</p>}
                  {character.personality && (
                    <div className="item-detail">
                      <strong>性格:</strong> {character.personality}
                    </div>
                  )}
                  {character.background && (
                    <div className="item-detail">
                      <strong>背景:</strong> {character.background}
                    </div>
                  )}
                  
                  {character.relationships && character.relationships.length > 0 && (
                    <div className="relationships-display">
                      <strong>关系:</strong>
                      <div className="relationships-list">
                        {character.relationships.map((rel, idx) => (
                          <div key={idx} className="relationship-tag">
                            <span className="rel-type">{rel.type}</span>
                            <span className="rel-name">{rel.characterName}</span>
                            {rel.description && <span className="rel-desc">: {rel.description}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="item-actions">
                    <button className="edit-button" onClick={() => setEditingCharacter(character)}>编辑</button>
                    <button className="delete-button" onClick={() => onDelete(character.id)}>删除</button>
                  </div>
                  <div className="item-date">
                    {new Date(character.updated_at).toLocaleDateString('zh-CN')}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PlotPlanningPage;