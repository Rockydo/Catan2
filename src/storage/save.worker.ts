import { deserialize, serialize, serializePacked } from "../game/save";
import type { Game } from "../game/types";
import { applySnapshotDelta, type SnapshotDelta } from "../game/snapshot-delta";
import {
  compress,
  expand,
  exportArchive,
  importSave,
  type SaveInput,
} from "./codec";
import { readRecords, writeRecord, type SaveRecord } from "./database";
import { encodeLoadedCampaign } from "./load-transfer";

export type SaveRequest =
  | { type: "load"; legacy: (string | null)[] }
  | { type: "export"; game: Game }
  | ({ type: "save" } & (
      { game: Game } | { base: number; delta: SnapshotDelta }
    ))
  | { type: "import"; text: SaveInput };
export interface SaveResult {
  mirror?: string;
  fallback?: string;
  bytes?: number;
  snapshotToken?: number;
  resync?: boolean;
}
let revision: string | undefined;
let savedSnapshot: Game | undefined;
let snapshotToken = 0;
let preserveBackup = false;
let initialBackup: string | undefined;
async function load(legacy: (string | null)[]) {
  let records: (SaveRecord | undefined)[] = [],
    error: string | undefined;
  try {
    records = await readRecords();
  } catch {
    /* Legacy storage is still usable when IndexedDB is unavailable. */
  }
  revision = records[0]?.revision;
  const candidates: {
    savedAt: number;
    recovered: boolean;
    legacy?: boolean;
    read: () => Promise<string>;
  }[] = [];
  records.forEach((record, index) => {
    if (record)
      candidates.push({
        savedAt: record.savedAt,
        recovered: index === 1,
        read: () => expand(record.bytes),
      });
  });
  legacy.forEach((text, index) => {
    if (!text) return;
    // The header is at the front; do not parse a multi-MB game just for its date.
    const date = text.slice(0, 300).match(/"savedAt"\s*:\s*"([^"]+)"/);
    candidates.push({
      savedAt: date ? Date.parse(date[1]) || 0 : 0,
      recovered: index === 1,
      legacy: true,
      read: async () => text,
    });
  });
  candidates.sort(
    (a, b) =>
      b.savedAt - a.savedAt || Number(a.recovered) - Number(b.recovered),
  );
  for (const candidate of candidates) {
    try {
      const text = await candidate.read();
      const game = deserialize(text);
      if (!revision) initialBackup = text;
      return {
        game,
        recovered: candidate.recovered || !!error,
        error,
        needsSave: !!candidate.legacy || candidate.recovered || !!error,
      };
    } catch (e) {
      error = e instanceof Error ? e.message : "The save could not be read.";
      preserveBackup = true;
    }
  }
  return { game: null, recovered: false, error };
}
async function handle(request: SaveRequest) {
  switch (request.type) {
    case "load":
      return encodeLoadedCampaign(await load(request.legacy));
    case "import":
      return encodeLoadedCampaign({
        game: await importSave(request.text),
        recovered: false,
      });
    case "export":
      return exportArchive(request.game);
    case "save": {
      if (
        !("game" in request) &&
        (!savedSnapshot || request.base !== snapshotToken)
      )
        return { resync: true };
      const game =
        "game" in request
          ? request.game
          : applySnapshotDelta(savedSnapshot!, request.delta);
      const small =
        Object.keys(game.pieces).length < 256 &&
        Object.keys(game.tiles).length <= 256;
      const text = small ? serialize(game) : serializePacked(game);
      const record: SaveRecord = {
        revision: crypto.randomUUID(),
        savedAt: Date.now(),
        bytes: await compress(text),
      };
      try {
        await writeRecord(
          record,
          revision,
          preserveBackup,
          initialBackup
            ? {
                revision: crypto.randomUUID(),
                savedAt: record.savedAt - 1,
                bytes: await compress(initialBackup),
              }
            : undefined,
        );
      } catch (error) {
        // Never fall back over a competing tab's newer save.
        if (error instanceof Error && error.message.startsWith("Another tab"))
          throw error;
        savedSnapshot = game;
        return { fallback: text, snapshotToken: ++snapshotToken };
      }
      initialBackup = undefined;
      revision = record.revision;
      preserveBackup = false;
      savedSnapshot = game;
      return {
        snapshotToken: ++snapshotToken,
        mirror: small && text.length <= 512_000 ? text : undefined,
        bytes: record.bytes.byteLength,
      };
    }
  }
}
// Serialize jobs so imports, backups and successive writes cannot overtake.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<SaveRequest & { request: number }>) => {
  queue = queue.then(async () => {
    try {
      const result = await handle(event.data);
      self.postMessage(
        {
          request: event.data.request,
          type: event.data.type,
          result,
        },
        { transfer: result instanceof Uint8Array ? [result.buffer] : [] },
      );
    } catch (error) {
      self.postMessage({
        request: event.data.request,
        type: event.data.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
