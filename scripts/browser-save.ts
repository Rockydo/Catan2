import type { Page } from "@playwright/test";
import { SAVE_KEY } from "../src/game/save";

/** Read only. Supports both releases when comparing disposable browser runs. */
export async function browserSave(page: Page): Promise<string | null> {
  return page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase | null>((resolve) => {
      const r = indexedDB.open("catane-frontiers-campaigns", 1);
      r.onupgradeneeded = () => {
        r.transaction?.abort();
        resolve(null);
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    });
    if (db) {
      try {
        const record = await new Promise<any>((resolve, reject) => {
          const r = db.transaction("saves").objectStore("saves").get("primary");
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        if (record)
          return await new Response(
            new Blob([record.bytes])
              .stream()
              .pipeThrough(new DecompressionStream("gzip")),
          ).text();
      } finally {
        db.close();
      }
    }
    return localStorage.getItem(key);
  }, SAVE_KEY);
}
