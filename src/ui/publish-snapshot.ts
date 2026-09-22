import type { Game } from "../game/types";

// Engine drafts and worker replies are independent copies. Reuse only equal,
// immutable published subtrees so a bank trade does not rebuild every terrain
// image, coastline and army group. Weak keys do not retain campaign history.
const encodings = new WeakMap<object, string>();
function encoding(value: object): string {
  let result = encodings.get(value);
  if (result === undefined) {
    result = JSON.stringify(value);
    encodings.set(value, result);
  }
  return result;
}
const fields = [
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
  "players",
  "alliances",
  "calendar",
] as const;

/** Call only on completed snapshots, never on an in-place engine draft. */
export function sharePublishedSnapshot(previous: Game, next: Game): Game {
  const published = { ...next };
  for (const key of fields) {
    const old = previous[key],
      value = next[key];
    if (old && value && old !== value && encoding(old) === encoding(value)) {
      // Both fields have the same key and serialized value. The mapped Game
      // property union is wider than TS can correlate across this loop.
      Object.assign(published, { [key]: old });
    }
  }
  return published;
}
