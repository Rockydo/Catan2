/** Deterministic catalogue coverage, not a performance benchmark. Project
 * construction still requires city support and (for irrigation) freshwater. */
import { generateWorld } from "../src/game/world";
import {
  INFRASTRUCTURE,
  infrastructureSuitable,
  type InfrastructureKind,
} from "../src/game/infrastructure";
import { localTechnique } from "../src/game/infrastructure-techniques";
import { REGIONAL_METHODS } from "../src/game/infrastructure-regional";
const seen = new Map<string, number>();
let land = 0,
  regional = 0;
for (let i = 0; i < 32; i++) {
  const s = generateWorld(`regional-production-audit-${i}`, 320, true);
  for (const t of Object.values(s.tiles))
    for (const kind of Object.keys(INFRASTRUCTURE) as InfrastructureKind[]) {
      if (!infrastructureSuitable(t, kind)) continue;
      land++;
      const id = localTechnique(t, kind).id;
      seen.set(id, (seen.get(id) ?? 0) + 1);
      if (id.startsWith("regional-")) regional++;
    }
}
console.log(
  JSON.stringify(
    {
      maps: 32,
      tiles: 32 * 320,
      suitableProjects: land,
      regionalProjects: regional,
      regionalMethodsSeen: REGIONAL_METHODS.filter((r) => seen.has(r.method.id))
        .length,
      rareUnseen: REGIONAL_METHODS.filter((r) => !seen.has(r.method.id)).map(
        (r) => r.method.name,
      ),
    },
    null,
    2,
  ),
);
