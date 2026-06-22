# 竞品源码调研报告

> 调研时间：2026-06-22
> 仓库克隆位置：`/tmp/ref-projects/`

---

## 一、ThoughtLab — 节点类型 + 颜色系统

**仓库**：`github.com/study-flamingo/thoughtlab`（v0.2.0-alpha）
**技术栈**：React + TypeScript + Cytoscape.js + Neo4j + FastAPI

### 节点类型定义 (`frontend/src/types/graph.ts`)

```typescript
export type NodeType = 'Observation' | 'Hypothesis' | 'Source' | 'Concept' | 'Entity';

// 各类型 → 颜色映射 (GraphVisualizer.tsx)
const nodeColors: Record<NodeType, string> = {
  Observation: '#3B82F6', // blue-500  🔵 观察
  Hypothesis:  '#10B981', // emerald-500 🟢 假设
  Source:      '#F59E0B', // amber-500  🟡 来源
  Concept:     '#8B5CF6', // violet-500 🟣 概念
  Entity:      '#EF4444', // red-500  🔴 实体
};
```

### 关系类型

13 种语义化关系：SUPPORTS / CONTRADICTS / RELATES_TO / OBSERVED_IN / DISCUSSES / CITES / DERIVED_FROM / INSPIRED_BY / PRECEDES / CAUSES / PART_OF / SIMILAR_TO / HAS_CHUNK

### Hypothesis 子状态颜色

```typescript
const STATUS_COLORS = {
  proposed:  '#3B82F6', // 蓝色
  tested:    '#F59E0B', // 黄色
  confirmed: '#10B981', // 绿色
  rejected:  '#EF4444', // 红色
};
```

### Cytoscape 渲染节点 (`GraphVisualizer.tsx`)

- 用 Cytoscape `cose` 布局（力导向）
- 节点样式直接取 `nodeColors[ele.data('type')]` 设背景色
- 选中节点加蓝色边框，高亮加黄色边框
- 画布使用 Canvas 绘制无限点阵网格背景

### 对我们项目的借鉴

- **Node 类型加 `type` 字段**：5 种类型足够覆盖（概念/事实/问题/来源/人物）
- **节点背景色按类型渲染**：当前我们的节点卡片统一用 amber 渐变，可以按类型换色
- **连线类型可选**：当前连线无类型，可加关系类型下拉（因果/相似/包含/引用）

---

## 二、Brain Map — Markdown 导入

**仓库**：`github.com/zubair-trabzada/brain-map`
**技术栈**：纯 Python 3 标准库（零依赖），单文件 `build.py`

### Wikilink 解析核心代码

```python
WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]")
MDLINK  = re.compile(r"\]\(([^)#\s]+\.md)\)")

# 1. 构建 stem → relpath 映射
stem_map = {}
for f in files:
    stem_map.setdefault(
        os.path.splitext(os.path.basename(f))[0].lower(), rels[f]
    )

# 2. 遍历文件提取 link
for f in files:
    text = open(f, encoding="utf-8", errors="ignore").read()
    for m in WIKILINK.finditer(text):
        tgt = stem_map.get(m.group(1).strip().lower())
        if tgt and tgt != rel:
            links.add((rel, tgt))
    # 同样处理 Markdown 相对链接 [xxx](./path/to/note.md)
    for m in MDLINK.finditer(text):
        raw = m.group(1)
        if raw.startswith(("http:", "https:")): continue
        # ... 解析相对路径 → 加入 links
```

### 分组与颜色

- 检测 AI Workshop OS 布局（`CLAUDE.md` + `wiki/`）→ 按知识库分组
- 普通文件夹 → 按顶层目录分组，轮换 12 色调色板
- 颜色作为 `groups[key].c` 存入 `graph-data.js`

### 输出

- 单个 `index.html` + `graph-data.js`（JSON 数据）
- 力导向图（D3-force），支持搜索、缩放、拖拽

### 对我们项目的借鉴

- **浏览器端 FileReader 读取 .md**：`WIKILINK = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/`
- **wikilink → 节点+连线**：遍历所有文件构建 name→path 映射，匹配 wikilink 创建连线
- **按文件夹分组颜色**：如果有文件夹结构，不同文件夹节点不同颜色
- **也支持 Markdown 链接**：`[text](./other.md)` 格式也解析

---

## 三、Multiview Mindmap — 层级/聚焦布局

**仓库**：`github.com/fcj-code/multiview-mindmap`（Obsidian 插件）
**技术栈**：Obsidian Plugin API + 纯 DOM 渲染

### Focus View 布局算法 (`FocusCanvas` 类)

以选中节点为中心，分 5 个区域放置关联节点：

```
              [Parent]                    ← 父节点（正上方）
                                          
[Siblings]  [ CENTER ]  [Links+SameTag]   ← 左右翼
                                          
        [Child1]  [Child2]               ← 子节点分左右两列
        [Child3]  [Child4]
```

### 核心布局参数

```typescript
const maxGroupCount = Math.max(
  parent ? 1 : 0, children.length, siblings.length,
  sameTag.length, links.length
);
const spreadBoost = 1 + Math.max(0, maxGroupCount - 8) * 0.03;
const gapX = Math.min(width * 0.56, Math.max(250, width * 0.28 * spreadBoost));  // 左右间距
const gapY = Math.min(height * 0.52, Math.max(160, height * 0.26 * spreadBoost)); // 上下间距
const sideRowGap = Math.max(54, Math.min(74, height * 0.085));                     // 侧翼行距
const childRowGap = Math.max(56, Math.min(76, height * 0.088));                    // 子节点行距
const childClusterOffset = Math.max(132, Math.min(220, gapX * 0.45));              // 子节点左右偏移
```

### 子节点分两簇

```typescript
if (count === 1) {
  place(child, { x: center.x, y: center.y + gapY });
} else if (count === 2) {
  place(child0, { x: center.x - offset, y: center.y + gapY });
  place(child1, { x: center.x + offset, y: center.y + gapY });
} else {
  const leftCount = Math.ceil(count / 2);
  layoutSingleColumn(leftNodes,  center.x - offset, startY, { rowGap, centeredY: false });
  layoutSingleColumn(rightNodes, center.x + offset, startY, { rowGap, centeredY: false });
}
```

### 差异对比

| 维度 | Multiview 分层视图 | 我们当前的画布 |
|------|-------------------|--------------|
| 位置 | 确定性布局（固定位置） | 自由拖拽 + 力导向 |
| 编辑 | 内联重命名 | 弹窗编辑 |
| 导航 | 纯 DOM 节点，按需渲染 | 全量 SVG 连线 + DOM 节点 |
| 缩放 | 无，固定视图 | 滚轮缩放 + 平移 |
| 适用 | 浏览层次关系 | 自由探索知识网络 |

### 对我们项目的借鉴

- **"层级视图"模式切换**：在自由画布之外，加一个层级视图按钮
- **选中节点后自动分层排列**：父→上，子→下两列，同级→右，引用→左
- **子节点分两列**避免单列过长
- **不做替换，做补充**：自由画布保留，层级视图是快捷浏览模式

---

## 四、Rig — AI 语义搜索（磁力拉取）

**仓库**：`github.com/Astralchemist/rig`
**技术栈**：TypeScript (CLI + Web) + SQLite + `bge-small` 本地嵌入

### 磁力拉取算法 (`packages/core/src/pull.ts`)

```typescript
// 默认权重
const DEFAULT_WEIGHTS = {
  structural: 0.50,  // 图结构距离
  semantic:   0.35,  // 嵌入语义相似度
  recency:    0.15,  // 最近访问衰减
};

function computeMagneticPull(anchorId, candidateIds, ctx, weights) {
  // 1. BFS 计算图距离（maxHops=4）
  const distances = bfsDistances(db, anchorId, maxHops);
  
  // 2. 批量取嵌入向量
  const vectors = getEmbeddingsMap(db, [anchorId, ...candidateIds]);
  
  // 3. 取 recency 衰减分
  const recencies = decayedActivationScores(db, now);
  
  // 4. 逐候选节点打分
  for (const id of candidateIds) {
    const structural = distances.has(id) ? 1/(1+distances.get(id)) : 0;
    const semantic    = (cosine(anchorVec, candidateVec) + 1) / 2;
    const recency     = recencies.get(id) ?? 0;
    const hub         = hubs.has(id) ? 1 : 0;
    
    const score = clamp01(
      structural * 0.50 + semantic * 0.35 + recency * 0.15 + hub * hubBias
    );
  }
}
```

### 图距离计算 (BFS)

```typescript
const bfsDistances = (db, anchorId, maxHops) => {
  const dist = new Map([[anchorId, 0]]);
  let frontier = [anchorId];
  for (let h = 1; h <= maxHops; h++) {
    // SELECT DISTINCT src, dst FROM edges WHERE src IN (frontier) OR dst IN (frontier)
    const next = rows.filter(r => !dist.has(r)).map(r => { dist.set(r, h); return r; });
    frontier = next;
  }
  return dist;
};
```

### Recency 指数衰减 (`activation-queries.ts`)

```typescript
// 半衰期 3 天，窗口 30 天
const decayedActivationScores = (db, now, windowMs, halflifeMs) => {
  const lambda = Math.LN2 / halflifeMs;
  for (const r of activations) {
    sums.set(r.node_id, (sums.get(r.node_id) ?? 0) + Math.exp(-lambda * (now - r.ts)));
  }
  // 软饱和: score = 1 - e^(-sum)
  for (const [id, s] of sums) out.set(id, 1 - Math.exp(-s));
};
```

### 对我们项目的借鉴

- **不需要本地 embedding 模型**：我们可以用 AI API 一次性让模型对候选打分
- **BFS 图距离可以直接算**：我们的 nodes + connections 数据在内存中，BFS 零成本
- **Recency 用 `node.lastAccessed` 字段**：每次点击/搜索节点更新时间戳
- **简化版打分函数**：

```typescript
// 方案 A：纯 AI 打分（一次 API 调用，把所有候选发给模型排序）
const prompt = `以下是与节点「${anchor.name}」可能相关的节点，请按相关性从高到低排序并打分(0-100)。...`;

// 方案 B：混合打分（图距离 + 文本匹配 + recency，无需 API）
const structuralScore = 1 / (1 + bfsDistance(anchor, candidate)); // BFS on in-memory graph
const textOverlap = jaccardSimilarity(anchor.content, candidate.content); // cheap keyword match
const recencyScore = 1 - Math.exp(-lambda * (now - candidate.lastAccessed));
```

---

## 可落地实现优先级

| 优先级 | 功能 | 改动量 | 复杂度 |
|--------|------|--------|--------|
| 1 | 节点类型 + 颜色系统 | ~80 行 | 低 |
| 2 | Markdown 导入 | ~150 行 | 中 |
| 3 | 层级布局模式 | ~200 行 | 中 |
| 4 | AI 语义搜索 | ~250 行 | 高 |

### 第 1 项：节点类型 + 颜色

改动文件：
- `src/types.ts` — Node 加 `type: 'concept' | 'fact' | 'question' | 'source' | 'person'`
- `src/components/Modals.tsx` — 编辑弹窗加类型选择下拉
- `src/components/MindMap.tsx` — 节点渲染用类型颜色替换统一 amber

### 第 2 项：Markdown 导入

改动文件：
- 新增 `src/lib/markdownImporter.ts` — FileReader + wikilink 正则 + 去重
- `src/components/HomeScreen.tsx` — 加"导入 Markdown"按钮
- `src/components/MindMap.tsx` — 接收导入的节点+连线批次

### 第 3 项：层级布局

改动文件：
- 新增 `src/lib/hierarchicalLayout.ts` — 分层布局算法（绕中心 5 区排布）
- `src/components/MindMap.tsx` — 加"层级视图"按钮 + 视图模式切换

### 第 4 项：AI 语义搜索

改动文件：
- 新增 `src/lib/semanticSearch.ts` — BFS + recency 衰减 + AI 打分
- `src/components/AIPanel.tsx` — 加"智能搜索"快捷按钮
- `src/types.ts` — Node 加 `lastAccessed` 字段
