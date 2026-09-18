import { factionStrengths } from "./ai-strategy";
import { townGuilds } from "./guilds";
import { GOODS, type Game, type Piece, type Town } from "./types";
import { strongestAI } from "./ai-expansion";
import {
  ownTowns,
  ownPieces,
  unusedBonuses,
  withPlanningFrame,
} from "./selectors";
import { distance, hash, neighbors, nextRandom, canOccupy } from "./world";
import { log } from "./economy";

function draw(s: Game): number {
  const [value, state] = nextRandom(
    s.rebellionRng ?? hash(s.seed + "rebellions"),
  );
  s.rebellionRng = state;
  return value;
}
const quota = (count: number, share: number) => Math.round(count * share);
const rebased = (born: number, before: number, after: number) =>
  born >= before ? after : Math.max(0, after - 1);
function tileDistance(s: Game, tile: string, towns: Town[]) {
  return Math.min(
    ...towns.flatMap((t) =>
      s.vertices[t.vertex].tiles.map((id) => distance(tile, id)),
    ),
  );
}

/** Mutates an engine working copy. Buildings/attachments remain whole. */
export function startRebellion(
  s: Game,
  victim: number,
  rebel: number,
  share: number,
): boolean {
  const donor = s.players[victim],
    restored = s.players[rebel];
  const towns = ownTowns(s, victim);
  if (
    !donor?.alive ||
    !restored ||
    restored.alive ||
    restored.control === "human" ||
    towns.length < 2 ||
    !Number.isFinite(share) ||
    share < (donor.control === "human" ? 0.15 : 0.25) ||
    share > (donor.control === "human" ? 0.35 : 0.45)
  )
    return false;
  const count = Math.max(
    1,
    Math.min(towns.length - 1, quota(towns.length, share)),
  );
  const pool = [...towns],
    region: Town[] = [];
  region.push(pool.splice(Math.floor(draw(s) * pool.length), 1)[0]);
  // Grow a compact region from a random town. Nearby ties get some variation;
  // island empires can yield multiple regions without scattering each building.
  const noise = new Map(pool.map((t) => [t.id, draw(s) * 1.5]));
  while (region.length < count) {
    pool.sort(
      (a, b) =>
        Math.min(
          ...s.vertices[a.vertex].tiles.map((id) =>
            tileDistance(s, id, region),
          ),
        ) +
        noise.get(a.id)! -
        Math.min(
          ...s.vertices[b.vertex].tiles.map((id) =>
            tileDistance(s, id, region),
          ),
        ) -
        noise.get(b.id)!,
    );
    region.push(pool.shift()!);
  }
  const regionalScore = (tiles: string[]) =>
    Math.min(...tiles.map((id) => tileDistance(s, id, region))) -
    Math.min(...tiles.map((id) => tileDistance(s, id, pool)));
  function regionalOrder<T>(items: T[], tiles: (item: T) => string[]): T[] {
    return items
      .map((item) => ({
        item,
        score: regionalScore(tiles(item)) + draw(s) * 0.8,
      }))
      .sort((a, b) => a.score - b.score)
      .map(({ item }) => item);
  }
  const originalStock = Object.fromEntries(
    GOODS.map((g) => [g, towns.reduce((n, t) => n + (t.stock[g] ?? 0), 0)]),
  );
  restored.alive = true;
  restored.turns = Math.max(1, restored.turns);
  restored.bonuses = unusedBonuses();
  restored.hand = [];
  restored.researchBought =
    restored.researchPlayed =
    restored.expeditionUsed =
    restored.routeMoved =
    restored.tradeOffered =
      false;
  restored.diplomacyDone = false;
  delete restored.allianceContacts;
  delete restored.plan;
  delete donor.plan;
  for (const town of region) {
    town.owner = rebel;
    town.born = rebased(town.born, donor.turns, restored.turns);
    for (const guild of townGuilds(town)) {
      guild.born = rebased(guild.born, donor.turns, restored.turns);
      guild.auto = false; // The new owner chooses how to spend its stores.
    }
  }
  const routes = Object.values(s.routes).filter((r) => r.owner === victim);
  const secedingRoutes = regionalOrder(
    routes,
    (r) => s.edges[r.edge].tiles,
  ).slice(0, quota(routes.length, share));
  for (const route of secedingRoutes) {
    route.owner = rebel;
    route.born = rebased(route.born, donor.turns, restored.turns);
  }
  const towers = Object.values(s.towers).filter((t) => t.owner === victim);
  const townVertices = new Set(towns.map((t) => t.vertex));
  const rebelVertices = new Set(region.map((t) => t.vertex));
  const secedingTowers = towers.filter((t) => rebelVertices.has(t.vertex));
  secedingTowers.push(
    ...regionalOrder(
      towers.filter((t) => !townVertices.has(t.vertex)),
      (t) => s.vertices[t.vertex].tiles,
    ).slice(
      0,
      Math.max(0, quota(towers.length, share) - secedingTowers.length),
    ),
  );
  for (const tower of secedingTowers) tower.owner = rebel;

  const units = ownPieces(s, victim);
  const selected = new Set<string>();
  const ships = units.filter((u) => u.naval);
  for (const ship of regionalOrder(ships, (u) => [u.tile]).slice(
    0,
    quota(ships.length, share),
  )) {
    selected.add(ship.id);
    for (const unit of units)
      if (unit.carrier === ship.id) selected.add(unit.id);
  }
  const passengerCount = units.filter(
    (u) => !u.naval && selected.has(u.id),
  ).length;
  const foot = units.filter((u) => !u.naval && !u.carrier);
  for (const unit of regionalOrder(foot, (u) => [u.tile]).slice(
    0,
    Math.max(
      0,
      quota(units.filter((u) => !u.naval).length, share) - passengerCount,
    ),
  ))
    selected.add(unit.id);

  // Split formations assemble on the nearest free hex of the same terrain.
  // Never put opposing factions on one tile, cross hostile territory, or split
  // a transport from its passengers. If no safe hex exists, that group stays.
  const groups = new Map<string, Piece[]>();
  for (const unit of units)
    if (selected.has(unit.id)) {
      if (!groups.has(unit.tile)) groups.set(unit.tile, []);
      groups.get(unit.tile)!.push(unit);
    }
  for (const [origin, group] of groups) {
    const naval = group.some((u) => u.naval);
    const queue = [origin],
      seen = new Set<string>();
    let destination: string | undefined;
    for (let i = 0; i < queue.length; i++) {
      const tile = queue[i];
      if (seen.has(tile)) continue;
      seen.add(tile);
      const present = Object.values(s.pieces).filter(
        (u) => u.tile === tile && !u.carrier && !selected.has(u.id),
      );
      if (present.some((u) => u.owner !== victim && u.owner !== rebel))
        continue;
      if (present.every((u) => u.owner === rebel)) {
        destination = tile;
        break;
      }
      queue.push(
        ...neighbors(tile).filter((id) => canOccupy(s.tiles[id], naval)),
      );
    }
    if (!destination) {
      for (const unit of group) selected.delete(unit.id);
      continue;
    }
    for (const unit of group) {
      unit.owner = rebel;
      unit.born = rebased(unit.born, donor.turns, restored.turns);
      if (unit.tile !== destination) delete unit.coverage;
      unit.tile = destination;
    }
  }

  // Keep warehouses in place where possible, equalizing just the difference
  // between regional stocks and the rolled share of each good.
  for (const good of GOODS) {
    const target = quota(originalStock[good], share);
    const held = region.reduce((n, t) => n + (t.stock[good] ?? 0), 0);
    const sources = held > target ? region : pool,
      receivers = held > target ? pool : region;
    let remaining = Math.abs(held - target);
    for (const source of sources) {
      const amount = Math.min(remaining, source.stock[good] ?? 0);
      if (!amount) continue;
      const receiver = [...receivers].sort(
        (a, b) =>
          tileDistance(s, s.vertices[source.vertex].tiles[0], [a]) -
          tileDistance(s, s.vertices[source.vertex].tiles[0], [b]),
      )[0];
      source.stock[good] = (source.stock[good] ?? 0) - amount;
      receiver.stock[good] = (receiver.stock[good] ?? 0) + amount;
      remaining -= amount;
      if (!remaining) break;
    }
  }
  const cards = donor.hand
    .map((card) => ({ card, order: draw(s) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, quota(donor.hand.length, share))
    .map(({ card }) => card);
  const cardIds = new Set(cards.map((c) => c.id));
  donor.hand = donor.hand.filter((c) => !cardIds.has(c.id));
  for (const card of cards)
    card.bought = rebased(card.bought, donor.turns, restored.turns);
  restored.hand = cards;
  // Territory or troop allegiance changes invalidate the old siege operation.
  for (const [id, siege] of Object.entries(s.sieges))
    if (
      s.towns[siege.town]?.owner === siege.owner ||
      siege.units?.some((unit) => selected.has(unit))
    )
      delete s.sieges[id];
  for (const [id, siege] of Object.entries(s.towerSieges ?? {}))
    if (
      s.towers[siege.vertex]?.owner === siege.owner ||
      siege.units?.some((unit) => selected.has(unit))
    )
      delete s.towerSieges![id];
  const defected = units.filter((u) => u.owner === rebel);
  const event = log(
    s,
    `${restored.name} has returned in a rebellion against ${donor.name}! ${Math.round(share * 100)}% secession: ${region.length} ${region.length === 1 ? "town" : "towns"}, ${defected.filter((u) => !u.naval).length} troops, ${defected.filter((u) => u.naval).length} ships and a share of resources and research.`,
    "warning",
    rebel,
    s.vertices[region[0].vertex].tiles[0],
  );
  event.rebellion = {
    victim,
    rebel,
    share: Math.round(share * 100),
    vertex: region[0].vertex,
    towns: region.length,
    troops: defected.filter((u) => !u.naval).length,
    ships: defected.filter((u) => u.naval).length,
    routes: secedingRoutes.length,
    towers: secedingTowers.length,
    cards: cards.length,
    goods: GOODS.reduce((n, g) => n + quota(originalStock[g], share), 0),
  };
  return true;
}

/** One check at the start of the affected faction's own turn. No cooldown. */
export function tryRebellions(s: Game) {
  if (s.phase.startsWith("setup") || s.phase === "finished") return;
  const p = s.players[s.active];
  if (!p.alive || ownTowns(s, p.id).length < 2) return;
  const dead = s.players.filter(
    (other) => !other.alive && other.control !== "human",
  );
  if (!dead.length) return;
  // A separate identity prevents cached pre-secession strength leaking into s.
  const snapshot = { ...s };
  const ranked = withPlanningFrame(snapshot, () => {
    if (p.control !== "human") return strongestAI(snapshot);
    const scores = factionStrengths(snapshot);
    return snapshot.players
      .filter((other) => other.alive)
      .sort((a, b) => scores[b.id] - scores[a.id] || a.id - b.id)
      .slice(0, 2)
      .map((other) => other.id);
  });
  const rank = ranked.indexOf(p.id);
  if (rank < 0) return;
  const chance = p.control === "human" ? [0.08, 0.04][rank] : [0.1, 0.05][rank];
  if (draw(s) >= chance) return;
  const rebel = dead[Math.floor(draw(s) * dead.length)].id;
  const share =
    ((p.control === "human" ? 15 : 25) + Math.floor(draw(s) * 21)) / 100;
  startRebellion(s, p.id, rebel, share);
}
