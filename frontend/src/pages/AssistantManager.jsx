import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api/assistants'
const MODELS_URL = 'http://localhost:3001/api/models'

function AssistantManager() {
  const [assistants, setAssistants] = useState([])
  const [models, setModels] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    config: {
      systemPrompt: '',
      model: '',
      temperature: 0.7
    }
  })

  useEffect(() => {
    fetchAssistants()
    fetchModels()
  }, [])

  const fetchAssistants = async () => {
    try {
      const response = await axios.get(API_URL)
      setAssistants(response.data.map(a => ({
        ...a,
        config: a.config ? JSON.parse(a.config) : { systemPrompt: '', model: '', temperature: 0.7 }
      })))
    } catch (error) {
      console.error('Error fetching assistants:', error)
    }
  }

  const fetchModels = async () => {
    try {
      const response = await axios.get(MODELS_URL)
      setModels(response.data.models || [])
    } catch (error) {
      console.error('Error fetching models:', error)
    }
  }

  const handleInitDefaults = async () => {
    try {
      await axios.post(`${API_URL}/init-defaults`)
      fetchAssistants()
      alert('默认助手初始化成功！')
    } catch (error) {
      console.error('Error initializing defaults:', error)
      alert('初始化失败')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        config: JSON.stringify(formData.config)
      }
      
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, data)
      } else {
        await axios.post(API_URL, data)
      }
      
      resetForm()
      fetchAssistants()
    } catch (error) {
      console.error('Error saving assistant:', error)
      alert('保存失败')
    }
  }

  const handleEdit = (assistant) => {
    setEditingId(assistant.id)
    setFormData({
      name: assistant.name,
      type: assistant.type,
      config: assistant.config
    })
  }

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个助手吗？')) {
      try {
        await axios.delete(`${API_URL}/${id}`)
        fetchAssistants()
      } catch (error) {
        console.error('Error deleting assistant:', error)
        alert('删除失败')
      }
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      name: '',
      type: '',
      config: {
        systemPrompt: '',
        model: '',
        temperature: 0.7
      }
    })
  }

  const getTypeLabel = (type) => {
    const labels = {
      editor_in_chief: '主编',
      writer: '写手',
      character_planner: '角色策划',
      chapter_planner: '章节构建',
      plot_planner: '剧情策划',
      custom: '自定义'
    }
    return labels[type] || type
  }

  return (
    <div className="page-content">
      <div className="assistant-manager">
        <div className="header">
          <h1>助手管理</h1>
          <button onClick={handleInitDefaults} className="init-btn">
            初始化默认助手
          </button>
        </div>

        <form onSubmit={handleSubmit} className="assistant-form">
          <h2>{editingId ? '编辑助手' : '添加助手'}</h2>
          
          <div className="form-group">
            <label>名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>类型</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              <option value="">请选择类型</option>
              <option value="editor_in_chief">主编</option>
              <option value="writer">写手</option>
              <option value="character_planner">角色策划</option>
              <option value="chapter_planner">章节构建</option>
              <option value="plot_planner">剧情策划</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div className="form-group">
            <label>模型</label>
            <select
              value={formData.config.model}
              onChange={(e) => setFormData({
                ...formData,
                config: { ...formData.config, model: e.target.value }
              })}
              required
            >
              <option value="">请选择模型</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>温度: {formData.config.temperature}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.config.temperature}
              onChange={(e) => setFormData({
                ...formData,
                config: { ...formData.config, temperature: parseFloat(e.target.value) }
              })}
            />
          </div>

          <div className="form-group">
            <label>系统提示词</label>
            <textarea
              value={formData.config.systemPrompt}
              onChange={(e) => setFormData({
                ...formData,
                config: { ...formData.config, systemPrompt: e.target.value }
              })}
              rows="10"
              required
            />
          </div>

          <div className="form-buttons">
            <button type="submit" className="submit-btn">
              {editingId ? '更新' : '添加'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="cancel-btn">
                取消
              </button>
            )}
          </div>
        </form>

        <div className="assistants-list">
          <h2>助手列表</h2>
          {assistants.length === 0 ? (
            <p>暂无助手，请点击"初始化默认助手"或手动添加！</p>
          ) : (
            assistants.map((assistant) => (
              <div key={assistant.id} className="assistant-card">
                <div className="assistant-header">
                  <h3>{assistant.name}</h3>
                  <span className="assistant-type">{getTypeLabel(assistant.type)}</span>
                </div>
                <p><strong>模型:</strong> {assistant.config.model}</p>
                <p><strong>温度:</strong> {assistant.config.temperature}</p>
                <details>
                  <summary>查看提示词</summary>
                  <pre>{assistant.config.systemPrompt}</pre>
                </details>
                <div className="assistant-actions">
                  <button onClick={() => handleEdit(assistant)} className="edit-btn">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(assistant.id)} className="delete-btn">
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AssistantManager
