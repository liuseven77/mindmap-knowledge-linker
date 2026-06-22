import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Link2, Edit3, Plus, Trash2, Move, RotateCcw, Sparkles, Shuffle,
  ArrowLeft, Search, Download, Undo2, Redo2, ExternalLink, ListTree, BrainCircuit
} from 'lucide-react';
import type { Node, Connection, Notebook, NodeType } from '../types';
import { generateId, NODE_TYPE_COLORS, NODE_TYPE_OPTIONS } from '../types';
import { useUndo } from '../useUndo';
import { EditNodeModal, DuplicateModal, EditConnectionModal } from './Modals';
import { AIPanel } from './AIPanel';
import { worldToScreen, screenToWorld, panToCenter, nodeTransform } from '../lib/coordinates';

interface MindMapProps {
  notebook: Notebook;
  onUpdate: (nodes: Node[], connections: Connection[]) => void;
  onBack: () => void;
}

export function MindMap({ notebook, onUpdate, onBack }: MindMapProps) {
  const { nodes, connections, setNodes, setConnections, undo, redo, canUndo, canRedo } =
    useUndo(notebook.nodes, notebook.connections);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('concept');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [hoveredConnPos, setHoveredConnPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  panRef.current = pan;
  scaleRef.current = scale;

  // Persist on change
  useEffect(() => { onUpdate(nodes, connections); // eslint-disable-next-line
  }, [nodes, connections]);

  // ── Keyboard shortcuts ──

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === 'Z' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const getNodeSize = (nodeId: string) => {
    const n = connections.filter(c => c.fromId === nodeId || c.toId === nodeId).length;
    return Math.min(1 + n * 0.08, 1.5);
  };

  const screenPos = useCallback((x: number, y: number, cw: number, ch: number) =>
    worldToScreen(x, y, { panX: panRef.current.x, panY: panRef.current.y, scale: scaleRef.current, canvasW: cw, canvasH: ch }),
  []);


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
    const centerX = cw / 2;
    const centerY = ch / 2;

    let worldX: number;
    let worldY: number;

    if (nodes.length === 0) {
      worldX = centerX;
      worldY = centerY;
    } else {
      const GOLDEN_ANGLE = 2.39996; // 137.508° in radians
      const MIN_DX = 160;
      const MIN_DY = 60;
      let placed = false;
      let r = 0;
      worldX = centerX;
      worldY = centerY;

      for (let i = 0; i < 20; i++) {
        const angle = i * GOLDEN_ANGLE;
        r += 25;
        const cx = centerX + r * Math.cos(angle);
        const cy = centerY + r * Math.sin(angle);
        const overlap = nodes.some(n => Math.abs(n.x - cx) < MIN_DX && Math.abs(n.y - cy) < MIN_DY);
        if (!overlap) {
          worldX = cx;
          worldY = cy;
          placed = true;
          break;
        }
      }
      if (!placed) {
        worldX = centerX + (Math.random() - 0.5) * 200;
        worldY = centerY + (Math.random() - 0.5) * 200;
      }
    }

    const node: Node = {
      id: generateId(), name, content: '',
      x: worldX,
      y: worldY,
      type: newNodeType,
    };
    setNodes(prev => [...prev, node]);
    setNewNodeName('');
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    setSelectedNodes(new Set());
  };

  const deleteConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  // ── Scatter (force-directed layout) ─────────

  const resolveOverlaps = (nodeId: string, strength = 0.8) => {
    const dragged = nodes.find(n => n.id === nodeId);
    if (!dragged) return;
    const MIN_DX = 160;
    const MIN_DY = 60;
    const updates: Map<string, { dx: number; dy: number }> = new Map();

    for (const other of nodes) {
      if (other.id === nodeId) continue;
      const dx = other.x - dragged.x;
      const dy = other.y - dragged.y;
      const overlapX = MIN_DX - Math.abs(dx);
      const overlapY = MIN_DY - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      // Push the other away from dragged node
      const pushX = Math.sign(dx) * overlapX * strength;
      const pushY = Math.sign(dy) * overlapY * strength;
      updates.set(other.id, { dx: pushX, dy: pushY });
    }

    if (updates.size === 0) return;
    setNodes(prev => prev.map(n => {
      const u = updates.get(n.id);
      return u ? { ...n, x: n.x + u.dx, y: n.y + u.dy } : n;
    }));
  };

  const scatterNodes = () => {
    if (nodes.length <= 1) return;

    const c = canvasRef.current;
    const cw = c?.clientWidth ?? 800;
    const ch = c?.clientHeight ?? 600;
    const centerX = cw / 2;
    const centerY = ch / 2;

    const positions = nodes.map(n => ({ x: n.x, y: n.y }));
    const nodeIndex = new Map<string, number>();
    nodes.forEach((n, i) => nodeIndex.set(n.id, i));

    for (let iter = 0; iter < 100; iter++) {
      const forces = positions.map(() => ({ fx: 0, fy: 0 }));
      const damping = Math.pow(0.97, iter);

      // Repulsion: all node pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);
          const force = 50000 / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          forces[i].fx -= fx;
          forces[i].fy -= fy;
          forces[j].fx += fx;
          forces[j].fy += fy;
        }
      }

      // Attraction: connected node pairs
      for (const conn of connections) {
        const i = nodeIndex.get(conn.fromId);
        const j = nodeIndex.get(conn.toId);
        if (i === undefined || j === undefined) continue;
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = (dist - 200) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[i].fx += fx;
        forces[i].fy += fy;
        forces[j].fx -= fx;
        forces[j].fy -= fy;
      }

      // Center gravity + clamp + apply
      for (let i = 0; i < nodes.length; i++) {
        forces[i].fx += (centerX - positions[i].x) * 0.001;
        forces[i].fy += (centerY - positions[i].y) * 0.001;

        const stepX = Math.max(-50, Math.min(50, forces[i].fx * damping));
        const stepY = Math.max(-50, Math.min(50, forces[i].fy * damping));
        positions[i].x += stepX;
        positions[i].y += stepY;
      }
    }

    setNodes(nodes.map((n, i) => ({ ...n, x: positions[i].x, y: positions[i].y })));
  };

  // ── Search ───────────────────────────────────

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    const found = nodes.find(n => n.name.includes(q));
    if (!found) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { panX, panY } = panToCenter(found.x, found.y, {
      panX: panRef.current.x, panY: panRef.current.y,
      scale: scaleRef.current,
      canvasW: canvas.clientWidth,
      canvasH: canvas.clientHeight,
    });
    setPan({ x: panX, y: panY });
    setSelectedNodes(new Set([found.id]));
  };

  // ── Pan & Zoom ──

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

  // ── Node Drag (world-space delta — scale-invariant) ──

  const dragState = useRef<{
    nodeId: string;
    worldX: number;
    worldY: number;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const el = e.currentTarget as HTMLDivElement;
    el.setPointerCapture(e.pointerId);
    el.style.zIndex = '50';
    el.style.touchAction = 'none';

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    dragState.current = {
      nodeId,
      worldX: node.x,
      worldY: node.y,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;

    if (!ds.active) {
      const dx = Math.abs(e.clientX - ds.startX);
      const dy = Math.abs(e.clientY - ds.startY);
      if (dx < 3 && dy < 3) return;
      ds.active = true;
    }

    const el = nodeEls.current.get(ds.nodeId);
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const sc = scaleRef.current;
    // Screen delta / scale = world delta. Zoom-invariant.
    const worldDX = (e.clientX - ds.startX) / sc;
    const worldDY = (e.clientY - ds.startY) / sc;
    const newWorldX = ds.worldX + worldDX;
    const newWorldY = ds.worldY + worldDY;

    setNodes(prev => prev.map(n => n.id === ds.nodeId ? { ...n, x: newWorldX, y: newWorldY } : n));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    if (ds.active) {
      const el = nodeEls.current.get(ds.nodeId);
      if (el) { el.style.zIndex = ''; }
      // Push overlapping neighbors away from dropped node
      resolveOverlaps(ds.nodeId);
    }
    dragState.current = null;
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const el = nodeEls.current.get(ds.nodeId);
    if (el) { el.style.zIndex = ''; }
    dragState.current = null;
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

  // ── Backlinks ─────────────────────────────────

  const selectedArray = Array.from(selectedNodes);
  const focusedNodeId = selectedArray.length === 1 ? selectedArray[0] : null;

  const backlinks = focusedNodeId
    ? connections
        .filter(c => c.fromId === focusedNodeId || c.toId === focusedNodeId)
        .map(c => {
          const otherId = c.fromId === focusedNodeId ? c.toId : c.fromId;
          const otherNode = nodes.find(n => n.id === otherId);
          return { connection: c, otherNode, direction: c.fromId === focusedNodeId ? 'out' as const : 'in' as const };
        })
        .filter(b => b.otherNode)
    : [];

  const orphanCount = nodes.filter(n => {
    return !connections.some(c => c.fromId === n.id || c.toId === n.id);
  }).length;

  // ── Render ────────────────────────────────────

  const canvas = canvasRef.current;
  const cw = canvas?.clientWidth ?? 800;
  const ch = canvas?.clientHeight ?? 600;

  const nodeStyle = (node: Node): React.CSSProperties => {
    const sz = getNodeSize(node.id);
    return {
      left: 0, top: 0,
      transform: nodeTransform(node.x, node.y, sz, {
        panX: panRef.current.x, panY: panRef.current.y,
        scale,
        canvasW: cw, canvasH: ch,
      }),
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
                    placeholder="搜索节点名称..."
                    className="w-40 pl-9 pr-3 py-2 rounded-xl border-2 border-amber-200
                             focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100
                             bg-white/90 text-amber-900 placeholder-amber-400 text-sm transition-all"
                  />
                </div>
                <input type="text" value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNode()}
                  placeholder="添加节点，输入名称后按 Enter 或点击右侧添加按钮"
                  className="flex-1 sm:w-64 px-4 py-2 rounded-xl border-2 border-amber-200
                           focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100
                           bg-white/90 text-amber-900 placeholder-amber-400 transition-all"
                />
                {/* Node type picker */}
                <div className="relative">
                  <button onClick={() => setShowTypePicker(!showTypePicker)}
                    style={{
                      backgroundColor: NODE_TYPE_COLORS[newNodeType].hover,
                      color: NODE_TYPE_COLORS[newNodeType].text,
                      borderColor: NODE_TYPE_COLORS[newNodeType].bg,
                    }}
                    className="px-3 py-2 rounded-xl border-2 text-sm font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS[newNodeType].bg }} />
                    {NODE_TYPE_COLORS[newNodeType].label}
                  </button>
                  {showTypePicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowTypePicker(false)} />
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 flex gap-1">
                        {NODE_TYPE_OPTIONS.map(t => {
                          const c = NODE_TYPE_COLORS[t];
                          const sel = t === newNodeType;
                          return (
                            <button key={t}
                              onClick={() => { setNewNodeType(t); setShowTypePicker(false); }}
                              style={{
                                backgroundColor: sel ? c.bg : c.hover,
                                color: sel ? '#fff' : c.text,
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors hover:brightness-95"
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => addNode()}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl
                           font-medium shadow-lg shadow-amber-200 hover:shadow-amber-300
                           transition-all flex items-center gap-2">
                  <Plus size={18} /><span className="hidden sm:inline">添加</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={undo} disabled={!canUndo}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    canUndo ? 'bg-white hover:bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300'
                    : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
                  title="撤销 (Ctrl+Z)">
                  <Undo2 size={20} />
                </button>
                <button onClick={redo} disabled={!canRedo}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    canRedo ? 'bg-white hover:bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300'
                    : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
                  title="重做 (Ctrl+Shift+Z)">
                  <Redo2 size={20} />
                </button>
                <button onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
                  className="p-2 bg-white hover:bg-amber-50 text-amber-600 rounded-xl
                           border-2 border-amber-200 hover:border-amber-300 transition-all"
                  title="重置视图">
                  <RotateCcw size={20} />
                </button>
                <button onClick={scatterNodes} disabled={nodes.length <= 1}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    nodes.length > 1 ? 'bg-white hover:bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300'
                    : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
                  title="分散布局">
                  <Shuffle size={20} />
                </button>
                <button
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    showAIPanel
                      ? 'bg-purple-100 text-purple-600 border-purple-300'
                      : 'bg-white hover:bg-purple-50 text-purple-500 border-purple-200 hover:border-purple-300'
                  }`}
                  title="AI 助手">
                  <BrainCircuit size={20} />
                </button>
                <button onClick={() => {
                  const data = JSON.stringify({ nodes, connections, name: notebook.name }, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `mindmap-${notebook.name}-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                  className="p-2 bg-white hover:bg-amber-50 text-amber-600 rounded-xl
                           border-2 border-amber-200 hover:border-amber-300 transition-all"
                  title="导出当前链接本">
                  <Download size={20} />
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70]
                      bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100
                      px-4 py-3 flex flex-col gap-3 min-w-[320px]">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="text-amber-700 font-medium">已选择 {selectedNodes.size} 个节点</span>
            <button onClick={() => setSelectedNodes(new Set())}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center gap-2">
              <X size={16} />清空选中
            </button>
            {selectedNodes.size === 1 && <>
              <button onClick={() => setShowBacklinks(true)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium shadow-md transition-all flex items-center gap-2">
                <ListTree size={16} />查看关联
              </button>
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
                  <div className="flex items-center gap-1 shrink-0">
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

      {/* Backlinks panel */}
      {showBacklinks && focusedNodeId && (
        <div className="fixed left-4 top-24 z-50 w-80 max-h-[70vh] bg-white/95 backdrop-blur-sm
                      rounded-2xl shadow-xl border border-amber-200 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <ListTree size={18} />
              {getNodeName(focusedNodeId)}
            </h3>
            <button onClick={() => setShowBacklinks(false)}
              className="text-white/80 hover:text-white"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Link2 size={14} />
              <span>{backlinks.length} 条关联</span>
            </div>
            {backlinks.length === 0 ? (
              <p className="text-sm text-amber-400 text-center py-4">此节点尚未与其他节点建立联系</p>
            ) : (
              backlinks.map(({ connection, otherNode, direction }) => (
                <div key={connection.id}
                  className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-amber-500 flex items-center gap-1">
                      {direction === 'out' ? '→' : '←'} {otherNode!.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingConnection(connection);
                          setShowConnectionModal(true);
                        }}
                        className="p-1 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
                        title="编辑联系内容"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          // Jump to the other node
                          const canvas = canvasRef.current;
                          if (!canvas) return;
                          const { panX, panY } = panToCenter(otherNode!.x, otherNode!.y, {
                            panX: panRef.current.x, panY: panRef.current.y,
                            scale: scaleRef.current,
                            canvasW: canvas.clientWidth,
                            canvasH: canvas.clientHeight,
                          });
                          setPan({ x: panX, y: panY });
                          setSelectedNodes(new Set([otherNode!.id]));
                        }}
                        className="p-1 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
                        title="跳转到此节点"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                  {connection.content ? (
                    <p className="text-sm text-amber-800 whitespace-pre-wrap">{connection.content}</p>
                  ) : (
                    <p className="text-sm text-amber-400 italic">无联系说明</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
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
        {/* SVG connections — behind nodes (lower z-index) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.fromId);
            const toNode = nodes.find(n => n.id === conn.toId);
            if (!fromNode || !toNode) return null;
            const ft = screenPos(fromNode.x, fromNode.y, cw, ch);
            const tt = screenPos(toNode.x, toNode.y, cw, ch);
            const isHovered = hoveredConnId === conn.id;
            return (
              <g key={conn.id}>
                {/* Invisible wide hit area */}
                <line
                  x1={ft.x} y1={ft.y} x2={tt.x} y2={tt.y}
                  stroke="transparent" strokeWidth={16}
                  style={{ pointerEvents: 'stroke' }}
                  onMouseEnter={(e) => {
                    setHoveredConnId(conn.id);
                    setHoveredConnPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => setHoveredConnPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredConnId(null)}
                />
                {/* Visible line */}
                <line
                  x1={ft.x} y1={ft.y} x2={tt.x} y2={tt.y}
                  stroke={isHovered ? '#f59e0b' : '#d97706'}
                  strokeWidth={isHovered ? 5 * scale : 3 * scale}
                  strokeLinecap="round"
                  opacity={isHovered ? 1 : 0.6}
                />
              </g>
            );
          })}
        </svg>

        {/* Connection hover tooltip */}
        {hoveredConnId && (() => {
          const conn = connections.find(c => c.id === hoveredConnId);
          if (!conn) return null;
          const fromName = getNodeName(conn.fromId);
          const toName = getNodeName(conn.toId);
          return (
            <div
              className="fixed pointer-events-none z-[60]"
              style={{
                left: hoveredConnPos.x + 14,
                top: hoveredConnPos.y - 12,
              }}
            >
              <div className="bg-white rounded-xl shadow-2xl border border-amber-200 px-3 py-2 max-w-xs">
                <p className="text-xs font-semibold text-amber-800">
                  {fromName} —— {toName}
                </p>
                {conn.content && (
                  <p className="text-xs text-amber-600 mt-1 whitespace-pre-wrap">{conn.content}</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Nodes */}
        {nodes.map(node => {
          const sel = selectedNodes.has(node.id);
          const colors = NODE_TYPE_COLORS[node.type || 'concept'];
          return (
            <div
              key={node.id}
              ref={(el) => { if (el) nodeEls.current.set(node.id, el); }}
              onPointerDown={(e) => handlePointerDown(e, node.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => handleNodeClick(e, node.id)}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={sel ? { ...nodeStyle(node), backgroundColor: colors.bg, zIndex: 10, boxShadow: `0 0 0 4px ${colors.ring}` } : { ...nodeStyle(node), backgroundColor: colors.ring, zIndex: 2, borderLeftColor: colors.bg }}
              className={`absolute origin-center cursor-move min-w-[120px] px-4 py-3 rounded-2xl shadow-lg border-l-4
                        ${sel ? 'text-white scale-110' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Move size={14} className={sel ? 'text-white' : ''} style={{ color: sel ? undefined : colors.icon }} />
                <span className={`font-medium ${sel ? 'text-white' : ''}`} style={{ color: sel ? undefined : colors.text }}>{node.name}</span>
              </div>
            </div>
          );
        })}

        {/* Hover tooltip */}
        {hoveredId && nodes.find(n => n.id === hoveredId)?.content && (() => {
          const node = nodes.find(n => n.id === hoveredId)!;
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

      {showAIPanel && (
        <AIPanel
          nodes={nodes}
          connections={connections}
          selectedNodes={selectedNodes}
          getNodeName={getNodeName}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      {/* Modals */}
      {editingNode && (
        <EditNodeModal
          node={editingNode}
          onSave={(updated) => { setNodes(prev => prev.map(n => n.id === updated.id ? updated : n)); setSelectedNodes(new Set()); }}
          onClose={() => setEditingNode(null)}
        />
      )}

      {duplicateName && (
        <DuplicateModal
          name={duplicateName}
          onForceAdd={() => addNode(true)}
          onClose={() => setDuplicateName(null)}
        />
      )}

      {editingConnection && showConnectionModal && (
        <EditConnectionModal
          connection={editingConnection}
          fromName={getNodeName(editingConnection.fromId)}
          toName={getNodeName(editingConnection.toId)}
          onSave={(c) => setConnections(prev => prev.map(x => x.id === c.id ? c : x))}
          onDelete={deleteConnection}
          onClose={() => { setShowConnectionModal(false); setEditingConnection(null); }}
        />
      )}
    </div>
  );
}
