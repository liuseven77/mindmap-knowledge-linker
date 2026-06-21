# 踩坑经验录

> 每次修完 bug、用户说"成功"后更新此文件。

---

## 1. 拖拽：DOM 直操 vs React 渲染，双系统必冲突

### 核心教训

**React 渲染会覆盖 DOM 直操的 inline style。** 当 `nodeStyle()` 的 React 渲染和 `el.style.transform = ...` 的 DOM 直操同时修改同一个 CSS 属性时，React 重渲染会抹掉 DOM 的修改，造成节点跳动。

### 最终正确方案

**拖拽期间直接用 `setNodes` 更新世界坐标，走 React 渲染路径。不再碰 DOM。**

```ts
// pointermove 中：
const worldDX = (e.clientX - ds.startX) / scale;  // 屏幕像素 ÷ 缩放 = 世界坐标差
const worldDY = (e.clientY - ds.startY) / scale;
setNodes(prev => prev.map(n => n.id === ds.nodeId
  ? { ...n, x: ds.worldX + worldDX, y: ds.worldY + worldDY } : n));
```

核心公式：**屏幕像素差 / 缩放比例 = 世界坐标差**。缩放越大，同样的鼠标物理位移对应更小的世界坐标变化——天然缩放不变。

### setPointerCapture 是拖拽的正确 API

```ts
el.setPointerCapture(e.pointerId); // pointerdown 中
el.releasePointerCapture(e.pointerId); // pointerup 中
```

按下时锁定指针到该元素。之后即使鼠标移出元素、移出窗口——**pointerup 一定在该元素上触发**。不需要 `document.addEventListener('mouseup')` 等全局监听器。

### 3px 拖拽阈值

```ts
pointerdown: 记录 startX/Y，设 active=false
pointermove: 移动超过 3px 才设 active=true
pointerup: 只有 active=true 才算拖拽，否则只是点击
```

---

## 2. e.preventDefault() 阻止 click 事件

**根因**：`handlePointerDown` 中加了 `e.preventDefault()`。浏览器将其解释为"这不是点击"，阻止了后续 `click` 事件触发。`handleNodeClick` 依赖 click 来更新 `selectedNodes` → 选中逻辑全部断裂 → 连线不显示、悬停不工作。

**教训**：`pointerdown` 中的 `preventDefault` 会吃 click。用 `setPointerCapture` + `onContextMenu` 阻止右键就够了。

---

## 3. screenPos = worldToScreen 签名不匹配

**根因**：架构优化时：
```ts
const screenPos = worldToScreen; // (wx, wy, ViewState对象)
// 但调用方传4个独立参数：
screenPos(node.x, node.y, cw, ch) // cw 被当成了 ViewState 对象！
```

**修复**：用 `useCallback` 包装适配：
```ts
const screenPos = useCallback((x, y, cw, ch) =>
  worldToScreen(x, y, { panX: panRef.current.x, panY: panRef.current.y, scale: scaleRef.current, canvasW: cw, canvasH: ch }), []);
```

---

## 4. useUndo 初始化重复快照

**根因**：初始渲染后 `useEffect` push 了与初始状态相同的内容。用户按第一次 Ctrl+Z 退回相同状态（"撤销没反应"）。

**修复**：`skipInitial` ref 标记，首次 Effect 跳过。

---

## 5. Modal 非受控组件数据丢失

**根因**：
```tsx
// ❌ 可变局部变量，不在 React 状态树中
const editingNode = { ...node };
<input value={editingNode.name} onChange={e => editingNode.name = e.target.value} />
```
父组件因 undo/redo 重渲染时，`{...node}` 重新创建覆盖用户修改。

**修复**：Modal 全部改为 `useState` 受控组件。

---

## 6. types.ts 类型 + 存储混同文件

**根因**：`types.ts` 同时负责类型定义和 localStorage 读写，导入类型被迫引入存储实现。

**修复**：拆出 `storage.ts`，定义 `NotebookStorage` 接口 + `LocalStorageAdapter`，为 Supabase 预留缝。

---

## 7. Vercel 部署：私有仓库权限

**根因**：GitHub Private + Co-Authored-By = Vercel 识别为多人协作 → 免费版拒绝。

**修复**：仓库改为 Public。

---

## 8. Git push：HTTPS 不通切 SSH

**根因**：Windows 下 HTTPS 到 GitHub 443 连接被重置。

**修复**：`git remote set-url origin git@github.com:liuseven77/mindmap-knowledge-linker.git`

---

## 9. 本地空白页面：Vite 进程僵死

**根因**：旧 Vite 进程占 5173 端口但已崩溃，新进程无法绑定。

**修复**：`taskkill /f /im node.exe`

---

## 10. Edge 浏览器空白：Ad-blocker

**根因**：扩展将 localhost 资源判为追踪脚本，`ERR_BLOCKED_BY_CLIENT`。

**修复**：隐私模式或换 Chrome。

---

## 交付前验证清单

- [ ] `npx tsc --noEmit` 零错误
- [ ] 添加节点 → 拖拽（100%/200%/50% 缩放）→ 节点跟随鼠标不偏移
- [ ] 选中两个节点 → 建立联系 → SVG 连线正确显示
- [ ] 悬停节点 → 内容 tooltip 显示
- [ ] undo/redo 正常工作

---

## 11. 浏览器直接调 AI API 被 CORS 拦截

**根因**：浏览器对跨域请求有安全限制。AI API（DeepSeek/OpenAI 等）服务器不设置 CORS 头，浏览器直接 fetch 会报 `Failed to fetch`。

**修复**：Vite 开发模式下用 `server.proxy` 代理 `/api/chat` → `https://api.deepseek.com/v1/chat/completions`，绕过 CORS。生产环境可在 Vercel 配置类似的 rewrite 规则。

**教训**：浏览器直调第三方 API 大概率遇到 CORS。开发时用 Vite proxy 解决，部署时用 Vercel rewrites。

---

> 最近更新：2026-06-21（新增第 11 条经验）
