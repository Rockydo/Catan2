import { cultivatedFish } from "./infrastructure-services";
import {
  canSail,
  baseGeographicYield,
  habitatKind,
  WILDLIFE_GOODS,
} from "./geography";
import { BIOMES, BIOME_INFO, biomeYield } from "./climate-content";
import {
  fishingRange,
  TERRAIN,
  processedFor,
  type TerrainKey,
} from "./content";
import { friendly } from "./relations";
import type { Game, Hex, Piece, Raw, Stock, Watchtower } from "./types";
import {
  neighbors,
  vertexNeighbors,
  solidAtVertex,
  canOccupy,
  terrainReadList,
} from "./world";

/** Per-producer output: Woods choices belong to factions, never to the shared tile owner. */
export function tileYield(
  tile: Hex,
  owner?: number,
): Partial<Record<Raw, number>> {
  if (tile.geography) {
    const output = baseGeographicYield(tile);
    for (const [raw, n] of Object.entries(tile.geography.fauna ?? {}))
      output[raw as Raw] = (output[raw as Raw] ?? 0) + n!;
    return output;
  }
  if (tile.biome) {
    if (tile.biome === "woods")
      return { [tile.woodsChoices?.[owner ?? -1] ?? "lumber"]: 1 };
    return biomeYield(tile.biome, tile.climate);
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
    !tile.geography &&
    tile.biome === "woods" &&
    (raw === "lumber" || raw === "hides")
      ? 1
      : (tileYield(tile, owner)[raw] ?? 0);
  return (seasonalBase ?? base) * tier;
}
// Climate-specific yields change quantities, never the first product. Most AI
// terrain checks need only that product, not a freshly allocated harvest stock.
const primaryGoods = Object.fromEntries(
  BIOMES.map((biome) => [biome, Object.keys(BIOME_INFO[biome].yield)[0]]),
) as Partial<Record<(typeof BIOMES)[number], Raw>>;
export function tileGood(tile: Hex, owner?: number): Raw | undefined {
  if (tile.geography)
    return (
      (Object.keys(tileYield(tile, owner))[0] as Raw | undefined) ??
      (cultivatedFish(tile, owner) ? "fish" : undefined)
    );
  if (tile.biome === "woods")
    return tile.woodsChoices?.[owner ?? -1] ?? "lumber";
  if (tile.biome) return primaryGoods[tile.biome];
  if (tile.resource === "water")
    return tile.fish ? "fish" : tile.whale ? "hides" : undefined;
  if (
    tile.resource === "snow" ||
    tile.resource === "ice" ||
    tile.resource === "desert" ||
    tile.resource === "peaks"
  )
    return undefined;
  return tile.resource;
}
export const tileOptions = (tile: Hex): Raw[] =>
  tile.geography
    ? ([
        ...new Set([
          ...tileGoods(tile),
          ...Object.keys(
            tile.resource === "water"
              ? { fish: 1, hides: 1, oil: 1 }
              : (WILDLIFE_GOODS[habitatKind(tile)!] ?? {}),
          ),
        ]),
      ] as Raw[])
    : tile.biome === "woods"
      ? ["lumber", "hides"]
      : tileGoods(tile);
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
  tile.geography?.access === "ford" || tile.geography?.projects?.bridge
    ? "flat"
    : tile.geography?.access === "flooded"
      ? "water"
      : tile.surface === "frozen"
        ? "flat"
        : tile.surface === "open"
          ? "water"
          : TERRAIN[tileTerrain(tile)].family;
export const terrainName = (tile: Hex) =>
  tile.geography &&
  tile.biome === "seal-grounds" &&
  !tile.geography.animals?.includes("seal")
    ? "Polar coast"
    : tile.geography &&
        tile.biome === "musk-ox-range" &&
        !tile.geography.animals?.includes("musk-ox")
      ? "Rocky tundra"
      : tile.geography &&
          tile.biome === "reindeer-range" &&
          !tile.geography.animals?.includes("reindeer")
        ? "Cold grassland"
        : tile.geography &&
            tile.biome === "turkey-grounds" &&
            !tile.geography.animals?.includes("turkey")
          ? "Open woodland"
          : tile.geography &&
              ["steppe-plain", "bison-range", "wildlife-grassland"].includes(
                tile.biome ?? "",
              )
            ? "Wild grassland"
            : tile.geography &&
                ["hunting-forest", "fern-hunting-grounds"].includes(
                  tile.biome ?? "",
                )
              ? "Wild forest"
              : TERRAIN[tileTerrain(tile)].name;
export const marineResource = (tile: Hex) =>
  tile.resource === "water" &&
  !!(
    cultivatedFish(tile) ||
    tile.fish ||
    tile.whale ||
    tile.biome === "cod" ||
    tile.geography?.animals?.some((k) => ["fish", "cod", "whale"].includes(k))
  );
export const collector = (u: Pick<Piece, "kind">) =>
  u.kind === "merchant" ||
  u.kind === "fishing" ||
  u.kind === "oceanfishing" ||
  u.kind === "merchantship" ||
  u.kind === "hunter";
export const productiveAtVertex = (s: Game, vertex: string) =>
  s.vertices[vertex].tiles.filter((id) => tileGood(s.tiles[id]));
export function defaultCoverage(s: Game, u: Pick<Piece, "tile" | "tier">) {
  return terrainReadList(s, `merchant-neighbors/${u.tile}`, () =>
    neighbors(u.tile)
      .filter((id) => s.tiles[id] && tileGood(s.tiles[id]))
      .sort((a, b) => {
        const ga = tileGood(s.tiles[a]),
          gb = tileGood(s.tiles[b]);
        return (
          Number(gb === "gold") - Number(ga === "gold") ||
          Math.abs(7 - s.tiles[a].number) - Math.abs(7 - s.tiles[b].number) ||
          a.localeCompare(b)
        );
      }),
  ).slice(0, u.tier);
}
export function harvestTiles(
  s: Game,
  u: Pick<Piece, "kind" | "tier" | "tile" | "coverage" | "carrier">,
): string[] {
  if (u.carrier || !collector(u)) return [];
  return terrainReadList(
    s,
    () =>
      JSON.stringify([
        "harvest-tiles",
        u.kind,
        u.tile,
        u.tier,
        u.kind === "merchant" ? u.coverage : null,
      ]),
    () => collectorTiles(s, u),
  );
}

function collectorTiles(
  s: Game,
  u: Pick<Piece, "kind" | "tier" | "tile" | "coverage">,
): string[] {
  if (u.kind === "merchant")
    return [u.tile, ...(u.coverage ?? defaultCoverage(s, u))].filter(
      (id) => s.tiles[id] && tileGood(s.tiles[id]),
    );
  if (u.kind === "merchantship")
    return neighbors(u.tile).filter(
      (id) => s.tiles[id] && s.tiles[id].resource !== "water",
    );
  if (u.kind === "hunter") {
    const found = new Set([u.tile]),
      queue = [{ id: u.tile, depth: 0 }];
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i];
      if (at.depth >= u.tier) continue;
      for (const id of neighbors(at.id))
        if (!found.has(id) && canOccupy(s.tiles[id])) {
          found.add(id);
          queue.push({ id, depth: at.depth + 1 });
        }
    }
    return [...found].filter(
      (id) =>
        !!s.tiles[id]?.geography?.animals?.some(
          (k) => !["fish", "cod", "whale"].includes(k),
        ),
    );
  }
  // A fishing radius follows connected water: nets do not cross land or ice.
  const accessible = (id: string) =>
    u.kind === "oceanfishing"
      ? canSail(s.tiles[id], "oceanfishing", u.tier, s.tiles)
      : canOccupy(s.tiles[id], true);
  if (!accessible(u.tile)) return [];
  const reached = new Set([u.tile]),
    queue = [{ id: u.tile, depth: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const { id, depth } = queue[i];
    if (depth >= fishingRange(u.kind, u.tier)) continue;
    for (const next of neighbors(id)) {
      if (reached.has(next) || !accessible(next)) continue;
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
