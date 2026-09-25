import manifest from "./infrastructure-art-manifest.json" with { type: "json" };
import type { Hex } from "../game/types";

const paintings: Record<string, Record<string, string>> = manifest;

/** Exact state only: never paint another season, hide wildlife, or portray a
 * combination using just one of its upgrades. Each entry is a complete image. */
export function infrastructurePainting(
  tile: Hex,
  source: string,
): string | undefined {
  const projects = tile.geography?.projects;
  const variants = paintings[source];
  if (!projects || !variants) return;
  const signature = Object.entries(projects)
    .filter(([, project]) => project != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, project]) => `${kind}:${project!.tier ?? 1}`)
    .join("+");
  const painting = variants[signature];
  return painting ? `infra-${painting}` : undefined;
}
