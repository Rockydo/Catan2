/** Rank exact source paintings on deterministic sample maps. No terrain merging. */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import {
  INFRASTRUCTURE,
  infrastructureSuitable,
  type InfrastructureKind,
} from "../src/game/infrastructure";
import { generateWorld } from "../src/game/world";
import { SEASONS } from "../src/game/seasons";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { DEVELOPMENT_ART_LIMIT } from "../src/ui/development-level";
import manifest from "../src/ui/infrastructure-art-manifest.json";
const installed: Record<string, Record<string, string>> = manifest;
const sources = new Map<
  string,
  {
    source: string;
    occurrences: number;
    contexts: Set<string>;
    kinds: Set<string>;
  }
>();
for (let seed = 0; seed < 8; seed++) {
  const world = generateWorld(`development-art-priority-${seed}`, 320, true);
  for (const tile of Object.values(world.tiles)) {
    const kinds = (Object.keys(INFRASTRUCTURE) as InfrastructureKind[]).filter(
      (kind) => infrastructureSuitable(tile, kind),
    );
    if (!kinds.length) continue;
    // Connected water needs geometry-specific review, never a flat replacement.
    if (tile.resource === "water" || tile.resource === "ice") continue;
    for (const season of SEASONS) {
      const source = terrainArtFile(seasonalTerrainPattern(tile, season));
      const entry = sources.get(source) ?? {
        source,
        occurrences: 0,
        contexts: new Set<string>(),
        kinds: new Set<string>(),
      };
      entry.occurrences++;
      entry.contexts.add(`${tile.climate}/${tile.biome}/${season}`);
      for (const kind of kinds) entry.kinds.add(kind);
      sources.set(source, entry);
    }
  }
}
const shipped = readdirSync("public/assets/infrastructure", {
  recursive: true,
}).filter((f) => /\.(webp|png|jpe?g)$/i.test(String(f))).length;
if (shipped > DEVELOPMENT_ART_LIMIT)
  throw Error("Development artwork exceeds the 1,000-image ceiling");
const report = {
  method:
    "Eight deterministic 320-tile geography maps, each sampled in all four seasons. Rank exact existing source files; do not merge crops, climates, wildlife or seasons. Complete seasonal sets before expanding families. Connected-water artwork requires separate geometry review.",
  maximumImages: DEVELOPMENT_ART_LIMIT,
  shippedImages: shipped,
  remainingBudget: DEVELOPMENT_ART_LIMIT - shipped,
  paintedSources: Object.keys(manifest).length,
  visualLevels: ["Worked (I–II)", "Mechanized (III)", "Industrial (IV)"],
  bySource: [...sources.values()]
    .sort(
      (a, b) =>
        b.occurrences - a.occurrences || a.source.localeCompare(b.source),
    )
    .map((e) => ({
      ...e,
      contexts: [...e.contexts].sort(),
      kinds: [...e.kinds].sort(),
      completedLevels: Object.keys(installed[e.source] ?? {}),
      missingLevels: [1, 2, 3].filter((level) => !installed[e.source]?.[level]),
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
      maximumImages: report.maximumImages,
      shippedImages: shipped,
      rankedSources: sources.size,
      next: report.bySource.slice(0, 12),
    },
    null,
    2,
  ),
);
