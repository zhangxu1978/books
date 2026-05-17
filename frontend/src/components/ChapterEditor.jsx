import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import AIHelperDialog from './AIHelperDialog';

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

function ChapterEditor({ value, onChange, assistants = [], defaultAssistant = null }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const quillRef = useRef(null);
  const ignoreNextMouseUpRef = useRef(false);

  const getSelectedText = useCallback(() => {
    if (!quillRef.current) return '';
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (range && range.length > 0) {
      return quill.getText(range.index, range.length);
    }
    return '';
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

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      // 如果需要忽略这次 mouseup，重置标志位并返回
      if (ignoreNextMouseUpRef.current) {
        ignoreNextMouseUpRef.current = false;
        return;
      }

      const text = getSelectedText();
      if (text.trim().length > 0 && !showDialog) {
        setSelectedText(text);
        setShowDialog(true);
      }
    }, 10);
  }, [getSelectedText, showDialog]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  const handleConfirm = (content) => {
    ignoreNextMouseUpRef.current = true;
    replaceSelectedText(content);
  };

  const handleCloseDialog = () => {
    ignoreNextMouseUpRef.current = true;
    setShowDialog(false);
    setSelectedText('');
  };

  return (
    <div className="chapter-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder="开始撰写章节内容..."
        ref={(el) => { quillRef.current = el; }}
      />

      <AIHelperDialog
        isOpen={showDialog}
        onClose={handleCloseDialog}
        selectedText={selectedText}
        assistants={assistants}
        defaultAssistant={defaultAssistant}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default ChapterEditor;
