import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = '/api';

function ChatInterface({ assistant, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useStream, setUseStream] = useState(false);
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
      const response = await axios.get(`${API_BASE}/conversations/sessions`, {
        params: { assistant_id: assistant.id }
      });
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
      const response = await axios.post(`${API_BASE}/conversations/sessions`, {
        title: '新对话',
        assistant_id: assistant.id
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

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    let sessionId = currentSession?.id;
    if (!sessionId) {
      try {
        const response = await axios.post(`${API_BASE}/conversations/sessions`, {
          title: inputText.substring(0, 30) + (inputText.length > 30 ? '...' : ''),
          assistant_id: assistant.id
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

    const userMessage = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    const assistantConfig = JSON.parse(assistant.config || '{}');
    const modelId = assistantConfig.model || assistantConfig.modelId || 'gpt-4';

    const messagesForAI = [...messages, userMessage];
    if (assistantConfig.systemPrompt) {
      messagesForAI.unshift({ role: 'system', content: assistantConfig.systemPrompt });
    }

    try {
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
        let assistantContent = '';
        
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

        await saveMessage(sessionId, 'user', userMessage.content);
        await saveMessage(sessionId, 'assistant', assistantContent);
      } else {
        const response = await axios.post(`${API_BASE}/chat`, {
          modelId,
          messages: messagesForAI
        });
        
        const assistantContent = response.data.choices?.[0]?.message?.content || '';
        const assistantMessage = { role: 'assistant', content: assistantContent };
        
        setMessages(prev => [...prev, assistantMessage]);
        await saveMessage(sessionId, 'user', userMessage.content);
        await saveMessage(sessionId, 'assistant', assistantContent);
      }

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

  return (
    <div className="chat-interface">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <button className="back-button" onClick={onBack}>← 返回</button>
          <h3>{assistant?.name || 'AI 助手'}</h3>
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
          <h2>{assistant?.name || 'AI 助手'}</h2>
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

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h3>开始与 {assistant?.name || 'AI 助手'} 对话</h3>
              <p>发送消息开始聊天</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  {msg.content}
                </div>
              </div>
            ))
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
      </div>
    </div>
  );
}

export default ChatInterface;
