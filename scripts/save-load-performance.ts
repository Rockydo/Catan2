import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { compress, importSave } from "../src/storage/codec";
import { serialize, serializePacked } from "../src/game/save";
import { packIntegers } from "../src/game/save-integers";
import { packGeometry } from "../src/game/save-geometry";
import { packSpatial } from "../src/game/save-spatial";
import { unpackGame } from "../src/game/save-packing";
import { packGame } from "../src/game/save-packing";
import { unpackUnitSequences } from "../src/game/save-tables";
import { packTables } from "../src/game/save-tables";
import { packReferences } from "../src/game/save-references";
import { hash } from "../src/game/world";
import { unpackDetails } from "../src/game/save-details";

// Compare original JSON, unit templates, map tables and reference dictionaries.
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
const latest = JSON.parse(serializePacked(game));
const topology = unpackDetails(latest.game);
const encodings = {
  legacy: Array.from(await compress(serialize(game))),
  templates: Array.from(await compress(template)),
  tables: Array.from(
    await compress(
      JSON.stringify({
        ...JSON.parse(template),
        packing: 2,
        game: packTables(templateGame),
        checksum: hash(JSON.stringify(packTables(templateGame))).toString(16),
      }),
    ),
  ),
  references: Array.from(
    await compress(
      JSON.stringify({
        ...JSON.parse(template),
        packing: 3,
        game: packReferences(packTables(templateGame)),
        checksum: hash(
          JSON.stringify(packReferences(packTables(templateGame))),
        ).toString(16),
      }),
    ),
  ),
  integers: Array.from(
    await compress(
      JSON.stringify({
        ...JSON.parse(template),
        packing: 4,
        game: packIntegers(packReferences(packTables(templateGame))),
        checksum: hash(
          JSON.stringify(
            packIntegers(packReferences(packTables(templateGame))),
          ),
        ).toString(16),
      }),
    ),
  ),
  spatial: Array.from(
    await compress(
      JSON.stringify({
        ...JSON.parse(template),
        packing: 5,
        game: packSpatial(
          packIntegers(packReferences(packTables(templateGame))),
        ),
        checksum: hash(
          JSON.stringify(
            packSpatial(packIntegers(packReferences(packTables(templateGame)))),
          ),
        ).toString(16),
      }),
    ),
  ),
  geometry: Array.from(
    await compress(
      JSON.stringify({
        ...JSON.parse(template),
        packing: 6,
        game: packSpatial(
          packIntegers(packReferences(packGeometry(packTables(templateGame)))),
        ),
        checksum: hash(
          JSON.stringify(
            packSpatial(
              packIntegers(
                packReferences(packGeometry(packTables(templateGame))),
              ),
            ),
          ),
        ).toString(16),
      }),
    ),
  ),
  topology: Array.from(
    await compress(
      JSON.stringify({
        ...latest,
        packing: 7,
        game: topology,
        checksum: hash(JSON.stringify(topology)).toString(16),
      }),
    ),
  ),
  packed: Array.from(await compress(JSON.stringify(latest))),
};
const formats = process.env.FORMATS?.split(",");
if (formats?.some((format) => !Object.hasOwn(encodings, format)))
  throw Error(
    `Unknown format. Choose from ${Object.keys(encodings).join(", ")}.`,
  );
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
            w.loadedGameText = data.result?.gameText;
            w.loadedUnitTemplates = data.result?.unitTemplates;
            w.loadedUnitSequences = data.result?.unitSequences;
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
    "tables",
    "references",
    "integers",
    "spatial",
    "geometry",
    "topology",
    "packed",
    "tables",
    "geometry",
    "topology",
    "packed",
    "templates",
    "references",
    "spatial",
    "integers",
    "tables",
    "legacy",
    "references",
    "legacy",
    "integers",
    "geometry",
    "topology",
    "packed",
    "spatial",
    "templates",
  ] as const) {
    if (formats && !formats.includes(format)) continue;
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
        game: w.loadedGameText ?? JSON.stringify(w.loadedGame),
        unitTemplates: w.loadedUnitTemplates,
        unitSequences: w.loadedUnitSequences,
      };
    });
    if (result.unitTemplates) {
      const packed = JSON.parse(result.game);
      if (result.unitSequences)
        packed.pieces = unpackUnitSequences(packed.pieces);
      result.game = JSON.stringify(unpackGame(packed));
    }
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
    tableBytes: encodings.tables.length,
    referenceBytes: encodings.references.length,
    integerBytes: encodings.integers.length,
    spatialBytes: encodings.spatial.length,
    geometryBytes: encodings.geometry.length,
    topologyBytes: encodings.topology.length,
    packedBytes: encodings.packed.length,
    legacyMedianReadyMs: median("legacy"),
    templateMedianReadyMs: median("templates"),
    tableMedianReadyMs: median("tables"),
    referenceMedianReadyMs: median("references"),
    integerMedianReadyMs: median("integers"),
    spatialMedianReadyMs: median("spatial"),
    geometryMedianReadyMs: median("geometry"),
    topologyMedianReadyMs: median("topology"),
    packedMedianReadyMs: median("packed"),
    samples,
    exactRoundTrip: true,
    stateHash: createHash("sha256").update(expected).digest("hex"),
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
