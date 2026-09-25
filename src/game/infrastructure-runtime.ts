import { floodsAt } from "./environment";
import { seasonAt } from "./seasons";
import type { Game } from "./types";
import { friendly } from "./relations";
import { allPieces, points } from "./selectors";
import { log } from "./economy";
import { PROJECTS, pieceAccess, type Project } from "./geography";

/** Surviving armed land occupation destroys hostile improvements after combat.
 * Detach changed terrain because movement transactions may share immutable tiles. */
export function ravageOccupiedInfrastructure(s: Game): boolean {
  const candidates = new Set(
    Object.values(s.tiles)
      .filter((tile) => Object.keys(tile.geography?.projects ?? {}).length)
      .map((tile) => tile.id),
  );
  if (!candidates.size) return false;
  const units = allPieces(s);
  const armed = new Map<string, Set<number>>();
  for (const u of units) {
    if (!candidates.has(u.tile) || u.carrier || u.naval || points(u) <= 0)
      continue;
    const owners = armed.get(u.tile) ?? new Set<number>();
    owners.add(u.owner);
    armed.set(u.tile, owners);
  }
  let detached = false,
    piecesDetached = false;
  for (const [id, owners] of armed) {
    const tile = s.tiles[id];
    if (!tile?.geography?.projects || s.battle?.target === id) continue;
    const lost = Object.entries(tile.geography.projects).filter(
      ([, p]) =>
        p &&
        [...owners].some((o) => !friendly(s, o, p.owner)) &&
        ![...owners].some((o) => friendly(s, o, p.owner)),
    );
    if (!lost.length) continue;
    if (!detached) {
      s.tiles = { ...s.tiles };
      detached = true;
    }
    const copy = structuredClone(tile);
    s.tiles[id] = copy;
    for (const [kind, p] of lost) {
      delete copy.geography!.projects![kind as Project];
      if (kind === "irrigation") {
        delete copy.geography!.harvestMode;
        delete copy.geography!.nextHarvestMode;
        delete copy.geography!.harvestChosenYear;
      }
      log(
        s,
        `${s.players[p!.owner].name} lost ${PROJECTS[kind as Project].name} at ${id}: ravaged by enemy occupation.`,
        "battle",
        p!.owner,
        id,
      );
    }
    if (
      lost.some(([kind]) => kind === "levee") &&
      floodsAt(copy, seasonAt(s) ?? "spring")
    )
      copy.geography!.access = "flooded";
    // A destroyed bridge/levee can strand even the victorious army. Preserve
    // the normal escape/rescue state and detach shared movement records.
    for (const unit of units) {
      if (unit.tile !== id || unit.carrier) continue;
      const status = pieceAccess(copy, unit, s.tiles)
        ? undefined
        : unit.naval
          ? "icebound"
          : "adrift";
      if (status === unit.seasonStatus) continue;
      if (!piecesDetached) {
        s.pieces = { ...s.pieces };
        piecesDetached = true;
      }
      const changed = { ...unit };
      s.pieces[unit.id] = changed;
      if (status) changed.seasonStatus = status;
      else delete changed.seasonStatus;
    }
  }
  return piecesDetached;
}
