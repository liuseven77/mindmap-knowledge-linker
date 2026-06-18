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
├── types.ts                       # 纯类型定义（Node, Connection, Notebook）
├── storage.ts                     # 存储接口 + localStorage 适配器（为 Supabase 预留）
├── autoExport.ts                  # 自动备份：File System Access API 定时导出 JSON
├── useUndo.ts                     # 撤销/重做 Hook
├── index.css                      # Tailwind 指令
├── main.tsx                       # React 入口
├── lib/
│   └── coordinates.ts             # 坐标变换纯函数（worldToScreen / screenToWorld / panToCenter / nodeTransform）
└── components/
    ├── HomeScreen.tsx              # 首页（笔记本创建/选择/导入导出/自动备份开关）
    ├── MindMap.tsx                 # 画布主组件（拖拽/缩放/选中/搜索/连线）
    └── Modals.tsx                  # 3个弹窗（EditNodeModal / DuplicateModal / EditConnectionModal，全部受控组件）
```

## 关键约定

- 主动调用开发类 skill，根据任务匹配已安装的 skill（如 improve-codebase-architecture、prototype、diagnose、tdd 等）
- 所有组件用函数式 + Hooks，禁止 class 组件
- 弹窗表单必须用受控组件（useState），禁止直接修改对象属性
- 拖拽激活时，`nodeStyle` 必须输出与 DOM 直操一致的 transform（通过 `dragState.screenX/Y`），禁止用 `{left:0,top:0}` 等空值，否则 React 渲染会覆盖 DOM transform 导致缩放下偏移
- 交付前必须在本地浏览器中验证核心操作：添加节点、拖拽（正常/缩放后）、连线显示、悬停预览
- 提交前确保本地 dev server 正常运行，确认线上 Vercel 已同步更新
- 关键经验教训见 [LESSONS.md](LESSONS.md)，每次踩坑后更新
- 缩放和平移用 ref 存储最新值（`panRef`/`scaleRef`），避免事件监听器中的闭包过期
- 坐标变换统一用 `lib/coordinates.ts` 纯函数，不内联在组件里
- 撤销/重做用快照栈（`useUndo`），Ctrl+Z / Ctrl+Shift+Z，初始化跳过首次 Effect 避免重复快照
- ID 生成用 `Math.random().toString(36)`，非安全场景够用
- 数据变更后自动调用 `autoExportIfEnabled()`，静默写入本地备份文件夹
- 类型检查通过（`npx tsc --noEmit` 零错误）才能提交

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
