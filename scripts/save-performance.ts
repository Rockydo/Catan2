import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { deserialize, serialize, serializePacked } from "../src/game/save";
import {
  compress,
  expand,
  exportCompact,
  importSave,
} from "../src/storage/codec";

// A disposable copy of any legacy or compressed export. No browser storage.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const source = readFileSync(process.env.SAVE_PATH, "utf8");
let start = performance.now();
const game = await importSave(source);
const loadMs = performance.now() - start;
const text = serialize(game);
const legacyBytes = await compress(text);
const legacyReloadStart = performance.now();
deserialize(await expand(legacyBytes));
const legacyReloadMs = performance.now() - legacyReloadStart;
start = performance.now();
const packed = serializePacked(game);
const packingMs = performance.now() - start;
start = performance.now();
const bytes = await compress(packed);
const compressionMs = performance.now() - start;
start = performance.now();
const restored = deserialize(await expand(bytes));
const reloadMs = performance.now() - start;
const exported = await exportCompact(game);
if (
  !isDeepStrictEqual(restored, game) ||
  JSON.stringify(restored) !== JSON.stringify(game) ||
  !isDeepStrictEqual(await importSave(exported), game)
)
  throw Error("Save round trip changed the campaign.");
console.log(
  JSON.stringify(
    {
      tiles: Object.keys(game.tiles).length,
      towns: Object.keys(game.towns).length,
      units: Object.keys(game.pieces).length,
      loadMs,
      compressionMs,
      packingMs,
      legacyReloadMs,
      reloadMs,
      jsonBytes: Buffer.byteLength(text),
      packedJsonBytes: Buffer.byteLength(packed),
      legacyStoredBytes: legacyBytes.byteLength,
      storedBytes: bytes.byteLength,
      exportBytes: Buffer.byteLength(exported),
      exactRoundTrip: true,
    },
    null,
    2,
  ),
);
