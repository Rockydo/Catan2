import fs from "node:fs";
import { TECHNIQUES } from "../src/game/infrastructure-techniques";
const path = "docs/local-production-methods.md";
const marker = "<!-- GENERATED METHODS -->";
const head = fs.readFileSync(path, "utf8").split(marker)[0];
const methods = Object.values(TECHNIQUES);
const output = methods
  .map((m) => {
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
    return `### ${m.name}\n\n${m.description}\n\n- Stages I–IV: ${m.stages.join(" → ")}.\n- Annual extra I–IV: **${m.annual.join(" / ")}**.\n- Spring / summer / autumn / winter weights: ${(m.seasons ?? [1, 1, 1, 1]).join(" / ")}.\n- Loss protection I–IV: ${protections}.\n- Construction adjustments: ${materials}.\n`;
  })
  .join("\n");
fs.writeFileSync(
  path,
  `${head}${marker}\n\n${methods.length} local methods.\n\n${output}`,
);
console.log(`Documented ${methods.length} local methods.`);
