import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3022/api';

const FUNCTION_OPTIONS = [
  { id: 'polish', label: '润色', icon: '✨' },
  { id: 'expand', label: '扩写', icon: '📝' },
  { id: 'rewrite', label: '重写', icon: '🔄' },
  { id: 'simplify', label: '精简', icon: '✂️' },
  { id: 'humanize', label: '去AI味儿', icon: '👤' }
];

const getPromptTemplate = (functionId, selectedText) => {
  const templates = {
    polish: `请润色以下文本，使其更优美流畅，保持原意不变：\n\n${selectedText}`,
    expand: `请扩写以下文本，增加更多细节描写，使内容更丰富：\n\n${selectedText}`,
    rewrite: `请用不同的表达方式重写以下文本，保持核心内容不变：\n\n${selectedText}`,
    simplify: `请精简以下文本，去除冗余，保持核心意思：\n\n${selectedText}`,
    humanize: `请将以下文本修改得更加自然，去除AI生成的痕迹，使其更像人类写作风格：\n\n${selectedText}`
  };
  return templates[functionId] || templates.polish;
};

function AIHelperDialog({ 
  isOpen, 
  onClose, 
  selectedText, 
  assistants, 
  defaultAssistant,
  onConfirm 
}) {
  const [selectedFunction, setSelectedFunction] = useState('polish');
  const [prompt, setPrompt] = useState('');
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (selectedText && selectedFunction) {
      setPrompt(getPromptTemplate(selectedFunction, selectedText));
    }
  }, [selectedText, selectedFunction]);

  useEffect(() => {
    if (defaultAssistant) {
      setSelectedAssistant(defaultAssistant);
    } else if (assistants && assistants.length > 0) {
      setSelectedAssistant(assistants[0]);
    }
  }, [defaultAssistant, assistants]);

  const handleFunctionChange = (functionId) => {
    setSelectedFunction(functionId);
    setPrompt(getPromptTemplate(functionId, selectedText));
  };

  const handleGenerate = async () => {
    if (!selectedAssistant) {
      alert('请先选择一个助手');
      return;
    }

    setIsGenerating(true);
    try {
      const assistantConfig = typeof selectedAssistant.config === 'string'
        ? JSON.parse(selectedAssistant.config || '{}')
        : (selectedAssistant.config || {});
      const modelId = assistantConfig.model || assistantConfig.modelId || 'deepseek-chat';

      const response = await axios.post(`${API_BASE}/chat`, {
        modelId,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      const generatedContent = response.data.choices?.[0]?.message?.content || '';
      setPrompt(generatedContent);
    } catch (error) {
      console.error('AI生成失败:', error);
      alert('AI生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(prompt);
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ai-helper-overlay" onClick={handleCancel}>
      <div className="ai-helper-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>🤖 AI 智能助手</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>

        <div className="dialog-body">
          <div className="toolbar-row">
            <div className="toolbar-item">
              <label className="form-label">功能选项</label>
              <select
                className="function-select"
                value={selectedFunction}
                onChange={(e) => handleFunctionChange(e.target.value)}
              >
                {FUNCTION_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar-item">
              <label className="form-label">选择助手</label>
              <select
                className="assistant-select"
                value={selectedAssistant?.id || ''}
                onChange={(e) => {
                  const assistant = assistants.find(a => String(a.id) === String(e.target.value));
                  setSelectedAssistant(assistant);
                }}
              >
                <option value="">请选择助手</option>
                {assistants.map((assistant) => (
                  <option key={assistant.id} value={assistant.id}>
                    📖 {assistant.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar-item toolbar-button">
              <label className="form-label">AI 生成</label>
              <button
                className="generate-button"
                onClick={handleGenerate}
                disabled={isGenerating || !selectedAssistant}
              >
                {isGenerating ? '⏳ 生成中...' : '🚀 AI生成'}
              </button>
            </div>
          </div>

          <div className="content-row">
            <div className="content-column">
              <label className="form-label">选择的内容</label>
              <textarea
                className="content-textarea read-only"
                value={selectedText}
                readOnly
                placeholder="选中的文本将显示在这里..."
              />
            </div>

            <div className="content-column">
              <label className="form-label">要求</label>
              <textarea
                className="content-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="AI生成的内容将显示在这里..."
              />
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="cancel-button" onClick={handleCancel}>取消</button>
          <button 
            className="confirm-button" 
            onClick={handleConfirm}
            disabled={!prompt.trim()}
          >
            ✅ 确认替换
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIHelperDialog;
