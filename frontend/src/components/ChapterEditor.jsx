import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean']
  ]
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'color', 'background',
  'align',
  'blockquote', 'code-block',
  'link'
];

const menuItems = [
  { id: 'polish', label: '润色', icon: '✨' },
  { id: 'expand', label: '扩写', icon: '📝' },
  { id: 'rewrite', label: '重写', icon: '🔄' },
  { id: 'simplify', label: '精简', icon: '✂️' },
  { id: 'predict', label: '预测下一步情节', icon: '🔮' },
  { id: 'character', label: '提取新角色', icon: '👥' }
];

function ChapterEditor({ value, onChange }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(null);
  const editorRef = useRef(null);
  const menuRef = useRef(null);
  const quillRef = useRef(null);

  const getSelectedText = useCallback(() => {
    if (!quillRef.current) return '';
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (range && range.length > 0) {
      return quill.getText(range.index, range.length);
    }
    return '';
  }, []);

  const getSelectionRange = useCallback(() => {
    if (!quillRef.current) return null;
    const quill = quillRef.current.getEditor();
    return quill.getSelection();
  }, []);

  const replaceSelectedText = useCallback((newText) => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (range && range.length > 0) {
      quill.deleteText(range.index, range.length);
      quill.insertText(range.index, newText);
      quill.setSelection(range.index, newText.length);
    }
  }, []);

  const calculateMenuPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return { x: 0, y: 0 };

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    let x = rect.left + rect.width / 2;
    let y = rect.top - 10;

    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const menuWidth = menuRect.width || 200;
      const menuHeight = menuRect.height || 250;

      if (x + menuWidth / 2 > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      } else if (x - menuWidth / 2 < 0) {
        x = 10;
      } else {
        x = x - menuWidth / 2;
      }

      if (y - menuHeight < 0) {
        y = rect.bottom + 10;
      } else {
        y = y - menuHeight;
      }
    }

    return { x: x + window.scrollX, y: y + window.scrollY };
  }, []);

  const handleSelectionChange = useCallback(() => {
    const text = getSelectedText();
    if (text.trim().length > 0) {
      setSelectedText(text);
      const position = calculateMenuPosition();
      setMenuPosition(position);
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  }, [getSelectedText, calculateMenuPosition]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    });
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const callAI = async (prompt) => {
    try {
      const response = await axios.post('http://localhost:3022/api/ai/chat', {
        modelId: 'moda-deepseek-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('AI调用失败:', error);
      throw error;
    }
  };

  const handleMenuClick = async (item) => {
    setLoading(true);
    setLoadingItem(item.id);
    
    try {
      let prompt = '';
      let result;

      switch (item.id) {
        case 'polish':
          prompt = `请润色以下文本，使其更优美流畅，保持原意不变：\n\n${selectedText}`;
          result = await callAI(prompt);
          replaceSelectedText(result);
          break;
        case 'expand':
          prompt = `请扩写以下文本，增加更多细节描写，使内容更丰富：\n\n${selectedText}`;
          result = await callAI(prompt);
          replaceSelectedText(result);
          break;
        case 'rewrite':
          prompt = `请用不同的表达方式重写以下文本，保持核心内容不变：\n\n${selectedText}`;
          result = await callAI(prompt);
          replaceSelectedText(result);
          break;
        case 'simplify':
          prompt = `请精简以下文本，去除冗余，保持核心意思：\n\n${selectedText}`;
          result = await callAI(prompt);
          replaceSelectedText(result);
          break;
        case 'predict':
          prompt = `根据以下文本，预测接下来可能发生的情节发展：\n\n${selectedText}`;
          result = await callAI(prompt);
          const range = getSelectionRange();
          if (range) {
            const quill = quillRef.current.getEditor();
            quill.insertText(range.index + range.length, '\n\n【情节预测】\n' + result);
          }
          break;
        case 'character':
          prompt = `从以下文本中提取可能出现的新角色，分析他们的特点：\n\n${selectedText}`;
          result = await callAI(prompt);
          const charRange = getSelectionRange();
          if (charRange) {
            const quill = quillRef.current.getEditor();
            quill.insertText(charRange.index + charRange.length, '\n\n【角色分析】\n' + result);
          }
          break;
      }
      setShowMenu(false);
    } catch (error) {
      alert('AI处理失败，请重试');
    } finally {
      setLoading(false);
      setLoadingItem(null);
    }
  };

  return (
    <div className="chapter-editor" ref={editorRef}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder="开始撰写章节内容..."
        ref={(el) => { quillRef.current = el; }}
      />
      
      {showMenu && (
        <div
          ref={menuRef}
          className="floating-menu"
          style={{
            position: 'absolute',
            left: menuPosition.x,
            top: menuPosition.y,
            zIndex: 1000
          }}
        >
          <div className="floating-menu-header">
            <span>AI 智能助手</span>
          </div>
          <div className="floating-menu-items">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`floating-menu-item ${loadingItem === item.id ? 'loading' : ''}`}
                onClick={() => handleMenuClick(item)}
                disabled={loading}
              >
                <span className="item-icon">{item.icon}</span>
                <span className="item-label">{item.label}</span>
                {loadingItem === item.id && <span className="loading-spinner">...</span>}
              </button>
            ))}
          </div>
        </div>
      )}


    </div>
  );
}

export default ChapterEditor;
