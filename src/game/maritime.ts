import { friendly } from "./relations";
import type { Game, Hex, Piece, Raw, Watchtower } from "./types";
import { neighbors, vertexNeighbors } from "./world";

export const tileGood = (tile: Hex): Raw | undefined =>
  tile.resource === "water"
    ? tile.fish
      ? "fish"
      : tile.whale
        ? "hides"
        : undefined
    : tile.resource;
/** Primary good still identifies the tile's camp and city extension. */
export const tileGoods = (tile: Hex): Raw[] => {
  const primary = tileGood(tile);
  return primary
    ? tile.resource === "water" && tile.whale && !tile.fish
      ? [primary, "oil"]
      : [primary]
    : [];
};
/** Visual terrain and harvested good differ for Whales (which produce Hides and Oil). */
export const tileTerrain = (tile: Hex): Raw | "water" | "whale" =>
  tile.resource === "water"
    ? tile.fish
      ? "fish"
      : tile.whale
        ? "whale"
        : "water"
    : tile.resource;
export const marineResource = (tile: Hex) =>
  tile.resource === "water" && !!(tile.fish || tile.whale);
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
  return [u.tile, ...around].filter(
    (id) => s.tiles[id] && marineResource(s.tiles[id]),
  );
}
export function towerSites(s: Game, owner = s.active) {
  return Object.keys(s.vertices).filter((v) => {
    const existing = s.towers[v];
    if (existing && (existing.owner !== owner || existing.tier >= 4))
      return false;
    return (
      s.vertices[v].edges.some(
        (e) => s.routes[e]?.kind === "road" && s.routes[e].owner === owner,
      ) &&
      !Object.values(s.towns).some(
        (t) => t.vertex === v && t.owner !== owner,
      ) &&
      !s.vertices[v].tiles.some((tile) =>
        Object.values(s.pieces).some(
          (u) =>
            u.tile === tile &&
            !u.naval &&
            !u.carrier &&
            u.kind !== "merchant" &&
            !friendly(s, u.owner, owner),
        ),
      )
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
