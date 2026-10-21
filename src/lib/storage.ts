// Offline-first storage engine (IndexedDB + safe localStorage mirror)
// & Smart client-side photo compression for iOS PWA / IPA

export const DB_NAME = "noticed_atelier_db";
const LEGACY_DB_NAME = "sidenotes_atelier_db";
const DB_VERSION = 1;
const STORE_NAME = "kv_store";

function openNamedDB(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = window.indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openAtelierDB(): Promise<IDBDatabase> {
  return openNamedDB(DB_NAME);
}

function getFromDB<T>(db: IDBDatabase, storeKey: string): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(storeKey);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function loadFromAtelierDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openAtelierDB();
    let result = await getFromDB<T>(db, key);
    if (result !== null && result !== undefined) {
      return result;
    }

    // Check alternate key namespace (noticed_* <-> sidenotes_*) in modern DB
    const alternateKey = key.startsWith("noticed_")
      ? key.replace(/^noticed_/, "sidenotes_")
      : key.replace(/^sidenotes_/, "noticed_");

    if (alternateKey !== key) {
      result = await getFromDB<T>(db, alternateKey);
      if (result !== null && result !== undefined) {
        // Auto-migrate to current key in modern DB
        await saveToAtelierDB(key, result);
        return result;
      }
    }

    // Check legacy DB (sidenotes_atelier_db) for backward compatibility
    try {
      const legacyDb = await openNamedDB(LEGACY_DB_NAME);
      let legacyResult = await getFromDB<T>(legacyDb, key);
      if (legacyResult === null && alternateKey !== key) {
        legacyResult = await getFromDB<T>(legacyDb, alternateKey);
      }
      if (legacyResult !== null && legacyResult !== undefined) {
        // Seamlessly migrate legacy data to modern DB
        await saveToAtelierDB(key, legacyResult);
        return legacyResult;
      }
    } catch {
      // Legacy DB may not exist on fresh installs
    }

    return null;
  } catch {
    return null;
  }
}

export async function saveToAtelierDB<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openAtelierDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback handled by safeLocalStorageSet
  }
}

export async function clearAtelierDB(): Promise<void> {
  try {
    const db = await openAtelierDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Also attempt to clear legacy DB if present
    try {
      const legacyDb = await openNamedDB(LEGACY_DB_NAME);
      await new Promise<void>((resolve, reject) => {
        const tx = legacyDb.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Ignore if unavailable
    }
  } catch {
    // Ignore if unavailable
  }
}

/**
 * Safely writes JSON to localStorage without throwing QuotaExceededError
 */
export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    // Mirror legacy key if modern key was passed so any remaining legacy code doesn't fail
    const legacyKey = key.replace(/^noticed_/, "sidenotes_");
    if (legacyKey !== key) {
      try {
        localStorage.setItem(legacyKey, value);
      } catch {
        // Ignore quota limits for legacy mirror
      }
    }
  } catch {
    // When photos exceed the ~5MB localStorage quota, IndexedDB holds the full dataset
  }
}

/**
 * Safely reads from localStorage with backward-compatible legacy fallback
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const current = localStorage.getItem(key);
  if (current !== null) return current;

  // Check legacy alternative (e.g. noticed_spaces -> sidenotes_spaces)
  const legacyKey = key.startsWith("noticed_")
    ? key.replace(/^noticed_/, "sidenotes_")
    : key.replace(/^sidenotes_/, "noticed_");

  if (legacyKey !== key) {
    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      try {
        localStorage.setItem(key, legacy);
      } catch {
        // Ignore quota limits
      }
      return legacy;
    }
  }
  return null;
}

/**
 * Safely removes key and its legacy mirror from localStorage
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
    const legacyKey = key.replace(/^noticed_/, "sidenotes_");
    if (legacyKey !== key) {
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // Ignore if unavailable
  }
}

/**
 * Compresses an image File on the client via HTML5 Canvas (max 1600px, quality 0.82)
 * Reduces 5-8MB camera photos to ~120-180KB DataURLs while preserving crisp editorial detail.
 */
export function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        resolve("");
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
