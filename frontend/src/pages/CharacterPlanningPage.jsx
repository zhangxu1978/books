import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import CharacterChatInterface from '../components/CharacterChatInterface';

const API_BASE = 'http://localhost:3001/api';

function CharacterPlanningPage() {
  const [books, setBooks] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [characters, setCharacters] = useState([]);
  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);

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
      
      // 只显示角色策划和自定义助手
      const charAssistants = assistantsRes.data.filter(a => 
        a.type === 'character_planner' || a.name.includes('角色') || a.type === 'custom'
      );
      
      // 排序：自定义助手排在下面
      const sortedAssistants = [...(charAssistants.length > 0 ? charAssistants : [])].sort((a, b) => {
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

  const loadCharacters = async (bookId) => {
    try {
      const response = await axios.get(`${API_BASE}/characters/book/${bookId}`);
      setCharacters(response.data);
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const handleStartNew = () => {
    if (assistants.length > 0) {
      setSelectedAssistant(assistants[0]);
      setSelectedBook(null);
      setShowChat(true);
    }
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    loadCharacters(book.id);
    if (assistants.length > 0) {
      setSelectedAssistant(assistants[0]);
      setShowChat(true);
    }
  };

  const handleCharacterSaved = (data) => {
    setSuccessMessage('角色保存成功！');
    setTimeout(() => setSuccessMessage(''), 3000);
    if (selectedBook) {
      loadCharacters(selectedBook.id);
    }
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedBook(null);
    setSelectedAssistant(null);
    setShowCharacterEditor(false);
    setEditingCharacter(null);
  };

  const handleEditCharacter = (character) => {
    setEditingCharacter({ ...character });
    setShowCharacterEditor(true);
  };

  const handleDeleteCharacter = async (characterId) => {
    if (!confirm('确定要删除这个角色吗？')) return;
    try {
      await axios.delete(`${API_BASE}/characters/${characterId}`);
      setSuccessMessage('角色删除成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
      if (selectedBook) {
        loadCharacters(selectedBook.id);
      }
    } catch (error) {
      console.error('Failed to delete character:', error);
    }
  };

  const handleSaveCharacterEdit = async () => {
    try {
      await axios.put(`${API_BASE}/characters/${editingCharacter.id}`, editingCharacter);
      setSuccessMessage('角色更新成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowCharacterEditor(false);
      setEditingCharacter(null);
      if (selectedBook) {
        loadCharacters(selectedBook.id);
      }
    } catch (error) {
      console.error('Failed to update character:', error);
    }
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
      <CharacterChatInterface
        assistant={selectedAssistant}
        allAssistants={assistants}
        bookId={selectedBook?.id}
        onBack={handleBack}
        onCharacterSaved={handleCharacterSaved}
        onAssistantChange={(newAssistant) => {
          setSelectedAssistant(newAssistant);
        }}
      />
    );
  }

  if (showCharacterEditor && editingCharacter) {
    return (
      <div className="editor-workflow">
        <div className="page-header">
          <h2>🎭 编辑角色</h2>
          <button className="back-button" onClick={handleBack}>← 返回</button>
        </div>
        <div className="character-editor">
          <div className="form-group">
            <label>姓名</label>
            <input
              type="text"
              value={editingCharacter.name || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>简介</label>
            <textarea
              value={editingCharacter.description || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>外貌</label>
            <textarea
              value={editingCharacter.appearance || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, appearance: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>性格</label>
            <textarea
              value={editingCharacter.personality || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, personality: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>背景</label>
            <textarea
              value={editingCharacter.background || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, background: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>核心动机</label>
            <textarea
              value={editingCharacter.motivation || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, motivation: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>成长弧线</label>
            <textarea
              value={editingCharacter.arc || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, arc: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>目标</label>
            <textarea
              value={editingCharacter.goals || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, goals: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>恐惧</label>
            <textarea
              value={editingCharacter.fears || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, fears: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>优点</label>
            <textarea
              value={editingCharacter.strengths || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, strengths: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>缺点</label>
            <textarea
              value={editingCharacter.weaknesses || ''}
              onChange={(e) => setEditingCharacter({ ...editingCharacter, weaknesses: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button className="primary-button" onClick={handleSaveCharacterEdit}>保存</button>
            <button className="secondary-button" onClick={handleBack}>取消</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-workflow">
      <div className="page-header">
        <h1>🎭 角色策划</h1>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <div className="workflow-intro">
        <h2>设计你的小说人物</h2>
        <p>角色策划将帮您设计和完善小说中的人物小传</p>
      </div>

      <div className="workflow-actions">
        <button className="primary-button" onClick={handleStartNew}>
          🎭 开始创建新角色
        </button>
      </div>

      {books.length > 0 && (
        <div className="books-section">
          <h3>选择已有小说</h3>
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

      {selectedBook && characters.length > 0 && (
        <div className="characters-section">
          <h3>📚 {selectedBook.title} 的角色</h3>
          <div className="characters-grid">
            {characters.map((char) => (
              <div key={char.id} className="character-card">
                <div className="character-header">
                  <h4>{char.name}</h4>
                  <div className="character-actions">
                    <button 
                      className="edit-button"
                      onClick={() => handleEditCharacter(char)}
                    >
                      编辑
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteCharacter(char.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
                {char.description && <p className="character-desc">{char.description}</p>}
                {char.personality && <p className="character-personality">性格: {char.personality.substring(0, 50)}...</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {assistants.length === 0 && (
        <div className="warning-message">
          <p>没有找到角色策划助手，请先在助手管理中创建一个</p>
          <Link to="/assistants" className="button-link">
            去创建助手 →
          </Link>
        </div>
      )}
    </div>
  );
}

export default CharacterPlanningPage;
