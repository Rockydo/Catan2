import type { WaterConnections } from "./water-connectivity";
import type { Hex } from "../game/types";
import type { WildlifeKind } from "../game/geography";
import { frozenInSeason, type Season } from "../game/seasons";

export const WILDLIFE_ART: Record<WildlifeKind, string> = Object.fromEntries(
  [
    "fish",
    "cod",
    "whale",
    "deer",
    "bison",
    "reindeer",
    "musk-ox",
    "seal",
    "jungle-game",
    "turkey",
  ].map((kind) => [kind, `geography/wildlife-${kind}.webp`]),
) as Record<WildlifeKind, string>;

/** The habitat remains underneath. Migrating populations add actual painted
 * animals, so every seasonal habitat has both occupied and empty artwork. */
export function WildlifeArt({
  tile,
  x,
  y,
  season,
  connections,
}: {
  tile: Hex;
  x: number;
  y: number;
  season?: Season;
  connections?: WaterConnections;
}) {
  const kinds = [...new Set(tile.geography?.animals ?? [])];
  if (!kinds.length) return null;
  const columns = kinds.length === 1 ? 1 : Math.ceil(Math.sqrt(kinds.length));
  const river = connections?.river;
  const rows = Math.ceil(kinds.length / columns),
    width = (river ? 32 : 64) / columns,
    height = (river ? 22 : 40) / rows;
  const ice =
    (tile.resource === "water" || tile.resource === "ice") &&
    frozenInSeason(tile, season);
  return (
    <g
      className="wildlife-art"
      transform={`translate(${x} ${y})`}
      pointerEvents="none"
    >
      {kinds.map((kind, i) => (
        <image
          key={kind}
          data-wildlife-kind={kind}
          href={`./assets/${WILDLIFE_ART[kind]}`}
          x={-(river ? 16 : 32) + (i % columns) * width}
          y={(river ? -4 : -1) + Math.floor(i / columns) * height}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          clipPath={
            river
              ? `url(#water-river-${connections.channel})`
              : "url(#season-terrain-hex)"
          }
          opacity={ice ? 0.65 : 1}
        />
      ))}
    </g>
  );
}
