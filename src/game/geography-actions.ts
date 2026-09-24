import type { Game, Command, Hex, Town, Stock } from "./types";
import {
  PROJECTS,
  pieceAccess,
  baseGeographicYield,
  type Project,
} from "./geography";
import { seasonYear } from "./seasons";
import { canOccupy } from "./world";
import { friendly } from "./relations";
import { pay, rule, log } from "./economy";
import {
  ownTowns,
  hostileAt,
  ready,
  speed,
  points,
  besieged,
} from "./selectors";

export function projectSite(
  s: Game,
  tile: Hex,
  kind: Project,
  owner = s.active,
): boolean {
  const g = tile.geography;
  if (!g || g.projects?.[kind] || tile.resource === "peaks" || g.pass)
    return false;
  const town = ownTowns(s, owner).some(
    (t) => s.vertices[t.vertex].tiles.includes(tile.id) && !besieged(s, t.id),
  );
  const road = tile.edges.some((e) => s.routes[e]?.owner === owner);
  if (!(town || road) || hostileAt(s, tile.id, owner, canOccupy(tile, true)))
    return false;
  if (kind === "bridge") return g.waterway === "river";
  if (kind === "irrigation")
    return !!g.floodplain && (baseGeographicYield(tile).grain ?? 0) > 0;
  if (kind === "levee") return !!g.floodplain;
  if (kind === "harbor")
    return (
      town && ["coast", "lake", "river", "shoal"].includes(g.waterway ?? "")
    );
  return town && tile.resource !== "water" && tile.resource !== "ice";
}
export function geographyCommand(s: Game, c: Command): boolean {
  if (
    !["project", "harvest-mode", "sabotage", "repair-terrain"].includes(c.type)
  )
    return false;
  const tile = s.tiles[c.tile ?? ""];
  rule(tile?.geography, "Choose a geography tile.");
  const g = tile.geography;
  if (c.type === "project") {
    rule(
      c.kind && Object.hasOwn(PROJECTS, c.kind),
      "Choose a local improvement.",
    );
    const kind = c.kind as Project;
    rule(
      projectSite(s, tile, kind),
      "This site cannot support that improvement or is not connected to your faction.",
    );
    pay(s, PROJECTS[kind].cost);
    (g.projects ??= {})[kind] = { owner: s.active, born: s.round };
    if (kind === "levee" && g.access === "flooded") g.access = "normal";
    for (const unit of Object.values(s.pieces))
      if (unit.tile === tile.id && !unit.carrier) {
        if (pieceAccess(tile, unit, s.tiles)) delete unit.seasonStatus;
        else unit.seasonStatus = unit.naval ? "icebound" : "adrift";
      }
    log(
      s,
      `${s.players[s.active].name} built ${PROJECTS[kind].name} at ${tile.id}.`,
      "build",
      s.active,
      tile.id,
    );
    return true;
  }
  if (c.type === "harvest-mode") {
    rule(
      g.projects?.irrigation?.owner === s.active,
      "Only the irrigation owner can choose the harvest calendar.",
    );
    rule(
      c.mode === "spread" || c.mode === "concentrated",
      "Choose concentrated or spread harvests.",
    );
    rule(
      g.harvestChosenYear !== seasonYear(s),
      "Choose a crop schedule only once per year.",
    );
    // Take effect next year, preventing switches between each favorable harvest.
    g.nextHarvestMode = c.mode;
    g.harvestChosenYear = seasonYear(s);
    log(
      s,
      `Harvest schedule at ${tile.id} will change next year.`,
      "build",
      s.active,
      tile.id,
    );
    return true;
  }
  if (c.type === "repair-terrain") {
    rule(!!g.damagedUntil, "This terrain is not disrupted.");
    rule(
      ownTowns(s).some((t) => s.vertices[t.vertex].tiles.includes(tile.id)) ||
        tile.edges.some((e) => s.routes[e]?.owner === s.active),
      "Repair an owned production site.",
    );
    rule(
      !hostileAt(s, tile.id, s.active, canOccupy(tile, true)),
      "Clear enemy occupation before repairs.",
    );
    pay(s, { lumber: 1, stone: 1 });
    delete g.damagedUntil;
    return true;
  }
  const units = (c.ids ?? []).map((id) => s.pieces[id]);
  rule(
    units.length > 0 &&
      new Set(c.ids).size === units.length &&
      units.every(
        (u) =>
          u &&
          u.owner === s.active &&
          u.tile === tile.id &&
          ready(s, u) &&
          !u.naval &&
          points(u) > 0 &&
          speed(u) + u.bonus - u.moved >= 1,
      ),
    "Use an armed land force on the tile with 1 movement point.",
  );
  const owners = new Set(
    Object.values(s.towns)
      .filter((t) => s.vertices[t.vertex].tiles.includes(tile.id))
      .map((t) => t.owner),
  );
  for (const edge of tile.edges)
    if (s.routes[edge]?.camps[tile.id]) owners.add(s.routes[edge].owner);
  rule(
    [...owners].some((o) => !friendly(s, o, s.active)),
    "This tile has no hostile production infrastructure.",
  );
  rule(
    ![...owners].some((o) => friendly(s, o, s.active)),
    "Do not sabotage your own or allied production.",
  );
  rule(
    !g.damagedUntil && (baseGeographicYield(tile).grain ?? 0) > 0,
    "Choose an undisrupted enemy crop tile.",
  );
  g.damagedUntil = s.round + 2;
  for (const u of units) u.moved++;
  log(
    s,
    `${s.players[s.active].name} disrupted crops at ${tile.id} for two rounds.`,
    "battle",
    s.active,
    tile.id,
  );
  return true;
}
export function protectedFood(s: Game, town: Town): Stock {
  if (
    !s.vertices[town.vertex].tiles.some(
      (id) => s.tiles[id].geography?.projects?.granary?.owner === town.owner,
    )
  )
    return {};
  let capacity = town.level * 8;
  const protected_: Stock = {};
  for (const good of ["grain", "fish", "meat"] as const) {
    const keep = Math.min(capacity, town.stock[good] ?? 0);
    if (keep) protected_[good] = keep;
    capacity -= keep;
  }
  return protected_;
}
