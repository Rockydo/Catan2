import { chromium } from "@playwright/test";
import { build } from "vite";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { compress, importSave } from "../src/storage/codec";
import { serializePacked } from "../src/game/save";

// Exercise the actual client/worker protocol after refresh. A disposable browser
// and a private copy of the export keep the playing campaign untouched. The
// small edit is only a diagnostic position, not a played turn or an AI decision.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const game = await importSave(readFileSync(process.env.SAVE_PATH));
const expected = JSON.stringify(game);
const bytes = Array.from(await compress(serializePacked(game)));
const entry = resolve(process.env.SOURCE_ROOT ?? ".", "src/storage/client.ts");
// Use the worker URL from the tested build, while bundling its corresponding
// real client. No approximation of snapshot comparison or save scheduling.
const bundle = await build({
  configFile: false,
  logLevel: "silent",
  plugins: [
    {
      name: "diagnostic-worker-url",
      transform(source, id) {
        if (id !== entry) return;
        return source.replace(
          'new URL("./save.worker.ts", import.meta.url)',
          "globalThis.__saveWorkerURL",
        );
      },
    },
  ],
  build: {
    write: false,
    minify: false,
    lib: { entry, name: "saveClient", formats: ["iife"] },
  },
});
const output = (Array.isArray(bundle) ? bundle : [bundle]).flatMap((result) =>
  "output" in result ? result.output : [],
);
const code = output.find((item) => item.type === "chunk")!.code;
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const samples = [];
const errors: string[] = [];
try {
  for (let i = 0; i < 3; i++) {
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const w = window as any,
        Native = window.Worker;
      localStorage.setItem("catane-language", "en");
      w.transferPosts = [];
      window.Worker = class extends Native {
        saving = false;
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.saving = String(url).includes("save.worker");
          if (this.saving) w.__saveWorkerURL = String(url);
        }
        postMessage(data: any) {
          const start = performance.now();
          super.postMessage(data);
          if (this.saving && w.measureTransfers)
            w.transferPosts.push({
              type: data.type,
              full: !!data.game,
              delta: !!data.delta,
              ms: performance.now() - start,
            });
        }
      };
    });
    await page.addInitScript({
      content: `${code}\nglobalThis.saveClient = saveClient;`,
    });
    await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4173");
    await page
      .getByRole("button", { name: "New campaign", exact: true })
      .waitFor();
    await page.evaluate(async (bytes) => {
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
              revision: "diagnostic",
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
    }, bytes);
    const result = await page.evaluate(async () => {
      const w = window as any,
        client = w.saveClient;
      w.measureTransfers = true;
      const start = performance.now();
      const loaded = await client.loadCampaign();
      const loadMs = performance.now() - start;
      const loadedText = JSON.stringify(loaded.game);
      const exportStart = performance.now();
      const archive = await client.exportCampaign(loaded.game);
      const exportMs = performance.now() - exportStart;
      const repeatStart = performance.now();
      const repeated = await client.exportCampaign(loaded.game);
      const repeatExportMs = performance.now() - repeatStart;
      const game = { ...loaded.game, actions: loaded.game.actions + 1 };
      const saveStart = performance.now();
      let sawPending = false;
      const done = new Promise<void>((resolve, reject) => {
        const stop = client.observeSaving((error: string, pending: boolean) => {
          if (error) {
            stop();
            reject(Error(error));
          }
          if (pending) sawPending = true;
          if (!pending && sawPending) {
            stop();
            resolve();
          }
        });
      });
      client.saveCampaign(game);
      await done;
      const saveMs = performance.now() - saveStart;
      const savedExportStart = performance.now();
      const savedExport = await client.exportCampaign(game);
      const savedExportMs = performance.now() - savedExportStart;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("catane-frontiers-campaigns", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      let stored: number[];
      try {
        stored = await new Promise<number[]>((resolve, reject) => {
          const r = db.transaction("saves").objectStore("saves").get("primary");
          r.onsuccess = () => resolve(Array.from(r.result.bytes));
          r.onerror = () => reject(r.error);
        });
      } finally {
        db.close();
      }
      return {
        loadMs,
        exportMs,
        repeatExportMs,
        savedExportMs,
        saveMs,
        posts: w.transferPosts,
        loadedText,
        archive: Array.from(archive) as number[],
        repeated: Array.from(repeated) as number[],
        savedExport: Array.from(savedExport) as number[],
        stored,
      };
    });
    if (
      result.loadedText !== expected ||
      JSON.stringify(await importSave(new Uint8Array(result.archive))) !==
        expected ||
      JSON.stringify(await importSave(new Uint8Array(result.repeated))) !==
        expected ||
      JSON.stringify(await importSave(new Uint8Array(result.savedExport))) !==
        JSON.stringify({ ...game, actions: game.actions + 1 }) ||
      JSON.stringify(await importSave(new Uint8Array(result.stored))) !==
        JSON.stringify({ ...game, actions: game.actions + 1 })
    )
      throw Error(
        "Load, export or first autosave changed the complete campaign.",
      );
    samples.push({
      loadMs: result.loadMs,
      exportMs: result.exportMs,
      repeatExportMs: result.repeatExportMs,
      savedExportMs: result.savedExportMs,
      saveMs: result.saveMs,
      posts: result.posts,
    });
    await page.close();
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  const median = (values: number[]) =>
    values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const report = {
    tiles: Object.keys(game.tiles).length,
    units: Object.keys(game.pieces).length,
    archiveBytes: bytes.length,
    medianLoadMs: median(samples.map((s) => s.loadMs)),
    medianExportMs: median(samples.map((s) => s.exportMs)),
    medianRepeatExportMs: median(samples.map((s) => s.repeatExportMs)),
    medianSavedExportMs: median(samples.map((s) => s.savedExportMs)),
    medianFirstSaveMs: median(samples.map((s) => s.saveMs)),
    medianExportPostMs: median(
      samples.map((s) => s.posts.find((p: any) => p.type === "export").ms),
    ),
    medianFirstSavePostMs: median(
      samples.map((s) =>
        s.posts
          .filter((p: any) => p.type === "save")
          .reduce((n: number, p: any) => n + p.ms, 0),
      ),
    ),
    samples,
    exactRoundTrip: true,
    stateHash: createHash("sha256").update(expected).digest("hex"),
    errors,
  };
  const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
  mkdirSync("test-artifacts", { recursive: true });
  writeFileSync(
    `test-artifacts/save-transfer-${label}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
