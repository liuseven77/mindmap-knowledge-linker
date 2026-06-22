// ─── Types ──────────────────────────────────────────

export type NodeType = 'concept' | 'fact' | 'question' | 'source' | 'person';

export const NODE_TYPE_COLORS: Record<NodeType, { bg: string; text: string; icon: string; ring: string; hover: string; label: string }> = {
  concept:  { bg: '#8B5CF6', text: '#6D28D9', icon: '#8B5CF6', ring: '#C4B5FD', hover: '#F5F3FF', label: '概念' },
  fact:     { bg: '#3B82F6', text: '#1D4ED8', icon: '#3B82F6', ring: '#BFDBFE', hover: '#EFF6FF', label: '事实' },
  question: { bg: '#F59E0B', text: '#B45309', icon: '#F59E0B', ring: '#FDE68A', hover: '#FFFBEB', label: '问题' },
  source:   { bg: '#10B981', text: '#047857', icon: '#10B981', ring: '#A7F3D0', hover: '#ECFDF5', label: '来源' },
  person:   { bg: '#EF4444', text: '#B91C1C', icon: '#EF4444', ring: '#FECACA', hover: '#FEF2F2', label: '人物' },
};

export const NODE_TYPE_OPTIONS: NodeType[] = ['concept', 'fact', 'question', 'source', 'person'];

export interface Node {
  id: string;
  name: string;
  content: string;
  x: number;
  y: number;
  type?: NodeType;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  content: string;
}

export interface Notebook {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ────────────────────────────────────────

export const generateId = () => Math.random().toString(36).substring(2, 15);
