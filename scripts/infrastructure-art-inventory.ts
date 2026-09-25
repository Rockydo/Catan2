/** Read-only coverage audit. Counts painted files, not runtime overlays. */
import { mkdirSync, writeFileSync } from "node:fs";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOME_INFO,
  type Biome,
} from "../src/game/climate-content";
import { RIPARIAN_TERRAIN } from "../src/game/geography";
import {
  INFRASTRUCTURE,
  infrastructureSuitable,
  type InfrastructureKind,
} from "../src/game/infrastructure";
import { generateHex } from "../src/game/world";
import { SEASONS } from "../src/game/seasons";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import type { Hex } from "../src/game/types";
const files = new Map<
  string,
  { source: string; kinds: InfrastructureKind[]; contexts: string[] }
>();
for (const climate of CLIMATES) {
  const biomes = new Set<Biome>(
    [
      ...CLIMATE_INFO[climate].terrain,
      ...CLIMATE_INFO[climate].water,
      ...RIPARIAN_TERRAIN[climate],
    ].map(([b]) => b),
  );
  for (const biome of biomes)
    for (const season of SEASONS) {
      const tile: Hex = {
        ...generateHex("art-audit", "0,0"),
        biome,
        climate,
        resource: BIOME_INFO[biome].resource,
        geography: {
          elevation: 0.65,
          region: climate,
          floodplain: true,
          coastal: true,
          access: "normal",
          animals: [],
          fauna: {},
          ...(BIOME_INFO[biome].resource === "water"
            ? {
                waterway:
                  biome === "river"
                    ? "river"
                    : biome === "lake"
                      ? "lake"
                      : "coast",
              }
            : {}),
        },
      };
      const kinds = (
        Object.keys(INFRASTRUCTURE) as InfrastructureKind[]
      ).filter((kind) => infrastructureSuitable(tile, kind));
      if (!kinds.length) continue;
      const source = terrainArtFile(seasonalTerrainPattern(tile, season));
      const key = source + "|" + kinds.join("+");
      const entry = files.get(key) ?? { source, kinds, contexts: [] };
      entry.contexts.push(`${climate}/${biome}/${season}`);
      files.set(key, entry);
    }
}
// Union signatures across shared source files rather than counting aliases twice.
const signatures = new Map<string, Set<string>>();
for (const entry of files.values()) {
  const seen = signatures.get(entry.source) ?? new Set<string>();
  const visit = (i: number, parts: string[]) => {
    if (i === entry.kinds.length) {
      if (parts.length) seen.add(parts.join("+"));
      return;
    }
    visit(i + 1, parts);
    for (let tier = 1; tier <= 4; tier++)
      visit(i + 1, [...parts, `${entry.kinds[i]}:${tier}`]);
  };
  visit(0, []);
  signatures.set(entry.source, seen);
}
const report = {
  scope:
    "Production tracks only; suitable existing crop/mineral/pasture/forest/water artwork. Maximum legal crop investment on elevated freshwater-adjacent floodplain sites. Excludes utility projects, flood variants, wildlife-present variants, and connected-water geometries. Shared base art aliases deduplicated.",
  sources: signatures.size,
  fullPaintedVariants: [...signatures.values()].reduce((n, x) => n + x.size, 0),
  singleUpgradeVariants: [...signatures.values()].reduce(
    (n, x) => n + [...x].filter((k) => !k.includes("+")).length,
    0,
  ),
  bySource: [...files.values()].map((x) => ({
    ...x,
    variants: signatures.get(x.source)!.size,
  })),
};
mkdirSync("output/infrastructure-art", { recursive: true });
writeFileSync(
  "output/infrastructure-art/coverage-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      sources: report.sources,
      fullPaintedVariants: report.fullPaintedVariants,
      singleUpgradeVariants: report.singleUpgradeVariants,
    },
    null,
    2,
  ),
);
console.log(
  report.bySource.find((e) =>
    e.contexts.includes("temperate/golden-fields/summer"),
  ),
);
