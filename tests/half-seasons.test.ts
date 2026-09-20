import { describe, expect, it } from "vitest";
import { newGame, canApplyCommand } from "../src/game/engine";
import {
  SEASONS,
  ICE_TRANSITIONS,
  seasonAt,
  seasonHalf,
  seasonLabel,
  seasonYear,
  iceOdds,
  iceRisk,
  seasonalProfile,
  seasonalYield,
  syncSeasonSurfaces,
} from "../src/game/seasons";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import {
  power,
  points,
  retreatOptions,
  productionSources,
} from "../src/game/selectors";
import {
  seasonalDestinationSafe,
  seasonalEvacuation,
  projectedIncome,
} from "../src/game/ai-seasonal";
import { BIOME_INFO, CLIMATE_INFO } from "../src/game/climate-content";
import { seasonalTerrainPattern } from "../src/ui/terrain-art";
import { hash } from "../src/game/world";
import { maritimeFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";

function fixture() {
  const f = maritimeFixture();
  f.s.calendar = {
    startRound: 1,
    startSeason: "spring",
    roundsPerSeason: 2,
    iceModel: 2,
  };
  f.s.round = 1;
  return f;
}
function hold(s: ReturnType<typeof fixture>["s"], id: string, frozen: boolean) {
  s.tiles[id].surface = frozen ? "frozen" : "open";
  s.tiles[id].iceWeather = {
    round: s.round,
    season: seasonAt(s)!,
    half: seasonHalf(s),
  };
  syncSeasonSurfaces(s);
}

describe("two-round seasons", () => {
  it.each(SEASONS)(
    "starts in early %s and advances only after every faction, with eight-round years",
    (startSeason) => {
      let { s } = fixture();
      s.calendar!.startSeason = startSeason;
      for (let round = 1; round <= 16; round++) {
        expect(s.round).toBe(round);
        expect(seasonAt(s)).toBe(
          SEASONS[
            (SEASONS.indexOf(startSeason) + Math.floor((round - 1) / 2)) % 4
          ],
        );
        expect(seasonHalf(s)).toBe(round % 2 ? "early" : "late");
        expect(seasonYear(s)).toBe(Math.floor((round - 1) / 8) + 1);
        s.phase = "economy";
        s = run(s, { type: "end-turn" });
        expect(s.round).toBe(round);
        s.phase = "economy";
        s = run(s, { type: "end-turn" });
      }
    },
  );
  it("new campaigns keep random season starts but always start early", () => {
    const s = newGame("half-season-start");
    expect(s.calendar).toMatchObject({ roundsPerSeason: 2, iceModel: 2 });
    expect(seasonHalf(s)).toBe("early");
    expect(newGame(s.seed).calendar).toEqual(s.calendar);
    assertInvariants(deserialize(serialize(s)));
  });
  it("keeps every land harvest amount and artwork unchanged between early and late", () => {
    const { s } = fixture();
    for (const [climate, info] of Object.entries(CLIMATE_INFO))
      for (const [biome] of info.terrain) {
        const tile = s.tiles["0,0"];
        Object.assign(tile, {
          biome,
          resource: BIOME_INFO[biome].resource,
          climate,
        });
        const original = seasonalProfile(tile);
        for (let round = 1; round <= 8; round += 2) {
          s.round = round;
          syncSeasonSurfaces(s);
          const season = seasonAt(s)!,
            art = seasonalTerrainPattern(tile, season);
          expect(seasonalYield(tile, 0, season)).toEqual(original[season]);
          s.round++;
          syncSeasonSurfaces(s);
          expect(seasonAt(s)).toBe(season);
          expect(seasonalYield(tile, 0, season)).toEqual(original[season]);
          expect(seasonalTerrainPattern(tile, seasonAt(s))).toBe(art);
        }
      }
  });
  it("migrates v12 at the same season and year without changing surfaces, units, warehouses or random streams", () => {
    const { s } = fixture();
    s.calendar = { startRound: 1, startSeason: "autumn", iceModel: 1 };
    s.round = 23;
    Object.assign(s.tiles["0,0"], {
      resource: "water",
      biome: "fish",
      fish: true,
      climate: "cold",
    });
    piece(s, "0,0", 0, "galley", 2);
    syncSeasonSurfaces(s);
    const saved = JSON.parse(serialize(s));
    saved.version = 12;
    const loaded = deserialize(JSON.stringify(saved));
    expect(seasonAt(loaded)).toBe(seasonAt(s));
    expect(seasonYear(loaded)).toBe(seasonYear(s));
    expect(seasonHalf(loaded)).toBe("early");
    expect(loaded.pieces).toEqual(s.pieces);
    expect(loaded.towns).toEqual(s.towns);
    expect([loaded.rng, loaded.deckRng]).toEqual([s.rng, s.deckRng]);
    for (const id in s.tiles)
      expect(loaded.tiles[id].surface).toBe(s.tiles[id].surface);
    expect(deserialize(serialize(loaded))).toEqual(loaded);
    loaded.round++;
    syncSeasonSurfaces(loaded);
    expect(seasonAt(loaded)).toBe(seasonAt(s));
    expect(seasonHalf(loaded)).toBe("late");
    assertInvariants(loaded);
  });
});

describe("independent per-boundary sea weather", () => {
  it.each(Object.keys(ICE_TRANSITIONS))(
    "resolves %s freeze and melt odds against the previous surface",
    (climate) => {
      const { s } = fixture(),
        t = s.tiles["0,0"];
      Object.assign(t, { resource: "water", biome: "water", climate });
      for (const [round, season, half, iced] of [
        [6, "autumn", "late", false],
        [2, "spring", "late", true],
      ] as const) {
        let changed = 0;
        const [freeze, melt] = iceOdds(t, season, half),
          chance = iced ? melt : freeze;
        for (let n = 0; n < 600; n++) {
          s.seed = `weather-frequency-${n}`;
          s.round = round;
          t.surface = iced ? "frozen" : "open";
          t.iceWeather = { round: round - 1, season, half: "early" };
          syncSeasonSurfaces(s);
          changed += Number((t.surface === "frozen") !== iced);
        }
        expect(changed / 600).toBeCloseTo(chance, 1);
      }
    },
  );
  it("does not reroll on reload, preview, discovery sync or repeated evaluation", () => {
    let s = newGame("weather-idempotence");
    const streams = [s.rng, s.deckRng, s.rebellionRng, s.frontierRng];
    for (let round = 1; round <= 17; round++) {
      s.round = round;
      syncSeasonSurfaces(s);
      const before = structuredClone(s);
      syncSeasonSurfaces(s);
      expect(s).toEqual(before);
      const t = Object.values(s.tiles).find((t) => t.iceWeather)!;
      for (let i = 1; i <= 8; i++) iceRisk(s, t, round + i);
      expect(s).toEqual(before);
      s = deserialize(serialize(s));
      expect(s).toEqual(before);
    }
    expect([s.rng, s.deckRng, s.rebellionRng, s.frontierRng]).toEqual(streams);
  });
  it("never melts permanent Glacial ice and always opens seasonal ice by late Summer", () => {
    const { s } = fixture();
    const pack = s.tiles["0,0"],
      seasonal = s.tiles["1,0"];
    Object.assign(pack, { resource: "ice", biome: "ice", climate: "glacial" });
    Object.assign(seasonal, {
      resource: "ice",
      biome: "ice",
      climate: "arctic",
    });
    for (let round = 1; round <= 16; round++) {
      s.round = round;
      syncSeasonSurfaces(s);
      expect(pack.surface).toBe("frozen");
      if (round % 8 === 4) expect(seasonal.surface).toBe("open");
    }
  });
  it("keeps the existing marine harvest calendar but blocks every raw and processed output under actual ice", () => {
    const { s, home } = fixture(),
      t = s.tiles["0,0"];
    Object.assign(t, {
      resource: "water",
      biome: "whale",
      whale: true,
      climate: "cold",
      freezeRoll: 0.99,
    });
    const before = seasonalProfile(t, 0);
    s.round = 3;
    home.level = home.turnLevel = 4;
    home.extensions[t.id] = 3;
    home.extensionGoods = { [t.id]: "hides" };
    hold(s, t.id, false);
    expect(seasonalProfile(t, 0)).toEqual(before);
    const rows = () =>
      productionSources(s).filter(
        (row) => row.tile === t.id && row.owner === 0,
      );
    expect(
      rows()
        .filter((r) => r.good === "oil")
        .map((r) => r.amount),
    ).toContain(8);
    expect(
      rows()
        .filter((r) => r.good === "coke")
        .map((r) => r.amount),
    ).toContain(4);
    hold(s, t.id, true);
    expect(rows().every((r) => r.amount === 0)).toBe(true);
    expect(seasonalProfile(t, 0)).toEqual(before);
    s.round = 4;
    hold(s, t.id, false);
    expect(
      rows()
        .filter((r) => r.good === "oil")
        .map((r) => r.amount),
    ).toContain(8);
  });
  it("shows early/late risk to AI without letting it inspect future weather randomness", () => {
    const { s } = fixture();
    s.round = 5;
    s.phase = "economy";
    s.active = 1;
    const t = s.tiles["1,0"];
    Object.assign(t, {
      resource: "water",
      biome: "fish",
      fish: true,
      climate: "arctic",
      freezeRoll: 0.99,
    });
    piece(s, t.id, 0, "galley", 1);
    hold(s, t.id, false);
    Object.defineProperty(s, "seed", {
      get() {
        throw Error("AI read hidden weather seed");
      },
    });
    expect(iceRisk(s, t)).toBe(0.55);
    expect(seasonalDestinationSafe(s, t.id, true)).toBe(false);
    expect(() => seasonalEvacuation(s)).not.toThrow();
    expect(() => projectedIncome(s, 0, 6)).not.toThrow();
  });
  it("rejects stale or malformed persisted weather state", () => {
    const s = newGame("weather-validation");
    const t = Object.values(s.tiles).find((t) => t.iceWeather)!;
    t.iceWeather!.round--;
    expect(() => assertInvariants(s)).toThrow("Invalid half-season sea state");
    const malformed = JSON.parse(serialize(s));
    malformed.checksum = hash(JSON.stringify(malformed.game)).toString(16);
    expect(() => deserialize(JSON.stringify(malformed))).toThrow();
  });
});

describe("icebound fleet exposure and land escorts", () => {
  function battleFixture() {
    const f = fixture();
    f.s.round = 7;
    Object.assign(f.s.tiles["1,0"], {
      resource: "water",
      biome: "water",
      climate: "cold",
    });
    const ship = piece(f.s, "1,0", 1, "galley", 4),
      army = piece(f.s, "0,0", 0, "heavy", 4);
    hold(f.s, "1,0", true);
    return { ...f, ship, army };
  }
  it("uses quarter power rounded per ship while retaining normal whole-unit casualty points", () => {
    const { s, ship, army } = battleFixture();
    expect(power(s, [ship], ship.tile)).toBe(Math.ceil(points(ship) / 4));
    const attacked = run(s, { type: "move", ids: [army.id], to: ship.tile });
    expect(attacked.battle?.defenderPower).toBe(Math.ceil(points(ship) / 4));
    expect(attacked.battle?.required).toBe(points(ship));
    assertInvariants(deserialize(serialize(attacked)));
  });
  it("includes same-hex land defenders at full strength in both attacks and shore bombardment", () => {
    const { s, ship, army } = battleFixture();
    const guard = piece(s, ship.tile, 1, "heavy", 4);
    const powerHere = power(s, [ship, guard], ship.tile);
    expect(powerHere).toBe(Math.ceil(points(ship) / 4) + 4);
    const attacked = run(s, { type: "move", ids: [army.id], to: ship.tile });
    expect(attacked.battle?.defenders).toEqual(
      expect.arrayContaining([ship.id, guard.id]),
    );
    expect(attacked.battle?.defenderPower).toBe(powerHere);
    const gun = piece(s, army.tile, 0, "artillery", 1);
    const bombarded = run(s, { type: "bombard", ids: [gun.id], to: ship.tile });
    expect(bombarded.battle?.defenders).toEqual(
      expect.arrayContaining([ship.id, guard.id]),
    );
    expect(bombarded.battle?.defenderPower).toBe(powerHere);
    assertInvariants(deserialize(serialize(bombarded)));
  });
  it("cannot retreat while frozen even beside open water, and regains full strength on thaw", () => {
    const { s, ship } = battleFixture();
    Object.assign(s.tiles["2,0"], {
      resource: "water",
      biome: "water",
      climate: "temperate",
    });
    hold(s, "2,0", false);
    expect(retreatOptions(s, ship.tile, 1, true, "0,0", [ship])).toEqual([]);
    expect(
      canApplyCommand(s, { type: "move", ids: [ship.id], to: "2,0" }),
    ).toBe(false);
    hold(s, ship.tile, false);
    expect(ship.seasonStatus).toBeUndefined();
    expect(power(s, [ship], ship.tile)).toBe(points(ship));
    expect(retreatOptions(s, ship.tile, 1, true, "0,0", [ship])).toContain(
      "2,0",
    );
  });
});
