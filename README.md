# 知识链接器 (MindMap Knowledge Linker)

可视化的知识图谱工具，用节点和连线组织你的知识体系。

**在线体验**：https://project-mu-lilac-98.vercel.app

## 功能

- **多笔记本** — 创建多个独立的知识体系，互不干扰
- **拖拽节点** — 自由拖动画布上的节点，调整布局
- **缩放平移** — 滚轮缩放，拖拽空白区域平移画布
- **建立连线** — 选中两个节点后点击"建立联系"
- **连线内容** — 为连线添加说明文字，在底部面板和反向链接面板查看编辑
- **反向链接面板** — 选中一个节点，右侧显示所有关联节点和连线内容
- **悬停预览** — 鼠标悬停在节点上显示详细内容
- **搜索跳转** — 搜索节点名称，快速定位到目标节点
- **撤销/重做** — Ctrl+Z / Ctrl+Shift+Z，50 步历史
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
| 部署 | Vercel |
| PWA | vite-plugin-pwa |

## 项目结构

```
src/
├── App.tsx                   # 根路由：首页 ↔ 画布
├── types.ts                  # 类型定义
├── storage.ts                # 存储接口 + localStorage 适配器
├── autoExport.ts             # 自动备份到本地文件夹
├── useUndo.ts                # 撤销/重做 Hook
├── lib/
│   └── coordinates.ts        # 坐标变换纯函数
├── components/
│   ├── HomeScreen.tsx        # 首页
│   ├── MindMap.tsx           # 画布主组件
│   └── Modals.tsx            # 弹窗
└── index.css                 # Tailwind 指令
```

## 路线图

- [ ] AI 智能关联推荐 — 自动发现节点间可能的关系
- [ ] 问答式知识检索 — 用自然语言提问获取知识体系综合回答
- [ ] Markdown 导入/导出 — 与 Obsidian 等工具互通
- [ ] 节点自定义颜色 — 按主题或领域区分
- [ ] 快捷键面板 — 查看和自定义快捷键
