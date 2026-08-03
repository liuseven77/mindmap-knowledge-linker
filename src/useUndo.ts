import { useState, useRef, useCallback, useEffect } from 'react';
import type { Node, Connection } from './types';

interface Snapshot {
  nodes: Node[];
  connections: Connection[];
}

export function useUndo(initialNodes: Node[], initialConnections: Connection[]) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [connections, setConnections] = useState<Connection[]>(initialConnections);

  const undoStack = useRef<Snapshot[]>([{ nodes: initialNodes, connections: initialConnections }]);
  const redoStack = useRef<Snapshot[]>([]);
  const freeze = useRef(false);
  const skipInitial = useRef(true);
  const batchDepth = useRef(0);

  // 始终指向最近一次渲染的状态，供 endBatch 在闭包外取用最新值
  const latestRef = useRef({ nodes: initialNodes, connections: initialConnections });
  latestRef.current = { nodes, connections };

  // Auto-snapshot after state changes
  useEffect(() => {
    if (skipInitial.current) { skipInitial.current = false; return; }
    if (freeze.current) return;
    if (batchDepth.current > 0) return; // 批量操作（如拖拽）期间不逐帧入栈
    const snap = { nodes, connections };
    undoStack.current.push(snap);
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [nodes, connections]);

  /** 开始一批连续变更：期间的状态变化合并为一步撤销（拖拽 = 一步） */
  const beginBatch = useCallback(() => {
    batchDepth.current++;
  }, []);

  /** 结束批量变更：把最新状态作为一步快照入栈 */
  const endBatch = useCallback(() => {
    batchDepth.current = Math.max(0, batchDepth.current - 1);
    if (batchDepth.current > 0) return;
    const { nodes: n, connections: c } = latestRef.current;
    const top = undoStack.current[undoStack.current.length - 1];
    const unchanged = top && top.nodes === n && top.connections === c;
    if (unchanged) return; // 没有实际变化（如点击未拖动），不入栈
    undoStack.current.push({ nodes: n, connections: c });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length <= 1) return;
    const current = undoStack.current.pop()!;
    redoStack.current.push(current);
    const prev = undoStack.current[undoStack.current.length - 1];
    freeze.current = true;
    // Need to copy since we mutate stacks based on ref identity
    setNodes(prev.nodes.map(n => ({ ...n })));
    setConnections(prev.connections.map(c => ({ ...c })));
    setTimeout(() => { freeze.current = false; }, 0);
  }, []);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(next);
    freeze.current = true;
    setNodes(next.nodes.map(n => ({ ...n })));
    setConnections(next.connections.map(c => ({ ...c })));
    setTimeout(() => { freeze.current = false; }, 0);
  }, []);

  const canUndo = undoStack.current.length > 1;
  const canRedo = redoStack.current.length > 0;

  return { nodes, connections, setNodes, setConnections, undo, redo, canUndo, canRedo, beginBatch, endBatch };
}
