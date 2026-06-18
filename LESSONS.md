# 踩坑经验录

## 拖拽：DOM 直操 vs React 渲染，双系统必冲突

### 核心教训

**React 渲染会覆盖 DOM 直操的 inline style。** 当 `nodeStyle()` 的 React 渲染和 `el.style.transform = ...` 的 DOM 直操同时修改同一个 CSS 属性时，React 重渲染会抹掉 DOM 的修改，造成节点跳动。

### 两次错误尝试

| 尝试 | 做法 | 结果 |
|------|------|------|
| 1 | 拖拽时 DOM 直操 transform，nodeStyle 返回 `{left:0,top:0}` | React 渲染时删除了 DOM 写入的 transform，节点跳回左上角 |
| 2 | 拖拽时 nodeStyle 也输出 transform，但用正则从 DOM 回读位置再同步 | 两个系统竞争，缩放下偏移量算错 |

### 最终正确方案

**拖拽期间直接用 `setNodes` 更新世界坐标，走 React 渲染路径。不再碰 DOM。**

```ts
// pointermove 中：
const worldDX = (e.clientX - ds.startX) / scale;  // 屏幕像素 ÷ 缩放 = 世界坐标差
const worldDY = (e.clientY - ds.startY) / scale;
setNodes(prev => prev.map(n => n.id === ds.nodeId
  ? { ...n, x: ds.worldX + worldDX, y: ds.worldY + worldDY } : n));
```

核心公式：**屏幕像素差 / 缩放比例 = 世界坐标差**。

为什么这是对的：当 `scale=1`，鼠标移动 10px → 世界坐标变 10。当 `scale=2`，鼠标移动 10px → 世界坐标变 5。缩放越大，同样的鼠标物理位移对应更小的世界坐标变化——这正是你看到的"放大了拖得慢"。

这个方案的优势：
- `setNodes` 触发 React 正常渲染 → `nodeStyle` 输出正确的 `transform` → 无冲突
- 不需要 DOM 正则解析
- 不需要 offset 预计算
- 不需要 screenX/screenY 同步
- `setPointerCapture` 保证 pointerup 一定触发

### 知识点：setPointerCapture

```ts
el.setPointerCapture(e.pointerId); // pointerdown 中
el.releasePointerCapture(e.pointerId); // pointerup 中
```

`setPointerCapture` 是浏览器内置 API，按下时锁定指针到该元素。之后即使鼠标移出元素、移出窗口、右键菜单弹出——**pointerup 一定会在该元素上触发**。不需要 `document.addEventListener('mouseup')` 之类的全局监听器。

---

## Pointer Events 取代 Mouse Events

| Mouse Events | Pointer Events |
|-------------|---------------|
| 鼠标专用 | 统一鼠标/触屏/笔 |
| 需要全局 document 监听器兜底 | setPointerCapture 自动兜底 |
| mouseup 可能漏触发（移出窗口等） | pointerup 捕获后必触发 |
| 需要 mouseleave + blur 保险 | 不需要，pointercancel 兜底 |

**结论：拖拽用 Pointer Events + setPointerCapture，平移用 Mouse Events。**

---

## 3px 拖拽阈值：区分点击和拖拽

纯点击不应该触发拖拽。解决方案：

```ts
pointerdown: 记录 startX/Y，设 active=false
pointermove: 移动超过 3px 才设 active=true，之前不移动节点
pointerup: 只有 active=true 才算拖拽，否则只是点击
```

---

## 架构变形后别忘检查调用约定

```
screenPos = worldToScreen  ← 错了！
```

原因：`worldToScreen(wx, wy, {panX,panY,scale,canvasW,canvasH})` 接收 ViewState 对象，但调用方传 `screenPos(node.x, node.y, cw, ch)` 是 4 个独立参数。签名不匹配导致 `cw` 被当作 ViewState 对象使用，坐标算错，连线画到屏幕外。

正确做法：
```ts
const screenPos = useCallback((x, y, cw, ch) =>
  worldToScreen(x, y, { panX: panRef.current.x, panY: panRef.current.y,
    scale: scaleRef.current, canvasW: cw, canvasH: ch }), []);
```

**教训：替换函数引用时，先确认参数签名完全匹配。**

---

## Modal 必须用受控组件

```tsx
// ❌ 不可变对象 + 直接改属性
const editingNode = { ...node };
<input value={editingNode.name}
  onChange={e => editingNode.name = e.target.value} />

// ✅ useState 受控
const [name, setName] = useState(node.name);
<input value={name} onChange={e => setName(e.target.value)} />
```

原因：非受控组件的 state 在 React 渲染树之外。如果父组件因 undo/redo 等原因重渲染，用户正在编辑的内容会丢失——因为 `{...node}` 重新创建了，但 input 的 DOM 状态还在。

---

## 单文件巨石 → 组件拆分：先建好目录再拆

拆之前的检查清单：
1. 是否有公共类型/工具函数可以独立？（→ types.ts, lib/）
2. 是否有独立的 UI 区域？（→ components/）
3. 是否有可复用的逻辑？（→ hooks/）
4. 拆分后类型检查零错误再提交

---

## 交付前验证清单

每次提交前必须验证：

- [ ] `npx tsc --noEmit` 零错误
- [ ] 本地 dev server 正常运行
- [ ] 添加节点 → 拖拽（正常缩放/放大后/缩小后）→ 节点跟随鼠标
- [ ] 选中两个节点 → 建立联系 → SVG 连线正确显示
- [ ] 悬停节点 → 内容 tooltip 显示
- [ ] 缩放后拖拽 → 节点不偏移
- [ ] 连线在两个缩放级别下位置正确
- [ ] undo/redo 正常工作

---

## 项目配置教训

- GitHub 仓库设为 **Public** 才能用 Vercel 免费版自动部署
- `.gitignore` 需要覆盖 `.bolt/`、`.env.*`、`*.tsbuildinfo`
- `package.json` 的 `name` 不要用生成器默认值（`vite-react-typescript-starter`）
- CLAUDE.md 要保持更新：项目结构、关键约定、构建命令、最近踩坑

---

> 记录时间：2026-06-18
> 相关文件：`src/components/MindMap.tsx`（拖拽核心）、`src/components/Modals.tsx`（受控组件）、`src/lib/coordinates.ts`（坐标变换）
