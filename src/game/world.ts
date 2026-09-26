import {
  restoreMountainPasses,
  favorMountainGaps,
  geographicTerrain,
  GEOGRAPHY_VERSION,
  pieceAccess,
} from "./geography";
import { planClimates, climateTerrain } from "./climate";
import { CLIMATE_INFO, type Climate } from "./climate-content";
import generation from "./generation.json" with { type: "json" };
import { RAW, type World, type Hex, type Vertex, type Edge } from "./types";
export const WATER_PROBABILITY = generation.waterProbability;
export const PORT_RESOURCES = RAW.filter((g) => g !== "gold" && g !== "oil");
/** Automatic trading ports need an open shoreline, not a narrow river bank. */
export function portCoast(world: World, ids: string[]): boolean {
  const tiles = ids.map((id) => world.tiles[id]);
  if (tiles.length !== 2 || tiles.some((t) => !t || t.resource === "ice"))
    return false;
  const water = tiles.filter((t) => t.resource === "water");
  return water.length === 1 && water[0].geography?.waterway !== "river";
}
export function restoreGoldPorts(world: World) {
  for (const edge of Object.values(world.edges)) {
    if (
      edge.harbor &&
      edge.tiles.some((id) => {
        const t = world.tiles[id];
        return (
          t?.resource === "ice" ||
          (t?.resource === "water" && t.geography?.waterway === "river")
        );
      })
    ) {
      delete edge.harbor;
      continue;
    }
    if (edge.harbor === "gold") edge.harbor = "generic";
  }
}
/** Repair unlucky modern coast rolls without moving or rerolling any existing
 * port. Runs on initial creation/load, not per reveal, so exploration order
 * cannot compete for these reserved sites. Earlier geography stays unchanged. */
export function ensurePortCoverage(world: World, seed: string): void {
  if ((world.geographyVersion ?? 0) < 8) return;
  const coast = Object.values(world.edges).filter(
    (e) =>
      portCoast(world, e.tiles) &&
      e.vertices.some((v) => solidAtVertex(world, v).length > 0),
  );
  const target = Math.min(6, Math.floor(coast.length / 8));
  if (!target) return;
  const ports = Object.values(world.edges).filter((e) => e.harbor);
  const used = new Set(ports.flatMap((e) => e.vertices));
  const specialists = new Set(
    ports.map((e) => e.harbor).filter((h) => h && h !== "generic"),
  );
  const specialistTarget = Math.ceil(target / 2);
  let generic = ports.some((e) => e.harbor === "generic");
  if (
    ports.length >= target &&
    specialists.size >= specialistTarget &&
    (generic || target < 2)
  )
    return;
  const candidates = coast
    .filter((e) => !e.harbor)
    .sort(
      (a, b) =>
        randomAt(seed, a.id, "port-coverage") -
          randomAt(seed, b.id, "port-coverage") || a.id.localeCompare(b.id),
    );
  const midpoints = new Map(
    [...ports, ...candidates].map((e) => {
      const [a, b] = e.vertices.map((v) => world.vertices[v]);
      return [e.id, [(a.x + b.x) / 2, (a.y + b.y) / 2]] as const;
    }),
  );
  while (
    ports.length < target ||
    specialists.size < specialistTarget ||
    (!generic && target >= 2)
  ) {
    let chosen: Edge | undefined,
      separation = -1;
    // Distribute additions over the available coast rather than filling one bay.
    for (const edge of candidates) {
      if (edge.harbor || edge.vertices.some((v) => used.has(v))) continue;
      const p = midpoints.get(edge.id)!;
      let gap = ports.length ? Infinity : 0;
      for (const port of ports) {
        const q = midpoints.get(port.id)!;
        gap = Math.min(gap, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);
      }
      if (gap > separation) {
        chosen = edge;
        separation = gap;
      }
    }
    if (!chosen) break; // Tiny or mountainous coasts may have no legal spare site.
    const missing = PORT_RESOURCES.filter((g) => !specialists.has(g));
    chosen.harbor =
      !generic && specialists.size > 0 && target >= 2
        ? "generic"
        : (missing.length ? missing : PORT_RESOURCES)[
            Math.floor(
              randomAt(seed, chosen.id, "port-coverage-resource") *
                (missing.length || PORT_RESOURCES.length),
            )
          ];
    if (chosen.harbor === "generic") generic = true;
    else specialists.add(chosen.harbor);
    ports.push(chosen);
    chosen.vertices.forEach((v) => used.add(v));
  }
}
export const LAND_RESOURCES = RAW.filter(
  (g) => g !== "fish" && g !== "meat" && g !== "oil" && g !== "gold",
);
export const RAW_TILE_PROBABILITY =
  (1 - WATER_PROBABILITY) / (LAND_RESOURCES.length + 0.5);
export const GOLD_TILE_PROBABILITY = RAW_TILE_PROBABILITY / 2;
export const discoveryProbability = (tiles: number) =>
  1 - (1 - RAW_TILE_PROBABILITY) ** tiles;
export const DIRS = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
] as const;
export const CORNERS = [
  [0, -2],
  [1, -1],
  [1, 1],
  [0, 2],
  [-1, 1],
  [-1, -1],
] as const;
export const key = (q: number, r: number) => `${q},${r}`;
export const coord = (id: string) =>
  id.split(",").map(Number) as [number, number];
// Hex coordinates never change. Bound the cache for unbounded expeditions and
// keep it private so callers of coord() still receive their own mutable tuple.
const distanceCoordinates = new Map<string, readonly [number, number]>();
function distanceCoord(id: string): readonly [number, number] {
  let point = distanceCoordinates.get(id);
  if (!point) {
    point = coord(id);
    if (distanceCoordinates.size >= 8192)
      distanceCoordinates.delete(distanceCoordinates.keys().next().value!);
    distanceCoordinates.set(id, point);
  }
  return point;
}
const neighborCache = new Map<string, string[]>();
export const neighbors = (id: string) => {
  let result = neighborCache.get(id);
  if (!result) {
    const [q, r] = distanceCoord(id);
    result = DIRS.map(([a, b]) => key(q + a, r + b));
    if (neighborCache.size >= 8192)
      neighborCache.delete(neighborCache.keys().next().value!);
    neighborCache.set(id, result);
  }
  // Keep caller mutations isolated from future pathfinding/generation.
  return result.slice();
};
export const distance = (a: string, b: string) => {
  const [q, r] = distanceCoord(a),
    [s, t] = distanceCoord(b);
  return Math.max(Math.abs(q - s), Math.abs(r - t), Math.abs(q + r - s - t));
};
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
export const randomAt = (seed: string, id: string, stream: string) =>
  hash(`${seed}|${id}|${stream}`) / 4294967296;
export function nextRandom(value: number): [number, number] {
  let t = (value + 0x6d2b79f5) >>> 0;
  let n = t;
  n = Math.imul(n ^ (n >>> 15), n | 1);
  n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
  return [((n ^ (n >>> 14)) >>> 0) / 4294967296, t];
}
export function tileVertices(q: number, r: number): string[] {
  return CORNERS.map(([a, b]) => `${2 * q + r + a}:${3 * r + b}`);
}
export const edgeKey = (a: string, b: string) => [a, b].sort().join("|");
/** Roll Fish first, then Whales on the remaining water, using independent streams. */
export function waterResources(
  seed: string,
  id: string,
  coastal: boolean,
): Pick<Hex, "fish" | "whale"> {
  if (randomAt(seed, id, "fish") < (coastal ? 0.15 : 0.1))
    return { fish: true };
  if (randomAt(seed, id, "whale") < (coastal ? 0.05 : 0.1))
    return { whale: true };
  return {};
}
export function generateHex(
  seed: string,
  id: string,
  climate?: Climate,
  openWater = false,
): Hex {
  const [q, r] = coord(id);
  const vertices = tileVertices(q, r);
  const water = randomAt(seed, id, "terrain") < WATER_PROBABILITY;
  const pick = randomAt(seed, id, "resource") * (LAND_RESOURCES.length + 0.5);
  const coastal = neighbors(id).some(
    (n) => randomAt(seed, n, "terrain") >= WATER_PROBABILITY,
  );
  return {
    id,
    q,
    r,
    ...(!climate && water ? waterResources(seed, id, coastal) : {}),
    resource: water
      ? "water"
      : pick >= LAND_RESOURCES.length
        ? "gold"
        : LAND_RESOURCES[Math.floor(pick)],
    ...(climate ? climateTerrain(seed, id, climate, openWater) : {}),
    number: 2 + Math.floor(randomAt(seed, id, "number") * 11),
    vertices,
    edges: vertices.map((a, i) => edgeKey(a, vertices[(i + 1) % 6])),
  };
}
export function addHexes(world: World, seed: string, ids: string[]) {
  restoreGoldPorts(world);
  const requested = ids.filter((id) => !world.tiles[id]);
  planClimates(world, seed, requested);
  const added = new Set<string>();
  for (const id of ids) {
    if (world.tiles[id]) continue;
    let hex: Hex;
    if (world.geographyVersion) {
      const [q, r] = coord(id),
        vertices = tileVertices(q, r);
      hex = {
        id,
        q,
        r,
        vertices,
        edges: vertices.map((a, i) => edgeKey(a, vertices[(i + 1) % 6])),
        resource: "water",
        climate: world.climatePlan?.[id],
        number: 2 + Math.floor(randomAt(seed, id, "number") * 11),
      };
      geographicTerrain(seed, hex, world.geographyVersion);
    } else {
      // Use actual revealed terrain and reserved climate land rolls for hidden
      // neighbors. Map edges are not automatically open sea, and ice is not land.
      const openWater = neighbors(id).every((n) => {
        const existing = world.tiles[n];
        if (existing)
          return existing.resource === "water" || existing.resource === "ice";
        const climate = world.climatePlan?.[n];
        return (
          climate !== undefined &&
          randomAt(seed, n, "terrain") >= CLIMATE_INFO[climate].land
        );
      });
      hex = generateHex(seed, id, world.climatePlan?.[id], openWater);
    }
    added.add(id);
    world.tiles[id] = hex;
    for (const v of hex.vertices) {
      if (!world.vertices[v]) {
        const [x, y] = v.split(":").map(Number);
        world.vertices[v] = { id: v, x, y, tiles: [], edges: [] };
      }
      world.vertices[v].tiles.push(id);
    }
    for (let i = 0; i < 6; i++) {
      const e = hex.edges[i];
      if (!world.edges[e])
        world.edges[e] = {
          id: e,
          vertices: [hex.vertices[i], hex.vertices[(i + 1) % 6]],
          tiles: [],
        };
      world.edges[e].tiles.push(id);
      for (const v of world.edges[e].vertices)
        if (!world.vertices[v].edges.includes(e))
          world.vertices[v].edges.push(e);
    }
  }
  favorMountainGaps(world, seed, [...added]);
  restoreMountainPasses(world, [...added]);
  // Older campaigns retain their actual terrain even where the new generator differs.
  // Unknown neighbours still use fixed coordinates, keeping reveal order stable.
  // Never reroll already revealed tiles, including saves made before Whales existed.
  for (const id of added) {
    const tile = world.tiles[id];
    if (tile.resource !== "water" || tile.biome) continue;
    const coastal = neighbors(id).some((n) =>
      world.tiles[n]
        ? world.tiles[n].resource !== "water"
        : randomAt(seed, n, "terrain") >= WATER_PROBABILITY,
    );
    delete tile.fish;
    delete tile.whale;
    Object.assign(tile, waterResources(seed, id, coastal));
  }
  const used = new Set(
    Object.values(world.edges)
      .filter((e) => e.harbor)
      .flatMap((e) => e.vertices),
  );
  for (const e of Object.values(world.edges).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (
      e.harbor ||
      e.tiles.length !== 2 ||
      !portCoast(world, e.tiles) ||
      used.has(e.vertices[0]) ||
      used.has(e.vertices[1])
    )
      continue;
    const water = e.tiles.filter((t) => world.tiles[t].resource === "water");
    if (water.length !== 1 || randomAt(seed, e.id, "harbor") >= 0.1) continue;
    e.harbor =
      randomAt(seed, e.id, "harbor-kind") < 0.5
        ? "generic"
        : PORT_RESOURCES[
            Math.floor(
              randomAt(seed, e.id, "harbor-resource") * PORT_RESOURCES.length,
            )
          ];
    e.vertices.forEach((v) => used.add(v));
  }
}
export function generateWorld(
  seed: string,
  count = 125,
  geography = false,
  geographyVersion = GEOGRAPHY_VERSION,
): World {
  const world: World = {
    tiles: {},
    vertices: {},
    edges: {},
    ...(geography ? { geographyVersion } : {}),
  };
  let radius = 0;
  while (1 + 3 * radius * (radius + 1) < count) radius++;
  const ids: string[] = [];
  for (let q = -radius; q <= radius; q++)
    for (let r = -radius; r <= radius; r++)
      if (distance("0,0", key(q, r)) <= radius) ids.push(key(q, r));
  ids.sort(
    (a, b) =>
      distance(a, "0,0") - distance(b, "0,0") ||
      randomAt(seed, a, "shape") - randomAt(seed, b, "shape"),
  );
  addHexes(world, seed, ids.slice(0, count));
  ensurePortCoverage(world, seed);
  return world;
}
export const vertexNeighbors = (world: World, id: string) =>
  world.vertices[id].edges.map((e) =>
    world.edges[e].vertices.find((v) => v !== id)!,
  );
interface WorldReadIndex {
  source: World;
  land: Map<string, string[]>;
  terrain?: Map<string, readonly string[]>;
}
let worldReadIndex: WorldReadIndex | undefined;
const worldViewIndexes = new WeakMap<World, WorldReadIndex>();
let terrainRead:
  | {
      tiles: World["tiles"];
      values: Map<string, readonly string[]>;
    }
  | undefined;

/** Protect an unchanged terrain dictionary across consecutive decisions.
 * Execution must detach this dictionary before editing any tile. */
export function withTerrainRead<T>(tiles: World["tiles"], run: () => T): T {
  const previous = terrainRead;
  terrainRead = { tiles, values: new Map() };
  try {
    return run();
  } finally {
    terrainRead = previous;
  }
}

/** Lists depending only on tile data and their explicit key. Never use for
 * occupation, diplomacy, towns, routes or turn state. Returned arrays remain
 * independent; mutable worlds outside a protected read calculate afresh. */
export function terrainReadList(
  world: World,
  key: string | (() => string),
  calculate: () => string[],
): string[] {
  const index =
    worldReadIndex?.source === world
      ? worldReadIndex
      : (worldViewIndexes.get(world) ?? worldReadIndex);
  const cache =
    terrainRead?.tiles === world.tiles
      ? terrainRead.values
      : index?.source.tiles === world.tiles
        ? (index.terrain ??= new Map())
        : undefined;
  if (!cache) return calculate();
  const id = typeof key === "string" ? key : key();
  let result = cache.get(id);
  if (!result) {
    result = calculate();
    cache.set(id, result);
  }
  return result.slice();
}
/** Published views are immutable. Transaction drafts must not register here. */
export function prepareWorldView(world: World): void {
  if (!worldViewIndexes.has(world))
    worldViewIndexes.set(world, { source: world, land: new Map() });
}
/** Related read views may reuse geometry while both dictionaries are unchanged.
 * Every new scope starts fresh; mutable execution runs outside this interval. */
export function withWorldReadFrame<T>(world: World, run: () => T): T {
  const previous = worldReadIndex;
  worldReadIndex = { source: world, land: new Map() };
  try {
    return run();
  } finally {
    worldReadIndex = previous;
  }
}
export function landAtVertex(world: World, v: string): string[] {
  const index =
    worldReadIndex?.source === world
      ? worldReadIndex
      : (worldViewIndexes.get(world) ?? worldReadIndex);
  const cache =
    index?.source.tiles === world.tiles &&
    index.source.vertices === world.vertices
      ? index.land
      : undefined;
  let land = cache?.get(v);
  if (!land) {
    land =
      world.vertices[v]?.tiles.filter(
        (t) => world.tiles[t].resource !== "water",
      ) ?? [];
    cache?.set(v, land);
  }
  // Existing callers receive independent, mutable arrays in adjacency order.
  return cache ? land.slice() : land;
}
/** Unit occupancy is separate from edge construction: roads can skirt peaks. */
export const canOccupy = (tile: Hex | undefined, naval = false): boolean =>
  pieceAccess(tile, { naval, kind: naval ? "transport" : "heavy", tier: 1 });
export const walkableAtVertex = (world: World, v: string) =>
  world.vertices[v]?.tiles.filter((id) => canOccupy(world.tiles[id])) ?? [];
/** Towns and towers need habitable ground; roads may still follow peak edges. */
export const solidAtVertex = (world: World, v: string) =>
  landAtVertex(world, v).filter(
    (t) =>
      !["ice", "peaks"].includes(world.tiles[t].resource) &&
      !world.tiles[t].geography?.pass,
  );
export const waterAtVertex = (world: World, v: string) =>
  world.vertices[v]?.tiles.filter((t) => canOccupy(world.tiles[t], true)) ?? [];
const vertexHexCache = new Map<string, Set<string>>();
export function unknownAtVertex(world: World, v: string): string[] {
  const vertex = world.vertices[v];
  if (!vertex) return [];
  // Every vertex touches exactly three geometric hexes, irrespective of discovery.
  let adjacent = vertexHexCache.get(v);
  if (!adjacent) {
    adjacent = new Set();
    for (const [dx, dy] of CORNERS) {
      const r = (vertex.y - dy) / 3,
        q = (vertex.x - dx - r) / 2;
      if (Number.isInteger(q) && Number.isInteger(r)) adjacent.add(key(q, r));
    }
    if (vertexHexCache.size >= 16384)
      vertexHexCache.delete(vertexHexCache.keys().next().value!);
    vertexHexCache.set(v, adjacent);
  }
  // Preserve the original launch ordering; don't cache discovery or occupation.
  return [...new Set(vertex.tiles.flatMap(neighbors))].filter(
    (t) => !world.tiles[t] && adjacent.has(t),
  );
}
export function expeditionFootprint(
  world: World,
  vertex: string,
  tier: number,
  direction = 0,
): string[] {
  const total = [0, 10, 20, 40][tier];
  if (!total || !world.vertices[vertex]) return [];
  const starts = unknownAtVertex(world, vertex);
  const queue = starts.map((id) => ({ id, depth: 0 }));
  const seen = new Set(starts);
  const selected: string[] = [];
  const [dq, dr] = DIRS[((direction % 6) + 6) % 6];
  while (queue.length && selected.length < total) {
    queue.sort(
      (a, b) =>
        a.depth - b.depth ||
        projection(b.id) - projection(a.id) ||
        a.id.localeCompare(b.id),
    );
    const current = queue.shift()!;
    selected.push(current.id);
    for (const n of neighbors(current.id))
      if (!world.tiles[n] && !seen.has(n)) {
        seen.add(n);
        queue.push({ id: n, depth: current.depth + 1 });
      }
  }
  function projection(id: string) {
    const [q, r] = coord(id);
    return (2 * q + r) * (2 * dq + dr) + 3 * r * dr;
  }
  return selected.length === total ? selected : [];
}
export function hexCenter(hex: Pick<Hex, "q" | "r">, size = 44) {
  return {
    x: Math.sqrt(3) * size * (hex.q + hex.r / 2),
    y: 1.5 * size * hex.r,
  };
}
export function vertexPoint(vertex: Pick<Vertex, "x" | "y">, size = 44) {
  return { x: (vertex.x * Math.sqrt(3) * size) / 2, y: (vertex.y * size) / 2 };
}
export const edgeMidpoint = (world: World, e: Edge, size = 44) => {
  const a = vertexPoint(world.vertices[e.vertices[0]], size),
    b = vertexPoint(world.vertices[e.vertices[1]], size);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};
