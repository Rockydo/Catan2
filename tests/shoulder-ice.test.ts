import { describe, expect, it } from "vitest";
import {
  SEASONS,
  SHOULDER_ICE_CHANCE,
  frozenInSeason,
  seasonalProfile,
  seasonalYield,
  seasonAt,
  syncSeasonSurfaces,
} from "../src/game/seasons";
import { BIOME_INFO } from "../src/game/climate-content";
import type { Game, Raw } from "../src/game/types";
import { canApplyCommand, newGame } from "../src/game/engine";
import { harvestTiles, tileYield } from "../src/game/maritime";
import {
  addHexes,
  expeditionFootprint,
  hash,
  randomAt,
  unknownAtVertex,
} from "../src/game/world";
import { productionSources } from "../src/game/selectors";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";

const coldClimates = ["arctic", "alpine", "cold"] as const;
const shoulderClimates = [...coldClimates, "prairie", "steppe", "tundra"] as const;
const frozenClimates = [...shoulderClimates, "glacial"] as const;
const shoulders = ["spring", "autumn"] as const;

function fixture() {
  const f = maritimeFixture();
  f.s.calendar = { startRound: 1, startSeason: "spring", iceModel: 1 };
  f.s.round = 1;
  for (const tile of Object.values(f.s.tiles)) tile.climate = "cold";
  return f;
}

function marineTile(biome: "water" | "fish" | "cod" | "whale" = "fish") {
  const { s } = fixture();
  const tile = s.tiles["0,0"];
  Object.assign(tile, {
    biome,
    resource: "water",
    climate: "arctic",
    freezeRoll: 0,
  });
  if (biome === "fish" || biome === "cod") tile.fish = true;
  if (biome === "whale") tile.whale = true;
  return tile;
}

function versionedSave(s: Game, version: number) {
  const envelope = JSON.parse(serialize(s));
  envelope.version = version;
  envelope.checksum = hash(JSON.stringify(envelope.game)).toString(16);
  return JSON.stringify(envelope);
}

function randomStreams(s: Game) {
  return Object.fromEntries(
    Object.entries(s).filter(([name]) => /rng$/i.test(name)),
  );
}

function migratedSpring() {
  const { s } = fixture();
  s.calendar = { startRound: 1, startSeason: "spring" };
  const tile = s.tiles["0,0"];
  Object.assign(tile, {
    resource: "water",
    biome: "fish",
    fish: true,
    climate: "arctic",
  });
  let attempt = 0;
  do {
    s.seed = `shoulder-migration-${attempt++}`;
  } while (randomAt(s.seed, tile.id, "season-freeze") >= 0.5);
  syncSeasonSurfaces(s);
  return deserialize(versionedSave(s, 9));
}

describe("stable shoulder-season sea ice", () => {
  it("uses the exact climate-specific spring and autumn thresholds", () => {
    expect(SHOULDER_ICE_CHANCE).toEqual({
      glacial: { spring: 1, autumn: 1 },
      arctic: { spring: 0.7, autumn: 0.5 },
      tundra: { spring: 0.45, autumn: 0.3 },
      alpine: { spring: 0.35, autumn: 0.25 },
      cold: { spring: 0.2, autumn: 0.1 },
      prairie: { spring: 0.1, autumn: 0.1 },
      steppe: { spring: 0.1, autumn: 0.1 },
    });
  });

  it.each(shoulderClimates)(
    "uses strict threshold boundaries and stable cold spots in %s",
    (climate) => {
      const tile = marineTile();
      tile.climate = climate;
      for (const season of shoulders) {
        const threshold = SHOULDER_ICE_CHANCE[climate][season];
        tile.freezeRoll = threshold - 0.000001;
        expect(frozenInSeason(tile, season)).toBe(true);
        tile.freezeRoll = threshold;
        expect(frozenInSeason(tile, season)).toBe(false);
      }
      for (const roll of [0, 0.09, 0.19, 0.3, 0.49, 0.69, 0.99]) {
        tile.freezeRoll = roll;
        if (frozenInSeason(tile, "autumn"))
          expect(frozenInSeason(tile, "spring")).toBe(true);
        expect(frozenInSeason(tile, "winter")).toBe(true);
        expect(frozenInSeason(tile, "summer")).toBe(false);
      }
    },
  );

  it("nests Cold frozen-water sets within Alpine and Arctic at the same stable roll", () => {
    const tile = marineTile();
    for (const season of shoulders)
      for (let i = 0; i < 100; i++) {
        tile.freezeRoll = i / 100;
        const frozen = coldClimates.map((climate) =>
          frozenInSeason({ ...tile, climate }, season),
        );
        if (frozen[2]) expect(frozen).toEqual([true, true, true]);
        if (frozen[1]) expect(frozen[0]).toBe(true);
      }
  });

  it("leaves mild seas, permanent ice and fixtures without freeze rolls unchanged", () => {
    const tile = marineTile();
    for (const climate of ["temperate", "oceanic", "tropical"] as const)
      for (const season of SEASONS)
        expect(frozenInSeason({ ...tile, climate }, season)).toBe(false);
    const legacy = { ...tile };
    delete legacy.freezeRoll;
    expect(SEASONS.map((season) => frozenInSeason(legacy, season))).toEqual([
      false,
      false,
      false,
      true,
    ]);
    const ice = { ...tile, biome: "ice" as const, resource: "ice" as const };
    expect(SEASONS.map((season) => frozenInSeason(ice, season))).toEqual([
      true,
      false,
      true,
      true,
    ]);
    expect(frozenInSeason(tile)).toBe(false);
    expect(frozenInSeason(ice)).toBe(true);
  });

  it("does not initialize stable rolls in legacy calendars until the model opts in", () => {
    const { s } = fixture();
    delete s.calendar!.iceModel;
    const tile = s.tiles["0,0"];
    Object.assign(tile, { resource: "water", biome: "water" });
    syncSeasonSurfaces(s);
    expect(tile.freezeRoll).toBeUndefined();
    expect(tile.surface).toBe("open");
    s.calendar!.iceModel = 1;
    syncSeasonSurfaces(s);
    expect(tile.freezeRoll).toBe(randomAt(s.seed, tile.id, "season-freeze"));
  });

  it("keeps legacy harvest rolls and frost patterns stable across years, saves and discovery", () => {
    const s = newGame("stable-shoulder-ice-5");
    s.calendar!.iceModel = 1;
    delete s.calendar!.roundsPerSeason;
    syncSeasonSurfaces(s);
    expect(s.calendar?.iceModel).toBe(1);
    const streams = randomStreams(s);
    const water = Object.values(s.tiles).filter(
      (tile) =>
        tile.resource === "water" &&
        frozenClimates.includes(
          tile.climate as (typeof frozenClimates)[number],
        ),
    );
    expect(water.length).toBeGreaterThan(0);
    for (const tile of water)
      expect(tile.freezeRoll).toBe(randomAt(s.seed, tile.id, "season-freeze"));
    for (const tile of Object.values(s.tiles).filter(
      (tile) =>
        tile.resource === "water" &&
        !frozenClimates.includes(
          tile.climate as (typeof frozenClimates)[number],
        ),
    ))
      expect(tile.freezeRoll).toBeUndefined();
    const rolls = Object.fromEntries(
      water.map((tile) => [tile.id, tile.freezeRoll]),
    );
    const surfaces = new Map<string, string>();
    for (let round = 1; round <= 9; round++) {
      s.round = round;
      syncSeasonSurfaces(s);
      const season = seasonAt(s)!;
      const current = JSON.stringify(
        water.map((tile) => [tile.id, tile.surface]),
      );
      if (surfaces.has(season)) expect(current).toBe(surfaces.get(season));
      else surfaces.set(season, current);
      expect(
        Object.fromEntries(water.map((tile) => [tile.id, tile.freezeRoll])),
      ).toEqual(rolls);
    }
    expect(randomStreams(s)).toEqual(streams);
    const saved = deserialize(serialize(s));
    expect(saved.tiles).toEqual(s.tiles);
    const before = structuredClone(saved.tiles);
    const vertex = Object.keys(saved.vertices).find(
      (v) =>
        unknownAtVertex(saved, v).length &&
        saved.vertices[v].tiles.some((id) =>
          frozenClimates.includes(
            saved.tiles[id].climate as (typeof frozenClimates)[number],
          ),
        ),
    )!;
    const revealed = expeditionFootprint(saved, vertex, 3);
    addHexes(saved, saved.seed, revealed);
    syncSeasonSurfaces(saved);
    for (const [id, tile] of Object.entries(before))
      expect({
        ...saved.tiles[id],
        geography: {
          ...saved.tiles[id].geography,
          fauna: undefined,
          animals: undefined,
        },
      }).toEqual({
        ...tile,
        geography: { ...tile.geography, fauna: undefined, animals: undefined },
      });
    const addedWater = revealed
      .map((id) => saved.tiles[id])
      .filter(
        (tile) =>
          tile.resource === "water" &&
          frozenClimates.includes(
            tile.climate as (typeof frozenClimates)[number],
          ),
      );
    expect(addedWater.length).toBeGreaterThan(0);
    for (const tile of addedWater)
      expect(tile.freezeRoll).toBe(
        randomAt(saved.seed, tile.id, "season-freeze"),
      );
    expect(randomStreams(saved)).toEqual(streams);
    assertInvariants(deserialize(serialize(saved)));
  });
});

describe("marine harvests under shoulder ice", () => {
  it.each(["fish", "cod", "whale"] as const)(
    "renders frozen %s grounds as ice and restores their fishing harvest after thaw",
    (biome) => {
      for (const climate of coldClimates) {
        const { s } = fixture();
        const tile = s.tiles["0,0"];
        Object.assign(tile, {
          biome,
          resource: "water",
          climate,
          freezeRoll: 0,
          fish: biome !== "whale",
          whale: biome === "whale",
        });
        const ship = piece(s, tile.id, 0, "fishing", 1);
        for (const season of ["spring", "autumn", "winter"] as const) {
          s.round = SEASONS.indexOf(season) + 1;
          syncSeasonSurfaces(s);
          expect(tile.surface).toBe("frozen");
          expect(ship.seasonStatus).toBe("icebound");
          expect(harvestTiles(s, ship)).toEqual([]);
          expect(seasonalYield(tile, 0, season)).toEqual({});
          expect(
            productionSources(s).filter((row) => row.tile === tile.id),
          ).toEqual([]);
          expect(terrainArtFile(seasonalTerrainPattern(tile, season))).toBe(
            `seasons/${climate}-ice-${season}.webp`,
          );
        }
        s.round = 6;
        syncSeasonSurfaces(s);
        expect(tile.biome).toBe(biome);
        expect(tile.resource).toBe("water");
        expect(tile.surface).toBe("open");
        expect(ship.seasonStatus).toBeUndefined();
        expect(harvestTiles(s, ship)).toContain(tile.id);
        expect(terrainArtFile(seasonalTerrainPattern(tile, "summer"))).toBe(
          `seasons/${climate}-${biome}-summer.webp`,
        );
        for (const [raw, base] of Object.entries(tileYield(tile))) {
          expect(seasonalYield(tile, 0, "summer")[raw as Raw]).toBe(4 * base!);
          expect(
            productionSources(s).some(
              (row) =>
                row.tile === tile.id && row.good === raw && row.amount > 0,
            ),
          ).toBe(true);
        }
      }
    },
  );

  it.each(["fish", "cod", "whale"] as const)(
    "moves each frozen %s harvest component into summer without changing annual raw output",
    (biome) => {
      const tile = marineTile(biome);
      const base = tileYield(tile);
      for (const climate of coldClimates)
        for (const roll of [0, 0.15, 0.3, 0.6, 0.99]) {
          tile.climate = climate;
          tile.freezeRoll = roll;
          const profile = seasonalProfile(tile);
          for (const [raw, amount] of Object.entries(base)) {
            const good = raw as Raw;
            expect(
              SEASONS.reduce(
                (sum, season) => sum + (profile[season][good] ?? 0),
                0,
              ),
            ).toBe(4 * amount!);
            expect(profile.winter[good] ?? 0).toBe(0);
            for (const season of shoulders)
              expect(profile[season][good] ?? 0).toBe(
                frozenInSeason(tile, season) ? 0 : amount,
              );
            const deferred = shoulders.filter((season) =>
              frozenInSeason(tile, season),
            ).length;
            expect(profile.summer[good]).toBe((2 + deferred) * amount!);
          }
          for (const season of SEASONS)
            expect(seasonalYield(tile, 0, season)).toEqual(profile[season]);
        }
    },
  );

  it("handles legacy whale flags componentwise, including Oil", () => {
    const tile = marineTile("whale");
    delete tile.biome;
    expect(seasonalProfile(tile)).toEqual({
      spring: {},
      summer: { hides: 4, oil: 4 },
      autumn: {},
      winter: {},
    });
  });

  it.each(["seal-grounds", "reindeer-range", "hunting-forest"] as const)(
    "never applies marine freeze suppression to land %s",
    (biome) => {
      const tile = marineTile();
      Object.assign(tile, { biome, resource: BIOME_INFO[biome].resource });
      delete tile.fish;
      const expected = seasonalProfile({ ...tile, freezeRoll: undefined });
      expect(seasonalProfile(tile)).toEqual(expected);
      for (const season of SEASONS)
        expect(frozenInSeason(tile, season)).toBe(false);
    },
  );

  it("keeps current surfaces, pieces, stocks and RNG unchanged when reading seasonal forecasts", () => {
    const { s } = fixture();
    const tile = s.tiles["0,0"];
    Object.assign(tile, {
      resource: "water",
      biome: "whale",
      whale: true,
      freezeRoll: 0,
    });
    piece(s, tile.id, 0, "fishing", 4);
    syncSeasonSurfaces(s);
    const before = JSON.stringify(s);
    for (const season of SEASONS) {
      frozenInSeason(tile, season);
      seasonalYield(tile, 0, season);
      productionSources(s, season);
    }
    productionSources(s, "annual");
    expect(JSON.stringify(s)).toBe(before);
  });

  it("stops an icebound fishing ship from harvesting neighboring open water while retaining its annual forecast", () => {
    const { s, home } = fixture();
    home.vertex = s.tiles["-3,0"].vertices[0];
    Object.assign(s.tiles["0,0"], {
      resource: "water",
      biome: "water",
      freezeRoll: 0,
    });
    Object.assign(s.tiles["1,0"], {
      resource: "water",
      biome: "fish",
      fish: true,
      freezeRoll: 0.99,
    });
    const ship = piece(s, "0,0", 0, "fishing", 4);
    syncSeasonSurfaces(s);
    expect(s.tiles["0,0"].surface).toBe("frozen");
    expect(s.tiles["1,0"].surface).toBe("open");
    expect(ship.seasonStatus).toBe("icebound");
    expect(harvestTiles(s, ship)).toEqual([]);
    expect(
      productionSources(s).filter(
        (row) => row.owner === 0 && row.tile === "1,0",
      ),
    ).toEqual([]);
    expect(
      productionSources(s, "annual")
        .filter(
          (row) => row.owner === 0 && row.tile === "1,0" && row.good === "fish",
        )
        .map((row) => row.amount),
    ).toEqual([4]);
    expect(ship.seasonStatus).toBe("icebound");
  });
});

describe("safe shoulder-ice save migration", () => {
  it("rejects malformed stable rolls, grace seasons and ice model markers", () => {
    const s = migratedSpring();
    assertInvariants(s);
    for (const value of [-0.01, 1, Infinity, NaN, "0.1", null]) {
      const invalid = structuredClone(s);
      Object.assign(invalid.tiles["0,0"], { freezeRoll: value });
      expect(() => assertInvariants(invalid)).toThrow(
        "Invalid local sea freezing roll.",
      );
    }
    for (const value of ["summer", "winter", "autumn", "monsoon", null]) {
      const invalid = structuredClone(s);
      Object.assign(invalid.tiles["0,0"], { thawGrace: value });
      expect(() => assertInvariants(invalid)).toThrow(
        "Invalid sea thaw grace.",
      );
    }
    for (const value of [0, 3, "1", true, null]) {
      const invalid = structuredClone(s);
      Object.assign(invalid.calendar!, { iceModel: value });
      expect(() => assertInvariants(invalid)).toThrow(
        "Invalid seasonal calendar.",
      );
    }
    const landRoll = structuredClone(s);
    landRoll.tiles["1,0"].freezeRoll = 0;
    expect(() => assertInvariants(landRoll)).toThrow(
      "Invalid local sea freezing roll.",
    );
    const noModel = structuredClone(s);
    delete noModel.calendar!.iceModel;
    expect(() => assertInvariants(noModel)).toThrow(
      "Invalid local sea freezing roll.",
    );
  });

  it("forecasts summer after spring migration grace exactly as the actual next season without mutation", () => {
    const s = migratedSpring();
    const before = JSON.stringify(s);
    expect(s.tiles["0,0"].thawGrace).toBe("spring");
    const rows = (game: Game, mode: "current" | "summer") =>
      productionSources(game, mode)
        .filter((row) => row.tile === "0,0")
        .map(({ owner, tile, good, amount }) => ({
          owner,
          tile,
          good,
          amount,
        }));
    const forecast = rows(s, "summer");
    expect(forecast.some((row) => row.good === "fish" && row.amount > 0)).toBe(
      true,
    );
    expect(JSON.stringify(s)).toBe(before);
    const next = structuredClone(s);
    next.round += 2;
    syncSeasonSurfaces(next);
    expect(next.tiles["0,0"].thawGrace).toBeUndefined();
    expect(rows(next, "current")).toEqual(forecast);
    expect(JSON.stringify(s)).toBe(before);
  });

  it("does not clear real thaw grace when previewing an end-turn that advances the season", () => {
    const s = migratedSpring();
    s.active = 1;
    s.phase = "economy";
    const tile = s.tiles["0,0"];
    const before = JSON.stringify(s);
    expect(
      s.players.filter((player) => player.alive).map((player) => player.id),
    ).toEqual([0, 1]);
    expect(canApplyCommand(s, { type: "end-turn" })).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(tile.thawGrace).toBe("spring");
    expect(tile.surface).toBe("open");
  });

  it.each(shoulders)(
    "preserves open %s water on version 9 upgrade and uses new weather thereafter",
    (season) => {
      const { s } = fixture();
      s.calendar = { startRound: 1, startSeason: season };
      const tile = s.tiles["0,0"];
      Object.assign(tile, {
        resource: "water",
        biome: "fish",
        fish: true,
        climate: "arctic",
      });
      let attempt = 0;
      do {
        s.seed = `shoulder-migration-${attempt++}`;
      } while (randomAt(s.seed, tile.id, "season-freeze") >= 0.5);
      const ship = piece(s, tile.id, 0, "galley");
      syncSeasonSurfaces(s);
      expect(tile.surface).toBe("open");
      const stocks = structuredClone(s.towns),
        streams = randomStreams(s);
      const loaded = deserialize(versionedSave(s, 9));
      const migrated = loaded.tiles[tile.id];
      expect(loaded.calendar?.iceModel).toBe(2);
      expect(migrated.freezeRoll).toBe(
        randomAt(s.seed, tile.id, "season-freeze"),
      );
      expect(migrated.thawGrace).toBe(season);
      expect(migrated.surface).toBe("open");
      expect(frozenInSeason(migrated, season)).toBe(false);
      expect(loaded.pieces[ship.id]).toEqual(ship);
      expect(loaded.towns).toEqual(stocks);
      expect(randomStreams(loaded)).toEqual(streams);
      expect(deserialize(serialize(loaded))).toEqual(loaded);
      syncSeasonSurfaces(loaded);
      expect(migrated.thawGrace).toBe(season);
      loaded.round++;
      syncSeasonSurfaces(loaded);
      expect(migrated.thawGrace).toBe(season);
      loaded.round++;
      syncSeasonSurfaces(loaded);
      expect(migrated.thawGrace).toBeUndefined();
      if (season === "spring") {
        expect(migrated.surface).toBe("open");
        expect(loaded.pieces[ship.id].seasonStatus).toBeUndefined();
      }
      loaded.round = season === "spring" ? 8 : 4;
      syncSeasonSurfaces(loaded);
      expect(migrated.surface).toBe("frozen");
      expect(loaded.pieces[ship.id].seasonStatus).toBe("icebound");
      expect(randomStreams(loaded)).toEqual(streams);
      assertInvariants(deserialize(serialize(loaded)));
    },
  );

  it("retains next-round seasonal activation for pre-season version 8 saves", () => {
    const { s } = maritimeFixture();
    s.round = 23;
    const before = structuredClone(s),
      streams = randomStreams(s);
    const loaded = deserialize(versionedSave(s, 8));
    expect(loaded.calendar).toMatchObject({
      startRound: 24,
      iceModel: 2,
      roundsPerSeason: 2,
    });
    expect(seasonAt(loaded)).toBeUndefined();
    expect(loaded.towns).toEqual(before.towns);
    expect(loaded.pieces).toEqual(before.pieces);
    expect(randomStreams(loaded)).toEqual(streams);
    loaded.round = 24;
    syncSeasonSurfaces(loaded);
    expect(seasonAt(loaded)).toBe("spring");
    assertInvariants(deserialize(serialize(loaded)));
  });
});
