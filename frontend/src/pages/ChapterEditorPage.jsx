import { useState, useEffect } from 'react';
import axios from 'axios';
import ChapterEditor from '../components/ChapterEditor';

const API_BASE = '/api';

function ChapterEditorPage() {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [activeLevel, setActiveLevel] = useState('l1');
  const [chapterLevels, setChapterLevels] = useState({ l1: '', l2: '', l3: '' });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [degradationInterval, setDegradationInterval] = useState(3);
  const [applyingDegradation, setApplyingDegradation] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    if (selectedBook) {
      fetchChapters(selectedBook.id);
    }
  }, [selectedBook]);

  const fetchBooks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/books`);
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const fetchChapters = async (bookId) => {
    try {
      const response = await axios.get(`${API_BASE}/chapters/book/${bookId}`);
      setChapters(response.data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchHistory = async (chapterId) => {
    try {
      const response = await axios.get(`${API_BASE}/chapter-history/chapter/${chapterId}`);
      setHistoryList(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleSelectChapter = (chapter) => {
    setSelectedChapter(chapter);
    setChapterTitle(chapter.title);
    setChapterLevels({
      l1: chapter.l1 || '',
      l2: chapter.l2 || '',
      l3: chapter.l3 || ''
    });
    setActiveLevel('l1');
    setSelectedHistory(null);
    if (showHistory) {
      fetchHistory(chapter.id);
    }
  };

  const handleCreateNewChapter = () => {
    setSelectedChapter(null);
    setChapterTitle('');
    setChapterLevels({ l1: '', l2: '', l3: '' });
    setActiveLevel('l1');
    setSelectedHistory(null);
    setHistoryList([]);
  };

  const handleSaveChapter = async () => {
    if (!selectedBook) {
      setMessage('请先选择一本书');
      return;
    }
    if (!chapterTitle.trim()) {
      setMessage('请输入章节标题');
      return;
    }

    setLoading(true);
    try {
      const chapterData = {
        book_id: selectedBook.id,
        title: chapterTitle,
        l1: chapterLevels.l1,
        l2: chapterLevels.l2,
        l3: chapterLevels.l3,
        word_count: chapterLevels.l1.replace(/<[^>]*>/g, '').length,
        order_num: selectedChapter ? selectedChapter.order_num : chapters.length
      };

      if (selectedChapter) {
        await axios.put(`${API_BASE}/chapters/${selectedChapter.id}`, chapterData);
        setMessage('章节更新成功！');
      } else {
        await axios.post(`${API_BASE}/chapters`, chapterData);
        setMessage('章节创建成功！');
      }

      fetchChapters(selectedBook.id);
    } catch (error) {
      console.error('Error saving chapter:', error);
      setMessage('保存失败，请重试');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleGenerateLevels = async () => {
    if (!selectedChapter) {
      setMessage('请先选择一个章节');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API_BASE}/chapters/${selectedChapter.id}/generate-levels`);
      setChapterLevels({
        l1: response.data.l1 || '',
        l2: response.data.l2 || '',
        l3: response.data.l3 || ''
      });
      setMessage('分级内容生成成功！');
    } catch (error) {
      console.error('Error generating levels:', error);
      setMessage('生成分级内容失败，请重试');
    } finally {
      setGenerating(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('确定要删除这个章节吗？')) return;

    try {
      await axios.delete(`${API_BASE}/chapters/${chapterId}`);
      if (selectedChapter && selectedChapter.id === chapterId) {
        handleCreateNewChapter();
      }
      fetchChapters(selectedBook.id);
      setMessage('章节删除成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting chapter:', error);
      setMessage('删除失败，请重试');
    }
  };

  const handleToggleHistory = async () => {
    if (!selectedChapter) {
      setMessage('请先选择一个章节');
      return;
    }
    setShowHistory(!showHistory);
    if (!showHistory) {
      fetchHistory(selectedChapter.id);
    }
  };

  const handleSelectHistory = (history) => {
    setSelectedHistory(history);
  };

  const handleRollback = async (historyId) => {
    if (!window.confirm('确定要回滚到这个版本吗？当前内容将被保存为新历史记录。')) return;

    try {
      const response = await axios.post(`${API_BASE}/chapter-history/${historyId}/rollback`);
      setSelectedChapter(response.data);
      setChapterTitle(response.data.title);
      setChapterLevels({
        l1: response.data.l1 || '',
        l2: response.data.l2 || '',
        l3: response.data.l3 || ''
      });
      fetchHistory(response.data.id);
      setMessage('回滚成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error rolling back:', error);
      setMessage('回滚失败，请重试');
    }
  };

  const handleApplyDegradation = async () => {
    if (!selectedBook) {
      setMessage('请先选择一本书');
      return;
    }
    if (!window.confirm(`确定要应用降级策略吗？每隔 ${degradationInterval} 个章节将保留完整内容，其余章节将被精简为 L3 级别。`)) return;

    setApplyingDegradation(true);
    try {
      const response = await axios.post(`${API_BASE}/chapters/book/${selectedBook.id}/apply-degradation`, {
        interval: degradationInterval
      });
      setChapters(response.data);
      if (selectedChapter) {
        const updatedChapter = response.data.find(c => c.id === selectedChapter.id);
        if (updatedChapter) {
          setSelectedChapter(updatedChapter);
          setChapterTitle(updatedChapter.title);
          setChapterLevels({
            l1: updatedChapter.l1 || '',
            l2: updatedChapter.l2 || '',
            l3: updatedChapter.l3 || ''
          });
        }
      }
      setMessage('降级策略应用成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error applying degradation:', error);
      setMessage('应用降级策略失败，请重试');
    } finally {
      setApplyingDegradation(false);
    }
  };

  const handleLevelChange = (level, value) => {
    setChapterLevels(prev => ({
      ...prev,
      [level]: value
    }));
  };

  const getWordCount = (content) => {
    return content.replace(/<[^>]*>/g, '').length;
  };

  return (
    <div className="chapter-editor-page">
      <div className="page-header">
        <h1>章节编辑器</h1>
      </div>

      {message && <div className="notification-message">{message}</div>}

      <div className="editor-layout">
        <div className="sidebar">
          <div className="sidebar-section">
            <h3>选择书籍</h3>
            <select
              value={selectedBook?.id || ''}
              onChange={(e) => {
                const book = books.find(b => b.id === parseInt(e.target.value));
                setSelectedBook(book);
                handleCreateNewChapter();
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
            <div className="sidebar-section">
              <div className="section-header">
                <h3>章节列表</h3>
                <button onClick={handleCreateNewChapter} className="btn-small">
                  + 新建章节
                </button>
              </div>
              <div className="chapters-list">
                {chapters.length === 0 ? (
                  <p className="empty-list">暂无章节</p>
                ) : (
                  chapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className={`chapter-item ${selectedChapter?.id === chapter.id ? 'active' : ''}`}
                    >
                      <div className="chapter-item-content" onClick={() => handleSelectChapter(chapter)}>
                        <span className="chapter-title">{chapter.title}</span>
                        <div className="chapter-meta">
                          <span className="word-count">{getWordCount(chapter.l1 || '')} 字</span>
                          <span className="chapter-index">#{index + 1}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(chapter.id);
                        }}
                        className="btn-delete-small"
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedBook && (
            <div className="sidebar-section">
              <h3>降级策略</h3>
              <div className="degradation-controls">
                <label>
                  每隔
                  <input
                    type="number"
                    min="1"
                    value={degradationInterval}
                    onChange={(e) => setDegradationInterval(parseInt(e.target.value) || 3)}
                    className="interval-input"
                  />
                  个章节保留完整内容
                </label>
                <button
                  onClick={handleApplyDegradation}
                  disabled={applyingDegradation}
                  className="btn-secondary"
                >
                  {applyingDegradation ? '应用中...' : '应用降级策略'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="main-content">
          {!selectedBook ? (
            <div className="placeholder">
              <h2>请先选择一本书</h2>
              <p>从左侧选择一本书开始编辑章节</p>
            </div>
          ) : (
            <div className="editor-container">
              <div className="chapter-header">
                <input
                  type="text"
                  placeholder="输入章节标题..."
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="chapter-title-input"
                />
                <div className="header-buttons">
                  <button
                    onClick={handleToggleHistory}
                    disabled={!selectedChapter}
                    className="btn-secondary"
                  >
                    {showHistory ? '隐藏历史' : '历史记录'}
                  </button>
                  {selectedChapter && (
                    <button
                      onClick={handleGenerateLevels}
                      disabled={generating}
                      className="btn-secondary"
                    >
                      {generating ? '生成中...' : 'AI 生成分级'}
                    </button>
                  )}
                  <button
                    onClick={handleSaveChapter}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? '保存中...' : '保存章节'}
                  </button>
                </div>
              </div>

              {showHistory && selectedChapter && (
                <div className="history-panel" style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
                  <div className="history-list">
                    <div className="history-header">
                      <h3>历史版本</h3>
                    </div>
                    {historyList.length === 0 ? (
                      <p className="empty-list">暂无历史记录</p>
                    ) : (
                      historyList.map((history) => (
                        <div
                          key={history.id}
                          className={`history-item ${selectedHistory?.id === history.id ? 'active' : ''}`}
                          onClick={() => handleSelectHistory(history)}
                        >
                          <div className="history-info">
                            <span className="history-version">v{history.version}</span>
                            <span className="history-date">
                              {new Date(history.created_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRollback(history.id);
                            }}
                            className="btn-small btn-rollback"
                          >
                            回滚
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedHistory && (
                    <div className="history-preview">
                      <h4>版本 v{selectedHistory.version} 预览</h4>
                      <div className="preview-content">
                        {selectedHistory.l1 && (
                          <div className="preview-level">
                            <h5>L1 - 完整内容</h5>
                            <div 
                              className="preview-text"
                              dangerouslySetInnerHTML={{ __html: selectedHistory.l1 }}
                            />
                          </div>
                        )}
                        {selectedHistory.l2 && (
                          <div className="preview-level">
                            <h5>L2 - 精简内容</h5>
                            <div 
                              className="preview-text"
                              dangerouslySetInnerHTML={{ __html: selectedHistory.l2 }}
                            />
                          </div>
                        )}
                        {selectedHistory.l3 && (
                          <div className="preview-level">
                            <h5>L3 - 故事梗概</h5>
                            <div 
                              className="preview-text"
                              dangerouslySetInnerHTML={{ __html: selectedHistory.l3 }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!showHistory && (
                <div className="level-tabs">
                  <button
                    className={`level-tab ${activeLevel === 'l1' ? 'active' : ''}`}
                    onClick={() => setActiveLevel('l1')}
                  >
                    L1 - 完整内容
                    <span className="level-word-count">({getWordCount(chapterLevels.l1)} 字)</span>
                  </button>
                  <button
                    className={`level-tab ${activeLevel === 'l2' ? 'active' : ''}`}
                    onClick={() => setActiveLevel('l2')}
                  >
                    L2 - 精简内容
                    <span className="level-word-count">({getWordCount(chapterLevels.l2)} 字)</span>
                  </button>
                  <button
                    className={`level-tab ${activeLevel === 'l3' ? 'active' : ''}`}
                    onClick={() => setActiveLevel('l3')}
                  >
                    L3 - 故事梗概
                    <span className="level-word-count">({getWordCount(chapterLevels.l3)} 字)</span>
                  </button>
                </div>
              )}

              {!showHistory && (
                <ChapterEditor
                  value={chapterLevels[activeLevel]}
                  onChange={(value) => handleLevelChange(activeLevel, value)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChapterEditorPage;
