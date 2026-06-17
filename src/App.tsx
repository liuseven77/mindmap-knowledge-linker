import { useState } from 'react';
import type { Node, Connection, Notebook } from './types';
import { generateId } from './types';
import { storage } from './storage';
import { HomeScreen } from './components/HomeScreen';
import { MindMap } from './components/MindMap';

export default function App() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleCreate = (name: string) => {
    const notebooks = storage.load();
    const nb: Notebook = {
      id: generateId(),
      name,
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    notebooks.push(nb);
    storage.save(notebooks);
    setActiveId(nb.id);
  };

  const handleUpdate = (nodes: Node[], connections: Connection[]) => {
    const notebooks = storage.load();
    const idx = notebooks.findIndex(n => n.id === activeId);
    if (idx >= 0) {
      notebooks[idx].nodes = nodes;
      notebooks[idx].connections = connections;
      notebooks[idx].updatedAt = new Date().toISOString();
      storage.save(notebooks);
    }
  };

  if (activeId) {
    const notebook = storage.load().find(n => n.id === activeId);
    if (!notebook) { setActiveId(null); return null; }
    return <MindMap notebook={notebook} onUpdate={handleUpdate} onBack={() => setActiveId(null)} />;
  }

  return <HomeScreen onCreate={handleCreate} onOpen={setActiveId} />;
}
