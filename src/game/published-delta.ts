import type { Game } from "./types";
import {
  applySnapshotDelta,
  composeSnapshotDeltas,
  SNAPSHOT_RECORD_FIELDS,
  snapshotDelta,
  type SnapshotDelta,
} from "./snapshot-delta";

// No strong link to a preceding campaign: old snapshots and their deltas can
// be collected as soon as React and autosave release them. Mutable engine
// transactions never register here. Only the UI's immutable worker replies do.
const received = new WeakMap<
  Game,
  { before: WeakRef<Game>; delta: SnapshotDelta }
>();

/** Both the source snapshot and received patch must remain immutable. */
export function applyPublishedDelta(before: Game, delta: SnapshotDelta): Game {
  const after = applySnapshotDelta(before, delta);
  received.set(after, { before: new WeakRef(before), delta });
  return after;
}

/** Reuse received changes for autosave/export. Compose only a short, sparse
 * sequence; interrupted histories, collected intermediates, human orders and
 * large accumulated changes use the ordinary exact comparison. No counter or
 * seed is evidence that two snapshots have the same base. */
export function publishedSnapshotDelta(
  before: Game,
  after: Game,
): SnapshotDelta {
  const patches: SnapshotDelta[] = [];
  let current = after,
    changed = 0;
  for (let i = 0; i < 32 && current !== before; i++) {
    const link = received.get(current),
      source = link?.before.deref();
    if (!link || !source) break;
    // The common one-reply path needs no enumeration, even for large battles.
    if (!patches.length && source === before) return link.delta;
    for (const record of Object.values(link.delta.records)) {
      changed += Object.keys(record.values).length;
      if (changed > 4096) return snapshotDelta(before, after);
    }
    // A full dictionary replacement would require copying that entire field
    // during composition. The regular comparison already bounds that work.
    if (
      (Object.keys(link.delta.values) as (keyof Game)[]).some((key) =>
        SNAPSHOT_RECORD_FIELDS.has(key),
      )
    )
      break;
    patches.push(link.delta);
    current = source;
  }
  if (current !== before || !patches.length)
    return snapshotDelta(before, after);
  let result = patches.pop()!;
  while (patches.length) result = composeSnapshotDeltas(result, patches.pop()!);
  return result;
}
