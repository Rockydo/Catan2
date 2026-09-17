import { describe, expect, it } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { affordable, inventory, recipePayment } from "../src/game/selectors";
import { pay } from "../src/game/economy";
import { applyCommand } from "../src/game/engine";
import { economyProjects } from "../src/game/ai";
import { RAW, PROCESSED } from "../src/game/types";

describe("automatic Gold recipe payment", () => {
  it.each([
    ...RAW.filter((g) => g !== "gold"),
    ...PROCESSED.filter((g) => g !== "goldbars"),
  ])("covers missing %s at 1:1 with its currency", (good) => {
    const { s, home } = maritimeFixture();
    const currency = RAW.includes(good as (typeof RAW)[number])
      ? "gold"
      : "goldbars";
    home.stock = { [good]: 1, [currency]: 2 };
    pay(s, { [good]: 3 });
    expect(inventory(s)[good] ?? 0).toBe(0);
    expect(inventory(s)[currency] ?? 0).toBe(0);
  });
  it("uses printed goods, then Fish/Oil, then a shared currency pool", () => {
    const { s, home } = maritimeFixture();
    home.stock = {
      grain: 1,
      fish: 2,
      coal: 1,
      oil: 1,
      gold: 3,
      steel: 1,
      goldbars: 2,
    };
    const cost = { grain: 4, coal: 3, stone: 1, steel: 2, cloth: 1 };
    const payment = recipePayment(s, cost);
    expect(payment).toEqual({
      grain: 1,
      fish: 2,
      coal: 1,
      oil: 1,
      stone: 0,
      steel: 1,
      cloth: 0,
      gold: 3,
      goldbars: 2,
    });
    expect(affordable(s, payment)).toBe(true);
    expect(recipePayment(s, payment)).toEqual(payment);
    pay(s, cost);
    expect(Object.values(inventory(s)).every((n) => !n)).toBe(true);
  });
  it("reserves explicit currency requirements and never double counts currency", () => {
    const { s, home } = maritimeFixture();
    home.stock = { gold: 3, goldbars: 2 };
    expect(
      affordable(s, recipePayment(s, { gold: 2, lumber: 1, brick: 1 })),
    ).toBe(false);
    expect(
      affordable(s, recipePayment(s, { goldbars: 1, steel: 1, cloth: 1 })),
    ).toBe(false);
    expect(affordable(s, recipePayment(s, { lumber: 2, brick: 2 }))).toBe(
      false,
    );
    expect(affordable(s, recipePayment(s, { steel: 2, cloth: 1 }))).toBe(false);
    expect(
      recipePayment(s, { gold: 2, lumber: 1, goldbars: 1, steel: 1 }),
    ).toEqual({ gold: 3, lumber: 0, goldbars: 2, steel: 0 });
  });
  it("keeps explicit bank trades exact and failed research purchases atomic", () => {
    const { s, home } = maritimeFixture();
    home.stock = { gold: 2, goldbars: 9 };
    const before = structuredClone(s);
    expect(
      applyCommand(s, { type: "bank", give: { lumber: 4 }, take: { stone: 1 } })
        .ok,
    ).toBe(false);
    expect(applyCommand(s, { type: "buy-research", tier: 1 }).ok).toBe(false);
    expect(s).toEqual(before);
  });
  it("buys research using currency and exposes the same payment to AI projects", () => {
    const { s, home } = maritimeFixture();
    home.stock = { gold: 3, goldbars: 6 };
    for (const tier of [1, 4]) {
      const result = applyCommand(s, { type: "buy-research", tier });
      expect(result.ok, result.error).toBe(true);
      expect(result.state.researchChoice).toHaveLength(2);
      expect(inventory(result.state)[tier === 1 ? "gold" : "goldbars"]).toBe(0);
    }
    s.players[0].control = "standard";
    const projects = economyProjects(s).filter(
      (p) => p.action.type === "buy-research",
    );
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) {
      expect(project.cost.gold || project.cost.goldbars).toBeGreaterThan(0);
      expect(affordable(s, project.cost)).toBe(true);
    }
  });
  it("does not cross currency groups or spend opponents' currency", () => {
    const { s, home, enemy } = maritimeFixture();
    home.stock = { gold: 10 };
    enemy.stock = { goldbars: 10 };
    expect(affordable(s, recipePayment(s, { steel: 1 }))).toBe(false);
    expect(recipePayment(s, { steel: 1 }, enemy.owner)).toEqual({
      steel: 0,
      goldbars: 1,
    });
    home.stock = { goldbars: 10 };
    expect(affordable(s, recipePayment(s, { lumber: 1 }))).toBe(false);
  });
});
