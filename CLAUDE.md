# MindMap Knowledge Linker — 知识链接器

可视化知识图谱工具。用户创建节点，在节点间建立连线（知识关联），连线越多的节点越大。

## 技术栈

- React 18 + TypeScript (Vite 5 构建)
- Tailwind CSS 3 样式
- Lucide React 图标
- localStorage 存储（无后端）
- PWA (vite-plugin-pwa)
- Vercel 部署

## 项目结构

```
src/
├── App.tsx                        # 根路由：首页 ↔ 画布
├── types.ts                       # 纯类型定义（Node, Connection, Notebook）
├── storage.ts                     # 存储接口 + localStorage 适配器（为 Supabase 预留）
├── autoExport.ts                  # 自动备份：File System Access API 导出 JSON
├── useUndo.ts                     # 撤销/重做 Hook（快照栈，50 步，skipInitial）
├── index.css                      # Tailwind 指令
├── main.tsx                       # React 入口
├── lib/
│   └── coordinates.ts             # 坐标变换纯函数
└── components/
    ├── HomeScreen.tsx              # 首页（创建/选择/导入导出/自动备份开关）
    ├── MindMap.tsx                 # 画布主组件
    └── Modals.tsx                  # 弹窗（全部受控组件）
```

## 关键约定

- 主动调用开发类 skill，根据任务匹配已安装的 skill
- 所有组件用函数式 + Hooks，禁止 class 组件
- **拖拽**：Pointer Events + `setPointerCapture`，世界坐标步长公式 `屏幕像素差/缩放=世界坐标差`，直接 `setNodes` 走 React 渲染。3px 阈值区分点击和拖拽。
- **pointerdown 禁止 e.preventDefault()**：会吞掉 click 事件导致选中逻辑断裂
- **弹窗**：必须用受控组件（useState），禁止直接修改对象属性
- **坐标变换**：统一用 `lib/coordinates.ts` 纯函数；替换函数引用前确认参数签名完全匹配
- **缩放/平移**：用 ref 存储最新值（panRef/scaleRef），避免事件监听器闭包过期
- **撤销/重做**：快照栈（useUndo），Ctrl+Z / Ctrl+Shift+Z，初始化跳过首次 Effect
- **数据变更**后自动调用 `autoExportIfEnabled()`，静默写入本地备份文件夹
- **提交前**：`npx tsc --noEmit` 零错误；本地 dev server 运行正常；验证拖拽（多缩放级别）、连线、悬停、undo/redo
- 关键经验教训见 [LESSONS.md](LESSONS.md)，每次踩坑后更新
- 提示词模板见 [vibe-coding-经验.md](vibe-coding-经验.md)（给用户的协作指南）

## 构建命令

```bash
npm run dev          # 启动开发服务器 (localhost:5173)
npm run build        # 生产构建（dist/）
npm run preview      # 预览生产构建 (localhost:4173)
npm run typecheck    # TypeScript 类型检查（提交前必须通过）
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
  storage.load() → 传给 HomeScreen 或 MindMap
  MindMap 通过 onUpdate(nodes, connections) → handleUpdate() → storage.save() + autoExportIfEnabled()
  useUndo 在 MindMap 内部管理 nodes/connections 状态并自动记录快照

存储适配器 (storage.ts):
  interface NotebookStorage { load(), save() }
  LocalStorageAdapter 实现，SupabaseAdapter 预留接口

自动备份 (autoExport.ts):
  用户选一次本地文件夹 → File System Access API 写入 JSON
  每次 storage.save() 触发静默导出，文件名带时间戳，不覆盖历史版本
```
