import manifest from "./infrastructure-art-manifest.json" with { type: "json" };
import type { Hex } from "../game/types";
import { developmentLevel } from "./development-level";

const paintings: Record<string, Record<string, string>> = manifest;

/** Share development levels, never terrain identities. An unpainted source or
 * level stays unchanged, including its exact season and migrating wildlife. */
export function infrastructurePainting(
  tile: Hex,
  source: string,
): string | undefined {
  const variants = paintings[source];
  if (!variants) return;
  const level = developmentLevel(tile);
  const painting = variants[level];
  return painting ? `infra-${painting}` : undefined;
}
