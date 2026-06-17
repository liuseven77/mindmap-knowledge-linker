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

export const generateId = () => Math.random().toString(36).substring(2, 15);
