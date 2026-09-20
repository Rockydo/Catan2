import { describe, expect, it } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import { chooseAIAction } from "../src/game/ai";
import {
  projectedIncome,
  seasonalDestinationSafe,
  seasonalDiversityBonus,
  seasonalEvacuation,
  seasonalRescueWaiting,
  withSeasonalPlanning,
} from "../src/game/ai-seasonal";
import { marketValues, tradeEvaluation } from "../src/game/ai-market";
import { income, moveTargets } from "../src/game/selectors";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { neighbors } from "../src/game/world";

function seasonalFixture(round = 1) {
  const f = maritimeFixture();
  f.s.calendar = { startRound: 1 };
  f.s.round = round;
  f.home.level = f.home.turnLevel = 1;
  for (const tile of Object.values(f.s.tiles)) {
    tile.resource = "snow";
    delete tile.biome;
    delete tile.surface;
  }
  for (const town of Object.values(f.s.towns)) town.stock = {};
  const crop = f.s.tiles["0,0"];
  crop.resource = "grain";
  crop.biome = "golden-fields";
  crop.climate = "temperate";
  f.s.players[0].control = "standard";
  return { ...f, crop };
}

describe("seasonal AI planning", () => {
  it("forecasts the next public roll and rolls into the next season after the last living faction", () => {
    const { s } = seasonalFixture();
    s.active = 1;
    s.phase = "roll";
    expect(projectedIncome(s, 0, 1).grain ?? 0).toBe(0);
    s.phase = "economy";
    expect(projectedIncome(s, 0, 1).grain).toBeCloseTo(8 / 6);
    // An eliminated faction does not add an imaginary roll to spring.
    s.players[3].alive = true;
    expect(projectedIncome(s, 0, 1).grain ?? 0).toBe(0);
    expect(projectedIncome(s, 0, 3).grain).toBeCloseTo(16 / 6);
  });

  it("preserves annual valuation while forecasting seasonal scarcity without reading RNG or hidden climates", () => {
    const { s } = seasonalFixture();
    s.phase = "roll";
    expect(projectedIncome(s, 0, 8).grain).toBeCloseTo(income(s, 0).grain! * 8);
    const before = structuredClone(s);
    Object.defineProperties(s, {
      rng: {
        get() {
          throw Error("Hidden RNG access");
        },
      },
      seed: {
        get() {
          throw Error("Hidden seed access");
        },
      },
      climatePlan: {
        get() {
          throw Error("Hidden climate access");
        },
      },
    });
    expect(projectedIncome(s, 0, 8).grain).toBeCloseTo(
      projectedIncome(before, 0, 8).grain!,
    );
  });

  it("keeps legacy no-season forecasts unchanged and returns empty output for a zero horizon", () => {
    const { s } = maritimeFixture();
    const expected = Object.fromEntries(
      Object.entries(income(s)).map(([good, amount]) => [good, amount! * 6]),
    );
    expect(projectedIncome(s)).toEqual(expected);
    expect(projectedIncome(s, s.active, 0)).toEqual({});
  });

  it("forecasts both Potato harvest sizes across the season boundary while retaining annual value", () => {
    const { s, crop } = seasonalFixture(2);
    crop.biome = "potato-fields";
    crop.climate = "andean";
    s.active = 1;
    s.phase = "roll";
    // One Summer roll remains, then both living factions roll in Autumn.
    expect(projectedIncome(s, 0, 1).grain).toBeCloseTo(2 / 6);
    expect(projectedIncome(s, 0, 3).grain).toBeCloseTo(14 / 6);
    expect(projectedIncome(s, 0, 8).grain).toBeCloseTo(16 / 6);
    expect(income(s, 0).grain).toBeCloseTo(2 / 6);
    s.phase = "economy";
    expect(projectedIncome(s, 0, 1).grain).toBeCloseTo(6 / 6);
    s.round = 3;
    expect(projectedIncome(s, 0, 1).grain ?? 0).toBe(0);
    expect(income(s, 0).grain).toBeCloseTo(2 / 6);
  });

  it("values a Potato maincrop as a complement to Summer wheat", () => {
    const { s, crop } = seasonalFixture();
    const potatoes = s.tiles["3,2"];
    Object.assign(potatoes, {
      resource: "grain",
      biome: "potato-fields",
      climate: "andean",
    });
    const [same, complementary] = withSeasonalPlanning(() => [
      seasonalDiversityBonus(s, [crop.id]),
      seasonalDiversityBonus(s, [potatoes.id]),
    ]);
    expect(same).toBe(0);
    expect(complementary).toBeCloseTo(0.12);
  });

  it("raises food scarcity and protects the last food before an unproductive half-year", () => {
    const { s, home } = seasonalFixture(1);
    home.stock = { grain: 2 };
    s.players.forEach((p) => {
      p.alive = true;
    });
    s.active = 3;
    const beforeHarvest = marketValues(s);
    const replenished = tradeEvaluation(
      s,
      0,
      {},
      { grain: 1 },
      {},
      beforeHarvest,
    );
    s.round = 3;
    expect(marketValues(s).grain).toBeGreaterThan(beforeHarvest.grain);
    const winterReserve = tradeEvaluation(
      s,
      0,
      {},
      { grain: 1 },
      {},
      beforeHarvest,
    );
    expect(winterReserve.loss).toBeGreaterThan(replenished.loss);
    expect(income(s, 0).grain).toBeCloseTo(2 / 6);
  });

  it("gives a small bonus for a complementary autumn crop, without changing annual yields", () => {
    const { s, crop } = seasonalFixture();
    const autumn = s.tiles["3,2"];
    autumn.resource = "grain";
    autumn.biome = "millet-fields";
    autumn.climate = "steppe";
    const [same, complementary] = withSeasonalPlanning(() => [
      seasonalDiversityBonus(s, [crop.id]),
      seasonalDiversityBonus(s, [autumn.id]),
    ]);
    expect(same).toBe(0);
    expect(complementary).toBeGreaterThan(same);
    expect(complementary).toBeLessThanOrEqual(0.16);
  });

  it("evacuates land troops off spring ice using ordinary MP and never walks back onto it", () => {
    let { s } = seasonalFixture(1);
    const ice = s.tiles["0,0"];
    ice.resource = "ice";
    ice.biome = "ice";
    ice.climate = "arctic";
    const army = piece(s, ice.id, 0, "light", 1);
    syncSeasonSurfaces(s);
    const action = seasonalEvacuation(s)!;
    expect(action).toMatchObject({ type: "move", ids: [army.id] });
    expect(neighbors(ice.id)).toContain(action.to);
    expect(moveTargets(s, action.ids!)[action.to!]).toHaveLength(1);
    s = run(s, action);
    expect(s.pieces[army.id].moved).toBe(1);
    expect(seasonalEvacuation(s)).toBeUndefined();
    expect(seasonalDestinationSafe(s, ice.id, false)).toBe(false);
  });

  it("sends an autumn fleet to open climate water, preserving frozen ships and normal movement", () => {
    let { s } = seasonalFixture(3);
    for (const id of ["0,0", "1,0", "2,0"]) {
      Object.assign(s.tiles[id], {
        resource: "water",
        biome: "water",
        climate: id === "2,0" ? "temperate" : "cold",
      });
    }
    const ship = piece(s, "0,0", 0, "galley", 1);
    syncSeasonSurfaces(s);
    const action = seasonalEvacuation(s)!;
    expect(action).toMatchObject({ type: "move", ids: [ship.id], to: "2,0" });
    s = run(s, action);
    expect(s.pieces[ship.id].moved).toBe(2);
    expect(seasonalEvacuation(s)).toBeUndefined();
    s.round = 4;
    s.pieces[ship.id].tile = "0,0";
    s.pieces[ship.id].moved = 0;
    syncSeasonSurfaces(s);
    expect(s.pieces[ship.id].seasonStatus).toBe("icebound");
    expect(seasonalEvacuation(s)).toBeUndefined();
  });

  it("does not send evacuating forces through hostile armies or include exhausted troops", () => {
    const { s } = seasonalFixture(1);
    Object.assign(s.tiles["0,0"], {
      resource: "ice",
      biome: "ice",
      climate: "arctic",
    });
    const mobile = piece(s, "0,0", 0, "light", 1);
    const spent = piece(s, "0,0", 0, "heavy", 1);
    spent.moved = 1;
    piece(s, "1,0", 1, "heavy", 4);
    syncSeasonSurfaces(s);
    const action = seasonalEvacuation(s)!;
    expect(action.ids).toEqual([mobile.id]);
    expect(action.to).not.toBe("1,0");
  });

  it("prioritizes weather evacuation in the real AI over ordinary recruitment and attacks", () => {
    const { s } = seasonalFixture(1);
    Object.assign(s.tiles["0,0"], {
      resource: "ice",
      biome: "ice",
      climate: "arctic",
    });
    const army = piece(s, "0,0", 0, "heavy", 1);
    syncSeasonSurfaces(s);
    expect(chooseAIAction(s)).toMatchObject({ type: "move", ids: [army.id] });
  });

  it("directs a carrier to stranded troops and holds it there until boarding is ready", () => {
    let { s } = seasonalFixture(2);
    for (const id of ["0,0", ...neighbors("0,0"), "2,0", "3,0"]) {
      Object.assign(s.tiles[id], {
        resource: "water",
        biome: "water",
        climate: "temperate",
      });
    }
    const army = piece(s, "0,0", 0, "heavy", 1);
    const ship = piece(s, "3,0", 0, "transport", 1);
    syncSeasonSurfaces(s);
    expect(s.pieces[army.id].seasonStatus).toBe("adrift");
    const action = seasonalEvacuation(s)!;
    expect(action).toMatchObject({ type: "move", ids: [ship.id] });
    expect(neighbors(army.tile)).toContain(action.to);
    s = run(s, action);
    expect(seasonalRescueWaiting(s, s.pieces[ship.id])).toBe(true);
    expect(seasonalEvacuation(s)).toBeUndefined();
    s.pieces[ship.id].moved = 0;
    const rescue = seasonalEvacuation(s)!;
    expect(rescue).toMatchObject({
      type: "load",
      ids: [army.id],
      ships: [ship.id],
    });
    s = run(s, rescue);
    expect(s.pieces[army.id].carrier).toBe(ship.id);
  });

  it("boards stranded troops into a carrier on the same open-water tile", () => {
    const { s } = seasonalFixture(2);
    for (const id of ["0,0", ...neighbors("0,0")])
      Object.assign(s.tiles[id], {
        resource: "water",
        biome: "water",
        climate: "temperate",
      });
    const army = piece(s, "0,0", 0, "heavy", 1),
      ship = piece(s, "0,0", 0, "convoy", 1);
    syncSeasonSurfaces(s);
    const action = seasonalEvacuation(s)!;
    expect(action).toMatchObject({
      type: "load",
      ids: [army.id],
      ships: [ship.id],
    });
    expect(run(s, action).pieces[army.id].carrier).toBe(ship.id);
  });

  it("recognizes trapped fleets as real combat opponents and attacks only with sufficient power", () => {
    const { s } = seasonalFixture(4);
    s.phase = "military";
    Object.assign(s.tiles["1,0"], {
      resource: "ice",
      biome: "ice",
      climate: "arctic",
    });
    const army = piece(s, "0,0", 0, "heavy", 4);
    piece(s, "1,0", 1, "galley", 1);
    syncSeasonSurfaces(s);
    expect(chooseAIAction(s)).toMatchObject({
      type: "move",
      ids: [army.id],
      to: "1,0",
    });
    for (let i = 0; i < 12; i++) piece(s, "1,0", 1, "galley", 4);
    syncSeasonSurfaces(s);
    const action = chooseAIAction(s);
    expect(action.type === "move" && action.to === "1,0").toBe(false);
  });

  it("keeps surviving icebound ships trapped after a land attack", () => {
    let { s } = seasonalFixture(4);
    Object.assign(s.tiles["1,0"], {
      resource: "water",
      biome: "water",
      climate: "cold",
    });
    Object.assign(s.tiles["2,0"], {
      resource: "water",
      biome: "water",
      climate: "temperate",
    });
    const army = piece(s, "0,0", 0, "heavy", 3);
    piece(s, "1,0", 1, "fishing", 2);
    piece(s, "1,0", 1, "fishing", 2);
    syncSeasonSurfaces(s);
    s = run(s, { type: "move", ids: [army.id], to: "1,0" });
    expect(s.battle?.loser).toBe(1);
    const action = chooseAIAction(s);
    expect(action).toMatchObject({
      type: "resolve-battle",
      actor: 1,
      retreat: undefined,
    });
    s = run(s, action);
    const survivors = Object.values(s.pieces).filter((u) => u.owner === 1);
    expect(survivors).toHaveLength(1);
    expect(survivors[0].tile).toBe("1,0");
    expect(survivors[0].seasonStatus).toBe("icebound");
    expect(s.pieces[army.id].tile).toBe("0,0");
  });
});
