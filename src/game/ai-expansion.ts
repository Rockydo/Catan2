import { appendValues } from "./aggregate";
import { emergencyTarget } from "./relations";
import type { Game } from "./types";
import { factionStrengths } from "./ai-strategy";
import { canOccupy } from "./world";
import {
  blockAt,
  hostileAt,
  ownTowns,
  routeKind,
  settlementSites,
  townAt,
} from "./selectors";

/** Human seats never consume an AI rank; faction ID resolves exact score ties. */
export function strongestAI(s: Game): number[] {
  const scores = factionStrengths(s);
  return s.players
    .filter((p) => p.alive && p.control !== "human")
    .sort((a, b) => scores[b.id] - scores[a.id] || a.id - b.id)
    .slice(0, 2)
    .map((p) => p.id);
}

/** Can the network reach any legal settlement without fighting or revealing tiles?
 * No resource budget or AI search-depth limit: poverty and distant sites do not
 * qualify as being cornered. Road/sea-route transitions obey normal build rules.
 */
export function isCornered(s: Game, player = s.active): boolean {
  const sites = new Set(settlementSites(s, player, true));
  if (!sites.size) return true;
  const queue = ownTowns(s, player).map((t) => t.vertex);
  for (const route of Object.values(s.routes))
    if (route.owner === player)
      appendValues(queue, s.edges[route.edge].vertices);
  const seen = new Set<string>();
  const checkedEdges = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const vertex = queue[i];
    if (seen.has(vertex)) continue;
    seen.add(vertex);
    const town = townAt(s, vertex);
    if (
      (town && town.owner !== player) ||
      (s.towers[vertex] && s.towers[vertex].owner !== player)
    )
      continue;
    if (sites.has(vertex)) return false;
    for (const id of s.vertices[vertex].edges) {
      if (checkedEdges.has(id)) continue;
      checkedEdges.add(id);
      const route = s.routes[id],
        edge = s.edges[id];
      if (route && route.owner !== player) continue;
      const kind = routeKind(s, id);
      if (
        edge.tiles.some((tile) =>
          kind === "road"
            ? blockAt(s, tile, player)
            : hostileAt(s, tile, player, canOccupy(s.tiles[tile], true)),
        )
      )
        continue;
      appendValues(queue, edge.vertices);
    }
  }
  return true;
}

const eligibility = new WeakMap<Game, Map<number, boolean>>();
/** Hard expedition rule, shared by engine, research and planner. */
export function aiExpeditionAllowed(s: Game, player = s.active): boolean {
  if (
    s.players[player].control === "human" ||
    emergencyTarget(s, player) !== undefined
  )
    return true;
  let cached = eligibility.get(s);
  if (cached?.has(player)) return cached.get(player)!;
  const allowed = strongestAI(s)[0] !== player;
  if (!cached) eligibility.set(s, (cached = new Map()));
  cached.set(player, allowed);
  return allowed;
}

export const AI_EXPEDITION_RESTRICTION =
  "The strongest AI faction cannot launch expeditions unless fighting in an emergency coalition.";
