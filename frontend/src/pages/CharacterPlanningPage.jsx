import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import CharacterChatInterface from '../components/CharacterChatInterface';

const API_BASE = 'http://localhost:3022/api';

const CHARACTER_TYPES = ['人物', '物品', '组织'];

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
  const [expandedTypes, setExpandedTypes] = useState({人物: true, 物品: true, 组织: true});
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedBook) {
      loadCharacters(selectedBook.id);
    }
  }, [selectedBook]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksRes, assistantsRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/assistants`)
      ]);
      setBooks(booksRes.data);
      
      const charAssistants = assistantsRes.data.filter(a => 
        a.type === 'character_planner' || a.name.includes('角色') || a.type === 'custom'
      );
      
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
    if (assistants.length > 0) {
      setSelectedAssistant(assistants[0]);
    }
  };

  const handleStartChat = () => {
    if (assistants.length > 0 && selectedBook) {
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

  const toggleTypeExpand = (type) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
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

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    try {
      const response = await axios.post(`${API_BASE}/ai/complete-character`, {
        character: editingCharacter,
        book: selectedBook
      });
      
      const completedCharacter = response.data;
      setEditingCharacter(prev => ({ ...prev, ...completedCharacter }));
      setSuccessMessage('AI生成完成！');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to generate character:', error);
      alert('AI生成失败，请重试');
    } finally {
      setAiGenerating(false);
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

  const renderCharacterEditorModal = () => {
    if (!showCharacterEditor || !editingCharacter) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowCharacterEditor(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🎭 编辑角色</h2>
            <button className="modal-close" onClick={() => setShowCharacterEditor(false)}>×</button>
          </div>
          <div className="modal-body">
            <div className="character-editor-modal">
              <div className="form-row">
                <div className="form-group">
                  <label>姓名</label>
                  <input
                    type="text"
                    value={editingCharacter.name || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>类型</label>
                  <select
                    value={editingCharacter.character_type || '人物'}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, character_type: e.target.value })}
                  >
                    {CHARACTER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>简介</label>
                <textarea
                  value={editingCharacter.description || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })}
                  placeholder="请输入角色简介..."
                />
              </div>
              <div className="form-group">
                <label>外貌</label>
                <textarea
                  value={editingCharacter.appearance || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, appearance: e.target.value })}
                  placeholder="请描述角色外貌..."
                />
              </div>
              <div className="form-group">
                <label>性格</label>
                <textarea
                  value={editingCharacter.personality || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, personality: e.target.value })}
                  placeholder="请描述角色性格..."
                />
              </div>
              <div className="form-group">
                <label>背景</label>
                <textarea
                  value={editingCharacter.background || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, background: e.target.value })}
                  placeholder="请描述角色背景..."
                />
              </div>
              <div className="form-group">
                <label>核心动机</label>
                <textarea
                  value={editingCharacter.motivation || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, motivation: e.target.value })}
                  placeholder="请描述角色的核心动机..."
                />
              </div>
              <div className="form-group">
                <label>成长弧线</label>
                <textarea
                  value={editingCharacter.arc || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, arc: e.target.value })}
                  placeholder="请描述角色的成长弧线..."
                />
              </div>
              <div className="form-group">
                <label>目标</label>
                <textarea
                  value={editingCharacter.goals || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, goals: e.target.value })}
                  placeholder="请描述角色的目标..."
                />
              </div>
              <div className="form-group">
                <label>恐惧</label>
                <textarea
                  value={editingCharacter.fears || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, fears: e.target.value })}
                  placeholder="请描述角色的恐惧..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>优点</label>
                  <textarea
                    value={editingCharacter.strengths || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, strengths: e.target.value })}
                    placeholder="请描述角色的优点..."
                  />
                </div>
                <div className="form-group">
                  <label>缺点</label>
                  <textarea
                    value={editingCharacter.weaknesses || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, weaknesses: e.target.value })}
                    placeholder="请描述角色的缺点..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="ai-generate-button" onClick={handleAiGenerate} disabled={aiGenerating}>
              {aiGenerating ? '生成中...' : '🤖 AI生成'}
            </button>
            <button className="secondary-button" onClick={() => setShowCharacterEditor(false)}>取消</button>
            <button className="primary-button" onClick={handleSaveCharacterEdit}>保存</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chapter-editor-page">
      <div className="page-header">
        <h1>🎭 角色策划</h1>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>

      {successMessage && <div className="notification-message">{successMessage}</div>}

      <div className="editor-layout">
        <div className="combined-sidebar">
          <div className="book-info">
            {selectedBook ? (
              <>
                <h4>{selectedBook.title}</h4>
                <p className="book-author">{selectedBook.author}</p>
              </>
            ) : (
              <>
                <h4>选择小说</h4>
                <p className="book-author">开始角色策划</p>
              </>
            )}
          </div>

          <div className="sidebar-section">
            <h3>选择书籍</h3>
            <select
              value={selectedBook?.id || ''}
              onChange={(e) => {
                const book = books.find(b => b.id === parseInt(e.target.value));
                handleSelectBook(book);
              }}
              className="book-select"
            >
              <option value="">请选择书籍</option>
              {books.map(book => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
          </div>

          {selectedBook && (
            <div className="plots-tree-section">
              <div className="section-header">
                <h3>角色列表</h3>
                <button onClick={handleStartChat} className="btn-small">
                  💬 策划
                </button>
              </div>
              <div className="plots-tree">
                {characters.length === 0 ? (
                  <div className="empty-tree">暂无角色</div>
                ) : (
                  CHARACTER_TYPES.map(type => {
                    const typeCharacters = characters.filter(c => c.character_type === type);
                    if (typeCharacters.length === 0) return null;
                    
                    const isExpanded = expandedTypes[type];
                    return (
                      <div key={type} className="plot-item">
                        <div 
                          className="plot-header"
                          onClick={() => toggleTypeExpand(type)}
                        >
                          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                          <span className="plot-title">{type}</span>
                          <span className="selected-indicator">({typeCharacters.length})</span>
                        </div>
                        {isExpanded && (
                          <div className="acts-list">
                            {typeCharacters.map((char) => (
                              <div 
                                key={char.id} 
                                className="chapter-item"
                                onClick={() => handleEditCharacter(char)}
                              >
                                <span className="chapter-number">📌</span>
                                <span className="act-title">{char.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="sessions-section">
            <div className="section-header">
              <h3>快速操作</h3>
            </div>
            <div className="sessions-list">
              <button className="new-chat-button" onClick={handleStartNew}>
                + 新建角色对话
              </button>
            </div>
          </div>
        </div>

        <div className="main-content">
          {!selectedBook ? (
            <div className="placeholder">
              <h2>请先选择一本书</h2>
              <p>从左侧选择一本书开始管理角色</p>
            </div>
          ) : (
            <div className="character-detail-panel">
              <div className="panel-header">
                <h2>📚 {selectedBook.title}</h2>
                {selectedBook.description && (
                  <p className="panel-info">{selectedBook.description}</p>
                )}
              </div>
              
              <div className="character-stats">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <div className="stat-value">{characters.length}</div>
                    <div className="stat-label">角色总数</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👤</div>
                  <div className="stat-info">
                    <div className="stat-value">{characters.filter(c => c.character_type === '人物').length}</div>
                    <div className="stat-label">人物</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📦</div>
                  <div className="stat-info">
                    <div className="stat-value">{characters.filter(c => c.character_type === '物品').length}</div>
                    <div className="stat-label">物品</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏛️</div>
                  <div className="stat-info">
                    <div className="stat-value">{characters.filter(c => c.character_type === '组织').length}</div>
                    <div className="stat-label">组织</div>
                  </div>
                </div>
              </div>

              <div className="character-list-preview">
                <h3>角色概览</h3>
                {characters.length === 0 ? (
                  <p className="empty-state">点击左侧角色开始编辑，或点击"新建角色对话"创建新角色</p>
                ) : (
                  <div className="characters-preview-grid">
                    {characters.slice(0, 6).map(char => (
                      <div 
                        key={char.id} 
                        className="preview-character-card"
                        onClick={() => handleEditCharacter(char)}
                      >
                        <div className="preview-avatar">
                          {char.character_type === '人物' ? '👤' : char.character_type === '物品' ? '📦' : '🏛️'}
                        </div>
                        <div className="preview-info">
                          <h4>{char.name}</h4>
                          {char.description && (
                            <p>{char.description.substring(0, 50)}{char.description.length > 50 ? '...' : ''}</p>
                          )}
                        </div>
                        <span className={`type-badge ${char.character_type}`}>
                          {char.character_type}
                        </span>
                      </div>
                    ))}
                    {characters.length > 6 && (
                      <div className="more-characters">
                        +{characters.length - 6} 更多角色
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {renderCharacterEditorModal()}
    </div>
  );
}

export default CharacterPlanningPage;