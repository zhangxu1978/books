import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import EditorChatInterface from '../components/EditorChatInterface';

const API_BASE = '/api';

function EditorWorkflow() {
  const [books, setBooks] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

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
      
      // 只显示主编和自定义助手
      const editorAssistants = assistantsRes.data.filter(a => 
        a.type === 'editor_in_chief' || a.name.includes('主编') || a.type === 'custom'
      );
      
      // 排序：自定义助手排在下面
      const sortedAssistants = [...(editorAssistants.length > 0 ? editorAssistants : [])].sort((a, b) => {
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
        allAssistants={assistants}
        bookId={selectedBook?.id}
        onBack={handleBack}
        onWorldviewSaved={handleWorldviewSaved}
        onAssistantChange={(newAssistant) => {
          setSelectedAssistant(newAssistant);
        }}
      />
    );
  }

  return (
    <div className="editor-workflow">
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
