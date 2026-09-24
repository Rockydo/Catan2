import { expect, it } from "vitest";
import { newGame } from "../src/game/engine";
import { pieceAccess } from "../src/game/geography";
import { fordStatus } from "../src/ui/ford-status";
import { environmentSummary } from "../src/game/environment";

it("describes open, submerged, frozen and bridged fords consistently with land movement", () => {
  const s = newGame("ford-clarity");
  const tile = Object.values(s.tiles).find((t) => t.geography?.ford)!;
  const unit = { kind: "heavy", naval: false, tier: 1 } as const;
  tile.surface = "open";
  tile.geography!.access = "ford";
  expect(fordStatus(tile)?.label).toBe("Ford open");
  expect(pieceAccess(tile, unit)).toBe(true);
  tile.geography!.access = "normal";
  expect(fordStatus(tile)?.label).toBe("Ford closed");
  expect(pieceAccess(tile, unit)).toBe(false);
  expect(environmentSummary(tile)).toContain("High water: ford closed");
  tile.surface = "frozen";
  expect(fordStatus(tile)?.label).toBe("Ice crossing");
  expect(pieceAccess(tile, unit)).toBe(true);
  expect(environmentSummary(tile)).toContain(
    "Frozen river: land crossing open",
  );
  expect(environmentSummary(tile)).not.toContain("High water: ford closed");
  tile.surface = "open";
  tile.geography!.projects = { bridge: { owner: 0, born: 1 } };
  expect(fordStatus(tile)?.label).toBe("Bridge open");
  expect(pieceAccess(tile, unit)).toBe(true);
  expect(environmentSummary(tile)).not.toContain("High water: ford closed");
});
