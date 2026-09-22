import type { Game } from "./types";

const RECORD_FIELDS = new Set<keyof Game>([
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
      values[key] = after[key];
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
    if (RECORD_FIELDS.has(key) && old && value) {
      const change = recordsDelta(old as Records, value as Records);
      if (change) delta.records[key] = change;
    } else if (!Object.hasOwn(before, key) || !sameValue(old, value)) {
      Object.assign(delta.values, { [key]: value });
    }
  }
  return delta;
}
/** Apply only to the exact immutable snapshot that originated this request. */
export function applySnapshotDelta(before: Game, delta: SnapshotDelta): Game {
  const result: Partial<Game> = {};
  for (const key of delta.keys) {
    const record = delta.records[key];
    let value: unknown;
    if (record) {
      const previous = before[key] as Records;
      value = record.keys
        ? Object.fromEntries(
            record.keys.map((id) => [
              id,
              Object.hasOwn(record.values, id)
                ? record.values[id]
                : previous[id],
            ]),
          )
        : { ...previous, ...record.values };
    } else
      value = Object.hasOwn(delta.values, key)
        ? delta.values[key]
        : before[key];
    Object.assign(result, { [key]: value });
  }
  return result as Game;
}
