import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

function Dashboard() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState(null);
  const [editForm, setEditForm] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/books`);
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (book) => {
    setEditingBook(book);
    setEditForm({
      title: book.title,
      author: book.author,
      description: book.description || '',
      estimated_chapters: book.estimated_chapters || '',
      estimated_words: book.estimated_words || '',
      words_per_chapter: book.words_per_chapter || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${API_BASE}/books/${editingBook.id}`, editForm);
      fetchBooks();
      setEditingBook(null);
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingBook(null);
    setEditForm({});
  };

  const getBookStats = (book) => {
    return {
      chapters: book.chapterCount || 0,
      characters: book.characterCount || 0,
      plots: book.plotCount || 0,
      lastUpdated: book.updated_at ? new Date(book.updated_at).toLocaleDateString('zh-CN') : '-'
    };
  };

  const workflowSteps = [
    {
      id: 'editor',
      title: '主编规划',
      icon: '📖',
      description: '世界观设定与故事大纲',
      path: '/editor-workflow',
      color: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'plot',
      title: '剧情策划',
      icon: '📚',
      description: '情节设计与故事结构',
      path: '/plot-planning',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'character',
      title: '角色策划',
      icon: '🎭',
      description: '人物塑造与角色关系',
      path: '/character-planning',
      color: 'from-pink-500 to-rose-600'
    },
    {
      id: 'writer',
      title: '写手创作',
      icon: '✍️',
      description: '多版本章节写作',
      path: '/writer-workspace',
      color: 'from-green-500 to-emerald-600'
    }
  ];

  const quickActions = [
    {
      title: '创建新书',
      icon: '➕',
      action: () => navigate('/editor-workflow'),
      color: 'bg-gradient-to-r from-purple-500 to-indigo-600'
    },
    {
      title: '助手管理',
      icon: '🤖',
      action: () => navigate('/assistants'),
      color: 'bg-gradient-to-r from-blue-500 to-cyan-600'
    },
    {
      title: 'AI对话',
      icon: '💬',
      action: () => navigate('/chat'),
      color: 'bg-gradient-to-r from-pink-500 to-rose-600'
    }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🎯 创作工作台</h1>
          <p>完整的小说创作流程，从构思到完稿</p>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="workflow-section">
          <h2>📋 创作流程</h2>
          <div className="workflow-steps">
            {workflowSteps.map((step, index) => (
              <Link key={step.id} to={step.path} className="workflow-card">
                <div className={`workflow-icon bg-gradient-to-br ${step.color}`}>
                  <span>{step.icon}</span>
                </div>
                <div className="workflow-content">
                  <div className="workflow-number">{index + 1}</div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                <div className="workflow-arrow">→</div>
              </Link>
            ))}
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="quick-actions-section">
            <h2>⚡ 快捷操作</h2>
            <div className="quick-actions">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`quick-action-card ${action.color}`}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span className="action-title">{action.title}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="recent-books-section">
            <h2>📚 最近书籍</h2>
            {loading ? (
              <div className="loading-state">加载中...</div>
            ) : books.length === 0 ? (
              <div className="empty-state">
                <p>还没有书籍</p>
                <button onClick={() => navigate('/editor-workflow')} className="create-first-btn">
                  开始创作第一本书
                </button>
              </div>
            ) : (
              <div className="books-list">
                {books.slice(0, 4).map((book) => {
                  const stats = getBookStats(book);
                  return (
                    <div key={book.id} className="book-card">
                      {editingBook?.id === book.id ? (
                        <div className="book-edit-form">
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="edit-input"
                          />
                          <input
                            type="text"
                            value={editForm.author}
                            onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                            className="edit-input"
                            placeholder="作者"
                          />
                          <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="edit-textarea"
                            placeholder="简介"
                          />
                          <div className="edit-fields">
                            <div className="edit-field">
                              <label>预计章节数:</label>
                              <input
                                type="number"
                                value={editForm.estimated_chapters}
                                onChange={(e) => setEditForm({ ...editForm, estimated_chapters: parseInt(e.target.value) || 0 })}
                                className="edit-input small"
                              />
                            </div>
                            <div className="edit-field">
                              <label>预计总字数:</label>
                              <input
                                type="number"
                                value={editForm.estimated_words}
                                onChange={(e) => setEditForm({ ...editForm, estimated_words: parseInt(e.target.value) || 0 })}
                                className="edit-input small"
                              />
                            </div>
                            <div className="edit-field">
                              <label>每章字数:</label>
                              <input
                                type="number"
                                value={editForm.words_per_chapter}
                                onChange={(e) => setEditForm({ ...editForm, words_per_chapter: parseInt(e.target.value) || 0 })}
                                className="edit-input small"
                              />
                            </div>
                          </div>
                          <div className="edit-actions">
                            <button className="save-btn" onClick={handleSaveEdit}>保存</button>
                            <button className="cancel-btn" onClick={handleCancelEdit}>取消</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="book-header">
                            <h4>{book.title}</h4>
                            <p className="book-author">{book.author}</p>
                          </div>
                          {book.description && (
                            <p className="book-desc">{book.description}</p>
                          )}
                          {(book.estimated_chapters > 0 || book.estimated_words > 0) && (
                            <div className="book-estimates">
                              <div className="estimate-item">
                                <span>📑 预计 {book.estimated_chapters} 章</span>
                              </div>
                              <div className="estimate-item">
                                <span>📝 预计 {book.estimated_words.toLocaleString()} 字</span>
                              </div>
                              {book.words_per_chapter > 0 && (
                                <div className="estimate-item">
                                  <span>📄 每章 {book.words_per_chapter.toLocaleString()} 字</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="book-stats">
                            <div className="stat-item">
                              <span className="stat-icon">📄</span>
                              <span>{stats.chapters} 章</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-icon">🎭</span>
                              <span>{stats.characters} 人</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-icon">📖</span>
                              <span>{stats.plots} 剧情</span>
                            </div>
                          </div>
                          <div className="book-footer">
                            <span className="book-date">更新: {stats.lastUpdated}</span>
                            <div className="book-actions">
                              <button className="edit-button" onClick={() => handleEditClick(book)}>
                                ✏️ 编辑
                              </button>
                              <Link to="/editor-workflow" className="continue-btn">
                                继续 →
                              </Link>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {books.length > 4 && (
              <div className="view-all-link">
                <Link to="/editor-workflow">查看全部 {books.length} 本书 →</Link>
              </div>
            )}
          </section>
        </div>

        <section className="tips-section">
          <h2>💡 创作建议</h2>
          <div className="tips-cards">
            <div className="tip-card">
              <div className="tip-icon">🎯</div>
              <h3>先规划后写作</h3>
              <p>从世界观设定开始，逐步构建角色和剧情，最后开始正式创作</p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">🔄</div>
              <h3>多版本尝试</h3>
              <p>在写手工作区可以同时创建多个版本，对比选择最佳方案</p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">🤖</div>
              <h3>善用AI助手</h3>
              <p>根据不同的创作阶段，选择合适的AI助手来帮助你</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;