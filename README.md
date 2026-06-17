# 知识链接器 (MindMap Knowledge Linker)

可视化的知识图谱工具，用节点和连线组织你的知识体系。

## 功能

- **多笔记本** — 创建多个独立的知识体系，互不干扰
- **拖拽节点** — 自由拖动画布上的节点，调整布局
- **缩放平移** — 滚轮缩放，拖拽空白区域平移画布
- **建立连线** — 选中两个节点后按 Escape 建立关联
- **连线内容** — 为连线添加说明文字，在底部面板查看编辑
- **悬停预览** — 鼠标悬停在节点上显示详细内容
- **搜索跳转** — 搜索节点名称，快速定位到目标节点
- **本地存储** — 所有数据保存在浏览器中，无需登录

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

## 项目结构

```
src/
├── App.tsx       # 全部应用代码
├── main.tsx      # React 入口
└── index.css     # Tailwind 指令
```

## 路线图

- [ ] Supabase 同步 — 跨设备数据同步
- [ ] Markdown 导出 — 导出知识图谱为文本
- [ ] 节点分组 — 用颜色或区域对节点分类
- [ ] 快捷键面板 — 查看和自定义快捷键
