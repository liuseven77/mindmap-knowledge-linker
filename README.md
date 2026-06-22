# 知识链接器 (MindMap Knowledge Linker)

可视化的知识图谱工具，用节点和连线组织你的知识体系。

**在线体验**：https://project-mu-lilac-98.vercel.app

## 功能

- **多笔记本** — 创建多个独立的知识体系，互不干扰
- **节点颜色** — 5 种节点类型（概念/事实/问题/来源/人物），不同颜色一目了然
- **拖拽节点** — 自由拖动画布上的节点，松手自动推开重叠邻居
- **智能放置** — 新节点自动找空位，不堆叠
- **一键分散** — 力导向算法自动整理布局
- **缩放平移** — 滚轮缩放，拖拽空白区域平移画布
- **建立连线** — 选中两个节点后点击"建立联系"，连线可编辑内容
- **连线悬停** — 鼠标靠近连线时高亮，显示两端节点名和连线内容
- **AI 助手** — 右侧面板，探索关联/润色内容/检查关系/润色连线/自由提问
- **反向链接面板** — 选中一个节点，左侧显示所有关联节点和连线内容
- **悬停预览** — 鼠标悬停在节点上显示详细内容
- **搜索跳转** — 搜索节点名称，快速定位到目标节点
- **撤销/重做** — Ctrl+Z / Ctrl+Shift+Z，50 步历史，文本框内不拦截
- **本地存储** — 所有数据保存在浏览器中，无需登录
- **自动备份** — 选择本地文件夹后，每次数据变更自动导出 JSON 备份
- **JSON 导入/导出** — 手动备份或迁移全部数据
- **PWA** — 浏览器可安装为独立应用，支持离线使用

## 本地运行

```bash
# 1. 克隆仓库
git clone git@github.com:liuseven77/mindmap-knowledge-linker.git
cd mindmap-knowledge-linker

# 2. 安装依赖（需要 Node.js 18+）
npm install

# 3. 启动开发服务器
npm run dev
```

浏览器打开 **http://localhost:5173** 即可使用。

> `localhost` 地址只有你的本机能访问，局域网或外网无法打开。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3 |
| 图标 | Lucide React |
| 存储 | localStorage |
| AI | OpenAI 兼容 API（DeepSeek / Qwen 等） |
| 部署 | Vercel（GitHub 集成自动部署） |
| PWA | vite-plugin-pwa |

## 项目结构

```
src/
├── App.tsx                   # 根路由：首页 ↔ 画布
├── types.ts                  # 类型定义 + NodeType + 颜色映射
├── storage.ts                # 存储接口 + localStorage 适配器
├── autoExport.ts             # 自动备份到本地文件夹
├── useUndo.ts                # 撤销/重做 Hook
├── services/
│   └── ai.ts                 # AI API 调用封装
├── lib/
│   └── coordinates.ts        # 坐标变换纯函数
├── components/
│   ├── HomeScreen.tsx        # 首页
│   ├── MindMap.tsx           # 画布主组件
│   ├── AIPanel.tsx           # AI 助手面板
│   ├── AISettings.tsx        # AI 配置弹窗
│   └── Modals.tsx            # 弹窗
├── GUIDE.md                  # 节点类型使用指南
├── RESEARCH.md               # 竞品源码调研报告
└── IDEAS.md                  # 待实现功能池
└── index.css                 # Tailwind 指令
```

## 路线图

### 已完成
- [x] AI 助手面板 — 探索关联/润色内容/检查关系/润色连线/自由提问
- [x] 节点防重叠 — 新节点智能放置 + 拖拽碰撞校正
- [x] 一键分散布局 — 力导向算法
- [x] 连线悬停高亮 — 透明热区 + tooltip
- [x] **节点类型 + 颜色系统** — 5 种类型（概念/事实/问题/来源/人物），工具栏类型选择器

### 即将开发
- [ ] **Markdown 导入/导出** — 导入 Obsidian vault，`[[wikilink]]` 自动转连线
- [ ] **层级布局模式** — 以选中节点为中心的分层排列视图

### 后续规划
- [ ] 智能关联推荐 — AI 自动扫描节点发现可能的关系
- [ ] 问答式知识检索 — 用自然语言提问获取知识体系综合回答
- [ ] 节点内容富文本 — 支持 Markdown 渲染
- [ ] 快捷键面板 — 查看和自定义快捷键

---

> 参考竞品：ThoughtLab、Brain Map、ThinkFlow AI、Rig 等开源知识图谱工具
