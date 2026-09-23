import { expect, it, vi } from "vitest";
import {
  applyCommand,
  applyCommandPlan,
  eliminate,
  execute,
} from "../src/game/engine";
import { breakSieges } from "../src/game/military";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { pruneAlliances } from "../src/game/diplomacy";
import {
  allPieces,
  income,
  inventory,
  moveTargets,
  piecesAt,
  productionSignature,
  withPlanningFrame,
} from "../src/game/selectors";
import { factionStrengths } from "../src/game/ai-strategy";
import { defaultCoverage, harvestTiles } from "../src/game/maritime";
import type { Command, Game } from "../src/game/types";
import { allianceFixture } from "./alliance-fixture";
import { piece, run } from "./helpers";
import { maritimeFixture } from "./maritime-fixture";

// Compare the optimized post-order scope with the original independent reads.
// This deliberately starts a new index for every cleanup operation.
function compare(s: Game, command: Command) {
  const original = JSON.stringify(s),
    expected = structuredClone(s);
  if (expected.phase === "military") expected.phase = "economy";
  expected.actions++;
  execute(expected, command);
  breakSieges(expected);
  eliminate(expected);
  syncEmergencyCoalition(expected);
  const actual = applyCommand(s, command);
  expect(actual.ok, actual.error).toBe(true);
  expect(JSON.stringify(actual.state)).toBe(JSON.stringify(expected));
  expect(JSON.stringify(s)).toBe(original);
  return actual.state;
}

it("keeps exact cleanup and coalition results after spending, upgrades and bulk recruitment", () => {
  let { s, towns } = allianceFixture();
  const home = towns[0];
  const commands: Command[] = [
    { type: "bank", give: { gold: 1 }, take: { lumber: 1 } },
    { type: "wall", town: home.id },
    { type: "city", town: home.id },
    { type: "recruit", town: home.id, tile: "-2,0", kind: "heavy", count: 100 },
    { type: "bank", give: { gold: 1 }, take: { ore: 1 } },
  ];
  for (const command of commands) s = compare(s, command);
  expect(s.alliances?.[0]).toMatchObject({ emergency: "locked", threat: 0 });
});

it("reads arriving guards before breaking town and watchtower sieges", () => {
  const { s, towns } = allianceFixture();
  s.pieces = {};
  const home = towns[0],
    attacker = piece(
      s,
      s.vertices[home.vertex].tiles.find((id) => id !== "-2,0")!,
      1,
    ),
    guard = piece(s, "-4,0", 0, "cavalry");
  s.sieges = {
    home: { owner: 1, town: home.id, progress: 1, last: 9, raided: null },
  };
  s.towers[home.vertex] = {
    id: "tower-test",
    vertex: home.vertex,
    owner: 0,
    tier: 2,
  };
  s.towerSieges = {
    home: {
      owner: 1,
      tower: "tower-test",
      vertex: home.vertex,
      progress: 0,
      last: 9,
      units: [attacker.id],
    },
  };
  const next = compare(s, { type: "move", ids: [guard.id], to: "-2,0" });
  expect(next.sieges).toEqual({});
  expect(next.towerSieges).toEqual({});
});

it("rebuilds after elimination instead of retaining the removed faction's forces or withdrawal rights", () => {
  const { s, towns } = allianceFixture();
  delete s.towns[towns[2].id];
  for (let i = 0; i < 100; i++) piece(s, "0,0", 2, "heavy", 4);
  piece(s, "0,0", 0);
  s.withdrawals = [{ tile: "0,0", owners: [0, 2] }];
  const next = compare(s, {
    type: "bank",
    give: { gold: 1 },
    take: { lumber: 1 },
  });
  expect(next.players[2].alive).toBe(false);
  expect(Object.values(next.pieces).some((unit) => unit.owner === 2)).toBe(
    false,
  );
  expect(next.withdrawals).toEqual([]);
  expect(
    next.alliances?.some((alliance) => alliance.members.includes(2)),
  ).not.toBe(true);
});

it("withdrawal checks ignore embarked troops and reuse current occupation reads", () => {
  const { s } = allianceFixture();
  s.pieces = {};
  piece(s, "0,0", 0);
  const second = piece(s, "0,0", 1);
  s.withdrawals = [{ tile: "0,0", owners: [0, 1] }];
  withPlanningFrame(s, () => {
    allPieces(s);
    pruneAlliances(s);
    expect(s.withdrawals).toHaveLength(1);
  });
  second.carrier = "transport";
  pruneAlliances(s);
  expect(s.withdrawals).toEqual([]);
});

it("indexes troops only once for final siege and coalition cleanup after peaceful movement", () => {
  const { s, enemy } = maritimeFixture();
  const moving = piece(s, "-3,0", 0, "cavalry");
  piece(s, "3,0", 0);
  for (let i = 0; i < 2000; i++) piece(s, "-4,0", 0);
  s.sieges.active = {
    owner: 0,
    town: enemy.id,
    progress: 1,
    last: 9,
    raided: null,
  };
  // Form any emergency coalition before the measured order. A new treaty
  // correctly requires another siege check against its changed friendships.
  syncEmergencyCoalition(s);
  const spy = vi.spyOn(Object, "keys");
  let result: ReturnType<typeof applyCommand>, scans: number;
  try {
    result = applyCommand(s, { type: "move", ids: [moving.id], to: "-2,0" });
    scans = spy.mock.calls.filter(
      ([value]) => value === result.state.pieces,
    ).length;
  } finally {
    spy.mockRestore();
  }
  expect(result.ok, result.error).toBe(true);
  expect(result.state.sieges.active).toEqual(s.sieges.active);
  // One troop list for validation and cleanup; location indexes are fresh.
  expect(scans).toBe(1);
});

it("withdrawal breaks town and tower sieges with the same ordered notifications", () => {
  const { s, enemy } = maritimeFixture();
  const unit = piece(s, "3,0", 0, "cavalry");
  s.sieges.active = {
    owner: 0,
    town: enemy.id,
    progress: 1,
    last: 9,
    raided: null,
  };
  s.towers[enemy.vertex] = {
    id: "tower-test",
    vertex: enemy.vertex,
    owner: 1,
    tier: 2,
  };
  s.towerSieges = {
    active: {
      owner: 0,
      tower: "tower-test",
      vertex: enemy.vertex,
      progress: 0,
      last: 9,
      units: [unit.id],
    },
  };
  const to = Object.keys(moveTargets(s, [unit.id])).find(
    (tile) => !s.vertices[enemy.vertex].tiles.includes(tile),
  )!;
  const next = compare(s, { type: "move", ids: [unit.id], to });
  expect(next.sieges).toEqual({});
  expect(next.towerSieges).toEqual({});
});

it.each(["tied", "decisive", "civilian"] as const)(
  "%s combat preserves intermediate siege cleanup and complete battle state",
  (outcome) => {
    const { s, enemy } = maritimeFixture();
    const attacker = piece(
      s,
      "2,0",
      0,
      "cavalry",
      outcome === "decisive" ? 4 : 1,
    );
    piece(s, "3,0", 1, outcome === "civilian" ? "merchant" : "cavalry");
    piece(s, "2,0", 0, "merchant");
    s.sieges.active = {
      owner: 0,
      town: enemy.id,
      progress: 1,
      last: 9,
      raided: null,
    };
    const command: Command = { type: "move", ids: [attacker.id], to: "3,0" };
    const next = compare(s, command);
    const expectedReads = decisionReads(next);
    const batch = applyCommandPlan(s, (view, done) => {
      decisionReads(view);
      if (!done.length) return command;
      expect(decisionReads(view)).toEqual(expectedReads);
      expect(JSON.stringify(view)).toBe(JSON.stringify(next));
      return undefined;
    });
    expect(batch.ok, batch.error).toBe(true);
    expect(!!next.battle).toBe(outcome === "decisive");
    if (outcome === "civilian") {
      expect(next.pieces[attacker.id].tile).toBe("3,0");
      expect(next.sieges.active).toBeDefined();
    } else expect(next.sieges).toEqual({});
  },
);

it("landed defenders break sieges immediately with unchanged cleanup and coalition results", () => {
  const { s, enemy } = maritimeFixture();
  s.active = 1;
  s.tiles["2,0"].resource = "water";
  const ship = piece(s, "2,0", 1, "transport");
  const guard = piece(s, "2,0", 1);
  guard.carrier = ship.id;
  const adjacent = s.vertices[enemy.vertex].tiles.find(
    (tile) => tile !== "3,0" && tile !== "2,0",
  )!;
  piece(s, adjacent, 0);
  s.sieges.active = {
    owner: 0,
    town: enemy.id,
    progress: 1,
    last: 9,
    raided: null,
  };
  const next = compare(s, { type: "unload", ships: [ship.id], to: "3,0" });
  expect(next.sieges).toEqual({});
  expect(next.pieces[guard.id].carrier).toBeUndefined();
});

function decisionReads(s: Game) {
  return {
    production: productionSignature(s),
    collectorAreas: Object.keys(s.tiles).map((tile) => [
      defaultCoverage(s, { tile, tier: 4 }),
      ...(["merchant", "merchantship", "fishing"] as const).map((kind) =>
        harvestTiles(s, { tile, tier: 4, kind }),
      ),
    ]),
    forces: allPieces(s),
    strengths: factionStrengths(s),
    factions: s.players.map((p) => ({
      stock: inventory(s, p.id),
      income: income(s, p.id),
    })),
    occupied: Object.keys(s.tiles).map((id) => piecesAt(s, id)),
  };
}

function comparePlan(s: Game, commands: Command[]) {
  const before = JSON.stringify(s),
    positions = [structuredClone(s)];
  for (const command of commands)
    positions.push(run(positions.at(-1)!, command));
  const expectedReads = positions.map(decisionReads);
  const actual = applyCommandPlan(s, (view, done) => {
    expect(JSON.stringify(view)).toBe(JSON.stringify(positions[done.length]));
    expect(decisionReads(view)).toEqual(expectedReads[done.length]);
    expect(done).toEqual(commands.slice(0, done.length));
    return commands[done.length];
  });
  expect(actual.ok, actual.error).toBe(true);
  expect(JSON.stringify(actual.state)).toBe(JSON.stringify(positions.at(-1)));
  expect(JSON.stringify(s)).toBe(before);
  return actual;
}

it("shares finished cleanup's troop index with the next decision, but rebuilds it after another move", () => {
  const { s, enemy } = maritimeFixture();
  const moving = piece(s, "-3,0", 0, "cavalry");
  piece(s, "3,0", 0);
  for (let i = 0; i < 2000; i++) piece(s, "-4,0", 0);
  s.sieges.active = {
    owner: 0,
    town: enemy.id,
    progress: 1,
    last: 9,
    raided: null,
  };
  syncEmergencyCoalition(s);
  const commands: Command[] = [
    { type: "move", ids: [moving.id], to: "-2,0" },
    { type: "move", ids: [moving.id], to: "-1,0" },
  ];
  const before = JSON.stringify(s),
    expected = commands.reduce((state, command) => run(state, command), s);
  const spy = vi.spyOn(Object, "keys");
  let result: ReturnType<typeof applyCommandPlan>, scans: number;
  try {
    result = applyCommandPlan(s, (view, done) => {
      allPieces(view);
      expect(piecesAt(view, `${-3 + done.length},0`)).toEqual([
        view.pieces[moving.id],
      ]);
      return commands[done.length];
    });
    scans = spy.mock.calls.filter(
      ([value]) => value === result.state.pieces,
    ).length;
  } finally {
    spy.mockRestore();
  }
  expect(result.ok, result.error).toBe(true);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  expect(JSON.stringify(s)).toBe(before);
  // The initial decision enumerates once. Both movement validations retain
  // the ordered records with refreshed copies and fresh derived indexes.
  // The next decision shares those current reads. Previously this took three.
  expect(scans).toBe(1);
});

it("next decisions see current stores, new recruits and a coalition formed during cleanup", () => {
  const { s, towns } = allianceFixture();
  const home = towns[0];
  const result = comparePlan(s, [
    { type: "bank", give: { gold: 1 }, take: { lumber: 1 } },
    { type: "wall", town: home.id },
    { type: "city", town: home.id },
    { type: "recruit", town: home.id, tile: "-2,0", kind: "heavy", count: 100 },
    { type: "bank", give: { gold: 1 }, take: { ore: 1 } },
  ]);
  expect(result.state.alliances?.[0]).toMatchObject({
    emergency: "locked",
    threat: 0,
  });
});

it("decisions after elimination cannot retain the removed troops, alliances or withdrawal rights", () => {
  const { s, towns } = allianceFixture();
  delete s.towns[towns[2].id];
  for (let i = 0; i < 100; i++) piece(s, "0,0", 2, "heavy", 4);
  piece(s, "0,0", 0);
  s.withdrawals = [{ tile: "0,0", owners: [0, 2] }];
  const result = comparePlan(s, [
    { type: "bank", give: { gold: 1 }, take: { lumber: 1 } },
    { type: "bank", give: { gold: 1 }, take: { ore: 1 } },
  ]);
  expect(result.state.players[2].alive).toBe(false);
  expect(allPieces(result.state).some((unit) => unit.owner === 2)).toBe(false);
  expect(result.state.withdrawals).toEqual([]);
});

it("reads refreshed forces, changed sea surfaces and dice production after a season boundary", () => {
  const { s } = maritimeFixture();
  s.active = 1;
  s.calendar = { startRound: 1, startSeason: "spring", roundsPerSeason: 2 };
  s.round = 2;
  Object.assign(s.tiles["1,0"], {
    resource: "water",
    climate: "cold",
    biome: "fish",
    fish: true,
    surface: "frozen",
  });
  const ship = piece(s, "1,0", 0, "merchantship", 3);
  ship.moved = 1;
  ship.acted = true;
  const result = comparePlan(s, [
    { type: "end-turn" },
    { type: "roll" },
    { type: "bank", give: { gold: 1 }, take: { ore: 1 } },
  ]);
  expect(result.state.round).toBe(3);
  expect(result.state.tiles["1,0"].surface).toBe("open");
  expect(result.state.pieces[ship.id].moved).toBe(0);
  expect(result.state.pieces[ship.id].acted).toBe(false);
});

it("long plans keep a bounded execution stack and restore surrounding read scopes", () => {
  const { s, home } = maritimeFixture();
  home.stock.gold = 5000;
  const count = 4096,
    before = JSON.stringify(s),
    command: Command = { type: "bank", give: { gold: 1 }, take: { grain: 1 } };
  let decisions = 0;
  withPlanningFrame(s, () => {
    const initial = allPieces(s),
      stock = inventory(s);
    const result = applyCommandPlan(s, (view, done) => {
      decisions++;
      expect(inventory(view).gold).toBe(stock.gold! - done.length);
      return done.length < count ? command : undefined;
    });
    expect(result.ok, result.error).toBe(true);
    expect(result.commands).toHaveLength(count);
    expect(result.state.actions).toBe(s.actions + count);
    expect(allPieces(s)).toBe(initial);
    expect(inventory(s)).toEqual(stock);
    // Errors in a resumed selection also unwind both read scopes and roll back.
    const failed = applyCommandPlan(s, (view, done) => {
      allPieces(view);
      if (done.length) throw Error("selection interrupted");
      return command;
    });
    expect(failed.ok).toBe(false);
    expect(failed.error).toBe("selection interrupted");
    expect(failed.state).toBe(s);
    expect(failed.commands).toEqual([]);
    expect(allPieces(s)).toBe(initial);
    expect(inventory(s)).toEqual(stock);
  });
  expect(decisions).toBe(count + 1);
  expect(JSON.stringify(s)).toBe(before);
});

it.each(["merchant", "merchantship", "fishing"] as const)(
  "%s movement refreshes production and coverage, including embarked collectors",
  (kind) => {
    const { s } = maritimeFixture();
    const naval = kind !== "merchant";
    if (naval)
      for (const id of ["0,0", "1,0"])
        Object.assign(s.tiles[id], { resource: "water", fish: true });
    const unit = piece(s, "0,0", 0, kind, 3);
    unit.coverage = ["0,1"];
    if (naval) {
      // Merchant hulls have no berths; a convoy carries the dependent troops.
      const carrier = piece(s, "0,0", 0, "convoy", 4);
      const passenger = piece(s, "0,0", 0, "merchant", 4);
      passenger.carrier = carrier.id;
      passenger.coverage = ["0,1"];
    }
    const selected = Object.values(s.pieces).filter((u) => !u.carrier);
    const command: Command = {
      type: "move",
      ids: selected.map((u) => u.id),
      to: "1,0",
    };
    const expected = compare(s, command);
    const expectedReads = decisionReads(expected);
    const result = applyCommandPlan(s, (view, done) => {
      decisionReads(view); // Prime every index before the movement.
      if (!done.length) return command;
      expect(decisionReads(view)).toEqual(expectedReads);
      expect(JSON.stringify(view)).toBe(JSON.stringify(expected));
      expect(view.pieces[unit.id].coverage).toBeUndefined();
      expect(piecesAt(view, "0,0")).toEqual([]);
      expect(Object.values(view.pieces).every((u) => u.tile === "1,0")).toBe(
        true,
      );
      return undefined;
    });
    expect(result.ok, result.error).toBe(true);
  },
);

it("movement cleanup drops the retained list before eliminating a faction", () => {
  const { s, towns } = allianceFixture();
  s.pieces = {};
  delete s.towns[towns[2].id];
  const eliminated = piece(s, "3,0", 2, "cavalry", 4);
  const mover = piece(s, "-4,0", 0, "cavalry");
  const command: Command = { type: "move", ids: [mover.id], to: "-3,0" };
  const expected = compare(s, command);
  const expectedReads = decisionReads(expected);
  const result = applyCommandPlan(s, (view, done) => {
    if (!done.length) return command;
    expect(decisionReads(view)).toEqual(expectedReads);
    expect(view.pieces[eliminated.id]).toBeUndefined();
    expect(JSON.stringify(view)).toBe(JSON.stringify(expected));
    return undefined;
  });
  expect(result.ok, result.error).toBe(true);
});

it("keeps copied troop references current through repeated moves and intervening recruitment", () => {
  const { s, home } = maritimeFixture();
  const a = piece(s, "0,0", 0, "cavalry", 4),
    b = piece(s, "0,0", 0, "cavalry", 4);
  // Original dictionary order is significant to both decisions and casualties.
  delete s.pieces[a.id];
  s.pieces[a.id] = a;
  const result = comparePlan(s, [
    { type: "move", ids: [a.id], to: "1,0" },
    { type: "recruit", town: home.id, tile: "0,0", kind: "heavy", count: 4 },
    { type: "move", ids: [b.id], to: "1,0" },
    { type: "move", ids: [a.id, b.id], to: "2,0" },
    { type: "move", ids: [a.id], to: "3,0" },
  ]);
  expect(allPieces(result.state)).toHaveLength(6);
  expect(Object.keys(result.state.pieces).slice(0, 2)).toEqual([b.id, a.id]);
  expect(result.state.pieces[a.id].moved).toBe(3);
  expect(result.state.pieces[b.id].moved).toBe(2);
  expect(s.pieces[a.id].moved).toBe(0);
});
it("refreshes troop lists when another transport boards or lands between fleet moves", () => {
  const { s } = maritimeFixture();
  for (const id of ["0,0", "1,0"]) s.tiles[id].resource = "water";
  const moving = piece(s, "0,0", 0, "convoy", 4),
    boarding = piece(s, "0,0", 0, "convoy", 4),
    landing = piece(s, "1,0", 0, "convoy", 4),
    traveler = piece(s, "0,0", 0, "merchant", 4),
    recruit = piece(s, "-1,0", 0, "cavalry", 4),
    arriving = piece(s, "1,0", 0, "heavy", 4);
  traveler.carrier = moving.id;
  arriving.carrier = landing.id;
  const result = comparePlan(s, [
    { type: "move", ids: [moving.id], to: "1,0" },
    { type: "load", ids: [recruit.id], ships: [boarding.id] },
    { type: "unload", ships: [landing.id], to: "2,0" },
    { type: "move", ids: [moving.id], to: "0,0" },
    { type: "move", ids: [moving.id], to: "1,0" },
  ]);
  expect(result.state.pieces[traveler.id].tile).toBe("1,0");
  expect(result.state.pieces[recruit.id].carrier).toBe(boarding.id);
  expect(result.state.pieces[arriving.id].tile).toBe("2,0");
  expect(result.state.pieces[arriving.id].carrier).toBeUndefined();
  expect(s.pieces[recruit.id].tile).toBe("-1,0");
});
it("abandons borrowed membership after combat removes civilian defenders", () => {
  const { s } = maritimeFixture();
  const attacker = piece(s, "0,0", 0, "cavalry", 4),
    civilian = piece(s, "1,0", 1, "merchant", 2);
  const result = comparePlan(s, [
    { type: "move", ids: [attacker.id], to: "1,0" },
    { type: "move", ids: [attacker.id], to: "2,0" },
  ]);
  expect(result.state.pieces[civilian.id]).toBeUndefined();
  expect(result.state.pieces[attacker.id].tile).toBe("2,0");
  expect(s.pieces[civilian.id]).toBe(civilian);
});

it("refreshes terrain fingerprints after detaching a batch for repeated Woods choices", () => {
  const { s, home } = maritimeFixture();
  const [first, second] = s.vertices[home.vertex].tiles;
  for (const id of [first, second])
    Object.assign(s.tiles[id], {
      resource: "lumber",
      biome: "woods",
      climate: "temperate",
    });
  const result = comparePlan(s, [
    { type: "bank", give: { gold: 1 }, take: { lumber: 1 } },
    { type: "woods-choice", tile: first, kind: "hides" },
    { type: "bank", give: { gold: 1 }, take: { ore: 1 } },
    { type: "woods-choice", tile: second, kind: "hides" },
    { type: "woods-choice", tile: first, kind: "lumber" },
  ]);
  expect(result.state.tiles[first].woodsChoices?.[0]).toBe("lumber");
  expect(result.state.tiles[second].woodsChoices?.[0]).toBe("hides");
  expect(s.tiles[first].woodsChoices).toBeUndefined();
});
