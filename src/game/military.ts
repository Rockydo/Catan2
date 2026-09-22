import { friendly, emergencyTarget } from "./relations";
import {
  GOODS,
  type Game,
  type Piece,
  type Command,
  type ShipClass,
  type Stock,
} from "./types";
import { SHIP_INFO, shipStats, isSettler } from "./content";
import { neighbors, canOccupy } from "./world";
import { rule, log, addStock } from "./economy";
import {
  piecesAt,
  combatantsAt,
  ready,
  fresh,
  speed,
  points,
  power,
  bombardmentPower,
  fleetDefenders,
  bombardmentTargets,
  moveTargets,
  minCasualties,
  retreatOptions,
  protects,
  canBesiege,
  siegeRequirement,
  towerSiegeRequirement,
  towerGuards,
  sumStock,
  nearestTown,
  hostileAt,
  ownTowns,
  withPlanningFrame,
} from "./selectors";

export function selected(
  s: Game,
  ids: string[] | undefined,
  stationary = false,
  naval?: boolean,
): Piece[] {
  rule(ids?.length, "Select at least one unit.");
  rule(new Set(ids).size === ids.length, "A unit cannot be selected twice.");
  const units = ids.map((id) => s.pieces[id]);
  rule(
    units.every((u) => u && u.owner === s.active),
    "Select only your own units.",
  );
  rule(
    units.every((u) => (stationary ? fresh(s, u) : ready(s, u))),
    "These units have already acted, are embarked, or are newly recruited.",
  );
  rule(
    units.every((u) => u.tile === units[0].tile && u.naval === units[0].naval),
    "Selected units must share a tile and movement type.",
  );
  if (naval !== undefined)
    rule(
      units.every((u) => u.naval === naval),
      naval ? "Select a fleet." : "Select a land army.",
    );
  return units;
}
export function setTile(s: Game, u: Piece, tile: string) {
  if (tile !== u.tile) delete u.seasonStatus;
  if (u.tile !== tile) delete u.coverage;
  u.tile = tile;
  if (u.naval)
    for (const v of Object.values(s.pieces))
      if (v.carrier === u.id) {
        delete v.coverage;
        v.tile = tile;
      }
}
export function removePieces(
  s: Game,
  ids: string[],
  friendly: Piece[] = [],
  enemies: Piece[] = [],
) {
  const removed = new Set(ids);
  const survivors = friendly.filter(
    (u) => !removed.has(u.id) && s.pieces[u.id],
  );
  for (const unit of Object.values(s.pieces)) {
    if (removed.has(unit.id) || !unit.carrier || !removed.has(unit.carrier))
      continue;
    const carrier = survivors.find(
      (ship) =>
        ship.naval &&
        ship.tile === unit.tile &&
        ship.owner === unit.owner &&
        Object.values(s.pieces).filter(
          (u) => u.carrier === ship.id && !removed.has(u.id),
        ).length < shipStats(ship.kind as ShipClass, ship.tier).capacity,
    );
    if (carrier) {
      unit.carrier = carrier.id;
      unit.tile = carrier.tile;
      survivors.push(unit);
    } else removed.add(unit.id);
  }
  for (const id of removed) delete s.pieces[id];
}
export function breakSieges(s: Game) {
  if (!Object.keys(s.sieges).length && !Object.keys(s.towerSieges ?? {}).length)
    return;
  // Movement, battles and diplomacy call this on mutable drafts. Build a
  // fresh local index once, after those mutations; only sieges and logs change
  // during this read. Never retain an occupation index across military orders.
  withPlanningFrame(s, () => checkSieges(s));
}
function checkSieges(s: Game) {
  for (const [id, siege] of Object.entries(s.towerSieges ?? {})) {
    const tower = s.towers[siege.vertex];
    if (
      !tower ||
      tower.id !== siege.tower ||
      friendly(s, tower.owner, siege.owner) ||
      towerGuards(s, tower) ||
      !s.vertices[tower.vertex].tiles.some((tile) =>
        piecesAt(s, tile, false).some(
          (u) => u.owner === siege.owner && points(u) > 0,
        ),
      )
    ) {
      delete s.towerSieges![id];
      if (tower)
        log(
          s,
          "The watchtower siege was broken.",
          "battle",
          tower.owner,
          s.vertices[tower.vertex].tiles[0],
        );
    }
  }
  for (const [id, siege] of Object.entries(s.sieges)) {
    const town = s.towns[siege.town];
    const guarded = new Map<boolean, boolean>();
    const hasGuard = (naval: boolean) => {
      if (!guarded.has(naval)) guarded.set(naval, protects(s, town, naval));
      return guarded.get(naval)!;
    };
    if (
      !town ||
      friendly(s, town.owner, siege.owner) ||
      !s.vertices[town.vertex].tiles.some((t) =>
        piecesAt(s, t).some(
          (u) =>
            u.owner === siege.owner && canBesiege(s, u) && !hasGuard(u.naval),
        ),
      )
    ) {
      delete s.sieges[id];
      if (town)
        log(s, `The siege of ${town.name} was broken.`, "battle", town.owner);
    }
  }
}
export function resolveBattle(s: Game, c: Command) {
  const b = s.battle;
  rule(b, "No battle is awaiting resolution.");
  rule(
    (c.actor ?? s.active) === b.loser,
    "The losing player chooses casualties.",
  );
  const ids = [...(c.ids ?? [])];
  rule(new Set(ids).size === ids.length, "Choose each casualty only once.");
  const losingIds = b.loser === b.attacker ? b.attackers : b.defenders;
  rule(
    ids.every((id) => losingIds.includes(id)),
    "Casualties must belong to the losing army.",
  );
  rule(
    ids.reduce((n, id) => n + points(s.pieces[id]), 0) === b.required,
    `Remove whole units totaling exactly ${b.required} points (the smallest possible total).`,
  );
  const losers = losingIds.map((id) => s.pieces[id]),
    winnerIds = b.loser === b.attacker ? b.defenders : b.attackers,
    winners = winnerIds.map((id) => s.pieces[id]);
  // Zero-power ships cannot satisfy a points choice, but are lost with a defeated fleet.
  for (const u of losers)
    if (points(u) === 0 && !ids.includes(u.id)) ids.push(u.id);
  const remaining = losers.filter((u) => !ids.includes(u.id));
  const options =
    b.loser === b.defender
      ? retreatOptions(
          s,
          b.target,
          b.defender,
          b.naval,
          b.origin,
          remaining,
        ).filter((tile) =>
          remaining.every((u) => !hostileAt(s, tile, u.owner, b.naval)),
        )
      : [];
  if (remaining.length && b.loser === b.defender && options.length)
    rule(
      c.retreat && options.includes(c.retreat),
      "Choose a legal retreat hex.",
    );
  removePieces(s, ids, remaining, winners);
  if (b.loser === b.defender) {
    if (remaining.length && options.length)
      remaining.forEach((u) => setTile(s, u, c.retreat!));
    if (!b.bombardment && (!remaining.length || options.length))
      for (const id of b.attackers)
        if (s.pieces[id]) setTile(s, s.pieces[id], b.target);
  }
  log(
    s,
    `${s.players[b.loser].name} lost ${ids.length} ${losers[0].naval ? "ship" : "unit"}${ids.length === 1 ? "" : "s"} (${b.required} points). ${b.attackerPower} against ${b.defenderPower}.`,
    "battle",
    b.loser,
    b.target,
  );
  delete s.battle;
  breakSieges(s);
}
/** Shared combat rules for normal movement and forced landings after thaw. */
export function engageBattle(
  s: Game,
  units: Piece[],
  defenders: Piece[],
  origin: string,
  target: string,
  thawRetreat = false,
): void {
  const attacker = units[0].owner;
  // A human chooses losses for an allied defense that includes their troops.
  defenders = [...defenders].sort(
    (a, b) =>
      Number(s.players[a.owner].control !== "human") -
      Number(s.players[b.owner].control !== "human"),
  );
  // Exposed merchants and colonists are lost when combat begins, including ties.
  const civilians = [...units, ...defenders].filter(
    (u) => u.kind === "merchant" || isSettler(u.kind),
  );
  removePieces(
    s,
    civilians.map((u) => u.id),
  );
  if (civilians.length)
    log(
      s,
      `${civilians.length} civilian unit(s) were destroyed in battle.`,
      "battle",
      undefined,
      target,
    );
  const fighting = units.filter((u) => s.pieces[u.id]),
    defending = defenders.filter((u) => s.pieces[u.id]);
  const a = power(s, fighting, target),
    d = power(s, defending, target);
  if (!fighting.length || !defending.length) {
    if (!defending.length) fighting.forEach((u) => setTile(s, u, target));
    breakSieges(s);
    return;
  }
  if (a === d) {
    log(
      s,
      `Battle tied ${a}–${d}; the defender held.`,
      "battle",
      attacker,
      target,
    );
  } else {
    const loser = a < d ? attacker : defending[0].owner,
      losers = a < d ? fighting : defending;
    const loss = Math.min(
      Math.abs(a - d),
      losers.reduce((n, u) => n + points(u), 0),
    );
    s.battle = {
      ...(thawRetreat ? { thawRetreat: true as const } : {}),
      attacker,
      defender: defending[0].owner,
      attackers: fighting.map((u) => u.id),
      defenders: defending.map((u) => u.id),
      origin,
      target,
      naval: units[0].naval,
      attackerPower: a,
      defenderPower: d,
      loser,
      loss,
      required: minCasualties(losers, loss),
    };
    if (losers.every((u) => points(u) === 0))
      resolveBattle(s, { type: "resolve-battle", actor: loser, ids: [] });
  }
}

export function siegeArmy(s: Game, c: Command) {
  const units = selected(s, c.ids, c.type !== "siege");
  const naval = units[0].naval;
  if (c.type === "siege")
    rule(
      units.every((u) => speed(u) + u.bonus - u.moved >= 1),
      "Sieging or raiding costs 1 remaining movement point per participating unit.",
    );
  rule(
    units.some((u) => canBesiege(s, u)),
    naval
      ? "Coastal sieges require a carrack or a tier III or IV frigate in open water."
      : "Civilian units cannot siege or raid towns.",
  );
  const town = s.towns[c.town ?? ""];
  rule(town && !friendly(s, town.owner, s.active), "Select an enemy town.");
  rule(
    s.vertices[town.vertex].tiles.includes(units[0].tile),
    naval
      ? "The fleet must be on an open-water hex adjacent to the town."
      : "The army must be on a land hex adjacent to the town.",
  );
  rule(
    !protects(s, town, naval),
    naval
      ? "Defeat every defending army and fleet adjacent to the town first."
      : "Defeat every defending army on the town’s adjacent land hexes first.",
  );
  return { units, town };
}
export function militaryCommand(s: Game, c: Command): boolean {
  if (c.type === "bombard") {
    const units = selected(s, c.ids, false, false);
    rule(
      c.to && bombardmentTargets(s, c.ids!).includes(c.to),
      "Select artillery with 1 movement point and an adjacent enemy fleet.",
    );
    const target = c.to,
      defenders = fleetDefenders(s, target);
    defenders.sort(
      (a, b) =>
        Number(s.players[b.owner].control === "human") -
          Number(s.players[a.owner].control === "human") || a.owner - b.owner,
    );
    const colonists = defenders.filter(
      (u) => isSettler(u.kind) || u.kind === "merchant",
    );
    removePieces(
      s,
      colonists.map((u) => u.id),
    );
    for (let i = defenders.length - 1; i >= 0; i--)
      if (!s.pieces[defenders[i].id]) defenders.splice(i, 1);
    if (!defenders.length) {
      units.forEach((u) => {
        u.moved += 1;
      });
      log(
        s,
        "Shore bombardment destroyed the settler ships.",
        "battle",
        s.active,
        target,
      );
      return true;
    }
    const a = bombardmentPower(s, units),
      d = power(s, defenders, target);
    units.forEach((u) => {
      u.moved += 1;
    });
    log(
      s,
      `Shore bombardment: ${a} artillery power against ${d} fleet power${a === d ? "; tied, the fleet held" : ""}.`,
      "battle",
      s.active,
      target,
    );
    if (a !== d) {
      const loser = a < d ? s.active : defenders[0].owner,
        losers = a < d ? units : defenders,
        loss = Math.min(
          Math.abs(a - d),
          losers.reduce((n, u) => n + points(u), 0),
        );
      s.battle = {
        bombardment: true,
        attacker: s.active,
        defender: defenders[0].owner,
        attackers: units.map((u) => u.id),
        defenders: defenders.map((u) => u.id),
        origin: units[0].tile,
        target,
        naval: true,
        attackerPower: a,
        defenderPower: d,
        loser,
        loss,
        required: minCasualties(losers, loss),
      };
      if (losers.every((u) => points(u) === 0))
        resolveBattle(s, { type: "resolve-battle", actor: loser, ids: [] });
    }
    return true;
  }
  if (c.type === "move") {
    const units = selected(s, c.ids);
    rule(c.to && s.tiles[c.to], "Choose a revealed destination.");
    // Validate against one read-only occupation snapshot, then leave its scope
    // before moving any pieces or resolving combat on the mutable draft.
    const { path, defenders } = withPlanningFrame(s, () => ({
      path: moveTargets(s, c.ids!)[c.to!],
      defenders: combatantsAt(s, c.to!, units[0].naval).filter(
        (u) => !friendly(s, u.owner, s.active),
      ),
    }));
    rule(
      path?.length,
      "The destination is unreachable with the selected army’s remaining movement.",
    );
    const target = c.to,
      origin = path.length > 1 ? path[path.length - 2] : units[0].tile;
    defenders.sort(
      (a, b) =>
        Number(s.players[b.owner].control === "human") -
          Number(s.players[a.owner].control === "human") || a.owner - b.owner,
    );
    units.forEach((u) => {
      const enemy = emergencyTarget(s);
      if (
        s.players[s.active].control !== "human" &&
        enemy !== undefined &&
        c.mode === "campaign" &&
        c.target &&
        s.tiles[c.target]
      )
        u.campaign = { enemy, target: c.target };
      else delete u.campaign;
      u.moved += path.length;
      setTile(s, u, defenders.length ? origin : target);
    });
    if (defenders.length) {
      engageBattle(s, units, defenders, origin, target);
    } else
      log(
        s,
        `${s.players[s.active].name} moved ${units.length} ${units[0].naval ? "ships" : "units"}.`,
        "info",
        s.active,
        target,
      );
    breakSieges(s);
    return true;
  }
  if (c.type === "siege" || c.type === "destroy-town") {
    const { units, town } = siegeArmy(s, c);
    const id = `${s.active}:${town.id}`,
      turn = s.players[s.active].turns;
    let siege = s.sieges[id];
    const detail = {
      town: town.id,
      name: town.name,
      defender: town.owner,
      vertex: town.vertex,
    };
    rule(
      !siege || siege.last !== turn,
      "Only one operation against this town is allowed per turn.",
    );
    if (c.type === "destroy-town") {
      rule(
        siege?.raided !== null &&
          siege?.raided !== undefined &&
          siege.raided < turn,
        "Raid first, then wait until your next turn to destroy.",
      );
      const loot = { ...town.stock };
      const destination = nearestTown(s, units[0].tile, s.active);
      rule(destination, "A surviving town is required to receive the spoils.");
      addStock(destination.stock, loot);
      town.stock = {};
      units.forEach((u) => (u.acted = true));
      delete s.towns[town.id];
      for (const [key, v] of Object.entries(s.sieges))
        if (v.town === town.id) delete s.sieges[key];
      log(
        s,
        `${town.name} was destroyed, with all its walls and extensions. ${sumStock(loot)} remaining goods were seized and sent to ${destination.name}.`,
        "battle",
        s.active,
        units[0].tile,
      ).townAttack = { ...detail, kind: "destroy", goods: loot };
      return true;
    }
    if (!siege)
      siege = s.sieges[id] = {
        owner: s.active,
        town: town.id,
        progress: 0,
        last: -1,
        raided: null,
      };
    rule(
      siege.raided === null || sumStock(town.stock) > 0,
      "No new resources to raid. You can destroy the town or withdraw.",
    );
    if (
      siege.raided !== null ||
      siege.progress >= siegeRequirement(s, town, units)
    ) {
      const loot = { ...town.stock };
      const destination = nearestTown(s, units[0].tile, s.active);
      rule(destination, "A surviving town is required to receive the raid.");
      addStock(destination.stock, loot);
      town.stock = {};
      siege.raided ??= turn;
      log(
        s,
        `${town.name} was raided for ${sumStock(loot)} goods. Destruction is possible next turn.`,
        "battle",
        s.active,
        units[0].tile,
      ).townAttack = { ...detail, kind: "raid", goods: loot };
    } else {
      siege.progress++;
      log(
        s,
        `${town.name}: siege turn ${siege.progress} completed.`,
        "battle",
        s.active,
        units[0].tile,
      ).townAttack = { ...detail, kind: "siege" };
    }
    siege.last = turn;
    siege.units = units.map((u) => u.id);
    units.forEach((u) => u.moved++);
    return true;
  }
  if (c.type === "destroy-tower") {
    const units = selected(s, c.ids, false, false),
      tower = s.towers[c.vertex ?? ""];
    rule(
      units.some((u) => points(u) > 0),
      "Merchants cannot destroy towers.",
    );
    rule(
      tower &&
        !friendly(s, tower.owner, s.active) &&
        s.vertices[tower.vertex].tiles.includes(units[0].tile),
      "Choose an adjacent enemy watchtower.",
    );
    rule(!towerGuards(s, tower), "Defeat the tower's guards first.");
    rule(
      units.every((u) => speed(u) + u.bonus - u.moved >= 1),
      "Sieging or destroying a watchtower costs 1 remaining movement point per unit.",
    );
    const id = `${s.active}:${tower.id}`,
      turn = s.players[s.active].turns;
    const siege = s.towerSieges?.[id];
    rule(
      !siege || siege.last !== turn,
      "Only one operation against this watchtower is allowed per turn.",
    );
    if ((siege?.progress ?? 0) >= towerSiegeRequirement(tower, units)) {
      // No warehouse or post-raid wait: overcome defenses and dismantle now.
      delete s.towers[tower.vertex];
      for (const [key, record] of Object.entries(s.towerSieges ?? {}))
        if (record.tower === tower.id) delete s.towerSieges![key];
      log(
        s,
        "Watchtower destroyed. Its army and city defense bonuses are removed.",
        "battle",
        s.active,
        units[0].tile,
      );
    } else {
      s.towerSieges ??= {};
      s.towerSieges[id] = {
        owner: s.active,
        tower: tower.id,
        vertex: tower.vertex,
        progress: (siege?.progress ?? 0) + 1,
        last: turn,
        units: units.map((u) => u.id),
      };
      log(
        s,
        `Watchtower siege: step ${s.towerSieges[id].progress} completed.`,
        "battle",
        s.active,
        units[0].tile,
      );
    }
    units.forEach((u) => u.moved++);
    return true;
  }
  if (c.type === "destroy-route") {
    const units = selected(s, c.ids),
      r = s.routes[c.edge ?? ""];
    rule(
      units.some((u) => points(u) > 0),
      "An armed force is required to destroy routes.",
    );
    rule(r, "Choose an existing road or shipping route.");
    rule(
      r.owner === s.active || !friendly(s, r.owner, s.active),
      "Allied routes cannot be destroyed.",
    );
    const e = s.edges[r.edge];
    rule(
      e.tiles.includes(units[0].tile),
      "The army or fleet must border this route.",
    );
    rule(
      (r.kind === "route") === units[0].naval,
      "Land armies destroy roads; fleets destroy shipping routes.",
    );
    rule(
      !e.tiles.some((t) =>
        piecesAt(s, t, units[0].naval).some(
          (u) =>
            friendly(s, u.owner, r.owner) && !friendly(s, u.owner, s.active),
        ),
      ),
      "Clear the route owner’s protecting force first.",
    );
    rule(
      units.every((u) => speed(u) + u.bonus - u.moved >= 1),
      "Destroying a road or shipping route costs 1 remaining movement point per unit.",
    );
    delete s.routes[r.edge];
    units.forEach((u) => u.moved++);
    log(
      s,
      `${s.players[s.active].name} destroyed a ${r.kind === "road" ? "road" : "shipping route"}${Object.keys(r.camps).length ? " and its resource camps" : ""}.`,
      "battle",
      s.active,
      units[0].tile,
    );
    return true;
  }
  if (c.type === "load") {
    const units = selected(s, c.ids, true, false),
      ships = selected(s, c.ships, true, true);
    rule(
      neighbors(units[0].tile).includes(ships[0].tile) ||
        (units[0].tile === ships[0].tile &&
          units.every((u) => u.seasonStatus === "adrift")),
      "Carriers must be on adjacent water.",
    );
    const berths = ships.reduce(
      (n, u) =>
        n +
        shipStats(u.kind as ShipClass, u.tier).capacity -
        Object.values(s.pieces).filter((p) => p.carrier === u.id).length,
      0,
    );
    rule(
      berths >= units.length,
      `Need ${units.length} berths; only ${berths} are free.`,
    );
    for (const u of units) {
      const ship = ships.find(
        (v) =>
          Object.values(s.pieces).filter((p) => p.carrier === v.id).length <
          shipStats(v.kind as ShipClass, v.tier).capacity,
      )!;
      u.carrier = ship.id;
      delete u.seasonStatus;
      delete u.coverage;
      u.tile = ship.tile;
      u.acted = true;
    }
    ships.forEach((u) => (u.acted = true));
    log(s, `${units.length} units embarked.`, "info", s.active, ships[0].tile);
    return true;
  }
  if (c.type === "unload") {
    const ships = selected(s, c.ships, true, true);
    rule(
      c.to &&
        neighbors(ships[0].tile).includes(c.to) &&
        canOccupy(s.tiles[c.to]),
      "Choose an adjacent walkable land hex. Bare Peaks are impassable.",
    );
    rule(
      s.tiles[c.to] && !hostileAt(s, c.to, s.active, false),
      "Secure an unoccupied landing beach first.",
    );
    const ids =
      c.ids ??
      Object.values(s.pieces)
        .filter((u) => u.carrier && ships.some((v) => v.id === u.carrier))
        .map((u) => u.id);
    rule(
      ids.length && new Set(ids).size === ids.length,
      "Select passengers to unload.",
    );
    for (const id of ids) {
      const u = s.pieces[id];
      rule(
        u &&
          u.carrier &&
          ships.some((v) => v.id === u.carrier) &&
          !u.acted &&
          u.moved === 0 &&
          u.born < s.players[s.active].turns,
        "Only fresh passengers on these ships may unload.",
      );
      delete u.carrier;
      delete u.coverage;
      u.tile = c.to;
      u.acted = true;
    }
    ships.forEach((u) => (u.acted = true));
    log(
      s,
      `${ids.length} units landed. They can act next turn.`,
      "info",
      s.active,
      c.to,
    );
    breakSieges(s);
    return true;
  }
  if (c.type === "hold") {
    selected(s, c.ids).forEach((u) => (u.acted = true));
    return true;
  }
  return false;
}
