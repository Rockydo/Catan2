import fs from "node:fs";
import { TECHNIQUES } from "../src/game/infrastructure-techniques";
import { SPECIALIZATIONS } from "../src/game/infrastructure-specializations";
import { INFRASTRUCTURE } from "../src/game/infrastructure";
import { BIOME_INFO, CLIMATE_INFO } from "../src/game/climate-content";
const path = "docs/local-production-methods.md";
const marker = "<!-- GENERATED METHODS -->";
const head = fs.readFileSync(path, "utf8").split(marker)[0];
const methods = Object.values(TECHNIQUES);
const output = methods
  .map((m) => {
    const rule = SPECIALIZATIONS.find((r) => r.method.id === m.id);
    const site = rule?.site;
    const requirements = site
      ? [
          site.biomes?.map((b) => BIOME_INFO[b].name).join(" / "),
          site.excludeBiomes &&
            `Except ${site.excludeBiomes.map((b) => BIOME_INFO[b].name).join(" / ")}`,
          site.climates?.map((c) => CLIMATE_INFO[c].name).join(" / "),
          site.waterways?.join(" / "),
          site.coastal && "Coastal",
          site.delta && "Delta",
          site.floodplain && "Floodplain",
          site.minElevation !== undefined && `Elevation ≥${site.minElevation}`,
          site.maxElevation !== undefined && `Elevation ≤${site.maxElevation}`,
          site.landmark,
        ]
          .filter(Boolean)
          .join("; ") || "All otherwise eligible sites"
      : "General/legacy fallback; specific matching methods take priority";
    const products =
      Object.entries(m.goods ?? {})
        .map(([g, n]) => `${g} ×${n}`)
        .join(", ") || "Native product proportions";
    const protections =
      Object.entries(m.protection ?? {})
        .map(
          ([w, v]) =>
            `${w}: ${v.map((n) => `${Math.round(n * 100)}%`).join(" / ")}`,
        )
        .join("; ") || "None";
    const materials =
      Object.entries(m.materials ?? {})
        .map(([g, v]) => `${g} ×${v}`)
        .join(", ") || "Base recipe";
    return `### ${m.name}\n\n${m.description}\n\n${rule ? `- Investment track: ${INFRASTRUCTURE[rule.kind].name}.\n` : ""}- Site selection: ${requirements}.\n- Stages I–IV: ${m.stages.join(" → ")}.\n- Annual extra I–IV: **${m.annual.join(" / ")}**.\n- Spring / summer / autumn / winter weights: ${(m.seasons ?? [1, 1, 1, 1]).join(" / ")}.\n- Shared bonus product weights: ${products}.\n- Loss protection I–IV: ${protections}.\n- Construction adjustments: ${materials}.\n`;
  })
  .join("\n");
fs.writeFileSync(
  path,
  `${head}${marker}\n\n${methods.length} local methods.\n\n${output}`,
);
console.log(`Documented ${methods.length} local methods.`);
