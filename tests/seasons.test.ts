import { describe, it, expect } from "vitest";
import {
  CLIMATES,
  BIOMES,
  BIOME_INFO,
  CLIMATE_INFO,
} from "../src/game/climate-content";
import {
  SEASONS,
  seasonalProfile,
  seasonalYield,
  seasonAt,
  seasonYear,
  syncSeasonSurfaces,
  frozenInSeason,
} from "../src/game/seasons";
import { newGame } from "../src/game/engine";
import { tileYield, harvestYield, terrainFamily } from "../src/game/maritime";
import { production } from "../src/game/economy";
import { canOccupy, hash, solidAtVertex } from "../src/game/world";
import {
  income,
  productionSources,
  moveTargets,
  ready,
  points,
  casualtySelection,
  retreatOptions,
} from "../src/game/selectors";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { maritimeFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";

function fixture() {
  const f = maritimeFixture();
  f.s.calendar = { startRound: 1 };
  f.s.round = 1;
  f.home.stock = {};
  return f;
}

describe("seasonal production", () => {
  it("cannot increase Woods' annual quantity by switching between hunting and logging", () => {
    const { s } = fixture();
    const tile = {
      ...s.tiles["0,0"],
      biome: "woods" as const,
      resource: "lumber" as const,
    };
    const wood = seasonalProfile({ ...tile, woodsChoices: { 0: "lumber" } }, 0);
    const hides = seasonalProfile({ ...tile, woodsChoices: { 0: "hides" } }, 0);
    expect(
      SEASONS.reduce(
        (n, season) =>
          n + Math.max(wood[season].lumber ?? 0, hides[season].hides ?? 0),
        0,
      ),
    ).toBe(4);
  });
  it("preserves every resource's annual expected yield for every biome, climate and Woods choice", () => {
    const { s } = fixture();
    for (const climate of CLIMATES)
      for (const biome of BIOMES)
        for (const choice of ["lumber", "hides"] as const) {
          const tile = {
            ...s.tiles["0,0"],
            climate,
            biome,
            resource: BIOME_INFO[biome].resource,
            woodsChoices: { 0: choice },
          };
          const yearly = seasonalProfile(tile, 0);
          for (const [good, amount] of Object.entries(tileYield(tile, 0)))
            expect(
              SEASONS.reduce(
                (n, season) =>
                  n + (yearly[season][good as keyof typeof yearly.spring] ?? 0),
                0,
              ),
              `${climate}/${biome}/${good}`,
            ).toBe(4 * amount!);
          for (const season of SEASONS)
            for (const amount of Object.values(yearly[season]))
              expect(Number.isInteger(amount) && amount >= 0).toBe(true);
        }
  });
  it("retains normalized resource rolls in all climates and introduces appropriate local crops and herds", () => {
    for (const c of CLIMATES)
      expect(
        CLIMATE_INFO[c].terrain.reduce((n, [, p]) => n + p, 0),
        c,
      ).toBe(100);
    expect(
      CLIMATE_INFO.arctic.terrain.some(([b]) => b === "reindeer-range"),
    ).toBe(true);
    expect(
      CLIMATE_INFO.savanna.terrain.some(([b]) => b === "millet-fields"),
    ).toBe(true);
    expect(CLIMATE_INFO.desert.terrain.some(([b]) => b === "rice-field")).toBe(
      false,
    );
  });
  it("requires both harvest season and matching dice, pays every matching roll, and scales city/refining/workshops", () => {
    const { s, home } = fixture();
    const tile = s.tiles["0,0"];
    tile.biome = "golden-fields";
    tile.resource = "grain";
    home.extensions[tile.id] = 3;
    expect(productionSources(s).filter((x) => x.tile === tile.id)).toEqual([]);
    expect(income(s).grain).toBeGreaterThan(0);
    s.round = 2;
    const rows = productionSources(s).filter(
      (x) => x.tile === tile.id && x.owner === 0,
    );
    expect(
      rows.filter((x) => x.good === "grain").reduce((n, x) => n + x.amount, 0),
    ).toBe(32);
    expect(
      rows
        .filter((x) => x.good === "provisions")
        .reduce((n, x) => n + x.amount, 0),
    ).toBe(40);
    production(s, 6);
    expect(s.production[0]).toEqual({});
    production(s, 7);
    const first = s.production[0].grain!;
    production(s, 7);
    expect(s.production[0].grain).toBe(first);
    expect(home.stock.grain).toBe(first * 2);
  });
  it("gives tropical rice three windows, subtropical rice two, and olive groves a winter harvest", () => {
    const { s } = fixture();
    const tile = s.tiles["0,0"];
    tile.biome = "rice-field";
    tile.climate = "tropical";
    expect(
      SEASONS.map((season) => seasonalYield(tile, 0, season).grain ?? 0),
    ).toEqual([4, 4, 4, 0]);
    tile.climate = "subtropical";
    expect(
      SEASONS.map((season) => seasonalYield(tile, 0, season).grain ?? 0),
    ).toEqual([0, 6, 6, 0]);
    tile.biome = "olive-grove";
    expect(seasonalYield(tile, 0, "winter").grain).toBe(2);
  });
  it("refines every seasonal Whale good and livestock meat in advanced producers", () => {
    const { s } = fixture();
    const tile = s.tiles["0,0"];
    tile.biome = "whale";
    tile.resource = "water";
    expect(
      harvestYield(tile, 0, 4, true, seasonalYield(tile, 0, "autumn")),
    ).toEqual({ hides: 8, oil: 8, leather: 4, coke: 4 });
    tile.biome = "cattle-pasture";
    tile.resource = "meat";
    expect(
      harvestYield(tile, 0, 3, true, seasonalYield(tile, 0, "autumn")),
    ).toEqual({ meat: 12, provisions: 4 });
  });
});

describe("calendar, sea ice and save migration", () => {
  it("draws all starting seasons reproducibly without advancing other random streams", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 24; i++) {
      const seed = `random-start-season-${i}`;
      const s = newGame(seed);
      seen.add(seasonAt(s)!);
      expect(newGame(seed).calendar).toEqual(s.calendar);
      expect(s.rng).toBe(hash(seed + "dice"));
      expect(s.deckRng).toBe(hash(seed + "deck"));
      for (const tile of Object.values(s.tiles))
        if (tile.resource === "water")
          expect(tile.surface).toBe(
            frozenInSeason(tile, seasonAt(s)) ? "frozen" : "open",
          );
      expect(deserialize(serialize(s)).calendar).toEqual(s.calendar);
    }
    expect([...seen].sort()).toEqual([...SEASONS].sort());
  });
  it.each(SEASONS)(
    "keeps the calendar and yearly cycle when starting in %s",
    (startSeason) => {
      const { s } = fixture();
      s.calendar = { startRound: 1, startSeason };
      for (let round = 1; round <= 9; round++) {
        s.round = round;
        expect(seasonAt(s)).toBe(
          SEASONS[(SEASONS.indexOf(startSeason) + round - 1) % 4],
        );
        expect(seasonYear(s)).toBe(Math.floor((round - 1) / 4) + 1);
        syncSeasonSurfaces(s);
        const restored = deserialize(serialize(s));
        expect(restored.calendar).toEqual(s.calendar);
        expect(seasonAt(restored)).toBe(seasonAt(s));
      }
    },
  );
  it("preserves Spring-based seasonal saves and rejects invalid starting seasons", () => {
    const { s } = fixture();
    s.round = 3;
    syncSeasonSurfaces(s);
    expect(seasonAt(deserialize(serialize(s)))).toBe("autumn");
    const invalid = structuredClone(s);
    Object.assign(invalid.calendar!, { startSeason: "monsoon" });
    expect(() => assertInvariants(invalid)).toThrow(
      "Invalid seasonal calendar.",
    );
  });
  it("changes season only when the living player order wraps", () => {
    let { s } = fixture();
    expect(seasonAt(s)).toBe("spring");
    s = run(s, { type: "end-turn" });
    expect(s.active).toBe(1);
    expect(seasonAt(s)).toBe("spring");
    s.phase = "economy";
    s = run(s, { type: "end-turn" });
    expect(s.active).toBe(0);
    expect(seasonAt(s)).toBe("summer");
    s.round = 5;
    expect(seasonAt(s)).toBe("spring");
    expect(seasonYear(s)).toBe(2);
  });
  it("freezes northern seas without creating permanent construction ground and releases ships on thaw", () => {
    const { s } = fixture();
    const tile = s.tiles["0,0"];
    tile.resource = "water";
    tile.climate = "cold";
    tile.biome = "water";
    const ship = piece(s, tile.id, 0, "galley");
    s.round = 4;
    syncSeasonSurfaces(s);
    expect(canOccupy(tile)).toBe(true);
    expect(canOccupy(tile, true)).toBe(false);
    expect(ship.seasonStatus).toBe("icebound");
    expect(ready(s, ship)).toBe(false);
    expect(terrainFamily(tile)).toBe("flat");
    expect(solidAtVertex(s, tile.vertices[0])).not.toContain(tile.id);
    s.round = 5;
    syncSeasonSurfaces(s);
    expect(ship.seasonStatus).toBeUndefined();
    expect(ready(s, ship)).toBe(true);
    expect(canOccupy(tile, true)).toBe(true);
  });
  it("lets troops stranded by thaw step ashore and rescue transports pick up on the same tile", () => {
    let { s } = fixture();
    const tile = s.tiles["0,0"];
    tile.resource = "ice";
    tile.biome = "ice";
    const army = piece(s, tile.id, 0, "heavy");
    s.round = 2;
    syncSeasonSurfaces(s);
    expect(army.seasonStatus).toBe("adrift");
    expect(moveTargets(s, [army.id])["1,0"]).toBeDefined();
    const ship = piece(s, tile.id, 0, "convoy");
    s = run(s, { type: "load", ids: [army.id], ships: [ship.id] });
    expect(s.pieces[army.id].carrier).toBe(ship.id);
    expect(s.pieces[army.id].seasonStatus).toBeUndefined();
    assertInvariants(deserialize(serialize(s)));
  });
  it("lets an army engage an icebound enemy fleet without bypassing or co-occupying it", () => {
    let { s } = fixture();
    const tile = s.tiles["1,0"];
    tile.resource = "water";
    tile.climate = "cold";
    tile.biome = "water";
    const army = piece(s, "0,0", 0, "heavy", 4),
      ship = piece(s, "1,0", 1, "galley", 1);
    s.round = 4;
    syncSeasonSurfaces(s);
    s = run(s, { type: "move", ids: [army.id], to: ship.tile });
    expect(s.battle?.defenders).toContain(ship.id);
    const b = s.battle!;
    const losers = b.defenders.map((id) => s.pieces[id]);
    const ids = casualtySelection(losers, b.required);
    const survivors = losers.filter((u) => !ids.includes(u.id));
    s = run(s, {
      type: "resolve-battle",
      actor: b.loser,
      ids,
      retreat: retreatOptions(
        s,
        b.target,
        b.loser,
        b.naval,
        b.origin,
        survivors,
      )[0],
    });
    expect(s.pieces[ship.id]).toBeUndefined();
    expect(s.pieces[army.id].tile).toBe("1,0");
    assertInvariants(deserialize(serialize(s)));
  });
  it("migrates old campaigns at the next whole-round boundary without changing resources or RNG", () => {
    const { s } = maritimeFixture();
    s.round = 23;
    const original = JSON.parse(serialize(s));
    original.version = 8;
    original.checksum = hash(JSON.stringify(original.game)).toString(16);
    const loaded = deserialize(JSON.stringify(original));
    expect(loaded.calendar).toEqual({ startRound: 24 });
    expect(seasonAt(loaded)).toBeUndefined();
    expect(loaded.rng).toBe(s.rng);
    expect(loaded.towns).toEqual(s.towns);
    expect(deserialize(serialize(loaded))).toEqual(loaded);
    loaded.round = 24;
    expect(seasonAt(loaded)).toBe("spring");
  });
});
