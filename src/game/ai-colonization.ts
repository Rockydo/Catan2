import type { Command, Game, Stock } from "./types";
import { isSettler, shipCost, unitCost } from "./content";
import { friendly } from "./relations";
import { canOccupy, neighbors } from "./world";
import { tileYield } from "./maritime";
import { marketValues } from "./ai-market";
import {
  besieged,
  colonizationSites,
  hostileAt,
  income,
  ownPieces,
  ownTowns,
  points,
  probability,
  ready,
  settlementSites,
  speed,
} from "./selectors";

/** Only revealed, reachable sites. Colonists avoid combat rather than trying to win it. */
function planner(s: Game) {
  const values = marketValues(s),
    inc = income(s);
  const foes = Object.values(s.pieces).filter(
    (u) => !u.carrier && !friendly(s, u.owner, s.active),
  );
  const danger = [false, true].map(
    (naval) =>
      new Set(
        foes
          .filter((u) => u.naval === naval)
          .flatMap((u) =>
            points(u) > 0 ? [u.tile, ...neighbors(u.tile)] : [u.tile],
          ),
      ),
  );
  const connected = new Set(settlementSites(s));
  const sites = settlementSites(s, s.active, true).filter(
    (v) => !s.vertices[v].tiles.some((t) => hostileAt(s, t)),
  );
  const candidates = sites.map((vertex) => ({
    vertex,
    value: s.vertices[vertex].tiles.reduce(
      (sum, t) =>
        sum +
        probability(s.tiles[t].number) *
          Object.entries(tileYield(s.tiles[t], s.active)).reduce(
            (n, [g, amount]) =>
              n +
              (amount! * (values[g as keyof typeof values] ?? 1)) /
                (1 + 4 * (inc[g as keyof Stock] ?? 0)),
            0,
          ),
      0,
    ),
  }));
  return (origin: string, naval: boolean, recruiting = false) => {
    const blocked = danger[naval ? 1 : 0];
    if (blocked.has(origin)) return undefined;
    const paths = new Map<string, string[]>([[origin, []]]),
      queue = [origin];
    const range = naval ? 14 : 10;
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i],
        path = paths.get(at)!;
      if (path.length >= range) continue;
      for (const next of neighbors(at))
        if (
          !paths.has(next) &&
          canOccupy(s.tiles[next], naval) &&
          !blocked.has(next)
        ) {
          paths.set(next, [...path, next]);
          queue.push(next);
        }
    }
    let best: { vertex: string; path: string[]; score: number } | undefined;
    for (const site of candidates) {
      if (site.value <= 0 || (recruiting && connected.has(site.vertex)))
        continue;
      for (const tile of s.vertices[site.vertex].tiles) {
        const path = paths.get(tile);
        if (!path || blocked.has(tile)) continue;
        const score = (site.value * 44) / (1 + path.length * 0.28) + 5;
        if (!best || score > best.score)
          best = { vertex: site.vertex, path, score };
      }
    }
    return best;
  };
}

export function colonistAction(s: Game): Command | null {
  const units = ownPieces(s).filter((u) => isSettler(u.kind) && ready(s, u));
  if (!units.length) return null;
  const plan = planner(s);
  for (const unit of units) {
    const target = plan(unit.tile, unit.naval);
    if (!target) continue;
    if (
      !target.path.length &&
      colonizationSites(s, unit).includes(target.vertex)
    )
      return { type: "colonize", ids: [unit.id], vertex: target.vertex };
    const steps = Math.min(
      target.path.length,
      speed(unit) + unit.bonus - unit.moved,
    );
    if (steps > 0)
      return { type: "move", ids: [unit.id], to: target.path[steps - 1] };
  }
  return null;
}

export function colonistProjects(
  s: Game,
): { action: Command; cost: Stock; score: number }[] {
  const towns = ownTowns(s),
    units = ownPieces(s),
    projects = [];
  const plan = planner(s);
  for (const naval of [false, true]) {
    // Fund additional parties as the empire grows, but first use parties already travelling.
    if (
      units.filter((u) => isSettler(u.kind) && u.naval === naval).length >=
      Math.max(1, Math.ceil(towns.length / 4))
    )
      continue;
    let best: { action: Command; cost: Stock; score: number } | undefined;
    for (const town of towns) {
      if (town.turnLevel < 1 || besieged(s, town.id)) continue;
      for (const tile of s.vertices[town.vertex].tiles) {
        if (!canOccupy(s.tiles[tile], naval)) continue;
        const target = plan(tile, naval, true);
        if (!target) continue;
        const score = target.score;
        if (!best || score > best.score)
          best = {
            action: {
              type: naval ? "ship" : "recruit",
              kind: naval ? "settlership" : "settler",
              town: town.id,
              tile,
              tier: 1,
            },
            cost: naval ? shipCost("settlership") : unitCost("settler", 1),
            score,
          };
      }
    }
    if (best) projects.push(best);
  }
  return projects;
}
