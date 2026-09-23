import { test, expect, type Page } from "@playwright/test";
import { fishingFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { deserialize, serialize, SAVE_KEY, BACKUP_KEY } from "../src/game/save";
import { importSave, exportCompact } from "../src/storage/codec";
import { readFile } from "node:fs/promises";

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
