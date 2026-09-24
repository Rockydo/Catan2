import { seasonalTerrainPattern, terrainArtFile } from "./terrain-art";
import type { Season } from "../game/seasons";
import { useLocale } from "../i18n";
import type { Hex } from "../game/types";
import { BIOME_INFO } from "../game/climate-content";
import { WATER_HEX } from "./water-connectivity";

// Shared flood materials sit over the exact seasonal terrain painting. Keeping
// the original terrain visible gives every biome and season a distinct wet state
// without replacing a mine, crop or forest with an unrelated generic landscape.
export function FloodDefinitions() {
  return (
    <>
      <clipPath clipPathUnits="userSpaceOnUse" id="flood-ground-hex">
        <polygon points={WATER_HEX} />
      </clipPath>
      <clipPath clipPathUnits="userSpaceOnUse" id="flood-crops">
        <path d="M-48 -24C-27 -32 -14 -10 7 -19S31 -32 48 -20L48 -10C22 -18 14 -7 -4 -9S-25 -24 -48 -13ZM-48 16C-22 -2 -4 25 18 10S36 8 48 17L48 27C18 10 11 37 -12 22S-33 13 -48 29Z" />
      </clipPath>
      <clipPath clipPathUnits="userSpaceOnUse" id="flood-forest">
        <path
          d="M-50 -45H50V50H-50Z M-26 -28C-38 -16 -14 -6 -10 -19C-6 -32 -20 -37 -26 -28Z M17 -6C4 7 30 17 37 3C39 -12 28 -19 17 -6Z M-22 22C-33 39 -6 46 1 33C7 18 -11 11 -22 22Z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath clipPathUnits="userSpaceOnUse" id="flood-rock">
        <path
          d="M-50 -45H50V50H-50Z M-15 -29C-25 -28 -35 -10 -25 0S-2 12 8 -3S3 -30 -15 -29Z M22 15C5 13 -1 31 12 40S36 42 39 28S36 13 22 15Z"
          clipRule="evenodd"
        />
      </clipPath>
    </>
  );
}
export function FloodArt({ tile, x, y }: { tile: Hex; x: number; y: number }) {
  if (tile.geography?.access !== "flooded" || tile.geography.projects?.levee)
    return null;
  const info = tile.biome ? BIOME_INFO[tile.biome] : undefined;
  const family =
    info?.yield.grain || info?.yield.wool || info?.yield.meat
      ? "crops"
      : info?.family === "forest"
        ? "forest"
        : "rock";
  return (
    <g
      className="flooded-terrain"
      data-flood-family={family}
      transform={`translate(${x} ${y})`}
      pointerEvents="none"
      clipPath="url(#flood-ground-hex)"
    >
      <polygon points={WATER_HEX} fill="#407f99" opacity=".08" />
      <g clipPath={`url(#flood-${family})`}>
        <polygon points={WATER_HEX} fill="#538c9e" opacity=".20" />
        <image
          href="./assets/geography/connected-water.webp"
          x="-44"
          y="-44"
          width="88"
          height="88"
          opacity=".20"
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
      <path
        d="M-35 -20q4-1.5 8 0t8 0M10 -22q4-1.5 8 0t8 0M-26 0q4-1.5 8 0t8 0M8 6q4-1.5 8 0t8 0M-20 26q4-1.5 8 0t8 0M5 32q4-1.5 8 0t8 0"
        fill="none"
        stroke="#d9efdd"
        strokeWidth=".55"
        opacity=".35"
      />
      <polygon
        points={WATER_HEX}
        fill="none"
        stroke="#a2d6e0"
        strokeWidth="1.5"
      />
    </g>
  );
}

export function FloodComparison({
  tile,
  season,
}: {
  tile: Hex;
  season: Season;
}) {
  const locale = useLocale();
  return (
    <div className="flood-art-comparison">
      {[false, true].map((wet) => {
        const sample = {
          ...tile,
          geography: {
            ...tile.geography!,
            access: wet ? ("flooded" as const) : ("normal" as const),
            projects: undefined,
          },
        };
        const file = terrainArtFile(seasonalTerrainPattern(sample, season));
        return (
          <figure key={String(wet)}>
            <svg
              viewBox="-45 -45 90 90"
              role="img"
              aria-label={
                locale === "fr"
                  ? wet
                    ? "Terrain inondé"
                    : "Terrain sec"
                  : wet
                    ? "Flooded terrain"
                    : "Dry terrain"
              }
            >
              <defs>
                <FloodDefinitions />
              </defs>
              <image
                href={`./assets/${file}`}
                x="-44"
                y="-44"
                width="88"
                height="88"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#flood-ground-hex)"
              />
              <FloodArt tile={sample} x={0} y={0} />
            </svg>
            <figcaption>
              {locale === "fr"
                ? wet
                  ? "Inondé : production 0"
                  : "Sec : récolte saisonnière"
                : wet
                  ? "Flooded: output 0"
                  : "Dry: seasonal harvest"}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
