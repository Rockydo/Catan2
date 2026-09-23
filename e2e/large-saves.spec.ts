import { test, expect, type Page } from "@playwright/test";
import { fishingFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { deserialize, serialize, SAVE_KEY, BACKUP_KEY } from "../src/game/save";
import { importSave, exportCompact } from "../src/storage/codec";
import { readFile } from "node:fs/promises";
import { snapshotDelta } from "../src/game/snapshot-delta";

async function saved(page: Page, key = "primary") {
  const record = await page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("catane-frontiers-campaigns", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      const record = await new Promise<any>((resolve, reject) => {
        const t = db.transaction("saves"),
          r = t.objectStore("saves").get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (!record) return null;
      const text = await new Response(
        new Blob([record.bytes])
          .stream()
          .pipeThrough(new DecompressionStream("gzip")),
      ).text();
      return {
        text,
        revision: record.revision,
        bytes: record.bytes.length,
      };
    } finally {
      db.close();
    }
  }, key);
  return record ? { ...record, game: deserialize(record.text) } : null;
}
function fixture(large = false) {
  const f = fishingFixture();
  if (large)
    for (let i = 0; i < 6000; i++) piece(f.s, f.water, 0, "fishing", 1);
  return f;
}
async function seed(page: Page, text: string, blockLocal = false) {
  await page.addInitScript(
    ({ text, key, backup, block }) => {
      if (!sessionStorage.getItem("test-seeded")) {
        localStorage.setItem(key, text);
        sessionStorage.setItem("test-seeded", "1");
      }
      if (block) {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (this === localStorage && [key, backup].includes(k))
            throw new DOMException("Quota exceeded", "QuotaExceededError");
          original.call(this, k, v);
        };
      }
    },
    { text, key: SAVE_KEY, backup: BACKUP_KEY, block: blockLocal },
  );
}

test("large saves survive localStorage quota, bulk recruitment, refresh and compact export/import", async ({
  page,
}) => {
  const { s, home } = fixture(true),
    text = serialize(s);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, text, true);
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect
    .poll(async () => (await saved(page))?.game.actions)
    .toBe(s.actions);
  expect((await saved(page))!.bytes).toBeLessThan(text.length * 0.3);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBeNull();
  await page.getByTestId(`town-${home.id}`).press("Enter");
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.getByLabel("Recruitment quantity").fill("100");
  await page.locator('[data-testid="recruit-heavy"] .recruit-purchase').click();
  await expect
    .poll(async () => Object.keys((await saved(page))!.game.pieces).length)
    .toBe(6100);
  const after = (await saved(page))!.game;
  expect(Object.keys((await saved(page, "backup"))!.game.pieces)).toHaveLength(
    6000,
  );
  await expect(page.getByText(/Automatic saving is unavailable/)).toHaveCount(
    0,
  );
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect((await saved(page))!.game).toEqual(after);
  await page.getByRole("button", { name: "Game settings and saves" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export saved game", exact: true })
    .click();
  const download = await downloading,
    exported = await readFile((await download.path())!);
  expect(download.suggestedFilename()).toMatch(/\.catane$/);
  expect([...exported.subarray(0, 2)]).toEqual([0x1f, 0x8b]);
  expect(exported.length).toBeLessThan(text.length * 0.4);
  expect(await importSave(exported)).toEqual(after);
  await page.evaluate(() => {
    // File data must be read in the worker, not copied through the UI thread.
    for (const method of ["arrayBuffer", "text", "stream"])
      Object.defineProperty(File.prototype, method, {
        value() {
          throw Error("Unexpected main-thread import read");
        },
        configurable: true,
      });
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "compact.catane",
    mimeType: "application/gzip",
    buffer: Buffer.from(exported),
  });
  await expect(
    page.getByText("Game imported. AI is paused until you resume."),
  ).toBeVisible();
  await expect.poll(async () => (await saved(page))?.game).toEqual(after);
  const damaged = Buffer.from(exported);
  damaged[damaged.length - 8] ^= 1;
  await page.locator("input[type=file]").setInputFiles({
    name: "damaged.catane",
    mimeType: "application/gzip",
    buffer: damaged,
  });
  await expect(page.getByRole("alert").last()).not.toContainText(
    "Game imported.",
  );
  expect((await saved(page))!.game).toEqual(after);
  expect(errors).toEqual([]);
});

test("legacy compressed imports and binary exports work when save workers are unavailable", async ({
  page,
}) => {
  const { s } = fixture();
  await seed(page, serialize(s));
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (String(url).includes("save.worker"))
          throw new DOMException("Test blocked worker", "SecurityError");
        super(url, options);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "old-compact.json",
    mimeType: "application/json",
    buffer: Buffer.from(await exportCompact(s)),
  });
  await expect(
    page.getByText("Game imported. AI is paused until you resume."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Game settings and saves" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export saved game", exact: true })
    .click();
  const download = await downloading;
  const archive = await readFile((await download.path())!);
  expect(download.suggestedFilename()).toMatch(/\.catane$/);
  expect(await importSave(archive)).toEqual(deserialize(serialize(s)));
  await page.locator("input[type=file]").setInputFiles({
    // Detection uses content, so a renamed archive remains readable.
    name: "renamed.json",
    mimeType: "application/json",
    buffer: archive,
  });
  await expect(
    page.getByText("Game imported. AI is paused until you resume."),
  ).toBeVisible();
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  expect(deserialize(stored!)).toEqual(deserialize(serialize(s)));
});

test("very large armies refresh through the validated text transfer without losing any saved state", async ({
  page,
}) => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 20_000; i++) piece(s, water, 0, "fishing", 1);
  const text = serialize(s),
    expected = JSON.stringify(deserialize(text));
  await seed(page, text);
  await page.addInitScript(() => {
    const Native = window.Worker;
    (window as any).largeLoad = false;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes("save.worker"))
          this.addEventListener("message", ({ data }) => {
            if (data.type === "load")
              (window as any).largeLoad =
                typeof data.result?.gameText === "string";
            if (data.type === "import")
              (window as any).largeImport =
                typeof data.result?.gameText === "string";
          });
      }
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Continue campaign/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).largeLoad)).toBe(true);
  await expect
    .poll(async () => {
      const value = await saved(page);
      return value ? JSON.stringify(value.game) === expected : false;
    })
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Continue campaign/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).largeLoad)).toBe(true);
  expect(JSON.stringify((await saved(page))!.game)).toBe(expected);
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.getByText(/Automatic saving is unavailable/)).toHaveCount(
    0,
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "large-campaign.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await expect(
    page.getByText("Game imported. AI is paused until you resume."),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).largeImport)).toBe(true);
  await expect
    .poll(async () => JSON.stringify((await saved(page))?.game))
    .toBe(expected);
});

test("damaged compressed primary recovers the previous save and keeps the valid backup", async ({
  page,
}) => {
  const { s, home } = fixture(true);
  await seed(page, serialize(s));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect
    .poll(async () => (await saved(page))?.game.actions)
    .toBe(s.actions);
  await page.getByTestId(`town-${home.id}`).press("Enter");
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.locator('[data-testid="recruit-heavy"] .recruit-purchase').click();
  await expect
    .poll(async () => (await saved(page))?.game.actions)
    .toBe(s.actions + 1);
  const backup = (await saved(page, "backup"))!.game;
  await page.evaluate(
    async ({ key, backup }) => {
      localStorage.removeItem(key);
      localStorage.removeItem(backup);
      const db = await new Promise<IDBDatabase>((r) => {
        const o = indexedDB.open("catane-frontiers-campaigns", 1);
        o.onsuccess = () => r(o.result);
      });
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction("saves", "readwrite"),
          store = t.objectStore("saves"),
          r = store.get("primary");
        r.onsuccess = () =>
          store.put(
            { ...r.result, bytes: new Uint8Array([1, 2, 3]) },
            "primary",
          );
        t.oncomplete = () => resolve();
        t.onabort = () => reject(t.error);
      });
      db.close();
    },
    { key: SAVE_KEY, backup: BACKUP_KEY },
  );
  await page.reload();
  await expect(
    page.getByText("Recovered your previous save from the backup."),
  ).toBeVisible();
  await expect
    .poll(async () => {
      try {
        return (await saved(page))?.game;
      } catch {
        // Recovery is visible before the replacement transaction commits.
        return null;
      }
    })
    .toEqual(backup);
  expect((await saved(page, "backup"))!.game).toEqual(backup);
});

test("a second tab cannot silently overwrite a newer campaign", async ({
  page,
  context,
}) => {
  const { s, home } = fixture();
  await seed(page, serialize(s));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect
    .poll(async () => (await saved(page))?.game.actions)
    .toBe(s.actions);
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: /Continue campaign/ }).click();
  for (const p of [page, other]) {
    await p.getByTestId(`town-${home.id}`).press("Enter");
    await p.getByRole("button", { name: "Forces", exact: true }).click();
  }
  await page.locator('[data-testid="recruit-heavy"] .recruit-purchase').click();
  await expect
    .poll(async () => (await saved(page))?.game.actions)
    .toBe(s.actions + 1);
  const revision = (await saved(page))!.revision;
  await other
    .locator('[data-testid="recruit-cavalry"] .recruit-purchase')
    .click();
  await expect(
    other.getByText(
      "Another tab saved a newer campaign. Export this game before reloading.",
    ),
  ).toBeVisible();
  expect((await saved(page))!.revision).toBe(revision);
});

test("rapid actions coalesce behind an outstanding save and protect refresh until committed", async ({
  page,
}) => {
  const { s, home } = fixture();
  await seed(page, serialize(s));
  await page.addInitScript(() => {
    const w = window as any,
      Native = window.Worker;
    w.savePosts = 0;
    w.saveFull = 0;
    w.saveDeltas = 0;
    w.holdSave = false;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (!String(url).includes("save.worker")) return;
        w.saveWorker = this;
        this.addEventListener("message", (e) => {
          if (w.holdSave && e.data.type === "save") {
            e.stopImmediatePropagation();
            w.heldSave = e.data;
          }
        });
      }
      postMessage(data: any) {
        if (data.type === "save") {
          w.savePosts++;
          if (data.game) w.saveFull++;
          if (data.delta) w.saveDeltas++;
        }
        super.postMessage(data);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  await page.getByTestId(`town-${home.id}`).press("Enter");
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  const start = await page.evaluate(() => {
    (window as any).holdSave = true;
    return (window as any).savePosts;
  });
  const recruit = page.locator(
    '[data-testid="recruit-heavy"] .recruit-purchase',
  );
  await recruit.click();
  await expect
    .poll(() => page.evaluate(() => !!(window as any).heldSave))
    .toBe(true);
  await recruit.click();
  await recruit.click();
  expect(await page.evaluate(() => (window as any).savePosts)).toBe(start + 1);
  await expect(page.locator(".save-status")).toHaveText("Saving…");
  expect(
    await page.evaluate(
      () =>
        !window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
    ),
  ).toBe(true);
  await page.evaluate(() => {
    const w = window as any;
    w.holdSave = false;
    w.saveWorker.onmessage(new MessageEvent("message", { data: w.heldSave }));
  });
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  expect(await page.evaluate(() => (window as any).savePosts)).toBe(start + 2);
  expect(await page.evaluate(() => (window as any).saveFull)).toBe(1);
  expect(await page.evaluate(() => (window as any).saveDeltas)).toBe(2);
  expect(Object.keys((await saved(page))!.game.pieces)).toHaveLength(3);
  expect((await saved(page))!.game.actions).toBe(s.actions + 3);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect(Object.keys((await saved(page))!.game.pieces)).toHaveLength(3);
});

test("a stale save-worker base requests a full snapshot before writing", async ({
  page,
}) => {
  const { s, home } = fixture(true);
  await seed(page, serialize(s));
  await page.addInitScript(() => {
    const Native = window.Worker;
    const w = window as any;
    w.saveResyncs = 0;
    w.saveFull = 0;
    window.Worker = class extends Native {
      corrupted = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (!String(url).includes("save.worker")) return;
        this.addEventListener("message", ({ data }) => {
          if (data.type === "save" && data.result?.resync) w.saveResyncs++;
        });
      }
      postMessage(data: any) {
        if (data.type === "save" && data.game) w.saveFull++;
        if (data.type === "save" && data.delta && !this.corrupted) {
          this.corrupted = true;
          data = { ...data, base: -1 };
        }
        super.postMessage(data);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  await page.getByTestId(`town-${home.id}`).press("Enter");
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.locator('[data-testid="recruit-heavy"] .recruit-purchase').click();
  await expect
    .poll(async () => (await saved(page))?.game.actions)
    .toBe(s.actions + 1);
  expect(await page.evaluate(() => (window as any).saveResyncs)).toBe(1);
  expect(await page.evaluate(() => (window as any).saveFull)).toBe(2);
  expect(Object.keys((await saved(page))!.game.pieces)).toHaveLength(6001);
  expect(Object.keys((await saved(page, "backup"))!.game.pieces)).toHaveLength(
    6000,
  );
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect(Object.keys((await saved(page))!.game.pieces)).toHaveLength(6001);
});

test("refresh reuses the loaded snapshot for export and the first autosave", async ({
  page,
}) => {
  const { s, home } = fixture(true);
  await seed(page, serialize(s));
  await page.addInitScript(() => {
    const w = window as any,
      Native = window.Worker;
    w.snapshotPosts = [];
    window.Worker = class extends Native {
      saving = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.saving = String(url).includes("save.worker");
      }
      postMessage(data: any) {
        if (this.saving && ["save", "export"].includes(data.type))
          w.snapshotPosts.push({
            type: data.type,
            full: !!data.game,
            delta: !!data.delta,
          });
        super.postMessage(data);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  const primary = (await saved(page))!;
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  expect(await page.evaluate(() => (window as any).snapshotPosts)).toEqual([]);
  await page.getByRole("button", { name: "Game settings and saves" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export saved game", exact: true })
    .click();
  const download = await downloading;
  expect(await importSave(await readFile((await download.path())!))).toEqual(
    primary.game,
  );
  expect((await saved(page))!.revision).toBe(primary.revision);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByTestId(`town-${home.id}`).press("Enter");
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.getByLabel("Recruitment quantity").fill("100");
  await page.locator('[data-testid="recruit-heavy"] .recruit-purchase').click();
  await expect
    .poll(async () => Object.keys((await saved(page))!.game.pieces).length)
    .toBe(6100);
  expect(await page.evaluate(() => (window as any).snapshotPosts)).toEqual([
    { type: "export", full: false, delta: true },
    { type: "save", full: false, delta: true },
  ]);
  expect((await saved(page, "backup"))!.game).toEqual(primary.game);
  const after = (await saved(page))!.game;
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect((await saved(page))!.game).toEqual(after);
});

test("exports recover from a stale worker token without changing the autosave", async ({
  page,
}) => {
  const { s } = fixture(true);
  await seed(page, serialize(s));
  await page.addInitScript(() => {
    const w = window as any,
      Native = window.Worker;
    w.exportResyncs = 0;
    w.exportFull = 0;
    window.Worker = class extends Native {
      saving = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.saving = String(url).includes("save.worker");
        if (this.saving)
          this.addEventListener("message", ({ data }) => {
            if (data.type === "export" && data.result?.resync)
              w.exportResyncs++;
          });
      }
      postMessage(data: any) {
        if (this.saving && data.type === "export") {
          if (data.game) w.exportFull++;
          else data = { ...data, base: -1 };
        }
        super.postMessage(data);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  const primary = (await saved(page))!,
    backup = (await saved(page, "backup"))!;
  await page.getByRole("button", { name: "Game settings and saves" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export saved game", exact: true })
    .click();
  const download = await downloading;
  expect(await importSave(await readFile((await download.path())!))).toEqual(
    primary.game,
  );
  expect(await page.evaluate(() => (window as any).exportResyncs)).toBe(1);
  expect(await page.evaluate(() => (window as any).exportFull)).toBe(1);
  expect((await saved(page))!.revision).toBe(primary.revision);
  expect((await saved(page, "backup"))!.revision).toBe(backup.revision);
});

test("exporting a different visible position preserves the retained autosave base", async ({
  page,
}) => {
  const { s } = fixture(true);
  await seed(page, serialize(s));
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes("save.worker"))
          (window as any).snapshotWorkerURL = String(url);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  const primary = (await saved(page))!;
  const exported = structuredClone(primary.game);
  const unit = Object.values(exported.pieces)[0];
  unit.bonus += 2;
  exported.actions += 1;
  const changed = structuredClone(primary.game);
  Object.values(changed.towns)[0].stock.gold = 13;
  changed.actions += 2;
  const result = await page.evaluate(
    async ({ exportDelta, saveDelta, unchangedDelta }) => {
      const worker = new Worker((window as any).snapshotWorkerURL, {
        type: "module",
      });
      let request = 0;
      const call = (message: any) =>
        new Promise<any>((resolve, reject) => {
          worker.onmessage = ({ data }) =>
            data.error ? reject(Error(data.error)) : resolve(data.result);
          worker.onerror = () => reject(Error("Save worker failed"));
          worker.postMessage({ ...message, request: ++request });
        });
      try {
        const loaded = await call({ type: "load", legacy: [] });
        const token = loaded.snapshotToken;
        if (typeof token !== "number")
          throw Error("Clean load did not retain a snapshot");
        const original = await call({
          type: "export",
          base: token,
          delta: unchangedDelta,
        });
        const archive = await call({
          type: "export",
          base: token,
          delta: exportDelta,
        });
        const originalAgain = await call({
          type: "export",
          base: token,
          delta: unchangedDelta,
        });
        const saved = await call({
          type: "save",
          base: token,
          delta: saveDelta,
        });
        const current = await call({
          type: "export",
          base: saved.snapshotToken,
          delta: unchangedDelta,
        });
        const currentAgain = await call({
          type: "export",
          base: saved.snapshotToken,
          delta: unchangedDelta,
        });
        // A subsequent save invalidates the old export token. The request must
        // report resync, never silently export the newer retained position.
        const stale = await call({
          type: "export",
          base: token,
          delta: exportDelta,
        });
        return {
          archive: Array.from(archive) as number[],
          original: Array.from(original) as number[],
          originalAgain: Array.from(originalAgain) as number[],
          current: Array.from(current) as number[],
          currentAgain: Array.from(currentAgain) as number[],
          saved,
          stale,
        };
      } finally {
        worker.terminate();
      }
    },
    {
      exportDelta: snapshotDelta(primary.game, exported),
      saveDelta: snapshotDelta(primary.game, changed),
      unchangedDelta: snapshotDelta(primary.game, primary.game),
    },
  );
  expect(await importSave(new Uint8Array(result.archive))).toEqual(exported);
  expect(await importSave(new Uint8Array(result.original))).toEqual(
    primary.game,
  );
  expect(result.originalAgain).toEqual(result.original);
  expect(await importSave(new Uint8Array(result.current))).toEqual(changed);
  expect(result.currentAgain).toEqual(result.current);
  expect(result.saved.resync).toBeUndefined();
  expect(result.stale).toEqual({ resync: true });
  expect((await saved(page))!.game).toEqual(changed);
  expect((await saved(page, "backup"))!.game).toEqual(primary.game);
});
