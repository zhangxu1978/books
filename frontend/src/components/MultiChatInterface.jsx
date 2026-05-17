import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3022/api';

function MultiChatInterface({ assistants, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sharedMessages, setSharedMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [useStream, setUseStream] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [assistantClones, setAssistantClones] = useState([]);
  const [loadingStates, setLoadingStates] = useState({});
  const messagesEndRef = useRef({});

  useEffect(() => {
    loadModels();
    loadSessions();
  }, []);

  useEffect(() => {
    if (assistantClones.length === 0 && assistants.length > 0) {
      setAssistantClones([{ id: 0, assistant: assistants[0], model: null }]);
    }
  }, [assistants]);

  const loadModels = async () => {
    try {
      const response = await axios.get(`${API_BASE}/models`);
      setAvailableModels(response.data.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/conversations/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE}/conversations/sessions/${sessionId}/messages`);
      setSharedMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const selectSession = async (session) => {
    setCurrentSession(session);
    await loadSessionMessages(session.id);
  };



  const addClone = () => {
    const newId = Math.max(...assistantClones.map(c => c.id), 0) + 1;
    const defaultAssistant = assistants[0];
    setAssistantClones([
      ...assistantClones,
      { id: newId, assistant: defaultAssistant, model: null }
    ]);
  };

  const removeClone = (cloneId) => {
    if (assistantClones.length > 1) {
      setAssistantClones(assistantClones.filter(c => c.id !== cloneId));
    }
  };

  const updateCloneAssistant = (cloneId, assistantId) => {
    const assistant = assistants.find(a => a.id === Number(assistantId));
    if (assistant) {
      setAssistantClones(assistantClones.map(c => 
        c.id === cloneId ? { ...c, assistant } : c
      ));
    }
  };

  const updateCloneModel = (cloneId, modelId) => {
    setAssistantClones(assistantClones.map(c => 
      c.id === cloneId ? { ...c, model: modelId } : c
    ));
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
    if (!inputText.trim() || assistantClones.length === 0) return;

    let sessionId = currentSession?.id;
    if (!sessionId) {
      try {
        if (assistants.length > 0) {
          const response = await axios.post(`${API_BASE}/conversations/sessions`, {
            title: inputText.substring(0, 30) + (inputText.length > 30 ? '...' : ''),
            assistant_id: assistants[0].id
          });
          const newSession = response.data;
          setSessions([newSession, ...sessions]);
          setCurrentSession(newSession);
          sessionId = newSession.id;
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }

    const userMessage = { role: 'user', content: inputText };
    setSharedMessages(prev => [...prev, userMessage]);
    setInputText('');

    const messagesForAI = [...sharedMessages, userMessage];

    const newLoadingStates = {};
    const newAssistantResponses = {};
    assistantClones.forEach(clone => {
      newLoadingStates[clone.id] = true;
      newAssistantResponses[clone.id] = { role: 'assistant', content: '' };
    });
    setLoadingStates(newLoadingStates);
    setSharedMessages(prev => [...prev, ...Object.values(newAssistantResponses).map((msg, i) => ({ ...msg, assistantId: assistantClones[i].id }))]);

    assistantClones.forEach(async (clone, index) => {
      try {
        const assistantConfig = JSON.parse(clone.assistant.config || '{}');
        const modelId = clone.model || assistantConfig.model || 'gpt-4';

        const aiMessages = [...messagesForAI];
        if (assistantConfig.systemPrompt) {
          aiMessages.unshift({ role: 'system', content: assistantConfig.systemPrompt });
        }

        if (useStream) {
          const response = await fetch(`${API_BASE}/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelId,
              messages: aiMessages
            })
          });

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantContent = '';

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
                  setSharedMessages(prev => {
                    const newMessages = [...prev];
                    const messageIndex = newMessages.findIndex((m, i) => i > messagesForAI.length - 1 && m.assistantId === clone.id);
                    if (messageIndex !== -1) {
                      newMessages[messageIndex] = { ...newMessages[messageIndex], content: assistantContent };
                    }
                    return newMessages;
                  });
                } catch (e) {}
              }
            }
          }

          if (index === 0) {
            await saveMessage(sessionId, 'user', userMessage.content);
            await saveMessage(sessionId, 'assistant', assistantContent);
          }
        } else {
          const response = await axios.post(`${API_BASE}/chat`, {
            modelId,
            messages: aiMessages
          });
          
          const assistantContent = response.data.choices?.[0]?.message?.content || '';
          
          setSharedMessages(prev => {
            const newMessages = [...prev];
            const messageIndex = newMessages.findIndex((m, i) => i > messagesForAI.length - 1 && m.assistantId === clone.id);
            if (messageIndex !== -1) {
              newMessages[messageIndex] = { ...newMessages[messageIndex], content: assistantContent };
            }
            return newMessages;
          });

          if (index === 0) {
            await saveMessage(sessionId, 'user', userMessage.content);
            await saveMessage(sessionId, 'assistant', assistantContent);
          }
        }
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setLoadingStates(prev => ({ ...prev, [clone.id]: false }));
      }
    });

    loadSessions();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getAssistantMessages = (assistantId) => {
    return sharedMessages.filter(msg => !msg.assistantId || msg.assistantId === assistantId);
  };

  return (
    <div className="multi-chat-interface">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <button className="back-button" onClick={onBack}>← 返回</button>
          <h3>分身对话模式</h3>
        </div>

        <div className="sessions-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
              onClick={() => selectSession(session)}
            >
              <span className="session-title">{session.title}</span>
              <span className="session-date">{formatDate(session.updated_at)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="multi-chat-main">
        <div className="multi-chat-header">
          <h2>助手分身对比</h2>
          <div className="header-controls">
            <label className="stream-toggle">
              <input
                type="checkbox"
                checked={useStream}
                onChange={(e) => setUseStream(e.target.checked)}
              />
              流式输出
            </label>
            <button className="add-clone-button" onClick={addClone}>
              + 添加分身
            </button>
          </div>
        </div>

        <div className="clones-container">
          {assistantClones.map((clone) => (
            <div key={clone.id} className="clone-panel">
              <div className="clone-header">
                <div className="clone-info">
                  <select 
                    className="assistant-select"
                    value={clone.assistant.id}
                    onChange={(e) => updateCloneAssistant(clone.id, e.target.value)}
                  >
                    {assistants.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <select 
                    className="model-select"
                    value={clone.model || ''}
                    onChange={(e) => updateCloneModel(clone.id, e.target.value || null)}
                  >
                    <option value="">默认模型</option>
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                {assistantClones.length > 1 && (
                  <button 
                    className="remove-clone-button"
                    onClick={() => removeClone(clone.id)}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="clone-messages" ref={el => messagesEndRef.current[clone.id] = el}>
                {sharedMessages.length === 0 ? (
                  <div className="welcome-message">
                    <h3>开始对话</h3>
                    <p>发送消息让分身们回复</p>
                  </div>
                ) : (
                  sharedMessages.map((msg, index) => {
                    if (msg.role === 'user' || msg.assistantId === clone.id) {
                      return (
                        <div 
                          key={index} 
                          className={`message ${msg.role}`}
                        >
                          <div className="message-avatar">
                            {msg.role === 'user' ? '👤' : '🤖'}
                          </div>
                          <div className="message-content">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="input-area">
          <textarea
            className="chat-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入消息，所有分身都会回复..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={Object.values(loadingStates).some(v => v)}
          />
          <button
            className="send-button"
            onClick={() => sendMessage()}
            disabled={Object.values(loadingStates).some(v => v)}
          >
            {Object.values(loadingStates).some(v => v) ? '回复中...' : '发送给所有分身'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MultiChatInterface;
