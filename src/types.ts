// ─── Types ──────────────────────────────────────────

export interface Node {
  id: string;
  name: string;
  content: string;
  x: number;
  y: number;
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

export const NOTEBOOKS_KEY = 'mindmap_notebooks';

export const generateId = () => Math.random().toString(36).substring(2, 15);

export function loadNotebooks(): Notebook[] {
  try { return JSON.parse(localStorage.getItem(NOTEBOOKS_KEY) || '[]'); }
  catch { return []; }
}

export function saveNotebooks(nb: Notebook[]) {
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(nb));
}
