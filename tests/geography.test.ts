import { existsSync } from "node:fs";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { CLIMATES, BIOME_INFO, type Biome } from "../src/game/climate-content";
import {
  seasonalDestinationSafe,
  projectedIncome,
} from "../src/game/ai-seasonal";
import { describe, it, expect } from "vitest";
import {
  newGame,
  applyCommand,
  beginTurn,
  canApplyCommand,
} from "../src/game/engine";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import {
  assertInvariants,
  serializePacked,
  deserialize,
} from "../src/game/save";
import {
  geographyAt,
  elevationAt,
  geographicTerrain,
  baseGeographicYield,
  pieceAccess,
  canSail,
  WILDLIFE_GOODS,
  landform,
} from "../src/game/geography";
import {
  generateHex,
  generateWorld,
  addHexes,
  neighbors,
  canOccupy,
} from "../src/game/world";
import {
  syncSeasonSurfaces,
  seasonalYield,
  seasonalProfile,
  seasonAt,
  SEASONS,
} from "../src/game/seasons";
import {
  syncEnvironment,
  environmentRisk,
  passClosed,
  waterCalendar,
} from "../src/game/environment";
import {
  power,
  fleetDefenders,
  points,
  ownTowns,
  moveTargets,
  productionSources,
  withPlanningFrame,
} from "../src/game/selectors";
import { harvestTiles, tileYield, tileOptions } from "../src/game/maritime";
import { PROJECTS } from "../src/game/geography";
import { startThawRetreats } from "../src/game/thaw-retreats";
import { protectedFood } from "../src/game/geography-actions";
import { GOODS, type Game, type Hex } from "../src/game/types";
import { piece, run } from "./helpers";

function tile(
  biome: Hex["biome"] = "woods",
  resource: Hex["resource"] = "lumber",
): Hex {
  return {
    ...generateHex("fixture", "0,0"),
    biome,
    resource,
    climate: "temperate",
    geography: {
      elevation: 0.6,
      region: "temperate:0,0",
      access: "normal",
      fauna: {},
      animals: [],
    },
  };
}
let baseline: Game | undefined;
function started() {
  if (!baseline) {
    let s = newGame("geo-epsilon");
    let count = 0;
    while (s.phase.startsWith("setup") && count++ < 100)
      s = run(s, chooseAIAction(s));
    expect(s.phase).toBe("roll");
    s.phase = "economy";
    for (const p of s.players)
      for (const good of GOODS) ownTowns(s, p.id)[0].stock[good] = 100;
    baseline = s;
  }
  return structuredClone(baseline);
}
describe("coherent geography", () => {
  it("generates varied world shapes with legal, stable river courses and playable setup", () => {
    const forms = new Set<string>();
    let rivers = 0,
      floodplains = 0,
      peaks = 0,
      passes = 0;
    for (let i = 0; i < 24; i++) {
      const s = newGame(`geography-survey-${i}`);
      forms.add(landform(s.seed));
      assertInvariants(s);
      expect(Object.keys(s.tiles)).toHaveLength(125);
      expect(
        Object.values(s.tiles).filter(
          (t) => !["water", "ice", "peaks"].includes(t.resource),
        ).length,
      ).toBeGreaterThan(12);
      for (const t of Object.values(s.tiles)) {
        const g = t.geography!;
        expect(g.region.startsWith(t.climate!)).toBe(true);
        if (g.downstream) {
          rivers++;
          expect(neighbors(t.id)).toContain(g.downstream);
          expect(elevationAt(s.seed, g.downstream)).toBeLessThan(
            elevationAt(s.seed, t.id),
          );
          expect(t.resource).toBe("water");
        }
        if (g.floodplain) {
          floodplains++;
          expect(
            neighbors(t.id).some(
              (n) =>
                !!geographyAt(s.seed, n).downstream ||
                geographyAt(s.seed, n).lake,
            ),
          ).toBe(true);
        }
        if (t.resource === "peaks") {
          peaks++;
          expect(canOccupy(t)).toBe(false);
        }
        if (g.pass) passes++;
      }
    }
    expect(forms.size).toBeGreaterThanOrEqual(8);
    expect(rivers).toBeGreaterThan(30);
    expect(floodplains).toBeGreaterThan(30);
    expect(peaks).toBeGreaterThan(0);
    expect(passes).toBeGreaterThan(0);
  });
  it("reserves geography independently of discovery order and leaves revealed ground unchanged", () => {
    const a = generateWorld("river-reveal", 125, true),
      b = structuredClone(a),
      old = structuredClone(a.tiles);
    const ids = Object.keys(a.tiles)
      .flatMap(neighbors)
      .filter((id) => !a.tiles[id]);
    addHexes(a, "river-reveal", ids);
    addHexes(b, "river-reveal", [...ids].reverse());
    for (const id of ids)
      expect(a.tiles[id].geography).toEqual(b.tiles[id].geography);
    for (const id of Object.keys(old)) expect(a.tiles[id]).toEqual(old[id]);
  });
  it("keeps old campaigns on their original generator and preserves compact geography saves", () => {
    const old = newGame("legacy-map", undefined, { geography: false });
    expect(old.geographyVersion).toBeUndefined();
    expect(deserialize(serializePacked(old))).toEqual(old);
    const s = started();
    const restored = deserialize(serializePacked(s));
    expect(restored).toEqual(s);
    assertInvariants(restored);
  });
  it("rejects corrupt fauna and unknown environmental states", () => {
    const s = started();
    s.tiles["0,0"].geography!.fauna = { gold: 999 };
    expect(() => deserialize(serializePacked(s))).toThrow(/Wildlife yields/);
  });
});
describe("seasonal geography and wildlife", () => {
  it("distinguishes snowmelt, monsoon and Mediterranean wet seasons", () => {
    expect(waterCalendar("cold")).toEqual([3, 2, 1, 0]);
    expect(waterCalendar("tropical")).toEqual([1, 3, 2, 0]);
    expect(waterCalendar("mediterranean")).toEqual([1, 0, 1, 3]);
    const t = tile("mountain-pass", "stone");
    t.geography!.pass = true;
    t.climate = "alpine";
    expect(passClosed(t, "winter", "normal")).toBe(true);
    expect(passClosed(t, "summer", "normal")).toBe(false);
    expect(environmentRisk(t, "summer")).toBe(0);
  });
  it("uses a shared regional forecast but retains individual ice draws", () => {
    const s = newGame("geo-weather");
    const values = Object.values(s.tiles);
    for (const t of values) {
      t.climate = "cold";
      t.geography!.region = "cold:shared";
    }
    syncSeasonSurfaces(s);
    expect(new Set(values.map((t) => t.geography!.weather)).size).toBe(1);
  });
  it("keeps forests productive without animals, empties wild plains and retains farms", () => {
    const forest = tile("hunting-forest", "hides");
    expect(tileYield(forest)).toEqual({ lumber: 2 });
    for (const season of SEASONS)
      expect(seasonalYield(forest, 0, season).lumber).toBeGreaterThanOrEqual(1);
    const plains = tile("steppe-plain", "hides");
    expect(tileYield(plains)).toEqual({});
    plains.geography!.fauna = { hides: 2, meat: 3 };
    expect(tileYield(plains)).toEqual({ hides: 2, meat: 3 });
    expect(tileYield(tile("pasture", "wool")).wool).toBe(2);
  });
  it("conserves every population through years of migration and changes locations", () => {
    const s = newGame("geo-alpha"),
      ids = s.wildlife!.map((w) => w.id),
      start = s.wildlife!.map((w) => w.tile);
    let moved = false;
    for (let r = 2; r <= 25; r++) {
      s.round = r;
      syncSeasonSurfaces(s);
      expect(s.wildlife!.map((w) => w.id)).toEqual(ids);
      moved ||= s.wildlife!.some((w, i) => w.tile !== start[i]);
      assertInvariants(s);
    }
    expect(moved).toBe(true);
  });
  it("cannot seed extra animals by syncing, saving or revealing the same hex again", () => {
    const s = newGame("geo-alpha"),
      before = structuredClone(s.wildlife);
    syncEnvironment(s);
    syncEnvironment(s);
    expect(s.wildlife).toEqual(before);
    const loaded = deserialize(serializePacked(s));
    syncEnvironment(loaded);
    expect(loaded.wildlife).toEqual(before);
  });
  it("keeps wildlife-dependent workshop choices valid when animals leave", () => {
    const t = tile("hunting-forest", "hides");
    expect(tileOptions(t)).toContain("hides");
    expect(tileOptions(t)).toContain("lumber");
    expect(tileOptions({ ...t, resource: "water", biome: "river" })).toContain(
      "fish",
    );
  });
  it("hunters collect only animal outputs across connected land within tier range", () => {
    const s = started(),
      home = ownTowns(s)[0],
      origin = s.vertices[home.vertex].tiles.find(
        (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
      )!;
    const t = s.tiles[origin];
    t.geography!.access = "normal";
    t.geography!.fauna = { hides: 2, meat: 3 };
    t.geography!.animals = ["bison"];
    const hunter = piece(s, origin, 0, "hunter", 3);
    expect(points(hunter)).toBe(2);
    expect(harvestTiles(s, hunter)).toContain(origin);
    const sources = productionSources(s).filter(
      (v) => v.tile === origin && v.owner === 0,
    );
    const withHunter = Object.fromEntries(
      GOODS.map((g) => [
        g,
        sources.filter((v) => v.good === g).reduce((n, v) => n + v.amount, 0),
      ]),
    );
    delete s.pieces[hunter.id];
    const without = productionSources(s).filter(
      (v) => v.tile === origin && v.owner === 0,
    );
    expect(
      withHunter.hides -
        without
          .filter((v) => v.good === "hides")
          .reduce((n, v) => n + v.amount, 0),
    ).toBe(6);
    expect(
      withHunter.meat -
        without
          .filter((v) => v.good === "meat")
          .reduce((n, v) => n + v.amount, 0),
    ).toBe(9);
  });
});
it("every geographic season and warm/cold closure has an installed terrain asset", () => {
  for (const biome of [
    "river",
    "lake",
    "shoal",
    "reef",
    "mountain-pass",
    "flood-wheat",
    "flood-rice",
    "flood-sorghum",
    "flood-meadow",
    "delta-gardens",
    "steppe-plain",
  ] as Biome[])
    for (const climate of CLIMATES)
      for (const season of SEASONS)
        for (const access of ["normal", "closed", "flooded"] as const) {
          const t = tile(biome, BIOME_INFO[biome].resource);
          t.climate = climate;
          t.geography!.access = access;
          const art = seasonalTerrainPattern(t, season);
          if (art.startsWith("geo-"))
            expect(
              existsSync(`public/assets/${terrainArtFile(art)}`),
              art,
            ).toBe(true);
        }
});
describe("geographic AI forecasts", () => {
  it("uses known safe fords but avoids the next season's closing crossing", () => {
    const s = started(),
      id = Object.keys(s.tiles)[0];
    Object.assign(s.tiles[id], tile("river", "water"), { id });
    const t = s.tiles[id];
    t.surface = "open";
    t.geography!.ford = true;
    t.geography!.access = "ford";
    t.geography!.waterway = "river";
    s.calendar = {
      startRound: 1,
      startSeason: "winter",
      roundsPerSeason: 2,
      iceModel: 2,
    };
    s.round = 1;
    expect(seasonalDestinationSafe(s, id, false)).toBe(true);
    s.round = 2;
    expect(seasonalDestinationSafe(s, id, false)).toBe(false);
  });
  it("forecasts a receding floodplain's coming harvest without changing terrain", () => {
    const s = started();
    s.calendar = {
      startRound: 1,
      startSeason: "spring",
      roundsPerSeason: 2,
      iceModel: 2,
    };
    s.round = 2;
    s.active = 4;
    s.phase = "economy";
    for (const t of Object.values(s.tiles)) {
      t.biome = "woods";
      t.resource = "lumber";
      delete t.surface;
      delete t.iceWeather;
      t.geography!.fauna = {};
      t.geography!.floodplain = false;
      t.geography!.access = "normal";
    }
    const home = ownTowns(s, 0)[0],
      id = s.vertices[home.vertex].tiles[0],
      t = s.tiles[id];
    Object.assign(t, {
      biome: "flood-wheat",
      resource: "grain",
      climate: "temperate",
    });
    t.geography!.floodplain = true;
    t.geography!.access = "flooded";
    const before = JSON.stringify(s);
    expect(projectedIncome(s, 0, 1).grain).toBeGreaterThan(0);
    expect(JSON.stringify(s)).toBe(before);
  });
  it("warm passes close with heavy rain instead of imposing temperate winter snow", () => {
    const t = tile("mountain-pass", "stone");
    t.geography!.pass = true;
    t.climate = "tropical";
    expect(passClosed(t, "winter", "normal")).toBe(false);
    expect(passClosed(t, "summer", "wet")).toBe(true);
  });
});
describe("crossings, local projects and ships", () => {
  it("allows deep-draft ships through shallows only with exactly one permanent land neighbor", () => {
    const t = tile("river", "water");
    t.surface = "open";
    const tiles: Game["tiles"] = { [t.id]: t };
    const adjacent = neighbors(t.id);
    for (let count = 0; count <= 6; count++) {
      adjacent.forEach((id, index) => {
        tiles[id] = {
          ...tile(),
          id,
          resource: index < count ? "lumber" : "water",
        };
      });
      for (const waterway of ["river", "shoal", "reef"] as const) {
        t.geography!.waterway = waterway;
        for (const kind of [
          "carrack",
          "convoy",
          "merchantship",
          "galley",
        ] as const)
          expect(pieceAccess(t, { naval: true, kind, tier: 4 }, tiles)).toBe(
            count === 1,
          );
        expect(canSail(t, "riverboat", 4, tiles)).toBe(true);
      }
      t.geography!.waterway = "deep";
      expect(canSail(t, "riverboat", 1, tiles)).toBe(true);
    }
    adjacent.forEach((id, index) => {
      tiles[id].resource = index === 0 ? "lumber" : "ice";
      tiles[id].surface = index === 0 ? undefined : "frozen";
    });
    t.geography!.waterway = "shoal";
    expect(canSail(t, "carrack", 4, tiles)).toBe(true);
    t.surface = "frozen";
    expect(canSail(t, "carrack", 4, tiles)).toBe(false);
    t.surface = "open";
    t.geography!.access = "closed";
    expect(canSail(t, "carrack", 4, tiles)).toBe(false);
    t.geography!.access = "flooded";
    expect(canSail(t, "carrack", 4, tiles)).toBe(false);
  });
  it("uses the coastal exception when recruiting deep-draft ships", () => {
    const s = started(),
      town = ownTowns(s)[0];
    const id = s.vertices[town.vertex].tiles[0];
    const t = s.tiles[id];
    t.resource = "water";
    t.biome = "river";
    t.surface = "open";
    t.geography!.waterway = "shoal";
    t.geography!.access = "normal";
    town.level = town.turnLevel = 4;
    const adjacent = neighbors(id).filter((id) => s.tiles[id]);
    adjacent.forEach((id, index) => {
      s.tiles[id].resource = index === 0 ? "stone" : "water";
    });
    const command = {
      type: "ship",
      town: town.id,
      tile: id,
      kind: "carrack",
      tier: 4,
    } as const;
    expect(canApplyCommand(s, command)).toBe(true);
    s.tiles[adjacent[1]].resource = "stone";
    expect(canApplyCommand(s, command)).toBe(false);
  });

  it("opens rivers only with ice, a low-water ford or a bridge; peaks never open", () => {
    const t = tile("river", "water");
    t.surface = "open";
    t.geography!.waterway = "river";
    expect(canOccupy(t)).toBe(false);
    t.geography!.access = "ford";
    expect(canOccupy(t)).toBe(true);
    t.geography!.access = "normal";
    t.geography!.projects = { bridge: { owner: 0, born: 1 } };
    expect(canOccupy(t)).toBe(true);
    t.resource = "peaks";
    expect(canOccupy(t)).toBe(false);
  });
  it("excludes deep-draft warships from rivers, reefs and shoals at recruitment and movement", () => {
    for (const waterway of ["river", "reef", "shoal"] as const) {
      const t = tile("river", "water");
      t.geography!.waterway = waterway;
      expect(canSail(t, "riverboat", 4)).toBe(true);
      expect(canSail(t, "carrack", 4)).toBe(false);
      expect(canSail(t, "galley", 2)).toBe(true);
      expect(canSail(t, "galley", 3)).toBe(false);
    }
    const s = started(),
      t = ownTowns(s)[0],
      id = s.vertices[t.vertex].tiles[0];
    s.tiles[id].resource = "water";
    s.tiles[id].biome = "river";
    s.tiles[id].surface = "open";
    s.tiles[id].geography!.waterway = "river";
    s.tiles[id].geography!.access = "normal";
    t.level = t.turnLevel = 4;
    const before = JSON.stringify(s);
    expect(
      applyCommand(s, {
        type: "ship",
        town: t.id,
        tile: id,
        kind: "carrack",
        tier: 4,
      }).ok,
    ).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
    expect(
      applyCommand(s, {
        type: "ship",
        town: t.id,
        tile: id,
        kind: "riverboat",
        tier: 4,
      }).ok,
    ).toBe(true);
  });
  it("constructs improvements transactionally, caps spread scheduling and protects food only from raids", () => {
    let s = started(),
      t = ownTowns(s)[0],
      id = s.vertices[t.vertex].tiles.find(
        (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
      )!;
    const hex = s.tiles[id];
    hex.geography!.access = "normal";
    hex.resource = "grain";
    hex.biome = "flood-wheat";
    hex.geography!.floodplain = true;
    const before = JSON.stringify(s);
    s = run(s, { type: "project", tile: id, kind: "irrigation" });
    expect(before).not.toBe(JSON.stringify(s));
    expect(hex.geography!.projects).toBeUndefined();
    s = run(s, { type: "harvest-mode", tile: id, mode: "spread" });
    expect(s.tiles[id].geography!.harvestMode).toBeUndefined();
    expect(
      applyCommand(s, { type: "harvest-mode", tile: id, mode: "spread" }).ok,
    ).toBe(false);
    s = run(s, { type: "project", tile: id, kind: "granary" });
    t = ownTowns(s)[0];
    t.level = 3;
    t.stock = { grain: 10, fish: 10, meat: 10, gold: 50 };
    expect(protectedFood(s, t)).toEqual({ grain: 10, fish: 10, meat: 4 });
    const crop = s.tiles[id];
    crop.geography!.harvestMode = "spread";
    const p = seasonalProfile(crop);
    expect(SEASONS.map((season) => p[season].grain)).toEqual([4, 4, 4, 4]);
  });
  it("blocks flooded production and restores it with a levee without changing resources", () => {
    const t = tile("flood-rice", "grain");
    t.geography!.access = "flooded";
    t.geography!.floodplain = true;
    expect(seasonalYield(t, 0, "autumn")).toEqual({});
    t.geography!.projects = { levee: { owner: 0, born: 1 } };
    expect(seasonalYield(t, 0, "autumn").grain).toBeGreaterThan(0);
  });
  it("planning geography orders and turn boundaries never mutates the live campaign", () => {
    const s = started(),
      town = ownTowns(s)[0],
      id = s.vertices[town.vertex].tiles.find(
        (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
      )!;
    Object.assign(s.tiles[id], { resource: "grain", biome: "flood-wheat" });
    s.tiles[id].geography!.floodplain = true;
    const before = JSON.stringify(s);
    expect(
      canApplyCommand(s, { type: "project", tile: id, kind: "irrigation" }),
    ).toBe(true);
    canApplyCommand(s, { type: "end-turn" });
    expect(JSON.stringify(s)).toBe(before);
    s.active = 1;
    s.players[1].turns = 2;
    const unit = piece(s, id, 1, "heavy", 1);
    s.pieces[unit.id] = unit;
    const snapshot = JSON.stringify(s);
    const command = { type: "sabotage", tile: id, ids: [unit.id] };
    expect(canApplyCommand(s, command)).toBe(true);
    expect(applyCommand(s, command).ok).toBe(true);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
  it("evacuates an army when its floodplain or mountain pass closes", () => {
    for (const mode of ["flooded", "closed"] as const) {
      const s = started();
      s.pieces = {};
      const a = Object.values(s.tiles).find(
        (t) =>
          !["water", "ice", "peaks"].includes(t.resource) &&
          neighbors(t.id).some(
            (id) =>
              s.tiles[id] &&
              canOccupy(s.tiles[id]) &&
              !["water", "ice"].includes(s.tiles[id].resource),
          ),
      )!;
      const prior = Object.values(s.tiles)
        .filter((t) => canOccupy(t))
        .map((t) => t.id);
      const army = piece(s, a.id, 0, "heavy", 4);
      a.geography!.access = mode;
      army.seasonStatus = "adrift";
      startThawRetreats(s, prior);
      expect(army.tile).not.toBe(a.id);
      expect(canOccupy(s.tiles[army.tile])).toBe(true);
      expect(army.seasonStatus).toBeUndefined();
    }
  });
  it("strands shallow ships when a levee dries flooded ground and preserves full-strength land escorts", () => {
    let s = started();
    s.pieces = {};
    const town = ownTowns(s)[0],
      id = s.vertices[town.vertex].tiles.find(
        (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
      )!;
    const t = s.tiles[id];
    t.geography!.floodplain = true;
    t.geography!.access = "flooded";
    const ship = piece(s, id, 0, "riverboat", 4);
    s = run(s, { type: "project", tile: id, kind: "levee" });
    expect(s.pieces[ship.id].seasonStatus).toBe("icebound");
    expect(power(s, [s.pieces[ship.id]], id)).toBe(2);
    const guard = piece(s, id, 0, "light", 4);
    expect(fleetDefenders(s, id, 1).map((u) => u.id)).toContain(guard.id);
  });
  it("a harbor grants one first-turn movement bonus without recurring stacking", () => {
    let s = started();
    const home = ownTowns(s)[0],
      id = s.vertices[home.vertex].tiles[0],
      t = s.tiles[id];
    Object.assign(t, { resource: "water", biome: "river", surface: "open" });
    Object.assign(t.geography!, { waterway: "river", access: "normal" });
    s = run(s, { type: "project", tile: id, kind: "harbor" });
    s = run(s, {
      type: "ship",
      town: home.id,
      tile: id,
      kind: "riverboat",
      tier: 1,
    });
    const ship = Object.values(s.pieces).find((u) => u.kind === "riverboat")!;
    expect(ship.harborBoost).toBe(true);
    beginTurn(s);
    expect(ship.bonus).toBe(1);
    expect(ship.harborBoost).toBeUndefined();
    beginTurn(s);
    expect(ship.bonus).toBe(0);
  });
  it("thermal springs open ordinary adjacent water but preserve permanent glacial pack ice", () => {
    const s = started(),
      land = Object.values(s.tiles).find(
        (t) => neighbors(t.id).filter((id) => s.tiles[id]).length === 6,
      )!;
    land.geography!.landmark = "thermal-spring";
    const [a, b] = neighbors(land.id).map((id) => s.tiles[id]);
    Object.assign(a, {
      resource: "water",
      biome: "water",
      surface: "frozen",
      climate: "glacial",
    });
    Object.assign(b, {
      resource: "ice",
      biome: "ice",
      surface: "frozen",
      climate: "glacial",
    });
    syncEnvironment(s);
    expect(a.surface).toBe("open");
    expect(b.surface).toBe("frozen");
  });
  it("AI considers levees and irrigation where they protect an established economy", () => {
    const s = started(),
      t = ownTowns(s)[0],
      id = s.vertices[t.vertex].tiles.find(
        (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
      )!;
    Object.assign(s.tiles[id], { resource: "grain", biome: "flood-wheat" });
    s.tiles[id].geography!.floodplain = true;
    t.level = t.turnLevel = 4;
    const plans = withPlanningFrame(s, () => economyProjects(s));
    expect(
      plans.some(
        (p) =>
          p.action.type === "project" &&
          p.action.kind === "levee" &&
          p.action.tile === id,
      ),
    ).toBe(true);
    expect(
      plans.some(
        (p) =>
          p.action.type === "project" &&
          p.action.kind === "irrigation" &&
          p.action.tile === id,
      ),
    ).toBe(true);
  });
});
