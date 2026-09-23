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

/** Engine transactions usually retain untouched troop records. Use the
 * already indexed source order to compare those rosters without encoding an
 * entire army. Probes select the strategy only: equality still checks every
 * key, its order and each changed value. Fully detached replies retain the
 * faster whole-object encoding path instead of encoding every unit twice. */
function sameRoster(
  before: Game["pieces"],
  after: Game["pieces"],
  keys: readonly string[],
): boolean | undefined {
  if (!keys.length) return undefined;
  const shared = [0, Math.floor(keys.length / 2), keys.length - 1].some(
    (i) => before[keys[i]] === after[keys[i]],
  );
  if (!shared) return undefined;
  const nextKeys = Object.keys(after);
  if (keys.length !== nextKeys.length) return false;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key !== nextKeys[i]) return false;
    if (
      before[key] !== after[key] &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key])
    )
      return false;
  }
  return true;
}

/** Call only on completed valid snapshots, never on an in-place engine draft.
 * knownPieceKeys, when supplied, is the exact immutable previous roster order.
 * Valid roster entries are defined Piece records, never omitted JSON values. */
export function sharePublishedSnapshot(
  previous: Game,
  next: Game,
  knownPieceKeys?: readonly string[],
): Game {
  const published = { ...next };
  for (const key of fields) {
    const old = previous[key],
      value = next[key];
    if (!old || !value || old === value) continue;
    const same =
      key === "pieces" && knownPieceKeys
        ? sameRoster(previous.pieces, next.pieces, knownPieceKeys)
        : undefined;
    if (same ?? encoding(old) === encoding(value)) {
      // Both fields have the same key and serialized value. The mapped Game
      // property union is wider than TS can correlate across this loop.
      Object.assign(published, { [key]: old });
    }
  }
  return published;
}
