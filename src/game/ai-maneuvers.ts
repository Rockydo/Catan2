import type { Command, Game } from "./types";

/** Reuse only a completed "no military action" search. Trading and operating
 * industry do not create a new path or battle. Resource-sensitive collectors,
 * settlers and guild supply are evaluated separately before this cache.
 * A single entry bounds memory and is safe across worker requests and saves. */
let lastPosition: string | undefined;
export function cachedMilitaryWait(s: Game, evaluate: () => Command): Command {
  const occupied = new Set(
    Object.values(s.pieces)
      .filter((u) => u.owner === s.active)
      .map((u) => u.tile),
  );
  const position = JSON.stringify({
    seed: s.seed,
    generation: s.generation,
    active: s.active,
    round: s.round,
    players: s.players,
    calendar: s.calendar,
    tiles: s.tiles,
    vertices: s.vertices,
    edges: s.edges,
    pieces: s.pieces,
    routes: s.routes,
    towns: Object.values(s.towns).map((town) => ({
      ...town,
      // Only enemy stores change the payoff for raiding in this search.
      stock: town.owner === s.active ? undefined : town.stock,
      // Readiness and contract allowances are checked by guildMilitaryOrder.
      guild: town.guild && { kind: town.guild.kind, tier: town.guild.tier },
      guilds: town.guilds?.map((g) => ({ kind: g.kind, tier: g.tier })),
    })),
    // A distant friendly tower has no effect on current combat power, paths
    // or enemy siege defenses. Hostile towers remain potential targets.
    towers: Object.values(s.towers).filter(
      (tower) =>
        tower.owner !== s.active ||
        s.vertices[tower.vertex].tiles.some((tile) => occupied.has(tile)),
    ),
    sieges: s.sieges,
    towerSieges: s.towerSieges,
    alliances: s.alliances,
    withdrawals: s.withdrawals,
  });
  if (lastPosition === position) return { type: "end-turn" };
  const command = evaluate();
  lastPosition = command.type === "end-turn" ? position : undefined;
  return command;
}
