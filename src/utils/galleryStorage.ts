// IndexedDB-backed gallery storage for saved generation trios.
// localStorage 装不下大尺寸拼豆 PNG,改用 IndexedDB。

const DB_NAME = 'pixel-bead-gallery';
const STORE = 'entries';
const DB_VERSION = 1;

export interface GalleryEntry {
  id: string;
  createdAt: number;
  category: string;
  name: string;
  tags: string[];
  original: string;
  anime: string | null;
  bead: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGalleryEntry(entry: GalleryEntry): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getAllGalleryEntries(): Promise<GalleryEntry[]> {
  const db = await openDb();
  try {
    return await new Promise<GalleryEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const idx = tx.objectStore(STORE).index('createdAt');
      const req = idx.openCursor(null, 'prev');
      const results: GalleryEntry[] = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value as GalleryEntry);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteGalleryEntry(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function clearGallery(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function makeEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 跟踪精选清单里已导入的 URL(用 localStorage,避免重复导入)
const IMPORTED_URLS_KEY = 'pixel-bead:imported-curated-urls';

export function getImportedCuratedUrls(): Set<string> {
  try {
    const raw = localStorage.getItem(IMPORTED_URLS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markCuratedUrlImported(url: string): void {
  try {
    const set = getImportedCuratedUrls();
    set.add(url);
    localStorage.setItem(IMPORTED_URLS_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage 不可用时静默失败,下次还会重试
  }
}

export function clearImportedCuratedUrls(): void {
  try {
    localStorage.removeItem(IMPORTED_URLS_KEY);
  } catch {
    // 静默
  }
}
