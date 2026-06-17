import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Link2, Edit3, Plus, Trash2, Move, RotateCcw, Sparkles,
  BookOpen, BookPlus, ArrowLeft, Clock, Search
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────

interface Node {
  id: string;
  name: string;
  content: string;
  x: number;
  y: number;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  content: string;
}

interface Notebook {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

const NOTEBOOKS_KEY = 'mindmap_notebooks';
const generateId = () => Math.random().toString(36).substring(2, 15);

function loadNotebooks(): Notebook[] {
  try { return JSON.parse(localStorage.getItem(NOTEBOOKS_KEY) || '[]'); }
  catch { return []; }
}

function saveNotebooks(nb: Notebook[]) {
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(nb));
}

// ─── Home Screen ────────────────────────────────────

function HomeScreen({ onCreate, onOpen }: {
  onCreate: (name: string) => void;
  onOpen: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [notebooks, setNotebooks] = useState<Notebook[]>(loadNotebooks);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
    setNotebooks(loadNotebooks());
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notebooks.filter(n => n.id !== id);
    saveNotebooks(updated);
    setNotebooks(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl
                        bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-200 mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-amber-900 mb-2">我的知识链接</h1>
          <p className="text-amber-600">创建知识链接本，梳理你的知识体系</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <BookPlus size={20} />创建新链接本
          </h2>
          <div className="flex gap-3">
            <input type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="输入链接本名称..."
              className="flex-1 px-4 py-3 rounded-xl border-2 border-amber-200
                         focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100
                         text-amber-900 placeholder-amber-400 transition-all"
            />
            <button onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500
                         hover:from-amber-600 hover:to-orange-600 text-white rounded-xl
                         font-medium shadow-lg shadow-amber-200 transition-all flex items-center gap-2">
              <Plus size={18} />创建
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <Clock size={20} />历史链接本
          </h2>
          {notebooks.length === 0 ? (
            <div className="text-center py-12 bg-white/60 rounded-2xl border border-dashed border-amber-200">
              <p className="text-amber-500">还没有链接本，创建一个开始吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notebooks
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map(nb => (
                  <button key={nb.id} onClick={() => onOpen(nb.id)}
                    className="w-full bg-white rounded-2xl shadow-md border border-amber-100
                               hover:shadow-lg hover:border-amber-300 transition-all p-5
                               flex items-center justify-between group text-left"
                  >
                    <div>
                      <h3 className="font-semibold text-amber-900">{nb.name}</h3>
                      <p className="text-sm text-amber-500 mt-1">
                        {nb.nodes.length} 个节点 · {nb.connections.length} 条连线
                        · {new Date(nb.updatedAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <span
                      onClick={(e) => handleDelete(nb.id, e)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50
                                 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mind Map Canvas ────────────────────────────────

function MindMap({ notebook, onUpdate, onBack }: {
  notebook: Notebook;
  onUpdate: (nodes: Node[], connections: Connection[]) => void;
  onBack: () => void;
}) {
  const [nodes, setNodes] = useState<Node[]>(notebook.nodes);
  const [connections, setConnections] = useState<Connection[]>(notebook.connections);
  const [newNodeName, setNewNodeName] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  panRef.current = pan;
  scaleRef.current = scale;

  // Persist
  useEffect(() => { onUpdate(nodes, connections); // eslint-disable-next-line
  }, [nodes, connections]);

  const getNodeSize = (nodeId: string) => {
    const n = connections.filter(c => c.fromId === nodeId || c.toId === nodeId).length;
    return Math.min(1 + n * 0.08, 1.5);
  };

  const screenPos = useCallback((x: number, y: number, cw: number, ch: number) => {
    const sc = scaleRef.current;
    const { x: px, y: py } = panRef.current;
    return {
      x: cw / 2 + px + (x - cw / 2) * sc,
      y: ch / 2 + py + (y - ch / 2) * sc,
    };
  }, []);

  // ── Add / Delete ──────────────────────────────

  const addNode = (forceAdd = false) => {
    if (!newNodeName.trim()) return;
    const name = newNodeName.trim();
    const existing = nodes.find(n => n.name === name);
    if (existing && !forceAdd) { setDuplicateName(name); return; }
    setDuplicateName(null);
    const c = canvasRef.current;
    const cw = c?.clientWidth ?? 800;
    const ch = c?.clientHeight ?? 600;
    const node: Node = {
      id: generateId(), name, content: '',
      x: cw / 2 + (Math.random() - 0.5) * 200,
      y: ch / 2 + (Math.random() - 0.5) * 200,
    };
    setNodes(prev => [...prev, node]);
    setNewNodeName('');
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    setSelectedNodes(new Set());
  };

  // ── Search ───────────────────────────────────

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    const found = nodes.find(n => n.name.includes(q));
    if (!found) return;
    // Pan canvas so the found node is centered on screen
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    // target: node.x, node.y in world coords → want them at screen center (cw/2, ch/2)
    // pan = worldPos - screenPos * (1/scale) ... actually:
    // screenX = cw/2 + panX + (worldX - cw/2) * scale
    // We want screenX = cw/2 when worldX = found.x
    // => cw/2 = cw/2 + panX + (found.x - cw/2) * scale
    // => panX = -(found.x - cw/2) * scale = (cw/2 - found.x) * scale
    const sc = scaleRef.current;
    setPan({
      x: (cw / 2 - found.x) * sc,
      y: (ch / 2 - found.y) * sc,
    });
    // Highlight this node briefly
    setSelectedNodes(new Set([found.id]));
  };

  // ── Pan & Zoom (state-based — low frequency) ──

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.max(0.3, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  const panning = useRef(false);
  const panMouse = useRef({ x: 0, y: 0 });
  const panBase = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (panning.current) {
        setPan({
          x: panBase.current.x + e.clientX - panMouse.current.x,
          y: panBase.current.y + e.clientY - panMouse.current.y,
        });
      }
    };
    const onUp = () => { panning.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startPan = (e: React.MouseEvent) => {
    panning.current = true;
    panMouse.current = { x: e.clientX, y: e.clientY };
    panBase.current = pan;
    e.preventDefault();
  };

  // ── Node Drag (DOM-based — zero React overhead) ──

  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const id = draggingId.current;
      if (!id) return;
      const el = nodeEls.current.get(id);
      const canvas = canvasRef.current;
      if (!el || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const sc = scaleRef.current;
      const mx = (e.clientX - rect.left) - dragOffset.current.x;
      const my = (e.clientY - rect.top) - dragOffset.current.y;

      el.style.transform = `translate(${mx - 60}px, ${my - 20}px) scale(${getNodeSize(id) * sc})`;
    };

    const onUp = () => {
      const id = draggingId.current;
      if (!id) return;
      const el = nodeEls.current.get(id);
      const canvas = canvasRef.current;
      if (el && canvas) {
        const m = el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        if (m) {
          const sx = parseFloat(m[1]) + 60;
          const sy = parseFloat(m[2]) + 20;
          const rect = canvas.getBoundingClientRect();
          const sc = scaleRef.current;
          const { x: px, y: py } = panRef.current;
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          const wx = (sx - cx - px) / sc + cx;
          const wy = (sy - cy - py) / sc + cy;
          setNodes(prev => prev.map(n => n.id === id ? { ...n, x: wx, y: wy } : n));
        }
        el.style.zIndex = '';
        el.style.transition = '';
      }
      draggingId.current = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const draggingId = useRef<string | null>(null);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    draggingId.current = nodeId;
    const el = nodeEls.current.get(nodeId);
    if (!el) return;
    el.style.zIndex = '50';
    // Find current screen position of the node
    const m = el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (m) {
      const nodeLeft = parseFloat(m[1]);
      const nodeTop = parseFloat(m[2]);
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      // Offset = where the mouse is relative to the node's top-left corner at mousedown
      dragOffset.current = {
        x: e.clientX - canvasRect.left - nodeLeft - 60,
        y: e.clientY - canvasRect.top - nodeTop - 20,
      };
    }
  };

  // ── Selection ─────────────────────────────────

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const handleCreateConnection = () => {
    if (selectedNodes.size !== 2) return;
    const [fromId, toId] = Array.from(selectedNodes);
    const existing = connections.find(
      c => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
    );
    if (existing) { setEditingConnection(existing); }
    else {
      const nc: Connection = { id: generateId(), fromId, toId, content: '' };
      setConnections(prev => [...prev, nc]);
      setEditingConnection(nc);
    }
    setShowConnectionModal(true);
    setSelectedNodes(new Set());
  };

  const getNodeName = (id: string) => nodes.find(n => n.id === id)?.name || '';

  // ── Render ────────────────────────────────────

  const canvas = canvasRef.current;
  const cw = canvas?.clientWidth ?? 800;
  const ch = canvas?.clientHeight ?? 600;

  const nodeStyle = (node: Node) => {
    const p = screenPos(node.x, node.y, cw, ch);
    const sz = getNodeSize(node.id);
    return {
      left: 0, top: 0,
      transform: `translate(${p.x - 60}px, ${p.y - 20}px) scale(${sz * scale})`,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-md border-b border-amber-100 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack}
                className="p-2 rounded-xl hover:bg-amber-100 text-amber-600 transition-colors">
                <ArrowLeft size={22} />
              </button>
              <h1 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />{notebook.name}
              </h1>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索节点..."
                    className="w-40 pl-9 pr-3 py-2 rounded-xl border-2 border-amber-200
                             focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100
                             bg-white/90 text-amber-900 placeholder-amber-400 text-sm transition-all"
                  />
                </div>
                <input type="text" value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNode()}
                  placeholder="输入节点名称..."
                  className="flex-1 sm:w-64 px-4 py-2 rounded-xl border-2 border-amber-200
                           focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100
                           bg-white/90 text-amber-900 placeholder-amber-400 transition-all"
                />
                <button onClick={() => addNode()}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl
                           font-medium shadow-lg shadow-amber-200 hover:shadow-amber-300
                           transition-all flex items-center gap-2">
                  <Plus size={18} /><span className="hidden sm:inline">添加</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
                  className="p-2 bg-white hover:bg-amber-50 text-amber-600 rounded-xl
                           border-2 border-amber-200 hover:border-amber-300 transition-all">
                  <RotateCcw size={20} />
                </button>
                <div className="px-3 py-2 bg-white rounded-xl border-2 border-amber-200 text-amber-700 font-medium text-sm">
                  缩放: {Math.round(scale * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Floating toolbar */}
      {selectedNodes.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                      bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100
                      px-4 py-3 flex flex-col gap-3 min-w-[320px]">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="text-amber-700 font-medium">已选择 {selectedNodes.size} 个节点</span>
            <button onClick={() => setSelectedNodes(new Set())}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center gap-2">
              <X size={16} />清空选中
            </button>
            {selectedNodes.size === 1 && <>
              <button onClick={() => {
                const n = nodes.find(x => x.id === Array.from(selectedNodes)[0]);
                if (n) setEditingNode(n);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium shadow-md transition-all flex items-center gap-2">
                <Edit3 size={16} />编辑内容
              </button>
              <button onClick={() => deleteNode(Array.from(selectedNodes)[0])}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium shadow-md transition-all flex items-center gap-2">
                <Trash2 size={16} />删除
              </button>
            </>}
            {selectedNodes.size === 2 && (
              <button onClick={handleCreateConnection}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium shadow-md transition-all flex items-center gap-2">
                <Link2 size={16} />建立联系
              </button>
            )}
          </div>

          {/* Show connection content between selected nodes */}
          {selectedNodes.size === 2 && (() => {
            const [a, b] = Array.from(selectedNodes);
            const conn = connections.find(
              c => (c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a)
            );
            if (!conn || !conn.content) return null;
            return (
              <div className="border-t border-amber-200 pt-3">
                <p className="text-sm text-amber-500 mb-1">
                  {getNodeName(conn.fromId)} ↔ {getNodeName(conn.toId)}
                </p>
                <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-3">
                  <p className="text-sm text-amber-800 whitespace-pre-wrap flex-1">{conn.content}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingConnection(conn);
                        setShowConnectionModal(true);
                      }}
                      className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors"
                      title="编辑联系内容"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={(e) => {
          if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
            startPan(e);
          }
        }}
        onClick={() => setSelectedNodes(new Set())}
        className="relative w-full h-[calc(100vh-88px)] overflow-hidden cursor-grab select-none"
      >
        {/* SVG connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.fromId);
            const toNode = nodes.find(n => n.id === conn.toId);
            if (!fromNode || !toNode) return null;
            const ft = screenPos(fromNode.x, fromNode.y, cw, ch);
            const tt = screenPos(toNode.x, toNode.y, cw, ch);
            return (
              <line key={conn.id}
                x1={ft.x} y1={ft.y} x2={tt.x} y2={tt.y}
                stroke="#d97706" strokeWidth={3 * scale} strokeLinecap="round" opacity="0.6" />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const sel = selectedNodes.has(node.id);
          return (
            <div
              key={node.id}
              ref={(el) => { if (el) nodeEls.current.set(node.id, el); }}
              onClick={(e) => handleNodeClick(e, node.id)}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={nodeStyle(node)}
              className={`absolute origin-center cursor-move min-w-[120px] px-4 py-3 rounded-2xl shadow-lg
                        ${sel ? 'bg-amber-400 ring-4 ring-amber-300 shadow-xl z-10' : 'bg-white hover:bg-amber-50 hover:shadow-xl'}`}
            >
              <div className="flex items-center gap-2">
                <Move size={14} className={sel ? 'text-white' : 'text-amber-400'} />
                <span className={`font-medium ${sel ? 'text-white' : 'text-amber-800'}`}>{node.name}</span>
              </div>
            </div>
          );
        })}

        {/* Hover tooltip */}
        {hoveredId && nodes.find(n => n.id === hoveredId)?.content && (() => {
          const node = nodes.find(n => n.id === hoveredId)!;
          if (!node.content) return null;
          const p = screenPos(node.x, node.y, cw, ch);
          const sz = getNodeSize(node.id) * scale;
          return (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: p.x,
                top: p.y - 16 * sz,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="bg-white rounded-xl shadow-2xl border border-amber-200 px-4 py-3 max-w-xs">
                <p className="text-sm font-semibold text-amber-800 mb-1">{node.name}</p>
                <p className="text-sm text-amber-600 whitespace-pre-wrap">{node.content}</p>
              </div>
              <div className="mx-auto w-3 h-3 bg-white border-r border-b border-amber-200 rotate-45 -mt-[6px]" />
            </div>
          );
        })()}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <Plus size={40} className="text-amber-400" />
              </div>
              <h3 className="text-xl font-medium text-amber-700 mb-2">开始创建你的知识链接</h3>
              <p className="text-amber-500">在上方输入节点名称，点击添加按钮创建第一个节点</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Node Modal */}
      {editingNode && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditingNode(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">编辑节点</h2>
              <button onClick={() => setEditingNode(null)} className="text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-700 mb-2">节点名称</label>
                <input type="text" value={editingNode.name}
                  onChange={e => setEditingNode({ ...editingNode, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-amber-200
                           focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 text-amber-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-700 mb-2">节点内容</label>
                <textarea value={editingNode.content}
                  onChange={e => setEditingNode({ ...editingNode, content: e.target.value })}
                  rows={4} placeholder="在此输入节点的详细内容..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-amber-200
                           focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100
                           text-amber-900 placeholder-amber-300 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingNode(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">取消</button>
                <button onClick={() => { setNodes(prev => prev.map(n => n.id === editingNode.id ? editingNode : n)); setEditingNode(null); }}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-md">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Name Modal */}
      {duplicateName && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDuplicateName(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">节点名称重复</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-amber-800">
                已存在名为 <span className="font-bold">"{duplicateName}"</span> 的节点，是否仍要创建？
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDuplicateName(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">取消</button>
                <button onClick={() => addNode(true)}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-md">仍要创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Connection Modal */}
      {editingConnection && showConnectionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowConnectionModal(false); setEditingConnection(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">编辑联系</h2>
              <button onClick={() => { setShowConnectionModal(false); setEditingConnection(null); }}
                className="text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-amber-200">
                  <span className="font-medium text-amber-800">{getNodeName(editingConnection.fromId)}</span>
                </div>
                <Link2 className="text-green-500" size={24} />
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-amber-200">
                  <span className="font-medium text-amber-800">{getNodeName(editingConnection.toId)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">联系内容</label>
                <textarea value={editingConnection.content}
                  onChange={e => setEditingConnection({ ...editingConnection, content: e.target.value })}
                  rows={4} placeholder="描述这两个节点之间的关系..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-green-200
                           focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100
                           text-gray-800 placeholder-green-300 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => {
                  setConnections(prev => prev.filter(c => c.id !== editingConnection.id));
                  setEditingConnection(null); setShowConnectionModal(false);
                }}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium flex items-center gap-2">
                  <Trash2 size={18} />删除
                </button>
                <button onClick={() => { setShowConnectionModal(false); setEditingConnection(null); }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">取消</button>
                <button onClick={() => {
                  setConnections(prev => prev.map(c => c.id === editingConnection.id ? editingConnection : c));
                  setEditingConnection(null); setShowConnectionModal(false);
                }}
                className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium shadow-md">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Root ────────────────────────────────────────

export default function App() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleCreate = (name: string) => {
    const notebooks = loadNotebooks();
    const nb: Notebook = {
      id: generateId(),
      name,
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    notebooks.push(nb);
    saveNotebooks(notebooks);
    setActiveId(nb.id);
  };

  const handleUpdate = (nodes: Node[], connections: Connection[]) => {
    const notebooks = loadNotebooks();
    const idx = notebooks.findIndex(n => n.id === activeId);
    if (idx >= 0) {
      notebooks[idx].nodes = nodes;
      notebooks[idx].connections = connections;
      notebooks[idx].updatedAt = new Date().toISOString();
      saveNotebooks(notebooks);
    }
  };

  if (activeId) {
    const notebook = loadNotebooks().find(n => n.id === activeId);
    if (!notebook) { setActiveId(null); return null; }
    return <MindMap notebook={notebook} onUpdate={handleUpdate} onBack={() => setActiveId(null)} />;
  }

  return <HomeScreen onCreate={handleCreate} onOpen={setActiveId} />;
}
