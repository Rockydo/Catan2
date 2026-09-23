import type { Command, Game, Stock } from "./types";
import { isSettler, shipCost, unitCost } from "./content";
import { canOccupy, neighbors } from "./world";
import { tileYield } from "./maritime";
import { marketValues } from "./ai-market";
import { seasonalDestinationSafe, seasonalDiversityBonus } from "./ai-seasonal";
import { colonistDanger } from "./ai-threats";
import {
  besieged,
  colonizationSites,
  hostileAt,
  income,
  ownPieces,
  ownTowns,
  planningValue,
  probability,
  ready,
  settlementSites,
  speed,
} from "./selectors";

/** Only revealed, reachable sites. Colonists avoid combat rather than trying to win it. */
function planner(s: Game) {
  return planningValue(s, `colonistPlanner/${s.active}`, () =>
    createPlanner(s),
  );
}
function createPlanner(s: Game) {
  let values: ReturnType<typeof marketValues> | undefined;
  let inc: Stock | undefined;
  const danger = colonistDanger(s);
  let connected: Set<string> | undefined;
  let sites: string[] | undefined;
  const siteValues = new Map<string, number>();
  const siteValue = (vertex: string) => {
    if (!siteValues.has(vertex)) {
      values ??= marketValues(s);
      inc ??= income(s);
      siteValues.set(
        vertex,
        (1 + seasonalDiversityBonus(s, s.vertices[vertex].tiles)) *
          s.vertices[vertex].tiles.reduce(
            (sum, t) =>
              sum +
              probability(s.tiles[t].number) *
                Object.entries(tileYield(s.tiles[t], s.active)).reduce(
                  (n, [g, amount]) =>
                    n +
                    (amount! * (values![g as keyof typeof values] ?? 1)) /
                      (1 + 4 * (inc![g as keyof Stock] ?? 0)),
                  0,
                ),
            0,
          ),
      );
    }
    return siteValues.get(vertex)!;
  };
  type Target = { vertex: string; path: string[]; score: number } | undefined;
  const targets = new Map<string, Target>();
  const evaluate = (
    origin: string,
    naval: boolean,
    recruiting: boolean,
  ): Target => {
    const blocked = danger[naval ? 1 : 0];
    if (blocked.has(origin)) return undefined;
    // Blocked parties cannot choose a site. Travelling parties do not need to
    // inspect road access, which only filters prospective recruitment sites.
    sites ??= settlementSites(s, s.active, true).filter(
      (v) => !s.vertices[v].tiles.some((t) => hostileAt(s, t)),
    );
    if (recruiting) connected ??= new Set(settlementSites(s));
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
    for (const vertex of sites) {
      if (recruiting && connected!.has(vertex)) continue;
      for (const tile of s.vertices[vertex].tiles) {
        const path = paths.get(tile);
        if (!path || blocked.has(tile)) continue;
        // An isolated colonist does not need a production forecast for sites
        // outside its reachable area. Scores and tie ordering stay identical.
        const value = siteValue(vertex);
        if (value <= 0) continue;
        const score = (value * 44) / (1 + path.length * 0.28) + 5;
        if (!best || score > best.score) best = { vertex, path, score };
      }
    }
    return best;
  };
  return (origin: string, naval: boolean, recruiting = false): Target => {
    const key = `${origin}/${naval}/${recruiting}`;
    if (!targets.has(key))
      targets.set(key, evaluate(origin, naval, recruiting));
    return targets.get(key);
  };
}

export function colonistAction(s: Game): Command | null {
  const units = ownPieces(s).filter(
    (u) =>
      isSettler(u.kind) &&
      ready(s, u) &&
      (speed(u) + u.bonus - u.moved > 0 || colonizationSites(s, u).length > 0),
  );
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
    for (let step = steps - 1; step >= 0; step--)
      if (seasonalDestinationSafe(s, target.path[step], unit.naval))
        return { type: "move", ids: [unit.id], to: target.path[step] };
  }
  return null;
}

export function colonistProjects(
  s: Game,
): { action: Command; cost: Stock; score: number }[] {
  const towns = ownTowns(s),
    units = ownPieces(s),
    projects = [];
  let plan: ReturnType<typeof planner> | undefined;
  for (const naval of [false, true]) {
    // Fund additional parties as the empire grows, but first use parties already travelling.
    if (
      units.filter((u) => isSettler(u.kind) && u.naval === naval).length >=
      Math.max(1, Math.ceil(towns.length / 4))
    )
      continue;
    plan ??= planner(s);
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
