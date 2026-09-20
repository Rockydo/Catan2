import { BIOME_INFO } from "./climate-content";
import { TERRAIN, processedFor, type TerrainKey } from "./content";
import { friendly } from "./relations";
import type { Game, Hex, Piece, Raw, Stock, Watchtower } from "./types";
import { neighbors, vertexNeighbors, solidAtVertex, canOccupy } from "./world";

/** Per-producer output: Woods choices belong to factions, never to the shared tile owner. */
export function tileYield(
  tile: Hex,
  owner?: number,
): Partial<Record<Raw, number>> {
  if (tile.biome) {
    if (tile.biome === "woods")
      return { [tile.woodsChoices?.[owner ?? -1] ?? "lumber"]: 1 };
    return { ...BIOME_INFO[tile.biome].yield };
  }
  if (tile.resource === "water")
    return tile.fish ? { fish: 1 } : tile.whale ? { hides: 1, oil: 1 } : {};
  return ["snow", "ice", "desert", "peaks"].includes(tile.resource)
    ? {}
    : { [tile.resource]: 1 };
}
export const tileGoods = (tile: Hex, owner?: number): Raw[] =>
  Object.keys(tileYield(tile, owner)) as Raw[];
/** Advanced production adds 1×/2× the base tile yield as processed goods. */
export function harvestYield(
  tile: Hex,
  owner: number,
  tier: number,
  refines = false,
  yield_: Stock = tileYield(tile, owner),
): Stock {
  const output: Stock = {};
  for (const [raw, amount] of Object.entries(yield_)) {
    output[raw as Raw] = amount! * tier;
    if (refines && tier >= 3) {
      const processed = processedFor(raw as Raw);
      output[processed] = (output[processed] ?? 0) + amount! * (tier - 2);
    }
  }
  return output;
}
/** Workshops retain their selected Woods product even if the raw harvest changes. */
export function workshopYield(
  tile: Hex,
  owner: number,
  raw: Raw,
  tier: number,
  seasonalBase?: number,
): number {
  const base =
    tile.biome === "woods" && (raw === "lumber" || raw === "hides")
      ? 1
      : (tileYield(tile, owner)[raw] ?? 0);
  return (seasonalBase ?? base) * tier;
}
export const tileGood = (tile: Hex, owner?: number): Raw | undefined =>
  tileGoods(tile, owner)[0];
export const tileOptions = (tile: Hex): Raw[] =>
  tile.biome === "woods" ? ["lumber", "hides"] : tileGoods(tile);
export const tileTerrain = (tile: Hex): TerrainKey =>
  tile.biome ??
  (tile.resource === "water"
    ? tile.fish
      ? "fish"
      : tile.whale
        ? "whale"
        : "water"
    : tile.resource);
export const terrainFamily = (tile: Hex) =>
  tile.surface === "frozen"
    ? "flat"
    : tile.surface === "open"
      ? "water"
      : TERRAIN[tileTerrain(tile)].family;
export const terrainName = (tile: Hex) => TERRAIN[tileTerrain(tile)].name;
export const marineResource = (tile: Hex) =>
  tile.resource === "water" &&
  !!(tile.fish || tile.whale || tile.biome === "cod");
export const collector = (u: Pick<Piece, "kind">) =>
  u.kind === "merchant" || u.kind === "fishing" || u.kind === "merchantship";
export const productiveAtVertex = (s: Game, vertex: string) =>
  s.vertices[vertex].tiles.filter((id) => tileGood(s.tiles[id]));
export function defaultCoverage(s: Game, u: Pick<Piece, "tile" | "tier">) {
  return neighbors(u.tile)
    .filter((id) => s.tiles[id] && tileGood(s.tiles[id]))
    .sort((a, b) => {
      const ga = tileGood(s.tiles[a]),
        gb = tileGood(s.tiles[b]);
      return (
        Number(gb === "gold") - Number(ga === "gold") ||
        Math.abs(7 - s.tiles[a].number) - Math.abs(7 - s.tiles[b].number) ||
        a.localeCompare(b)
      );
    })
    .slice(0, u.tier);
}
export function harvestTiles(
  s: Game,
  u: Pick<Piece, "kind" | "tier" | "tile" | "coverage" | "carrier">,
): string[] {
  if (u.carrier || !collector(u)) return [];
  const around = neighbors(u.tile).filter((id) => s.tiles[id]);
  if (u.kind === "merchant")
    return [u.tile, ...(u.coverage ?? defaultCoverage(s, u))].filter(
      (id) => s.tiles[id] && tileGood(s.tiles[id]),
    );
  if (u.kind === "merchantship")
    return around.filter((id) => s.tiles[id].resource !== "water");
  // A fishing radius follows connected water: nets do not cross land or ice.
  if (!canOccupy(s.tiles[u.tile], true)) return [];
  const reached = new Set([u.tile]),
    queue = [{ id: u.tile, depth: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const { id, depth } = queue[i];
    if (depth >= u.tier) continue;
    for (const next of neighbors(id)) {
      if (reached.has(next) || !canOccupy(s.tiles[next], true)) continue;
      reached.add(next);
      queue.push({ id: next, depth: depth + 1 });
    }
  }
  return [...reached].filter(
    (id) => s.tiles[id] && marineResource(s.tiles[id]),
  );
}
export function towerSites(s: Game, owner = s.active) {
  const enemyTowns = new Set(
    Object.values(s.towns)
      .filter((t) => t.owner !== owner)
      .map((t) => t.vertex),
  );
  const blocked = new Set(
    Object.values(s.pieces)
      .filter(
        (u) =>
          !u.naval &&
          !u.carrier &&
          u.kind !== "merchant" &&
          u.kind !== "settler" &&
          !friendly(s, u.owner, owner),
      )
      .map((u) => u.tile),
  );
  return Object.keys(s.vertices).filter((v) => {
    if (!solidAtVertex(s, v).length) return false;
    const existing = s.towers[v];
    if (existing && (existing.owner !== owner || existing.tier >= 4))
      return false;
    return (
      s.vertices[v].edges.some(
        (e) => s.routes[e]?.kind === "road" && s.routes[e].owner === owner,
      ) &&
      !enemyTowns.has(v) &&
      !s.vertices[v].tiles.some((tile) => blocked.has(tile))
    );
  });
}
export function towerPower(s: Game, owner: number, tile: string) {
  return Object.values(s.towers ?? {})
    .filter(
      (t) => t.owner === owner && s.vertices[t.vertex].tiles.includes(tile),
    )
    .reduce((n, t) => n + t.tier, 0);
}
export function towerDefense(s: Game, owner: number, vertex: string) {
  const adjacent = [vertex, ...vertexNeighbors(s, vertex)];
  return Object.values(s.towers ?? {})
    .filter((t) => t.owner === owner && adjacent.includes(t.vertex))
    .reduce((n, t) => n + t.tier, 0);
}
export const towerName = (tower: Watchtower) =>
  ["", "Lookout", "Stone Watchtower", "Guard Tower", "Grand Watchtower"][
    tower.tier
  ];
