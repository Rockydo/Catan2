import { expect, it } from "vitest";
import { snapshotDelta, applySnapshotDelta } from "../src/game/snapshot-delta";
import { AISession } from "../src/game/ai-session";
import { funded, piece, run } from "./helpers";
import { ownTowns } from "../src/game/selectors";
import { addHexes, neighbors } from "../src/game/world";
import type { Game } from "../src/game/types";

function roundTrip(before: Game, after: Game) {
  const unchanged = JSON.stringify(before);
  const delta = structuredClone(snapshotDelta(before, after));
  const result = applySnapshotDelta(before, delta);
  expect(result).toStrictEqual(after);
  expect(JSON.stringify(result)).toBe(JSON.stringify(after));
  expect(JSON.stringify(before)).toBe(unchanged);
  return { delta, result };
}
it("sends only changed warehouses for a trade, retaining every unchanged layer and town", () => {
  const s = funded(),
    other = ownTowns(s, 1)[0];
  const next = run(s, { type: "bank", give: { gold: 1 }, take: { grain: 1 } });
  const { delta, result } = roundTrip(s, next);
  expect(delta.records.pieces).toBeUndefined();
  expect(delta.records.tiles).toBeUndefined();
  expect(result.pieces).toBe(s.pieces);
  expect(result.tiles).toBe(s.tiles);
  expect(result.towns[other.id]).toBe(other);
  expect(Object.keys(delta.records.towns!.values)).not.toContain(other.id);
});
it("preserves inserted/deleted records, record iteration order and absent versus undefined fields", () => {
  const s = funded();
  const u = piece(s, "0,0"),
    v = piece(s, "0,0");
  const next = structuredClone(s);
  delete next.pieces[u.id];
  next.pieces[u.id] = structuredClone(u);
  delete next.pieces[v.id];
  piece(next, "0,0");
  next.players[0].bonuses.discount = undefined;
  next.productionSupport = undefined;
  delete next.towerSieges;
  const { result } = roundTrip(s, next);
  expect(Object.keys(result.pieces)).toEqual(Object.keys(next.pieces));
  expect(Object.hasOwn(result, "productionSupport")).toBe(true);
  expect(Object.hasOwn(result, "towerSieges")).toBe(false);
});
it("includes world expansion, climate choices, freezing, diplomacy and removed optional maps", () => {
  const s = funded();
  const u = piece(s, "0,0");
  const mutations = [
    (n: Game) => {
      addHexes(n, n.seed, Object.keys(n.tiles).flatMap(neighbors));
    },
    (n: Game) => {
      n.tiles["0,0"].woodsChoices = { 0: "hides" };
      n.tiles["0,0"].surface = "frozen";
    },
    (n: Game) => {
      n.pieces[u.id].moved = 2;
      ownTowns(n)[0].owner = 1;
    },
    (n: Game) => {
      n.alliances = [{ id: "a1", members: [0, 1], threat: 2, lockedUntil: 5 }];
    },
    (n: Game) => {
      delete n.climatePlan;
      delete n.calendar;
      delete n.towerSieges;
    },
  ];
  for (const change of mutations) {
    const next = structuredClone(s);
    change(next);
    roundTrip(s, next);
  }
});
it("continued worker requests and full resynchronization have the exact engine outcomes", () => {
  const s = funded();
  s.players[0].control = "standard";
  const session = new AISession();
  let visible = s;
  let reply = session.handle(
    { request: 1, state: structuredClone(s), delta: true },
    () => 0,
  );
  for (let request = 1; request <= 3; request++) {
    expect(reply.error).toBeUndefined();
    expect(reply.delta).toBeDefined();
    let expected = visible;
    for (const command of reply.commands!) expected = run(expected, command);
    const actual = applySnapshotDelta(visible, structuredClone(reply.delta!));
    expect(actual).toEqual(expected);
    expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
    visible = actual;
    if (request < 3)
      reply = session.handle(
        { request: request + 1, baseRequest: request, delta: true },
        () => 0,
      );
  }
  expect(session.handle({ request: 4, baseRequest: 999, delta: true })).toEqual(
    { request: 4, resync: true },
  );
  // A new campaign has the same counters but unrelated content. It replaces
  // the retained position instead of borrowing that position's records.
  const other = funded("resynchronized");
  other.players[0].control = "standard";
  const resynced = session.handle(
    { request: 5, state: other, delta: true },
    () => 0,
  );
  let expected = other;
  for (const c of resynced.commands!) expected = run(expected, c);
  expect(applySnapshotDelta(other, resynced.delta!)).toEqual(expected);
});
