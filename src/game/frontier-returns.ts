import type { Game, Town, UnitClass } from "./types";
import { hash, nextRandom, distance, landAtVertex } from "./world";
import { settlementSites, hostileAt, unusedBonuses } from "./selectors";
import { log } from "./economy";

function draw(s: Game): number {
  const [value, next] = nextRandom(
    s.frontierRng ?? hash(s.seed + "frontier-returns"),
  );
  s.frontierRng = next;
  return value;
}
/** Only legal intersections touching newly discovered land; never alter terrain. */
export function frontierReturnSites(
  s: Game,
  owner: number,
  revealed: string[],
): string[] {
  const land = new Set(
    revealed.filter(
      (id) => s.tiles[id] && !["water", "ice"].includes(s.tiles[id].resource),
    ),
  );
  return settlementSites(s, owner, true).filter((v) =>
    s.vertices[v].tiles.some(
      (id) => land.has(id) && !hostileAt(s, id, owner, false),
    ),
  );
}
export function restoreOnFrontier(
  s: Game,
  owner: number,
  revealed: string[],
  townCount: number,
  troopCount: number,
): boolean {
  const p = s.players[owner];
  if (
    !p ||
    p.alive ||
    ![1, 2, 3].includes(townCount) ||
    ![1, 2, 3].includes(troopCount)
  )
    return false;
  const built: Town[] = [];
  const land = new Set(
    revealed.filter(
      (id) => s.tiles[id] && !["water", "ice"].includes(s.tiles[id].resource),
    ),
  );
  for (let i = 0; i < townCount; i++) {
    const candidates = frontierReturnSites(s, owner, revealed);
    if (!candidates.length) break;
    // A random foothold, then a compact cluster. Ordinary spacing still applies.
    const vertex = built.length
      ? candidates
          .map((v) => ({
            v,
            score:
              Math.min(
                ...s.vertices[v].tiles.flatMap((a) =>
                  built.flatMap((t) =>
                    s.vertices[t.vertex].tiles.map((b) => distance(a, b)),
                  ),
                ),
              ) +
              draw(s) * 1.5,
          }))
          .sort((a, b) => a.score - b.score)[0].v
      : candidates[Math.floor(draw(s) * candidates.length)];
    const id = `t${s.nextId++}`;
    const t: Town = {
      id,
      owner,
      vertex,
      name: `${p.name.split(" ")[0]} Return ${i + 1}`,
      level: 1,
      wall: 0,
      stock: {},
      extensions: {},
      born: Math.max(1, p.turns),
      turnLevel: 1,
      recruited: 0,
      launched: 0,
    };
    s.towns[id] = t;
    built.push(t);
  }
  if (!built.length) return false;
  p.alive = true;
  p.turns = Math.max(1, p.turns);
  p.hand = [];
  p.bonuses = unusedBonuses();
  p.researchBought =
    p.researchPlayed =
    p.expeditionUsed =
    p.routeMoved =
    p.tradeOffered =
    p.diplomacyDone =
      false;
  delete p.plan;
  delete p.allianceContacts;
  const deployment = [
    ...new Set(built.flatMap((t) => landAtVertex(s, t.vertex))),
  ].filter((id) => land.has(id) && !hostileAt(s, id, owner, false));
  const kinds: UnitClass[] = ["heavy", "light", "cavalry"];
  for (let i = 0; i < troopCount; i++) {
    const id = `u${s.nextId++}`,
      tile = deployment[Math.floor(draw(s) * deployment.length)];
    s.pieces[id] = {
      id,
      owner,
      tile,
      kind: kinds[Math.floor(draw(s) * kinds.length)],
      tier: 1,
      naval: false,
      born: p.turns,
      moved: 0,
      acted: false,
      bonus: 0,
    };
  }
  log(
    s,
    `${p.name} has returned on the newly explored frontier with ${built.length} settlement${built.length === 1 ? "" : "s"} and ${troopCount} troops!`,
    "warning",
    owner,
    s.vertices[built[0].vertex].tiles[0],
  ).frontierReturn = {
    faction: owner,
    towns: built.length,
    troops: troopCount,
    vertex: built[0].vertex,
  };
  return true;
}
/** Each eliminated faction receives its own independent 10% roll per expedition. */
export function tryFrontierReturns(s: Game, revealed: string[]) {
  for (const p of s.players) {
    if (p.alive) continue;
    if (draw(s) >= 0.1) continue;
    restoreOnFrontier(
      s,
      p.id,
      revealed,
      1 + Math.floor(draw(s) * 3),
      1 + Math.floor(draw(s) * 3),
    );
  }
}
