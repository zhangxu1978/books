# 📖 长篇小说写作软件

一个基于 React + Node.js + SQLite 的 AI 辅助小说创作工具。

## 🚀 快速开始

### 一键启动

```bash
# 首次安装依赖
npm run install:all

# 一键启动前后端
npm start
# 或
npm run dev
```

### 手动启动

```bash
# 启动后端 (端口 3001)
npm run dev:backend

# 启动前端 (端口 5173)
npm run dev:frontend
```

## 📁 项目结构

```
books/
├── backend/          # Express 后端
│   ├── database/     # SQLite 数据库
│   ├── services/     # 业务逻辑
│   ├── routes/       # API 路由
│   └── index.js
├── frontend/         # React 前端
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   └── package.json
└── package.json
```

## ✨ 主要功能

- 🤖 **多角色 AI 助手**：主编、写手、角色策划、剧情策划
- 🌍 **世界观规划**：AI 引导式世界观设定
- 📝 **故事线与大纲**：自动生成故事线和章节规划
- 🎭 **角色管理**：详细的人物小传与关系设定
- 📚 **章节编辑**：富文本编辑器 + AI 辅助
- 💾 **多版本保存**：L1/L2/L3 三级文本 + 历史记录回滚
- 🖥️ **助手分身**：多模型对比生成

## 🔧 配置

AI 模型配置在根目录的 `key.json` 文件中。

## 🛠️ 技术栈

- **前端**：React 18 + Vite + React Router + React Quill
- **后端**：Express.js + Better-sqlite3 + Axios
- **数据库**：SQLite
