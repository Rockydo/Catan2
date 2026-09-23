import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { compress, importSave } from "../src/storage/codec";
import { serialize } from "../src/game/save";
import { resolve } from "node:path";
import { build } from "vite";

// Compare the worker import boundary, including main-thread reconstruction.
// Use an identical historical encoding so older builds can read the same input.
// A fresh worker and disposable profile keep the player's campaign untouched.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const game = await importSave(readFileSync(process.env.SAVE_PATH));
const expected = JSON.stringify(game);
const bytes = Array.from(await compress(serialize(game)));
// Bundle the actual main-thread decoder, rather than approximate its work in
// the diagnostic. SOURCE_ROOT can select a prior checkout for comparisons.
const bundle = await build({
  configFile: false,
  logLevel: "silent",
  build: {
    write: false,
    minify: false,
    lib: {
      entry: resolve(
        process.env.SOURCE_ROOT ?? ".",
        "src/storage/load-transfer.ts",
      ),
      name: "saveTransfer",
      formats: ["iife"],
    },
  },
});
const output = (Array.isArray(bundle) ? bundle : [bundle]).flatMap((result) =>
  "output" in result ? result.output : [],
);
const decoderCode = output.find((item) => item.type === "chunk")!.code;
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("catane-language", "en");
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes("save.worker"))
          (window as any).saveWorkerURL = String(url);
      }
    };
  });
  await page.addInitScript({
    content: `${decoderCode}
globalThis.saveTransfer = saveTransfer;`,
  });
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4173");
  await page
    .getByRole("button", { name: "New campaign", exact: true })
    .waitFor();
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const result = await page.evaluate(async (bytes) => {
      const worker = new Worker((window as any).saveWorkerURL, {
        type: "module",
      });
      const start = performance.now();
      try {
        const data: any = await new Promise((resolve, reject) => {
          worker.onmessage = ({ data }) =>
            data.error ? reject(Error(data.error)) : resolve(data.result);
          worker.onerror = () => reject(Error("Import worker failed."));
          worker.postMessage({
            type: "import",
            request: 1,
            text: new Uint8Array(bytes),
          });
        });
        const receivedMs = performance.now() - start;
        const campaign = (window as any).saveTransfer.decodeLoadedCampaign(
          data,
        ).game;
        const readyMs = performance.now() - start;
        return { receivedMs, readyMs, game: JSON.stringify(campaign) };
      } finally {
        worker.terminate();
      }
    }, bytes);
    if (result.game !== expected)
      throw Error("Import changed the complete campaign.");
    samples.push({ receivedMs: result.receivedMs, readyMs: result.readyMs });
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  const report = {
    units: Object.keys(game.pieces).length,
    tiles: Object.keys(game.tiles).length,
    inputBytes: bytes.length,
    medianReadyMs: samples.map((s) => s.readyMs).sort((a, b) => a - b)[1],
    samples,
    exactRoundTrip: true,
    errors,
  };
  const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
  mkdirSync("test-artifacts", { recursive: true });
  writeFileSync(
    `test-artifacts/save-import-${label}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
