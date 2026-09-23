import type { Game, Piece } from "./types";
import { collector } from "./maritime";
import { neighbors } from "./world";
import { ownPieces } from "./selectors";

/** Geographic candidates only. Each objective search must still check tactical
 * reachability through blockades. Keep the original troop order in every list,
 * including passengers that could land in more than one neighboring region. */
export function indexRegionalLandForces(
  s: Game,
  regions: ReadonlyMap<string, number>,
): Map<number | undefined, Piece[]> {
  const forces = new Map<number | undefined, Piece[]>();
  const landingRegions = new Map<string, Set<number | undefined>>();
  for (const unit of ownPieces(s)) {
    if (unit.naval || collector(unit)) continue;
    if (unit.carrier) {
      if (!landingRegions.has(unit.tile))
        landingRegions.set(
          unit.tile,
          new Set(neighbors(unit.tile).map((id) => regions.get(id))),
        );
      for (const region of landingRegions.get(unit.tile)!) {
        if (!forces.has(region)) forces.set(region, []);
        forces.get(region)!.push(unit);
      }
    } else {
      const region = regions.get(unit.tile);
      if (!forces.has(region)) forces.set(region, []);
      forces.get(region)!.push(unit);
    }
  }
  return forces;
}
