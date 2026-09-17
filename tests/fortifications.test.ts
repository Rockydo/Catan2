import { expect, it } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { run } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { siegeRequirement } from "../src/game/selectors";
import type { Stock } from "../src/game/types";
it.each([
  { tier: 2, cost: { stone: 3 } },
  { tier: 3, cost: { masonry: 3 } },
  { tier: 4, cost: { masonry: 4, steel: 2 } },
] as { tier: number; cost: Stock }[])(
  "wall tier $tier is affordable with only its new simple recipe",
  ({ tier, cost }) => {
    const { s, home } = maritimeFixture();
    home.level = home.turnLevel = tier;
    home.wall = tier - 1;
    home.stock = { ...cost };
    const before = siegeRequirement(s, home, []);
    const n = run(s, { type: "wall", town: home.id });
    expect(n.towns[home.id].stock).toEqual({});
    expect(n.towns[home.id].wall).toBe(tier);
    expect(siegeRequirement(n, n.towns[home.id], [])).toBe(before + 1);
    expect(applyCommand(n, { type: "wall", town: home.id }).ok).toBe(false);
    home.level = tier - 1;
    expect(applyCommand(s, { type: "wall", town: home.id }).ok).toBe(false);
  },
);
