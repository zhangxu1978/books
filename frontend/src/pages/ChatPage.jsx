import { useState, useEffect } from 'react';
import axios from 'axios';
import ChatInterface from '../components/ChatInterface';
import MultiChatInterface from '../components/MultiChatInterface';

const API_BASE = 'http://localhost:3022/api';

function ChatPage() {
  const [assistants, setAssistants] = useState([]);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [mode, setMode] = useState('select');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssistants();
  }, []);

  const loadAssistants = async () => {
    try {
      const response = await axios.get(`${API_BASE}/assistants`);
      setAssistants(response.data);
    } catch (error) {
      console.error('Failed to load assistants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssistant = (assistant) => {
    setSelectedAssistant(assistant);
    setMode('single');
  };

  const handleMultiMode = () => {
    setMode('multi');
  };

  const handleBack = () => {
    setMode('select');
    setSelectedAssistant(null);
  };

  if (loading) {
    return (
      <div className="chat-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (mode === 'single' && selectedAssistant) {
    return (
      <ChatInterface
        assistant={selectedAssistant}
        onBack={handleBack}
      />
    );
  }

  if (mode === 'multi') {
    return (
      <MultiChatInterface
        assistants={assistants}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="chat-page">
      <div className="assistant-selector">
        <h1>选择对话模式</h1>
        <div className="mode-selector">
          <div className="mode-card" onClick={handleMultiMode}>
            <div className="mode-icon">👥</div>
            <h3>分身模式</h3>
            <p>同时与多个助手对话，对比回复</p>
            <button className="start-chat-button">开始分身对话</button>
          </div>
          <div className="mode-divider">
            <span>或</span>
          </div>
        </div>
        <h2>选择单个助手</h2>
        <div className="assistants-grid">
          {assistants.length === 0 ? (
          <div className="no-assistants">
            <p>还没有创建助手</p>
            <p>请到助手管理页面创建助手</p>
          </div>
        ) : (
          assistants.map(assistant => (
            <div
              key={assistant.id}
              className="assistant-card"
              onClick={() => handleSelectAssistant(assistant)}
            >
              <div className="assistant-icon">🤖</div>
              <h3>{assistant.name}</h3>
              <p className="assistant-type">{assistant.type}</p>
              <button className="start-chat-button">开始对话</button>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
