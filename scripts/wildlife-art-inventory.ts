import {
  CLIMATES,
  CLIMATE_INFO,
  BIOMES,
  BIOME_INFO,
} from "../src/game/climate-content";
import {
  WILDLIFE_GOODS,
  RIPARIAN_TERRAIN,
  wildHabitat,
  type WildlifeKind,
} from "../src/game/geography";
import { suitableWildlifeHabitat } from "../src/game/environment";
import { generateHex } from "../src/game/world";
import {
  baseSeasonalTerrainPattern,
  terrainArtFile,
} from "../src/ui/terrain-art";
import { SEASONS } from "../src/game/seasons";
import { writeFileSync } from "node:fs";
const variants = new Map<
  string,
  { kind: WildlifeKind; file: string; habitats: string[] }
>();
for (const climate of CLIMATES)
  for (const biome of BIOMES) {
    // Include out-of-table old save biomes only where the natural habitat exists;
    // timber aliases share their actual base file with an already included type.
    const tile = {
      ...generateHex("art", "0,0"),
      climate,
      biome,
      resource: BIOME_INFO[biome].resource,
      geography: {
        elevation: 0.5,
        region: climate,
        coastal: true,
        animals: [],
      },
    };
    if (!wildHabitat(tile)) continue;
    if (
      !CLIMATE_INFO[climate].terrain.some(([b]) => b === biome) &&
      !RIPARIAN_TERRAIN[climate].some(([b]) => b === biome) &&
      !["river-woods"].includes(biome)
    )
      continue;
    for (const kind of Object.keys(WILDLIFE_GOODS) as WildlifeKind[]) {
      if (!suitableWildlifeHabitat(tile, kind)) continue;
      for (const season of SEASONS) {
        const file = terrainArtFile(baseSeasonalTerrainPattern(tile, season));
        const id = `${kind}/${file}`;
        const entry = variants.get(id) ?? { kind, file, habitats: [] };
        entry.habitats.push(`${climate}/${biome}/${season}`);
        variants.set(id, entry);
      }
    }
  }
writeFileSync(
  "/tmp/wildlife-art-inventory.json",
  JSON.stringify([...variants.values()], null, 2),
);
console.log("Variants", variants.size);
console.log(
  Object.fromEntries(
    Object.keys(WILDLIFE_GOODS).map((k) => [
      k,
      [...variants.values()].filter((v) => v.kind === k).length,
    ]),
  ),
);
