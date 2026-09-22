export const DATABASE = "catane-frontiers-campaigns";
export const STORE = "saves";
export interface SaveRecord {
  revision: string;
  savedAt: number;
  bytes: Uint8Array<ArrayBuffer>;
}
let opening: Promise<IDBDatabase> | undefined;
export function openDatabase(): Promise<IDBDatabase> {
  if (!opening)
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Campaign storage is blocked by another tab."));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = undefined;
        };
        resolve(db);
      };
    }).catch((error) => {
      opening = undefined;
      throw error;
    });
  return opening;
}
export async function readRecords(): Promise<(SaveRecord | undefined)[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly"),
      store = transaction.objectStore(STORE);
    const primary = store.get("primary"),
      backup = store.get("backup");
    transaction.oncomplete = () => resolve([primary.result, backup.result]);
    transaction.onabort = () => reject(transaction.error);
  });
}
/** Backup and primary commit atomically. Reject another tab's newer save. */
export async function writeRecord(
  record: SaveRecord,
  expected: string | undefined,
  preserveBackup: boolean,
  initialBackup?: SaveRecord,
) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite", {
      durability: "strict",
    });
    const store = transaction.objectStore(STORE),
      previous = store.get("primary");
    let conflict = false;
    previous.onsuccess = () => {
      if (previous.result?.revision !== expected) {
        conflict = true;
        transaction.abort();
        return;
      }
      if (previous.result && !preserveBackup)
        store.put(previous.result, "backup");
      else if (!previous.result && initialBackup)
        store.put(initialBackup, "backup");
      store.put(record, "primary");
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        new Error(
          conflict
            ? "Another tab saved a newer campaign. Export this game before reloading."
            : "Automatic saving is unavailable or storage is full. Export your game to keep it safe.",
        ),
      );
  });
}
