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
    try {
      localStorage.setItem(KEY, JSON.stringify(notebooks));
    } catch (err) {
      // 兜底：localStorage 约 5MB 上限，写满时不能静默崩溃丢数据
      console.error('保存失败：本地存储可能已满', err);
      window.alert('保存失败：浏览器本地存储空间已满（约 5MB）。请先导出备份数据，或删除不用的笔记本后重试。');
    }
  }
}

export const storage: NotebookStorage = new LocalStorageAdapter();
