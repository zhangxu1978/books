import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:3001/api';

function EditorChatInterface({ assistant, onBack, onWorldviewSaved, bookId }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useStream, setUseStream] = useState(false);
  const [worldInfo, setWorldInfo] = useState(null);
  const [storylines, setStorylines] = useState(null);
  const [outlineInfo, setOutlineInfo] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState('world');
  const [successTip, setSuccessTip] = useState('');  // 用于显示成功提示
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (assistant) {
      loadSessions();
    }
  }, [assistant]);

  useEffect(() => {
    if (bookId) {
      loadExistingData(bookId);
    }
  }, [bookId]);

  const loadExistingData = async (currentBookId) => {
    try {
      const [worldsRes, outlinesRes] = await Promise.all([
        axios.get(`${API_BASE}/worlds/book/${currentBookId}`),
        axios.get(`${API_BASE}/outlines/book/${currentBookId}`)
      ]);
      
      if (worldsRes.data && worldsRes.data.length > 0) {
        setWorldInfo(worldsRes.data[0]);
        if (worldsRes.data[0].storylines) {
          setStorylines(worldsRes.data[0].storylines);
        }
      }
      
      if (outlinesRes.data && outlinesRes.data.length > 0) {
        setOutlineInfo(outlinesRes.data[0]);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
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
      const params = { assistant_id: assistant.id };
      if (bookId) params.book_id = bookId;
      const response = await axios.get(`${API_BASE}/conversations/sessions`, { params });
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE}/conversations/sessions/${sessionId}/messages`);
      const loadedMessages = response.data;
      
      // 对每个助手消息进行解析
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
      const data = {
        title: '主编新对话',
        assistant_id: assistant.id
      };
      if (bookId) data.book_id = bookId;
      const response = await axios.post(`${API_BASE}/conversations/sessions`, data);
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

  const parseEditorResponse = async (responseText) => {
    try {
      const response = await axios.post(`${API_BASE}/novel-workflow/parse`, {
        response: responseText
      });
      return response.data;
    } catch (error) {
      console.error('Failed to parse editor response:', error);
      return { text: responseText, options: [], worldInfo: null, ready: false };
    }
  };

  const saveWorldview = async (worldData) => {
    try {
      const data = { ...worldData, session_id: currentSession?.id };
      if (bookId) data.book_id = bookId;
      const response = await axios.post(`${API_BASE}/novel-workflow/save-worldview`, data);
      if (response.data.success) {
        setWorldInfo(response.data.world);
        if (onWorldviewSaved) {
          onWorldviewSaved(response.data);
        }
        return response.data;
      }
    } catch (error) {
      console.error('Failed to save worldview:', error);
    }
    return false;
  };

  const saveStorylines = async (storylinesData, currentBookId) => {
    try {
      const data = { ...storylinesData, book_id: currentBookId || bookId };
      const response = await axios.post(`${API_BASE}/novel-workflow/save-storylines`, data);
      if (response.data.success) {
        setStorylines(response.data.storylines);
        return true;
      }
    } catch (error) {
      console.error('Failed to save storylines:', error);
    }
    return false;
  };

  const saveOutline = async (outlineData, currentBookId) => {
    try {
      const data = { ...outlineData, book_id: currentBookId || bookId };
      const response = await axios.post(`${API_BASE}/novel-workflow/save-outline`, data);
      if (response.data.success) {
        setOutlineInfo(response.data.outline);
        return true;
      }
    } catch (error) {
      console.error('Failed to save outline:', error);
    }
    return false;
  };

  const sendMessage = async (text = null) => {
    // 确保 messageText 是字符串
    let messageText = text || inputText;
    if (typeof messageText === 'object' && messageText !== null) {
      // 如果是对象，尝试提取 text 属性
      messageText = messageText.text || messageText.content || JSON.stringify(messageText);
    }
    // 确保是字符串后再调用 trim()
    if (!messageText || !String(messageText).trim() || isLoading) return;

    // 确保 messageText 是字符串类型
    const safeMessageText = String(messageText);
    
    let sessionId = currentSession?.id;
    if (!sessionId) {
      try {
        const data = {
          title: safeMessageText.substring(0, 30) + (safeMessageText.length > 30 ? '...' : ''),
          assistant_id: assistant.id
        };
        if (bookId) data.book_id = bookId;
        const response = await axios.post(`${API_BASE}/conversations/sessions`, data);
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
      messagesForAI.unshift({ role: 'system', content: assistantConfig.systemPrompt });
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

      const parsedResponse = await parseEditorResponse(assistantContent);
      console.log('Parsed response:', parsedResponse);
      
      let currentBookId = bookId;
      
      if (parsedResponse.ready && parsedResponse.worldInfo) {
        console.log('Saving worldview with data:', parsedResponse.worldInfo);
        const saveResult = await saveWorldview(parsedResponse.worldInfo);
        console.log('Save result:', saveResult);
        if (saveResult && saveResult.book) {
          currentBookId = saveResult.book.id;
        }
        setShowPreview(true);
        setSuccessTip('🎉 世界观构建完成！');
        setTimeout(() => {
          setSuccessTip('📚 请进入「剧情策划」继续完善故事线...');
        }, 2000);
      }

      if (parsedResponse.storylinesReady && parsedResponse.storylines) {
        await saveStorylines({ storylines: parsedResponse.storylines }, currentBookId);
        setPreviewMode('storylines');
      }

      if (parsedResponse.outlineReady && parsedResponse.outlineInfo) {
        await saveOutline(parsedResponse.outlineInfo, currentBookId);
        setPreviewMode('outline');
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

  const renderMessage = (msg, index) => {
    // 如果有解析的JSON，使用narrative作为显示文本
    const displayText = msg.parsed && msg.parsed.narrative ? msg.parsed.narrative : msg.content;
    
    return (
      <div key={index} className={`message ${msg.role}`}>
        <div className="message-avatar">
          {msg.role === 'user' ? '👤' : '🤖'}
        </div>
        <div className="message-content">
          <div className="message-text">{displayText}</div>
          {msg.role === 'assistant' && msg.parsed && msg.parsed.options && msg.parsed.options.length > 0 && (
            <div className="options-container">
              {msg.parsed.options.map((option, optIndex) => {
                // 支持两种格式：字符串数组 或 对象数组 {id, text}
                const optionText = typeof option === 'object' && option !== null ? option.text : option;
                return (
                  <button
                    key={optIndex}
                    className="option-button"
                    onClick={() => sendMessage(optionText)}
                    disabled={isLoading}
                  >
                    {optionText}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWorldPreview = () => {
    if (!worldInfo) return null;
    
    return (
      <div className="world-preview">
        <h3>世界观预览</h3>
        <div className="preview-section">
          <h4>基本信息</h4>
          <p><strong>书名:</strong> {worldInfo.book_name}</p>
          <p><strong>作者:</strong> {worldInfo.player_name}</p>
          <p><strong>叙事模式:</strong> {worldInfo.narrative_mode}</p>
          <p><strong>世界名称:</strong> {worldInfo.world_name}</p>
          <p><strong>世界类型:</strong> {worldInfo.world_type}</p>
        </div>
        {worldInfo.world_desc && (
          <div className="preview-section">
            <h4>世界描述</h4>
            <p>{worldInfo.world_desc}</p>
          </div>
        )}
        {worldInfo.atmosphere && (
          <div className="preview-section">
            <h4>氛围</h4>
            <p>{worldInfo.atmosphere}</p>
          </div>
        )}
        {worldInfo.power_system && (
          <div className="preview-section">
            <h4>力量体系</h4>
            <p>{worldInfo.power_system}</p>
          </div>
        )}
        {worldInfo.society_structure && (
          <div className="preview-section">
            <h4>社会结构</h4>
            <p>{worldInfo.society_structure}</p>
          </div>
        )}
        {worldInfo.special_element && (
          <div className="preview-section">
            <h4>特殊元素</h4>
            <p>{worldInfo.special_element}</p>
          </div>
        )}
        {worldInfo.player_background && (
          <div className="preview-section">
            <h4>主角背景</h4>
            <p>{worldInfo.player_background}</p>
          </div>
        )}
      </div>
    );
  };

  const renderStorylinesPreview = () => {
    if (!storylines) return null;
    
    let storylinesData = storylines;
    if (typeof storylines === 'string') {
      try {
        storylinesData = JSON.parse(storylines);
      } catch (e) {
        return <p>{storylines}</p>;
      }
    }
    
    return (
      <div className="storylines-preview">
        <h3>故事线预览</h3>
        {storylinesData.mainPlot && (
          <div className="preview-section">
            <h4>🎯 明线（主线剧情）</h4>
            <p>{storylinesData.mainPlot}</p>
          </div>
        )}
        {storylinesData.subPlot && (
          <div className="preview-section">
            <h4>🔮 暗线（隐藏剧情）</h4>
            <p>{storylinesData.subPlot}</p>
          </div>
        )}
        {storylinesData.romancePlot && (
          <div className="preview-section">
            <h4>💕 感情线</h4>
            <p>{storylinesData.romancePlot}</p>
          </div>
        )}
      </div>
    );
  };

  const renderOutlinePreview = () => {
    if (!outlineInfo) return null;
    
    let outlineData;
    if (outlineInfo.content) {
      try {
        outlineData = JSON.parse(outlineInfo.content);
      } catch (e) {
        outlineData = outlineInfo;
      }
    } else {
      outlineData = outlineInfo;
    }
    
    return (
      <div className="outline-preview">
        <h3>大纲预览</h3>
        {outlineData.title && (
          <div className="preview-section">
            <h4>📖 {outlineData.title}</h4>
          </div>
        )}
        {outlineData.summary && (
          <div className="preview-section">
            <h4>内容概要</h4>
            <p>{outlineData.summary}</p>
          </div>
        )}
        {outlineData.chapters && outlineData.chapters.length > 0 && (
          <div className="preview-section">
            <h4>📚 章节规划</h4>
            <div className="chapters-list">
              {outlineData.chapters.map((chapter, index) => (
                <div key={index} className="chapter-item">
                  <strong>第{chapter.number || index + 1}章: {chapter.title}</strong>
                  {chapter.content && <p>{chapter.content}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    if (!showPreview) return null;
    
    return (
      <div className="preview-panel">
        <div className="preview-tabs">
          {worldInfo && (
            <button 
              className={`preview-tab ${previewMode === 'world' ? 'active' : ''}`}
              onClick={() => setPreviewMode('world')}
            >
              世界观
            </button>
          )}
          {storylines && (
            <button 
              className={`preview-tab ${previewMode === 'storylines' ? 'active' : ''}`}
              onClick={() => setPreviewMode('storylines')}
            >
              故事线
            </button>
          )}
          {outlineInfo && (
            <button 
              className={`preview-tab ${previewMode === 'outline' ? 'active' : ''}`}
              onClick={() => setPreviewMode('outline')}
            >
              大纲
            </button>
          )}
        </div>
        {previewMode === 'world' && renderWorldPreview()}
        {previewMode === 'storylines' && renderStorylinesPreview()}
        {previewMode === 'outline' && renderOutlinePreview()}
      </div>
    );
  };

  return (
    <div className="chat-interface editor-chat">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <button className="back-button" onClick={onBack}>← 返回</button>
          <h3>📖 {assistant?.name || '主编'}</h3>
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
          <h2>📖 {assistant?.name || '主编'}</h2>
          {worldInfo && (
            <button 
              className="preview-toggle-button" 
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '隐藏预览' : '显示预览'}
            </button>
          )}
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

        {showPreview && (worldInfo || storylines || outlineInfo) && renderPreview()}

        {successTip && (
          <div className="success-tip-container">
            <div className="success-tip">{successTip}</div>
            <Link to="/plot-planning" className="next-step-link">进入剧情策划 →</Link>
          </div>
        )}

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h3>开始与主编对话</h3>
              <p>主编将引导您规划小说的世界观和故事线</p>
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
            onClick={isLoading ? stopGeneration : sendMessage}
          >
            {isLoading ? '停止' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditorChatInterface;
