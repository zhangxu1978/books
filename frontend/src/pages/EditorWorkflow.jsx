import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import EditorChatInterface from '../components/EditorChatInterface';

const API_BASE = 'http://localhost:3001/api';

function EditorWorkflow() {
  const [books, setBooks] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  const workflowSteps = [
    { 
      title: '主编规划',
      path: '/editor-workflow',
      active: true,
      completed: true,
      icon: '📖'
    },
    { 
      title: '剧情策划',
      path: '/plot-planning',
      active: false,
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
      
      const editorAssistants = assistantsRes.data.filter(a => 
        a.type === 'editor' || a.name.includes('主编')
      );
      setAssistants(editorAssistants.length > 0 ? editorAssistants : assistantsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewBook = () => {
    if (assistants.length > 0) {
      setSelectedAssistant(assistants[0]);
      setSelectedBook(null);
      setShowChat(true);
    }
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    if (assistants.length > 0) {
      setSelectedAssistant(assistants[0]);
      setShowChat(true);
    }
  };

  const handleWorldviewSaved = (data) => {
    setSuccessMessage('世界观保存成功！');
    setTimeout(() => setSuccessMessage(''), 3000);
    loadData();
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedBook(null);
    setSelectedAssistant(null);
  };

  if (loading) {
    return (
      <div className="editor-workflow">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (showChat && selectedAssistant) {
    return (
      <EditorChatInterface
        assistant={selectedAssistant}
        bookId={selectedBook?.id}
        onBack={handleBack}
        onWorldviewSaved={handleWorldviewSaved}
      />
    );
  }

  return (
    <div className="editor-workflow">
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
        <h1>📖 主编工作流</h1>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <div className="workflow-intro">
        <h2>世界观规划</h2>
        <p>让主编引导您构思小说的世界观、故事线和基本设定</p>
      </div>

      <div className="workflow-actions">
        <button className="primary-button" onClick={handleStartNewBook}>
          📝 开始创作新小说
        </button>
        <Link to="/character-planning" className="secondary-button">
          🎭 进入角色策划
        </Link>
        <Link to="/plot-planning" className="secondary-button">
          📚 进入剧情策划
        </Link>
        <Link to="/writer-workspace" className="secondary-button">
          ✍️ 进入写手创作
        </Link>
      </div>

      {books.length > 0 && (
        <div className="books-section">
          <h3>选择已有小说继续创作</h3>
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
                <div className="book-date">
                  更新于: {new Date(book.updated_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {assistants.length === 0 && (
        <div className="warning-message">
          <p>没有找到主编助手，请先在助手管理中创建一个主编助手</p>
          <Link to="/assistants" className="button-link">
            去创建助手 →
          </Link>
        </div>
      )}
    </div>
  );
}

export default EditorWorkflow;
