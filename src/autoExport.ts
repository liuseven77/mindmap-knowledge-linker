/**
 * Auto-export: periodically saves all notebooks as JSON to a user-selected folder.
 * Uses the File System Access API — user picks a folder once, then auto-save is invisible.
 */

const HANDLE_KEY = 'mindmap_autoexport_handle';

export async function pickExportFolder(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    // Persist the handle in IndexedDB so it survives reloads
    const db = await openDb();
    await storeHandle(db, dirHandle);
    db.close();
    return true;
  } catch {
    return false; // user cancelled or API not supported
  }
}

export async function autoExportIfEnabled(data: unknown): Promise<void> {
  const handle = await getStoredHandle();
  if (!handle) return;

  try {
    // Verify permission still valid
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      const req = await handle.requestPermission({ mode: 'readwrite' });
      if (req !== 'granted') {
        clearHandle();
        return;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `mindmap-backup-${timestamp}.json`;
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch {
    // Silently fail — auto-export is a safety net, not a hard requirement
  }
}

export async function isAutoExportEnabled(): Promise<boolean> {
  const handle = await getStoredHandle();
  if (!handle) return false;
  try {
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}

export async function disableAutoExport(): Promise<void> {
  await clearHandle();
}

// ── IndexedDB helpers (stores directory handles) ──

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('mindmap_autoexport', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('handles'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeHandle(db: IDBDatabase, handle: FileSystemDirectoryHandle): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function clearHandle(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete(HANDLE_KEY);
    tx.oncomplete = () => db.close();
  } catch { /* ignore */ }
}
