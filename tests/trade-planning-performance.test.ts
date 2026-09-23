import { expect, it, vi } from "vitest";
import { tradeFixture } from "./trade-fixture";
import { ownTowns, withPlanningFrame } from "../src/game/selectors";
import { playerTradeToward } from "../src/game/ai";
import * as guildAI from "../src/game/guild-ai";

it("skips partner economy searches without complementary stock but retains a viable whole-card offer", () => {
  const s = tradeFixture();
  for (const town of Object.values(s.towns)) town.stock = {};
  ownTowns(s, s.active)[0].stock = { lumber: 20 };
  ownTowns(s, 0)[0].stock = { coal: 20 };
  const spy = vi.spyOn(guildAI, "guildEconomyProjects");
  try {
    expect(
      withPlanningFrame(s, () => playerTradeToward(s, { grain: 1 })),
    ).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    const viable = structuredClone(s);
    ownTowns(viable, 0)[0].stock = { grain: 20 };
    const before = JSON.stringify(viable);
    const offer = withPlanningFrame(viable, () =>
      playerTradeToward(viable, { grain: 1 }),
    );
    expect(offer).toMatchObject({
      type: "offer-trade",
      partner: 0,
      take: { grain: 1 },
    });
    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(viable)).toBe(before);
  } finally {
    spy.mockRestore();
  }
});

it("does not plan counterparties when all goods are reserved or the project is already funded", () => {
  const s = tradeFixture();
  for (const town of Object.values(s.towns)) town.stock = {};
  const home = ownTowns(s, s.active)[0];
  home.stock = { lumber: 2 };
  const spy = vi.spyOn(guildAI, "guildEconomyProjects");
  try {
    expect(playerTradeToward(s, { lumber: 2, grain: 1 })).toBeNull();
    expect(playerTradeToward(s, { lumber: 1 })).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});
