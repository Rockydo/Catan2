import { FloodSurface } from "./FloodArt";
import type { Hex } from "../game/types";
import { frozenInSeason, type Season } from "../game/seasons";
import { terrainArtFile, terrainPatternKey } from "./terrain-art";
import {
  bankArt,
  riverBankSector,
  WATER_HEX,
  shoreGeometry,
  riverGeometry,
  riverClipId,
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
  const rivers = new Map(
    connections.filter((c) => c.river).map((c) => [riverClipId(c), c]),
  );
  return (
    <>
      {connections.some((c) => c.banks?.length) &&
        Array.from({ length: 6 }, (_, side) => (
          <clipPath
            key={`bank-${side}`}
            id={`river-bank-${side}`}
            clipPathUnits="userSpaceOnUse"
          >
            <path d={riverBankSector(side)} />
          </clipPath>
        ))}
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
      {[...rivers].map(([id, c]) => (
        <clipPath key={id} id={id} clipPathUnits="userSpaceOnUse">
          <path d={riverGeometry(c.channel, c.basin, c.variant).water} />
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
  // One continuous ground painting per hex. Painting neighbor textures into
  // triangular wedges created hard, pointed seams between snow and dry ground.
  const bankCounts = new Map<string, number>();
  for (const file of connections.banks ?? [])
    if (file) bankCounts.set(file, (bankCounts.get(file) ?? 0) + 1);
  const bank =
    [...bankCounts].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0] ?? bankArt(tile, season);
  const frozen = frozenInSeason(tile, season);
  const geometry = river
    ? riverGeometry(channel, connections.basin, connections.variant)
    : undefined;
  const line = river ? geometry!.line : shoreGeometry(shore).line;
  const shallow =
    river ||
    ["river", "shoal", "reef"].includes(tile.geography?.waterway ?? "");
  return (
    <g
      className="connected-water"
      data-shore-mask={shore}
      data-channel-mask={river ? channel : undefined}
      data-basin-mask={river ? connections.basin || 0 : undefined}
      transform={`translate(${x} ${y})`}
      pointerEvents="none"
      clipPath="url(#water-full-hex)"
    >
      {river ? texture(bank, "water-full-hex") : null}
      {river &&
        connections.floodedBanks?.map((family, side) =>
          family ? (
            <g
              key={`flood-${side}`}
              data-flooded-bank={side}
              clipPath={`url(#river-bank-${side})`}
            >
              <FloodSurface family={family} outline={false} />
            </g>
          ) : null,
        )}
      {river ? (
        <path d={geometry!.water} fill="#326b7c" />
      ) : (
        <polygon points={WATER_HEX} fill="#326b7c" />
      )}
      {waterTexture(x, y, river ? riverClipId(connections) : "water-full-hex")}
      {frozen && (
        <g
          clipPath={`url(#${river ? riverClipId(connections) : "water-full-hex"})`}
          data-ice-exposure={connections.openIce ?? 0}
        >
          {texture(
            connections.openIce
              ? `geography/exposed-${tile.climate === "glacial" || tile.resource === "ice" ? "pack" : "sea"}-ice-v1.webp`
              : terrainArtFile(terrainPatternKey("ice", tile.climate, season)),
            "water-full-hex",
          )}
        </g>
      )}
      {!frozen &&
        !river &&
        tile.geography?.waterway === "reef" &&
        texture("geography/submerged-reef.webp", "water-full-hex", 0.38)}
      {!frozen &&
        shallow &&
        (river ? (
          <path d={geometry!.water} fill="#92b9a5" opacity=".2" />
        ) : (
          <polygon
            points={WATER_HEX}
            fill={tile.geography?.waterway === "reef" ? "#5da99b" : "#92b9a5"}
            opacity=".2"
          />
        ))}
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
