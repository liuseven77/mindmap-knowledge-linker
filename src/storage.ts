import type { Notebook } from './types';

export interface NotebookStorage {
  load(): Notebook[];
  save(notebooks: Notebook[]): void;
}

const KEY = 'mindmap_notebooks';

class LocalStorageAdapter implements NotebookStorage {
  load(): Notebook[] {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }

  save(notebooks: Notebook[]): void {
    localStorage.setItem(KEY, JSON.stringify(notebooks));
  }
}

export const storage: NotebookStorage = new LocalStorageAdapter();
