# MindMap Knowledge Linker — 知识链接器

可视化知识图谱工具。用户创建节点，在节点间建立连线（知识关联），连线越多的节点越大。

## 技术栈

- React 18 + TypeScript (Vite 5 构建)
- Tailwind CSS 3 样式
- Lucide React 图标
- localStorage 存储（无后端）
- @supabase/supabase-js 已安装但未启用

## 项目结构

```
src/
├── App.tsx                        # 根路由：首页 ↔ 画布
├── types.ts                       # 类型定义 + localStorage 工具函数
├── useUndo.ts                     # 撤销/重做 Hook
├── index.css                      # Tailwind 指令
├── main.tsx                       # React 入口
└── components/
    ├── HomeScreen.tsx              # 首页（笔记本创建/选择/导入导出）
    ├── MindMap.tsx                 # 画布主组件（541行，包含拖拽/缩放/选中/搜索）
    └── Modals.tsx                  # 3个弹窗（编辑节点/重复名确认/编辑连线）
```

## 关键约定

- 所有组件用函数式 + Hooks，禁止 class 组件
- 拖拽用 DOM 直接操作（`el.style.transform`），不通过 React state，确保 60fps
- 缩放和平移用 ref 存储最新值（`panRef`/`scaleRef`），避免事件监听器中的闭包过期
- 世界坐标 ↔ 屏幕坐标变换通过 `screenPos()` 统一处理
- 撤销/重做用快照栈（`useUndo`），Ctrl+Z / Ctrl+Shift+Z
- ID 生成用 `Math.random().toString(36)`，非安全场景够用

## 构建命令

```bash
npm run dev          # 启动开发服务器 (localhost:5173)
npm run build        # 生产构建
npm run typecheck    # TypeScript 类型检查
```

## 数据流

```
localStorage ("mindmap_notebooks")
  └── Notebook[] — 笔记本数组
        ├── nodes[]         — 节点（id, name, content, x, y）
        ├── connections[]   — 连线（id, fromId, toId, content）
        ├── createdAt
        └── updatedAt

App.tsx:
  loadNotebooks() → 传给 HomeScreen 或 MindMap
  MindMap 通过 onUpdate(nodes, connections) → handleUpdate() → saveNotebooks()
  useUndo 在 MindMap 内部管理 nodes/connections 状态并自动记录快照
```
