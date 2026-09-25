import {
  isSpecialist,
  SPECIALIST_PROJECTS,
  specialistId,
} from "./infrastructure-specialists";
import {
  infrastructureSuitable,
  installedRotation,
  rotationPrerequisites,
  INFRASTRUCTURE,
  specialistSuitable,
  specialistCost,
  specialistTier,
  specialistBranches,
  infrastructureCost,
  isInfrastructure,
  tierOf,
} from "./infrastructure";
import { neighbors } from "./world";
import type { Game, Command, Hex, Town, Stock } from "./types";
import {
  PROJECTS,
  pieceAccess,
  baseGeographicYield,
  type Project,
} from "./geography";
import { ordinarySeasonalProfile, seasonYear } from "./seasons";
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
  if (
    !g ||
    (g.projects?.[kind] &&
      (!isInfrastructure(kind) ||
        g.projects[kind]!.owner !== owner ||
        tierOf(tile, kind) >= 4)) ||
    tile.resource === "peaks" ||
    g.pass
  )
    return false;
  const town = ownTowns(s, owner).some(
    (t) => s.vertices[t.vertex].tiles.includes(tile.id) && !besieged(s, t.id),
  );
  const road = tile.edges.some((e) => s.routes[e]?.owner === owner);
  if (!(town || road) || hostileAt(s, tile.id, owner, canOccupy(tile, true)))
    return false;
  if (kind === "bridge") return g.waterway === "river";
  if (isInfrastructure(kind)) {
    const next = tierOf(tile, kind) + 1;
    if (!infrastructureSuitable(tile, kind)) return false;
    if (
      !ownTowns(s, owner).some(
        (t) =>
          t.level >= next &&
          s.vertices[t.vertex].tiles.includes(tile.id) &&
          !besieged(s, t.id),
      )
    )
      return false;
    if (kind === "irrigation" && !freshwaterSite(s, tile)) return false;
    return true;
  }
  if (isSpecialist(kind)) {
    const { branch, tier } = SPECIALIST_PROJECTS[kind];
    if (branch.rotation) {
      const other = installedRotation(tile);
      const ordinary = ordinarySeasonalProfile(tile, owner);
      if (
        (other && other.id !== branch.id) ||
        !rotationPrerequisites(tile, branch, owner) ||
        !branch.rotation.seasons.some(
          (season) => !(ordinary[season].grain || ordinary[season].oil),
        )
      )
        return false;
    }
    return (
      specialistSuitable(tile, branch) &&
      specialistTier(tile, branch, owner) === tier - 1 &&
      ((branch.track !== "irrigation" && !branch.freshwater) ||
        freshwaterSite(s, tile)) &&
      ownTowns(s, owner).some(
        (t) =>
          t.level >= tier &&
          s.vertices[t.vertex].tiles.includes(tile.id) &&
          !besieged(s, t.id),
      )
    );
  }
  if (kind === "levee") return !!g.floodplain;
  if (kind === "harbor")
    return (
      town && ["coast", "lake", "river", "shoal"].includes(g.waterway ?? "")
    );
  return town && tile.resource !== "water" && tile.resource !== "ice";
}
/** Freshwater access is local: ocean and salt water never count as irrigation. */
export function freshwaterSite(s: Game, tile: Hex): boolean {
  return (
    tile.biome === "oasis" ||
    [tile.id, ...neighbors(tile.id)].some((id) => {
      const g = s.tiles[id]?.geography;
      return (
        g?.waterway === "river" ||
        g?.waterway === "lake" ||
        g?.landmark === "thermal-spring"
      );
    })
  );
}
export function projectCost(tile: Hex, kind: Project): Stock {
  if (isSpecialist(kind)) return specialistCost(tile, kind);
  if (!isInfrastructure(kind)) return PROJECTS[kind].cost;
  const next = tierOf(tile, kind) + 1;
  return next > 4 ? {} : infrastructureCost(kind, next, tile);
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
    pay(s, projectCost(tile, kind));
    const tier = isInfrastructure(kind) ? tierOf(tile, kind) + 1 : 1;
    (g.projects ??= {})[kind] = {
      owner: s.active,
      born: s.round,
      tier,
    };
    if (kind === "levee" && g.access === "flooded") g.access = "normal";
    for (const unit of Object.values(s.pieces))
      if (unit.tile === tile.id && !unit.carrier) {
        if (pieceAccess(tile, unit, s.tiles)) delete unit.seasonStatus;
        else unit.seasonStatus = unit.naval ? "icebound" : "adrift";
      }
    log(
      s,
      `${s.players[s.active].name} built ${PROJECTS[kind].name}${isInfrastructure(kind) ? ` tier ${tier}` : ""} at ${tile.id}.`,
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

export const UTILITY_PROJECTS = [
  "bridge",
  "levee",
  "harbor",
  "granary",
] as const;
/** At most one next stage per locally relevant branch, rather than 268 project probes. */
export function candidateProjects(tile: Hex, owner?: number): Project[] {
  return [
    ...UTILITY_PROJECTS,
    ...(Object.keys(INFRASTRUCTURE) as (keyof typeof INFRASTRUCTURE)[]),
    ...specialistBranches(tile).flatMap((branch) => {
      const tier = specialistTier(tile, branch, owner);
      return tier < 4 ? [specialistId(branch, tier + 1)] : [];
    }),
  ];
}
