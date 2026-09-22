import { expect, it, vi } from "vitest";
import * as ai from "../src/game/ai";
import { planAIOrders } from "../src/game/ai-orders";
import {
  recruitmentFundingTarget,
  recruitmentIntentOrder,
  type RecruitmentIntent,
} from "../src/game/ai-recruitment";
import { unitCost } from "../src/game/content";
import { inventory } from "../src/game/selectors";
import { fishingFixture } from "./maritime-fixture";
import { run } from "./helpers";
import type { Command } from "../src/game/types";

function fixture() {
  const { s, home } = fishingFixture();
  s.players[0].control = "standard";
  home.stock = { gold: 2000 };
  const tile = s.vertices[home.vertex].tiles.find(
    (id) => s.tiles[id].resource !== "water",
  )!;
  const command: Command = {
    type: "recruit",
    town: home.id,
    tile,
    kind: "merchant",
    tier: 4,
  };
  const target = recruitmentFundingTarget(
    s,
    command,
    25,
    unitCost("merchant", 4),
    ai.marginalValues(s),
  );
  const intent: RecruitmentIntent = {
    command: { ...command, count: target.count },
    cost: target.cost,
  };
  return { s, intent };
}
const oneOrderClock = () => {
  let time = 0;
  return () => (time += 200);
};

it("finishes reserved imports across cloned worker replies, then pays for the entire chosen order", () => {
  let { s, intent } = fixture();
  const original = structuredClone(s);
  const strategy = vi
    .spyOn(ai, "chooseAIAction")
    .mockImplementation((view, capture) => {
      capture?.(intent);
      return recruitmentIntentOrder(view, intent, ai.marginalValues(view))!;
    });
  try {
    let bought = false,
      trades = 0;
    for (let n = 0; n < 20; n++) {
      const plan = planAIOrders(s, oneOrderClock());
      expect(plan.commands).toHaveLength(1);
      const command = plan.commands[0];
      expect(plan.state).toEqual(run(s, command));
      s = structuredClone(plan.state);
      if (command.type === "recruit") {
        expect(command.count).toBe(25);
        bought = true;
        break;
      }
      expect(command.type).toBe("bank");
      trades++;
    }
    expect(trades).toBeGreaterThan(1);
    expect(bought).toBe(true);
    expect(strategy).toHaveBeenCalledTimes(1);
    expect(Object.values(s.pieces)).toHaveLength(25);
    expect(inventory(s).gold).toBeLessThan(inventory(original).gold!);
  } finally {
    strategy.mockRestore();
  }
});

it("abandons the pending order if the user changes or imports the campaign", () => {
  let { s, intent } = fixture();
  const strategy = vi
    .spyOn(ai, "chooseAIAction")
    .mockImplementation((view, capture) => {
      capture?.(intent);
      return recruitmentIntentOrder(view, intent, ai.marginalValues(view))!;
    });
  try {
    const plan = planAIOrders(s, oneOrderClock());
    expect(plan.commands[0].type).toBe("bank");
    s = structuredClone(plan.state);
    s.players[0].name = "Imported campaign";
    strategy.mockImplementation(() => ({ type: "end-turn" }));
    const next = planAIOrders(s, oneOrderClock());
    expect(strategy).toHaveBeenCalledTimes(2);
    expect(next.commands).toEqual([{ type: "end-turn" }]);
    expect(Object.keys(next.state.pieces)).toHaveLength(0);
  } finally {
    strategy.mockRestore();
  }
});
