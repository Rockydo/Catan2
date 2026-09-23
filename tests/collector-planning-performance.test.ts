import { expect, it, vi } from "vitest";
import { chooseAIAction } from "../src/game/ai";
import * as market from "../src/game/ai-market";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";

it("does not price collection moves when all merchants have spent their movement", () => {
  const { s, home } = maritimeFixture();
  s.phase = "military";
  const tile = s.vertices[home.vertex].tiles[0];
  for (let i = 0; i < 100; i++) piece(s, tile, 0, "merchant", 1).moved = 1;
  const spy = vi.spyOn(market, "marketValues");
  try {
    const before = JSON.stringify(s);
    expect(chooseAIAction(s)).toEqual({ type: "end-turn" });
    expect(spy).not.toHaveBeenCalled();
    expect(JSON.stringify(s)).toBe(before);
    // A single mobile collector restores the normal market-based decision.
    const mobile = structuredClone(s);
    Object.values(mobile.pieces)[0].moved = 0;
    chooseAIAction(mobile);
    expect(spy).toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});
