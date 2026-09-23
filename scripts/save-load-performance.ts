import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { compress, importSave } from "../src/storage/codec";
import { serialize, serializePacked } from "../src/game/save";
import { packGame } from "../src/game/save-packing";
import { hash } from "../src/game/world";

// Compare original JSON, the first template format, and current table packing.
// Uses a disposable browser profile, never the player's storage or export.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const game = await importSave(readFileSync(process.env.SAVE_PATH));
const expected = JSON.stringify(game);
const templateGame = packGame(game);
const template = JSON.stringify({
  format: "catane-frontiers-packed",
  version: 14,
  packing: 1,
  savedAt: new Date().toISOString(),
  checksum: hash(JSON.stringify(templateGame)).toString(16),
  game: templateGame,
});
const encodings = {
  legacy: Array.from(await compress(serialize(game))),
  templates: Array.from(await compress(template)),
  packed: Array.from(await compress(serializePacked(game))),
};
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const w = window as any,
      Native = window.Worker;
    localStorage.setItem("catane-language", "en");
    w.loadMs = 0;
    // Record the actual menu appearance, independent of Playwright's polling.
    new MutationObserver(() => {
      if (
        !w.readyMs &&
        Array.from(document.querySelectorAll("button")).some((b) =>
          b.textContent?.startsWith("Continue campaign"),
        )
      )
        w.readyMs = performance.now();
    }).observe(document, { childList: true, subtree: true });
    window.Worker = class extends Native {
      started = 0;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (!String(url).includes("save.worker")) return;
        this.addEventListener("message", ({ data }) => {
          if (data.type === "load") {
            w.loadMs = performance.now() - this.started;
            w.loadedGame = data.result?.game;
          }
        });
      }
      postMessage(data: any) {
        if (data.type === "load") this.started = performance.now();
        super.postMessage(data);
      }
    };
  });
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4173");
  await page
    .getByRole("button", { name: "New campaign", exact: true })
    .waitFor();
  const samples: { format: string; loadMs: number; readyMs: number }[] = [];
  for (const format of [
    "legacy",
    "templates",
    "packed",
    "packed",
    "templates",
    "legacy",
    "legacy",
    "packed",
    "templates",
  ] as const) {
    await page.evaluate(async (bytes) => {
      localStorage.removeItem("catane-frontiers-save-v1");
      localStorage.removeItem("catane-frontiers-backup-v1");
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("catane-frontiers-campaigns", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const t = db.transaction("saves", "readwrite"),
            store = t.objectStore("saves");
          store.clear();
          store.put(
            {
              revision: crypto.randomUUID(),
              savedAt: Date.now(),
              bytes: new Uint8Array(bytes),
            },
            "primary",
          );
          t.oncomplete = () => resolve();
          t.onabort = () => reject(t.error);
        });
      } finally {
        db.close();
      }
    }, encodings[format]);
    await page.reload();
    await page.getByRole("button", { name: /Continue campaign/ }).waitFor();
    const result = await page.evaluate(() => {
      const w = window as any;
      return {
        loadMs: w.loadMs,
        readyMs: w.readyMs,
        game: JSON.stringify(w.loadedGame),
      };
    });
    if (result.game !== expected) throw Error("Reload changed the campaign.");
    samples.push({ format, loadMs: result.loadMs, readyMs: result.readyMs });
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  const median = (format: string) =>
    samples
      .filter((s) => s.format === format)
      .map((s) => s.readyMs)
      .sort((a, b) => a - b)[1];
  const report = {
    tiles: Object.keys(game.tiles).length,
    towns: Object.keys(game.towns).length,
    units: Object.keys(game.pieces).length,
    legacyBytes: encodings.legacy.length,
    templateBytes: encodings.templates.length,
    packedBytes: encodings.packed.length,
    legacyMedianReadyMs: median("legacy"),
    templateMedianReadyMs: median("templates"),
    packedMedianReadyMs: median("packed"),
    samples,
    exactRoundTrip: true,
    errors,
  };
  const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
  mkdirSync("test-artifacts", { recursive: true });
  writeFileSync(
    `test-artifacts/save-load-${label}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
