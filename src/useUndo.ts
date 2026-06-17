import { useState, useRef, useCallback, useEffect } from 'react';
import type { Node, Connection } from '../types';

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

  // Auto-snapshot after state changes
  useEffect(() => {
    if (freeze.current) return;
    const snap = { nodes, connections };
    undoStack.current.push(snap);
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [nodes, connections]);

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

  return { nodes, connections, setNodes, setConnections, undo, redo, canUndo, canRedo };
}
