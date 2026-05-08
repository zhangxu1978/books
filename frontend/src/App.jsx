import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import AssistantManager from './pages/AssistantManager'
import ChatPage from './pages/ChatPage'
import EditorWorkflow from './pages/EditorWorkflow'
import CharacterPlanningPage from './pages/CharacterPlanningPage'
import WriterWorkspace from './pages/WriterWorkspace'
import PlotPlanningPage from './pages/PlotPlanningPage'
import ChapterOutlinePage from './pages/ChapterOutlinePage'
import Dashboard from './pages/Dashboard'
import './App.css'

function Navbar() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: '🏠 首页' },
    { path: '/editor-workflow', label: '📖 主编规划' },
    { path: '/plot-planning', label: '📚 剧情策划' },
    { path: '/character-planning', label: '🎭 角色策划' },
    { path: '/chapter-outline', label: '📝 章节构建' },
    { path: '/writer-workspace', label: '✍️ 写手创作' },
    { path: '/assistants', label: '🤖 助手管理' },
    { path: '/chat', label: '💬 AI对话' }
  ]

  return (
    <nav className="navbar">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          to={item.path} 
          className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor-workflow" element={<EditorWorkflow />} />
          <Route path="/plot-planning" element={<PlotPlanningPage />} />
          <Route path="/character-planning" element={<CharacterPlanningPage />} />
          <Route path="/chapter-outline" element={<ChapterOutlinePage />} />
          <Route path="/writer-workspace" element={<WriterWorkspace />} />
          <Route path="/assistants" element={<AssistantManager />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
