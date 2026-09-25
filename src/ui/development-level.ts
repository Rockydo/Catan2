import { isInfrastructure } from "../game/infrastructure";
import type { Hex } from "../game/types";

export type DevelopmentLevel = 0 | 1 | 2 | 3;
export const DEVELOPMENT_NAMES = [
  "Undeveloped",
  "Worked",
  "Mechanized",
  "Industrial",
] as const;
export const DEVELOPMENT_NAMES_FR = [
  "Non aménagé",
  "Aménagé",
  "Mécanisé",
  "Industriel",
] as const;
export const DEVELOPMENT_ART_LIMIT = 1000;

/** Appearance only. Several basic projects cannot imply a steam-powered site.
 * Hunting, foraging and whaling have no approved development paintings;
 * they must not select unrelated logging or agricultural art.
 * Utility projects keep their existing visuals and do not set production level. */
export function developmentLevel(tile: Hex): DevelopmentLevel {
  let highest = 0;
  for (const [kind, project] of Object.entries(tile.geography?.projects ?? {}))
    if (
      project &&
      isInfrastructure(kind) &&
      !["hunting", "foraging", "whaling"].includes(kind)
    )
      highest = Math.max(highest, project.tier ?? 1);
  return highest >= 4 ? 3 : highest >= 3 ? 2 : highest > 0 ? 1 : 0;
}
