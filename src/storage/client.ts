import { BACKUP_KEY, SAVE_KEY, loadLocal, saveLocal } from "../game/save";
import type { Game } from "../game/types";
import { snapshotDelta } from "../game/snapshot-delta";
import { exportArchive, importSave, type SaveInput } from "./codec";
import type { SaveRequest, SaveResult, ExportResult } from "./save.worker";
import { decodeLoadedCampaign, type LoadedCampaign } from "./load-transfer";

export type { LoadedCampaign } from "./load-transfer";
const WARNING =
  "Automatic saving is unavailable or storage is full. Export your game to keep it safe.";
let worker: Worker | undefined;
let failed = false,
  request = 0;
const waiting = new Map<
  number,
  { resolve: (result: any) => void; reject: (error: Error) => void }
>();
function call<T>(message: SaveRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      if (failed) throw new Error("The save worker is unavailable.");
      if (!worker) {
        try {
          worker = new Worker(new URL("./save.worker.ts", import.meta.url), {
            type: "module",
          });
        } catch (error) {
          failed = true;
          throw error;
        }
        worker.onmessage = ({ data }) => {
          const job = waiting.get(data.request);
          if (!job) return;
          waiting.delete(data.request);
          if (data.error) job.reject(new Error(data.error));
          else job.resolve(data.result);
        };
        worker.onerror = () => {
          failed = true;
          savedBase = undefined;
          worker?.terminate();
          worker = undefined;
          for (const job of waiting.values()) job.reject(new Error(WARNING));
          waiting.clear();
        };
      }
      const id = ++request;
      waiting.set(id, { resolve, reject });
      try {
        worker.postMessage({ ...message, request: id });
      } catch (error) {
        waiting.delete(id);
        throw error;
      }
    } catch (error) {
      reject(error);
    }
  });
}
export async function loadCampaign(): Promise<LoadedCampaign> {
  const legacy = [SAVE_KEY, BACKUP_KEY].map((key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  });
  try {
    const result = decodeLoadedCampaign(await call({ type: "load", legacy }));
    savedBase =
      result.game && result.snapshotToken !== undefined
        ? { game: result.game, token: result.snapshotToken }
        : undefined;
    return result;
  } catch {
    savedBase = undefined;
    return loadLocal();
  }
}
let pending: Game | undefined,
  running = false,
  unsaved = false;
let savedBase: { game: Game; token: number } | undefined;
let error = "";
const listeners = new Set<(error: string, pending: boolean) => void>();
function notify() {
  for (const listener of listeners) listener(error, unsaved);
}
export function observeSaving(
  listener: (error: string, pending: boolean) => void,
) {
  listeners.add(listener);
  listener(error, unsaved);
  return () => {
    listeners.delete(listener);
  };
}
export function hasUnsavedChanges() {
  return unsaved;
}
/** At most one transferred snapshot and one newest pending snapshot. */
export function saveCampaign(game: Game) {
  pending = game;
  unsaved = true;
  notify();
  if (!running) void drain();
}
async function drain() {
  running = true;
  while (pending) {
    const game = pending;
    pending = undefined;
    try {
      if (failed) saveLocal(game);
      else {
        // Retain just the last acknowledged immutable snapshot. Small changes
        // no longer copy the entire army through the main-thread message port.
        let result = await call<SaveResult>(
          savedBase && savedBase.game.seed === game.seed
            ? {
                type: "save",
                base: savedBase.token,
                delta: snapshotDelta(savedBase.game, game),
              }
            : { type: "save", game },
        );
        if (result.resync)
          result = await call<SaveResult>({ type: "save", game });
        if (result.resync || result.snapshotToken === undefined)
          throw new Error(WARNING);
        if (result.fallback) {
          // Keep the previous primary if a fallback write also exceeds quota.
          const previous = localStorage.getItem(SAVE_KEY);
          localStorage.setItem(SAVE_KEY, result.fallback);
          try {
            if (previous) localStorage.setItem(BACKUP_KEY, previous);
          } catch {
            /* Primary succeeded. */
          }
        } else {
          try {
            if (result.mirror) {
              const previous = localStorage.getItem(SAVE_KEY);
              localStorage.setItem(SAVE_KEY, result.mirror);
              if (previous && previous.length <= 512_000)
                localStorage.setItem(BACKUP_KEY, previous);
              else localStorage.removeItem(BACKUP_KEY);
            } else {
              // Only after IndexedDB's transaction has committed successfully.
              localStorage.removeItem(SAVE_KEY);
              localStorage.removeItem(BACKUP_KEY);
            }
          } catch {
            /* Optional legacy mirror; the durable save succeeded. */
          }
        }
        savedBase = { game, token: result.snapshotToken };
      }
      error = "";
      unsaved = !!pending;
    } catch (e) {
      error =
        e instanceof Error && e.message.startsWith("Another tab")
          ? e.message
          : WARNING;
      unsaved = true;
    }
    notify();
  }
  running = false;
}
export async function exportCampaign(
  game: Game,
): Promise<Uint8Array<ArrayBuffer>> {
  if (failed) return exportArchive(game);
  const result = await call<ExportResult>(
    savedBase && savedBase.game.seed === game.seed
      ? {
          type: "export",
          base: savedBase.token,
          delta: snapshotDelta(savedBase.game, game),
        }
      : { type: "export", game },
  );
  return result instanceof Uint8Array
    ? result
    : call<Uint8Array<ArrayBuffer>>({ type: "export", game });
}
export async function importCampaign(text: SaveInput): Promise<Game> {
  if (failed) return importSave(text);
  return decodeLoadedCampaign(await call({ type: "import", text })).game!;
}
