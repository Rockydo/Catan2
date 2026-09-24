import {
  riverWildlifeAnchor,
  type WaterConnections,
} from "./water-connectivity";
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

/** Marine schools follow channel clips. Land uses full painted terrain variants;
 * isolated sprites are reserved for the schematic wildlife overview. */
export function WildlifeArt({
  tile,
  x,
  y,
  season,
  connections,
  schematic = false,
}: {
  tile: Hex;
  x: number;
  y: number;
  season?: Season;
  connections: WaterConnections | undefined;
  schematic?: boolean;
}) {
  const kinds = [...new Set(tile.geography?.animals ?? [])].filter(
    (kind) => schematic || ["fish", "cod", "whale"].includes(kind),
  );
  if (!kinds.length) return null;
  const columns = kinds.length === 1 ? 1 : Math.ceil(Math.sqrt(kinds.length));
  const river = connections?.river;
  const anchor = river
    ? riverWildlifeAnchor(connections.channel)
    : { x: 0, y: 19 };
  const rows = Math.ceil(kinds.length / columns),
    width = (river ? 24 : 64) / columns,
    height = (river ? 16 : 40) / rows;
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
          x={anchor.x - (river ? 12 : 32) + (i % columns) * width}
          y={anchor.y - (river ? 8 : 20) + Math.floor(i / columns) * height}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          clipPath={
            river
              ? `url(#water-river-${connections.channel})`
              : connections
                ? `url(#water-surface-${connections.shore})`
                : "url(#season-terrain-hex)"
          }
          opacity={
            ice
              ? 0.5
              : ["fish", "cod"].includes(kind)
                ? 0.66
                : kind === "whale"
                  ? 0.8
                  : 1
          }
        />
      ))}
    </g>
  );
}
