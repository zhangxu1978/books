import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

function CharacterChatInterface({ assistant, onBack, onCharacterSaved, bookId }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useStream, setUseStream] = useState(false);
  const [characterInfo, setCharacterInfo] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (assistant) {
      loadSessions();
    }
  }, [assistant]);

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
        title: '角色策划新对话',
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
      console.error('Failed to parse response:', error);
      return { text: responseText, options: [], characterInfo: null, ready: false };
    }
  };

  const saveCharacter = async (charData) => {
    try {
      const data = { ...charData };
      if (bookId) data.book_id = bookId;
      const response = await axios.post(`${API_BASE}/novel-workflow/save-character`, data);
      if (response.data.success) {
        setCharacterInfo(response.data.character);
        if (onCharacterSaved) {
          onCharacterSaved(response.data);
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to save character:', error);
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
      
      if (parsedResponse.characterReady && parsedResponse.characterInfo) {
        await saveCharacter(parsedResponse.characterInfo);
        setShowPreview(true);
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
    return (
      <div key={index} className={`message ${msg.role}`}>
        <div className="message-avatar">
          {msg.role === 'user' ? '👤' : '🎭'}
        </div>
        <div className="message-content">
          <div className="message-text">{msg.content}</div>
          {msg.role === 'assistant' && msg.parsed && msg.parsed.options && msg.parsed.options.length > 0 && (
            <div className="options-container">
              {msg.parsed.options.map((option, optIndex) => (
                <button
                  key={optIndex}
                  className="option-button"
                  onClick={() => sendMessage(option.text)}
                  disabled={isLoading}
                >
                  {option.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCharacterPreview = () => {
    if (!characterInfo) return null;
    
    return (
      <div className="world-preview">
        <h3>🎭 角色预览</h3>
        <div className="preview-section">
          <h4>基本信息</h4>
          <p><strong>姓名:</strong> {characterInfo.name}</p>
          {characterInfo.description && <p><strong>简介:</strong> {characterInfo.description}</p>}
        </div>
        {characterInfo.appearance && (
          <div className="preview-section">
            <h4>外貌</h4>
            <p>{characterInfo.appearance}</p>
          </div>
        )}
        {characterInfo.personality && (
          <div className="preview-section">
            <h4>性格</h4>
            <p>{characterInfo.personality}</p>
          </div>
        )}
        {characterInfo.background && (
          <div className="preview-section">
            <h4>背景</h4>
            <p>{characterInfo.background}</p>
          </div>
        )}
        {characterInfo.motivation && (
          <div className="preview-section">
            <h4>核心动机</h4>
            <p>{characterInfo.motivation}</p>
          </div>
        )}
        {characterInfo.arc && (
          <div className="preview-section">
            <h4>成长弧线</h4>
            <p>{characterInfo.arc}</p>
          </div>
        )}
        {characterInfo.goals && (
          <div className="preview-section">
            <h4>目标</h4>
            <p>{characterInfo.goals}</p>
          </div>
        )}
        {characterInfo.fears && (
          <div className="preview-section">
            <h4>恐惧</h4>
            <p>{characterInfo.fears}</p>
          </div>
        )}
        {characterInfo.strengths && (
          <div className="preview-section">
            <h4>优点</h4>
            <p>{characterInfo.strengths}</p>
          </div>
        )}
        {characterInfo.weaknesses && (
          <div className="preview-section">
            <h4>缺点</h4>
            <p>{characterInfo.weaknesses}</p>
          </div>
        )}
        {characterInfo.relationships && Array.isArray(characterInfo.relationships) && characterInfo.relationships.length > 0 && (
          <div className="preview-section">
            <h4>关系</h4>
            <ul>
              {characterInfo.relationships.map((rel, idx) => (
                <li key={idx}>{rel}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-interface editor-chat">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <button className="back-button" onClick={onBack}>← 返回</button>
          <h3>🎭 {assistant?.name || '角色策划'}</h3>
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
          <h2>🎭 {assistant?.name || '角色策划'}</h2>
          {characterInfo && (
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

        {showPreview && characterInfo && (
          <div className="preview-panel">
            {renderCharacterPreview()}
          </div>
        )}

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h3>开始与角色策划对话</h3>
              <p>角色策划将帮您设计和完善小说中的人物</p>
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

export default CharacterChatInterface;
