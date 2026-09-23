import type { Game, Piece } from "./types";
import { formationPower } from "./selectors";
import { terrainFamily } from "./maritime";

/** Check separate formations, never the sum of armies on different tiles.
 * Single-owner land armies receive identical destination tower support. Their
 * strongest formation therefore stays the same within each terrain family.
 * Keep full per-destination checks for mixed owners or naval formations.
 * The campaign and formations must remain unchanged for this query's life. */
export function formationCanBeat(s: Game, groups: Piece[][]) {
  const queries = groups.map((group) => formationPower(s, group));
  // Small island forces have no repeated army scan worth indexing.
  if (queries.length <= 2)
    return (tile: string, defense: number) =>
      queries.some((query) => query(tile) > defense);
  const owner = groups[0]?.[0]?.owner;
  const uniform = groups.every((group) =>
    group.every((unit) => !unit.naval && unit.owner === owner),
  );
  const searches = new Map<
    ReturnType<typeof terrainFamily>,
    { checked: number; best?: (tile: string) => number }
  >();
  return (tile: string, defense: number): boolean => {
    if (!uniform) return queries.some((query) => query(tile) > defense);
    const family = terrainFamily(s.tiles[tile]);
    let search = searches.get(family);
    if (!search) {
      search = { checked: 0 };
      searches.set(family, search);
    }
    let best = search.best?.(tile) ?? 0;
    if (search.best && best > defense) return true;
    // Easy targets still stop at the first winning army. Harder targets resume
    // the search instead of repeating every weaker formation on every tile.
    while (search.checked < queries.length) {
      const query = queries[search.checked++];
      const strength = query(tile);
      if (!search.best || strength > best) {
        best = strength;
        search.best = query;
      }
      if (strength > defense) return true;
    }
    return false;
  };
}
