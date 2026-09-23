import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

// One checkout per process. Always use a copy of an export, never live storage.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const root = process.env.SOURCE_ROOT ?? ".";
const load = (file: string) => import(pathToFileURL(resolve(root, file)).href);
const { importSave, compress, expand } = await load("src/storage/codec.ts");
const { serializePacked, deserializeSnapshot } = await load("src/game/save.ts");
const { encodeLoadedCampaign, decodeLoadedCampaign } = await load(
  "src/storage/load-transfer.ts",
);
const game = await importSave(readFileSync(process.env.SAVE_PATH));
const expected = JSON.stringify(game);
const archive = await compress(serializePacked(game));
const samples: {
  inflateMs: number;
  validateMs: number;
  encodeMs: number;
  restoreMs: number;
  totalMs: number;
}[] = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  const text = await expand(archive);
  const inflated = performance.now();
  const { game: loaded, units } = deserializeSnapshot(text);
  const validated = performance.now();
  const transfer = encodeLoadedCampaign(
    { game: loaded, recovered: false },
    units,
  );
  const encoded = performance.now();
  const restored = decodeLoadedCampaign(transfer).game;
  const decoded = performance.now();
  if (JSON.stringify(restored) !== expected)
    throw Error("Reload changed the campaign.");
  if (i >= 3)
    samples.push({
      inflateMs: inflated - start,
      validateMs: validated - inflated,
      encodeMs: encoded - validated,
      restoreMs: decoded - encoded,
      totalMs: decoded - start,
    });
}
const median = (key: keyof (typeof samples)[number]) =>
  samples.map((s) => s[key]).sort((a, b) => a - b)[
    Math.floor(samples.length / 2)
  ];
const report = {
  tiles: Object.keys(game.tiles).length,
  towns: Object.keys(game.towns).length,
  units: Object.keys(game.pieces).length,
  storedBytes: archive.length,
  medians: Object.fromEntries(
    Object.keys(samples[0]).map((key) => [
      key,
      median(key as keyof (typeof samples)[number]),
    ]),
  ),
  samples,
  stateHash: createHash("sha256").update(expected).digest("hex"),
  exactRoundTrip: true,
};
if (process.env.EXPECT_PATH) {
  const before = JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"));
  if (before.stateHash !== report.stateHash)
    throw Error("Reference campaign differs.");
}
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/save-decode-${label}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
