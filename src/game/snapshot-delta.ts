import type { Game } from "./types";
import { copyRecords } from "./record-copy";

export const SNAPSHOT_RECORD_FIELDS: ReadonlySet<keyof Game> = new Set([
  "tiles",
  "vertices",
  "edges",
  "climatePlan",
  "towns",
  "routes",
  "pieces",
  "towers",
  "sieges",
  "towerSieges",
]);
type Records = Record<string, unknown>;
export interface RecordDelta {
  // Omitted when the key order did not change. It matters to deterministic AI
  // tie breaks, including records removed and reinserted in a different order.
  keys?: string[];
  values: Records;
}
export interface SnapshotDelta {
  keys: (keyof Game)[];
  values: Partial<Game>;
  records: Partial<Record<keyof Game, RecordDelta>>;
}

/** Exact plain-data comparison, including undefined fields and property order.
 * Valid game records have bounded nesting. Compare records separately so no
 * whole-campaign JSON strings or permanent comparison caches are needed. */
function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length)
    return false;
  const ak = Object.keys(a),
    bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++)
    if (
      ak[i] !== bk[i] ||
      !sameValue((a as Records)[ak[i]], (b as Records)[bk[i]])
    )
      return false;
  return true;
}
function recordsDelta(
  before: Records,
  after: Records,
): RecordDelta | undefined {
  const oldKeys = Object.keys(before),
    keys = Object.keys(after);
  let reordered = oldKeys.length !== keys.length;
  const values: Records = {};
  let changed = false;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (oldKeys[i] !== key) reordered = true;
    if (!Object.hasOwn(before, key) || !sameValue(before[key], after[key])) {
      // Match copyRecords for literal own keys without invoking the legacy
      // prototype setter. Campaign IDs normally exclude this spelling.
      if (key === "__proto__")
        Object.defineProperty(values, key, {
          value: after[key],
          enumerable: true,
          configurable: true,
          writable: true,
        });
      else values[key] = after[key];
      changed = true;
    }
  }
  return reordered || changed
    ? { ...(reordered ? { keys } : {}), values }
    : undefined;
}
export function snapshotDelta(before: Game, after: Game): SnapshotDelta {
  const delta: SnapshotDelta = {
    keys: Object.keys(after) as (keyof Game)[],
    values: {},
    records: {},
  };
  for (const key of delta.keys) {
    const old = before[key],
      value = after[key];
    if (Object.hasOwn(before, key) && Object.is(old, value)) continue;
    if (SNAPSHOT_RECORD_FIELDS.has(key) && old && value) {
      const change = recordsDelta(old as Records, value as Records);
      if (change) delta.records[key] = change;
    } else if (!Object.hasOwn(before, key) || !sameValue(old, value)) {
      Object.assign(delta.values, { [key]: value });
    }
  }
  return delta;
}
/** Apply only to the exact immutable snapshot that originated this request.
 * knownPieceKeys must belong to that source's unchanged piece dictionary. */
export function applySnapshotDelta(
  before: Game,
  delta: SnapshotDelta,
  knownPieceKeys?: readonly string[],
): Game {
  const result: Partial<Game> = {};
  for (const key of delta.keys) {
    const record = delta.records[key];
    let value: unknown;
    if (record) {
      const previous = before[key] as Records;
      value = copyRecords(
        previous,
        record,
        key === "pieces" ? knownPieceKeys : undefined,
      );
    } else
      value = Object.hasOwn(delta.values, key)
        ? delta.values[key]
        : before[key];
    Object.assign(result, { [key]: value });
  }
  return result as Game;
}

/** Compose consecutive exact patches without scanning either campaign. The
 * later key list controls deletions and order. Unused record values may remain
 * in a patch, but copyRecords only reads values named by that final key list. */
export function composeSnapshotDeltas(
  first: SnapshotDelta,
  last: SnapshotDelta,
): SnapshotDelta {
  const result: SnapshotDelta = { keys: last.keys, values: {}, records: {} };
  for (const key of last.keys) {
    if (Object.hasOwn(last.values, key)) {
      Object.assign(result.values, { [key]: last.values[key] });
      continue;
    }
    const previous = first.records[key],
      next = last.records[key];
    if (Object.hasOwn(first.values, key)) {
      Object.assign(result.values, {
        [key]: next
          ? copyRecords(first.values[key] as Records, next)
          : first.values[key],
      });
    } else if (previous && next) {
      const keys = next.keys ?? previous.keys;
      result.records[key] = {
        ...(keys ? { keys } : {}),
        values: copyRecords(previous.values, { values: next.values }),
      };
    } else if (next ?? previous) {
      result.records[key] = next ?? previous;
    }
  }
  return result;
}
