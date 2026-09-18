import {
  CLIMATES,
  CLIMATE_INFO,
  BIOME_INFO,
  compatibleClimate,
  type Climate,
  type Biome,
} from "./climate-content";
import type { World, Hex } from "./types";
import { neighbors, coord, key, randomAt } from "./world";

const climateDistances = CLIMATES.map((start) => {
  const distances = new Map<Climate, number>([[start, 0]]),
    queue: Climate[] = [start];
  for (let i = 0; i < queue.length; i++)
    for (const next of CLIMATE_INFO[queue[i]].compatible)
      if (!distances.has(next)) {
        distances.set(next, distances.get(queue[i])! + 1);
        queue.push(next);
      }
  return distances;
});
function distanceTo(from: Climate, to: Climate) {
  return climateDistances[CLIMATES.indexOf(from)].get(to)!;
}
function bounds(ids: string[]) {
  let minQ = Infinity,
    maxQ = -Infinity,
    minR = Infinity,
    maxR = -Infinity;
  for (const id of ids) {
    const [q, r] = coord(id);
    minQ = Math.min(minQ, q);
    maxQ = Math.max(maxQ, q);
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
  }
  return { minQ, maxQ, minR, maxR };
}
/** Starting from a valid map, move each new cell toward its proposed climate.
 * Every accepted recoloring remains compatible with its neighbors and strictly
 * reduces graph distance to its proposal. Cells that cannot advance form buffers.
 * At most six recolorings per cell; existing climate reservations never change. */
export function bufferClimates(
  baseline: Record<string, Climate>,
  proposed: Record<string, Climate>,
  mutable: string[],
  seed: string,
) {
  const result = { ...baseline },
    allowed = new Set(mutable);
  const queue = [...mutable].sort(
    (a, b) =>
      randomAt(seed, a, "climate-buffer") - randomAt(seed, b, "climate-buffer"),
  );
  const queued = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    queued.delete(id);
    const current = result[id],
      goal = proposed[id];
    if (current === goal) continue;
    const adjacent = neighbors(id)
      .map((n) => result[n])
      .filter((c): c is Climate => !!c);
    const candidates = CLIMATES.filter(
      (c) =>
        distanceTo(c, goal) < distanceTo(current, goal) &&
        adjacent.every((n) => compatibleClimate(c, n)),
    ).sort(
      (a, b) =>
        distanceTo(a, goal) - distanceTo(b, goal) ||
        randomAt(seed, id, `buffer-${a}`) - randomAt(seed, id, `buffer-${b}`),
    );
    if (!candidates.length) continue;
    result[id] = candidates[0];
    for (const n of [id, ...neighbors(id)])
      if (allowed.has(n) && !queued.has(n)) {
        queued.add(n);
        queue.push(n);
      }
  }
  return result;
}
/** Reserve an unseen rectangular collar before terrain is rolled. Coordinate
 * clamping extends the old valid rectangle without introducing incompatible edges.
 * Reserving holes also prevents later expeditions finding an impossible boundary. */
export function planClimates(world: World, seed: string, revealed: string[]) {
  if (!revealed.length) return;
  const previous = world.climatePlan ?? {},
    oldIds = Object.keys(previous);
  const all = [...oldIds, ...revealed, ...Object.keys(world.tiles)],
    extent = bounds(all);
  const revealBounds = bounds(revealed);
  extent.minQ = Math.min(extent.minQ, revealBounds.minQ - 2);
  extent.maxQ = Math.max(extent.maxQ, revealBounds.maxQ + 2);
  extent.minR = Math.min(extent.minR, revealBounds.minR - 2);
  extent.maxR = Math.max(extent.maxR, revealBounds.maxR + 2);
  const seedTile = [...revealed].sort(
    (a, b) =>
      randomAt(seed, a, "climate-start") - randomAt(seed, b, "climate-start"),
  )[0];
  const initial = Object.keys(world.tiles).length
    ? "temperate"
    : CLIMATES[
        Math.floor(
          randomAt(seed, seedTile, "climate-initial") * CLIMATES.length,
        )
      ];
  const oldBounds = oldIds.length ? bounds(oldIds) : undefined;
  const baseline: Record<string, Climate> = { ...previous },
    assigned: Record<string, Climate> = { ...previous };
  const fresh: string[] = [];
  for (let q = extent.minQ; q <= extent.maxQ; q++)
    for (let r = extent.minR; r <= extent.maxR; r++) {
      const id = key(q, r);
      if (previous[id]) continue;
      baseline[id] = oldBounds
        ? previous[
            key(
              Math.max(oldBounds.minQ, Math.min(oldBounds.maxQ, q)),
              Math.max(oldBounds.minR, Math.min(oldBounds.maxR, r)),
            )
          ]
        : initial;
      if (world.tiles[id]) {
        baseline[id] = world.tiles[id].climate ?? "temperate";
        assigned[id] = baseline[id];
      } else fresh.push(id);
    }
  if (!Object.keys(assigned).length) assigned[seedTile] = initial;
  const queue = Object.keys(assigned).sort(
    (a, b) =>
      randomAt(seed, a, "climate-frontier") -
      randomAt(seed, b, "climate-frontier"),
  );
  const pending = new Set(fresh);
  if (assigned[seedTile]) pending.delete(seedTile);
  for (let i = 0; i < queue.length; i++)
    for (const id of neighbors(queue[i]).sort(
      (a, b) =>
        randomAt(seed, a, "climate-order") - randomAt(seed, b, "climate-order"),
    )) {
      if (!pending.has(id)) continue;
      const adjacent = neighbors(id)
        .map((n) => assigned[n])
        .filter((c): c is Climate => !!c);
      if (!adjacent.length) continue;
      const base =
        adjacent[
          Math.floor(randomAt(seed, id, "climate-parent") * adjacent.length)
        ];
      const same = adjacent.every((c) => c === base),
        stay = randomAt(seed, id, "climate-stay") < 0.88;
      let climate = base;
      if (!same || !stay) {
        const withinTwo = [
          ...new Set(neighbors(id).flatMap((n) => [n, ...neighbors(n)])),
        ]
          .filter((n) => n !== id)
          .map((n) => assigned[n])
          .filter((c): c is Climate => !!c);
        let choices = CLIMATES.filter((c) =>
          withinTwo.every((n) => compatibleClimate(c, n)),
        );
        if (same && !stay) choices = choices.filter((c) => c !== base);
        if (!same && stay) {
          const familiar = choices.filter((c) => adjacent.includes(c));
          if (familiar.length) choices = familiar;
        }
        if (choices.length)
          climate =
            choices[
              Math.floor(randomAt(seed, id, "climate-switch") * choices.length)
            ];
      }
      assigned[id] = climate;
      pending.delete(id);
      queue.push(id);
    }
  // A seed inside the old reservation was removed from pending but is already assigned.
  for (const id of pending) assigned[id] = baseline[id];
  for (const id of fresh) assigned[id] ??= baseline[id];
  world.climatePlan = bufferClimates(
    baseline,
    assigned,
    fresh.filter(
      (id) =>
        oldIds.length || Object.keys(world.tiles).length || id !== seedTile,
    ),
    seed,
  );
}
export function climateTerrain(
  seed: string,
  id: string,
  climate: Climate,
): Pick<Hex, "resource" | "climate" | "biome" | "fish" | "whale"> {
  const info = CLIMATE_INFO[climate];
  let biome: Biome = "water";
  if (randomAt(seed, id, "terrain") < info.land) {
    let roll =
      randomAt(seed, id, "resource") *
      info.terrain.reduce((n, [, weight]) => n + weight, 0);
    biome = info.terrain.at(-1)![0];
    for (const [candidate, weight] of info.terrain) {
      roll -= weight;
      if (roll < 0) {
        biome = candidate;
        break;
      }
    }
  } else
    for (const [candidate, chance] of info.water)
      if (randomAt(seed, id, `water-${candidate}`) < chance) {
        biome = candidate;
        break;
      }
  return {
    climate,
    biome,
    resource: BIOME_INFO[biome].resource,
    ...(biome === "fish" || biome === "cod" ? { fish: true } : {}),
    ...(biome === "whale" ? { whale: true } : {}),
  };
}
