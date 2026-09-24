import type { Hex } from "../game/types";
import { frozenInSeason, type Season } from "../game/seasons";
import { terrainArtFile, terrainPatternKey } from "./terrain-art";
import {
  bankArt,
  WATER_HEX,
  shoreGeometry,
  riverGeometry,
  waterSurfacePath,
  type WaterConnections,
} from "./water-connectivity";

export function WaterDefinitions({
  connections,
}: {
  connections: WaterConnections[];
}) {
  const shores = new Set(
    connections.filter((c) => !c.river).map((c) => c.shore),
  );
  const rivers = new Set(
    connections.filter((c) => c.river).map((c) => c.channel),
  );
  return (
    <>
      <clipPath id="water-full-hex" clipPathUnits="userSpaceOnUse">
        <polygon points={WATER_HEX} />
      </clipPath>
      {[...shores].map((mask) => (
        <clipPath
          key={`surface${mask}`}
          id={`water-surface-${mask}`}
          clipPathUnits="userSpaceOnUse"
        >
          <path d={waterSurfacePath(mask)} />
        </clipPath>
      ))}
      {[...shores].filter(Boolean).map((mask) => (
        <clipPath
          key={`s${mask}`}
          id={`water-shore-${mask}`}
          clipPathUnits="userSpaceOnUse"
        >
          <path d={shoreGeometry(mask).banks} />
        </clipPath>
      ))}
      {[...rivers].map((mask) => (
        <clipPath
          key={`r${mask}`}
          id={`water-river-${mask}`}
          clipPathUnits="userSpaceOnUse"
        >
          <path d={riverGeometry(mask).water} />
        </clipPath>
      ))}
    </>
  );
}
const texture = (file: string, clip: string, opacity = 1) => (
  <image
    href={`./assets/${file}`}
    x={-44.1}
    y={-44.1}
    width={88.2}
    height={88.2}
    preserveAspectRatio="xMidYMid slice"
    clipPath={`url(#${clip})`}
    opacity={opacity}
  />
);
function waterTexture(x: number, y: number, clip: string) {
  // Sample a world-aligned texture. Ripples continue over hex borders instead
  // of restarting the same small picture at every tile center.
  const size = 512,
    left = (-(((x + 44.1) % size) + size) % size) - 44.1,
    top = (-(((y + 44.1) % size) + size) % size) - 44.1;
  const images = [];
  for (let dx = left; dx < 44.1; dx += size)
    for (let dy = top; dy < 44.1; dy += size)
      images.push(
        <image
          key={`${dx}/${dy}`}
          href="./assets/geography/connected-water.webp"
          x={dx}
          y={dy}
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clip})`}
          opacity=".60"
        />,
      );
  return images;
}
export function ConnectedWater({
  tile,
  connections,
  x,
  y,
  season,
}: {
  tile: Hex;
  connections: WaterConnections;
  x: number;
  y: number;
  season?: Season;
}) {
  const { shore, channel, river } = connections;
  const frozen = frozenInSeason(tile, season);
  const line = river ? riverGeometry(channel).line : shoreGeometry(shore).line;
  const shallow = ["shoal", "reef"].includes(tile.geography?.waterway ?? "");
  return (
    <g
      className="connected-water"
      data-shore-mask={shore}
      data-channel-mask={river ? channel : undefined}
      transform={`translate(${x} ${y})`}
      pointerEvents="none"
    >
      {river ? texture(bankArt(tile, season), "water-full-hex") : null}
      {river ? (
        <path d={riverGeometry(channel).water} fill="#326b7c" />
      ) : (
        <polygon points={WATER_HEX} fill="#326b7c" />
      )}
      {frozen
        ? texture(
            terrainArtFile(terrainPatternKey("ice", tile.climate, season)),
            river ? `water-river-${channel}` : "water-full-hex",
          )
        : waterTexture(
            x,
            y,
            river ? `water-river-${channel}` : "water-full-hex",
          )}
      {!frozen &&
        !river &&
        tile.geography?.waterway === "reef" &&
        texture("geography/submerged-reef.webp", "water-full-hex", 0.38)}
      {!frozen && !river && shallow && (
        <polygon
          points={WATER_HEX}
          fill={tile.geography?.waterway === "reef" ? "#5da99b" : "#92b9a5"}
          opacity=".2"
        />
      )}
      {!river && shore
        ? texture(bankArt(tile, season), `water-shore-${shore}`)
        : null}
      {line && (
        <>
          <path
            d={line}
            fill="none"
            stroke="#263f36"
            strokeWidth="2.1"
            opacity=".6"
          />
          <path
            d={line}
            fill="none"
            stroke="#b3bb92"
            strokeWidth="1.15"
            opacity=".75"
          />
          <path
            d={line}
            fill="none"
            stroke="#d4e5ce"
            strokeWidth=".35"
            opacity=".65"
          />
        </>
      )}
    </g>
  );
}
