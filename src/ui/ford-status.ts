import type { Hex } from "../game/types";

/** Describe the route actually available, rather than promising a ford under ice. */
export function fordStatus(tile: Hex) {
  if (!tile.geography?.ford) return undefined;
  const g = tile.geography;
  if (g.projects?.bridge)
    return {
      kind: "bridge",
      label: "Bridge open",
      detail:
        "Land units can cross here using the bridge, even when the ford is submerged.",
    } as const;
  if (
    g.access !== "closed" &&
    g.access !== "flooded" &&
    tile.surface === "frozen"
  )
    return {
      kind: "ice",
      label: "Ice crossing",
      detail:
        "Land units can cross on the ice. Recheck this crossing after thaw.",
    } as const;
  if (g.access === "ford")
    return {
      kind: "open",
      label: "Ford open",
      detail:
        "Low water: land units can enter and cross this river tile. The ford can close when seasonal water levels rise.",
    } as const;
  return {
    kind: "closed",
    label: "Ford closed",
    detail:
      "High water: land units cannot cross here without a bridge or frozen river. Boats still follow normal navigation rules.",
  } as const;
}
