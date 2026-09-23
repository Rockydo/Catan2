import { expect, it, vi } from "vitest";
import { factionStrengthDetails } from "../src/game/ai-strategy";
import { applyCommand } from "../src/game/engine";
import {
  allPieces,
  hostileAt,
  inventory,
  movementOccupationKeys,
  ownPieces,
  ownTowns,
  passengersOn,
  pieceCompositionValue,
  piecePlanningValue,
  piecesAt,
  planningValue,
  prepareGameView,
  preparePatchedGameView,
  productionSources,
  retainPieceRead,
  withPlanningFrame,
} from "../src/game/selectors";
import { applySnapshotDelta, snapshotDelta } from "../src/game/snapshot-delta";
import { applyPublishedDelta } from "../src/game/published-delta";
import type { Game } from "../src/game/types";
import { piece } from "./helpers";
import { fishingFixture } from "./maritime-fixture";

function freeze(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}
function fixture() {
  const f = fishingFixture();
  const ship = piece(f.s, f.water, 0, "convoy", 3);
  piece(f.s, f.water, 0).carrier = ship.id;
  piece(f.s, f.water, 0, "fishing", 4);
  piece(f.s, f.water, 1, "galley", 2);
  piece(f.s, "0,1", 0, "merchant", 3).coverage = ["1,1", "1,0"];
  piece(f.s, "0,1", 1, "heavy", 4);
  return { ...f, ship };
}
function readings(s: Game) {
  return {
    units: allPieces(s),
    occupation: movementOccupationKeys(s),
    sources: productionSources(s),
    forces: factionStrengthDetails(s),
    owners: s.players.map((p) => ({
      stock: inventory(s, p.id),
      towns: ownTowns(s, p.id),
      units: ownPieces(s, p.id),
    })),
    passengers: passengersOn(s, Object.keys(s.pieces)),
    tiles: Object.keys(s.tiles).map((tile) => ({
      units: piecesAt(s, tile),
      hostile: s.players.map((p) => hostileAt(s, tile, p.id)),
    })),
  };
}

it("shares one lazy troop scan through published economic snapshots", () => {
  const { s, water } = fixture();
  for (let i = 0; i < 1000; i++) piece(s, water, i % 2, "fishing");
  let scans = 0;
  s.pieces = new Proxy(s.pieces, {
    ownKeys(target) {
      scans++;
      return Reflect.ownKeys(target);
    },
  });
  prepareGameView(s);
  inventory(s);
  expect(scans).toBe(0);
  const units = allPieces(s),
    occupation = movementOccupationKeys(s),
    pure = vi.fn((records) => records.length),
    composition = vi.fn((records) => records.length);
  for (let actions = 1; actions <= 20; actions++) {
    const view = { ...s, actions };
    prepareGameView(view);
    expect(allPieces(view)).toBe(units);
    expect(movementOccupationKeys(view)).toBe(occupation);
    expect(retainPieceRead(view)).toBe(retainPieceRead(s));
    expect(piecePlanningValue(view, "count", pure)).toBe(units.length);
    expect(pieceCompositionValue(view, "count", composition)).toBe(
      units.length,
    );
    expect(planningValue(view, "actions", () => view.actions)).toBe(actions);
    ownPieces(view);
    piecesAt(view, water);
    productionSources(view);
  }
  expect(pure).toHaveBeenCalledTimes(1);
  expect(composition).toHaveBeenCalledTimes(1);
  expect(scans).toBe(1);
});

it("keeps stocks, town ownership, terrain and diplomacy fresh with identical troops", () => {
  const { s, home, water } = fixture();
  const before = structuredClone(s);
  const initial = readings(structuredClone(s));
  freeze(s);
  prepareGameView(s);
  expect(readings(s)).toEqual(initial);
  const changed = structuredClone(s);
  changed.pieces = s.pieces;
  changed.towns[home.id].stock = { gold: 9 };
  changed.towns[home.id].level = 2;
  changed.towns[home.id].extensions = {};
  changed.tiles[water].resource = "grain";
  delete changed.tiles[water].fish;
  changed.alliances = [
    { id: "pact", members: [0, 1], threat: 2, lockedUntil: 99 },
  ];
  const expected = readings(structuredClone(changed));
  freeze(changed);
  prepareGameView(changed);
  expect(readings(changed)).toEqual(expected);
  expect(hostileAt(s, water, 0)).toBe(true);
  expect(hostileAt(changed, water, 0)).toBe(false);
  expect(inventory(changed).gold).toBe(9);
  expect(retainPieceRead(changed)).toBe(retainPieceRead(s));
  const captured = structuredClone(changed);
  captured.pieces = s.pieces;
  captured.towns[home.id].owner = 1;
  captured.players[0].alive = false;
  const captureExpected = readings(structuredClone(captured));
  freeze(captured);
  prepareGameView(captured);
  expect(readings(captured)).toEqual(captureExpected);
  expect(readings(s)).toEqual(initial);
  expect(s).toEqual(before);
});

it("invalidates every troop index when a worker delta changes the roster", () => {
  const { s, ship, water } = fixture();
  const initial = readings(structuredClone(s));
  freeze(s);
  prepareGameView(s);
  expect(readings(s)).toEqual(initial);
  const changed = structuredClone(s);
  const units = Object.values(changed.pieces);
  units[0].tile = "2,0";
  delete units[1].carrier;
  units[1].tile = "0,1";
  units[2].tier = 1;
  units[2].seasonStatus = "icebound";
  units[3].owner = 0;
  units[4].coverage = ["0,0"];
  units[4].bonus = 3;
  delete changed.pieces[units[5].id];
  piece(changed, water, 1, "galley", 4);
  // Reinsert a record to exercise campaign-order preservation as well.
  delete changed.pieces[ship.id];
  changed.pieces[ship.id] = units[0];
  const expected = readings(structuredClone(changed));
  const delta = snapshotDelta(s, changed);
  const received = applyPublishedDelta(
    s,
    delta,
    retainPieceRead(s)?.recordKeys,
  );
  freeze(received);
  preparePatchedGameView(s, received, delta);
  expect(retainPieceRead(received)).not.toBe(retainPieceRead(s));
  expect(retainPieceRead(received)?.recordKeys).toBe(
    delta.records.pieces!.keys,
  );
  expect(readings(received)).toEqual(expected);
  expect(readings(s)).toEqual(initial);
});

it("reuses source key order for copying and fresh reads through successive value-only patches", () => {
  const { s, water } = fixture();
  for (let i = 0; i < 1000; i++) piece(s, water, i % 2, "fishing");
  prepareGameView(s);
  const original = readings(s),
    sourceKeys = retainPieceRead(s)!.recordKeys;
  expect(sourceKeys).toBeDefined();
  const snapshots = [s];
  for (let turn = 1; turn <= 4; turn++) {
    const before = snapshots.at(-1)!,
      changed = structuredClone(before),
      unit = changed.pieces[sourceKeys![turn]];
    unit.owner = (unit.owner + 1) % s.players.length;
    unit.tile = "0,1";
    unit.tier = 1 + (turn % 4);
    unit.bonus = turn;
    changed.actions++;
    const expected = readings(structuredClone(changed));
    const delta = snapshotDelta(before, changed);
    expect(delta.records.pieces?.keys).toBeUndefined();
    freeze(before);
    freeze(delta);
    const keys = vi.spyOn(Object, "keys");
    let received: Game;
    try {
      received = applyPublishedDelta(
        before,
        delta,
        retainPieceRead(before)!.recordKeys,
      );
      preparePatchedGameView(before, received, delta);
      allPieces(received);
      ownPieces(received);
      piecesAt(received, water);
      expect(
        keys.mock.calls.some(
          ([value]) => value === before.pieces || value === received.pieces,
        ),
      ).toBe(false);
      expect(retainPieceRead(received)!.recordKeys).toBe(sourceKeys);
    } finally {
      keys.mockRestore();
    }
    expect(readings(received!)).toEqual(expected);
    snapshots.push(received!);
  }
  expect(readings(s)).toEqual(original);
});

it("keeps patch preparation lazy and discovers order when the source was never indexed", () => {
  const { s, water } = fixture();
  prepareGameView(s);
  expect(retainPieceRead(s)!.recordKeys).toBeUndefined();
  const next = structuredClone(s);
  Object.values(next.pieces)[0].tile = "0,1";
  const delta = snapshotDelta(s, next);
  const received = applyPublishedDelta(s, delta);
  preparePatchedGameView(s, received, delta);
  inventory(received);
  expect(retainPieceRead(s)!.recordKeys).toBeUndefined();
  expect(retainPieceRead(received)!.recordKeys).toBeUndefined();
  const spy = vi.spyOn(Object, "keys");
  try {
    allPieces(received);
    piecesAt(received, water);
    expect(
      spy.mock.calls.filter(([value]) => value === received.pieces),
    ).toHaveLength(1);
  } finally {
    spy.mockRestore();
  }
  expect(readings(received)).toEqual(readings(structuredClone(next)));
});

it("uses actual dictionary keys and fresh order after replacement or deletion", () => {
  const { s } = fixture();
  const units = Object.values(s.pieces);
  // Literal aliases and numeric keys must never be inferred from unit.id.
  s.pieces = { 9: units[0], alias: units[1], 2: units[2] };
  prepareGameView(s);
  allPieces(s);
  const next = {
    ...s,
    pieces: { ...s.pieces, alias: { ...units[1], moved: 2 } },
  };
  const patch = snapshotDelta(s, next);
  const updated = applyPublishedDelta(s, patch, retainPieceRead(s)!.recordKeys);
  preparePatchedGameView(s, updated, patch);
  expect(allPieces(updated)).toEqual(Object.values(next.pieces));
  const replacement = { ...next, pieces: { completely: units[5] } };
  const full = {
    keys: Object.keys(replacement) as (keyof Game)[],
    values: { pieces: replacement.pieces },
    records: {},
  };
  const restored = applyPublishedDelta(
    updated,
    full,
    retainPieceRead(updated)!.recordKeys,
  );
  preparePatchedGameView(updated, restored, full);
  expect(allPieces(restored)).toEqual(Object.values(replacement.pieces));
  const empty = { ...restored, pieces: {} },
    removed = snapshotDelta(restored, empty),
    last = applyPublishedDelta(
      restored,
      removed,
      retainPieceRead(restored)!.recordKeys,
    );
  preparePatchedGameView(restored, last, removed);
  expect(allPieces(last)).toEqual([]);
  expect(retainPieceRead(last)!.recordKeys).toEqual([]);
});

it("keeps mutable planning scopes and unregistered drafts outside published caches", () => {
  const { s, water } = fixture();
  freeze(s);
  prepareGameView(s);
  const original = allPieces(s);
  const cached = piecePlanningValue(s, "probe", () => "published");
  const related = { ...s };
  expect(allPieces(related)).not.toBe(original);
  expect(piecePlanningValue(related, "probe", () => "fresh")).toBe("fresh");
  withPlanningFrame(related, () => {
    expect(allPieces(related)).not.toBe(original);
    expect(piecePlanningValue(related, "probe", () => "scope")).toBe("scope");
  });
  const draft = structuredClone(s);
  withPlanningFrame(draft, () => readings(draft));
  piece(draft, water, 1, "galley", 4);
  expect(allPieces(draft)).toHaveLength(original.length + 1);
  withPlanningFrame(draft, () => {
    expect(allPieces(draft)).toHaveLength(original.length + 1);
    expect(piecePlanningValue(draft, "probe", () => "new-scope")).toBe(
      "new-scope",
    );
  });
  expect(piecePlanningValue(s, "probe", () => "incorrect")).toBe(cached);
  expect(allPieces(s)).toBe(original);
});

it("retains published indexes after an economic worker reply and rebuilds them after recruitment", () => {
  const { s, home } = fishingFixture();
  const land = s.vertices[home.vertex].tiles.find(
    (id) => s.tiles[id].resource !== "water",
  )!;
  piece(s, land, 0, "heavy", 3);
  freeze(s);
  prepareGameView(s);
  const original = readings(s);
  const economic = applyCommand(s, {
    type: "bank",
    give: { gold: 1 },
    take: { grain: 1 },
  });
  expect(economic.ok).toBe(true);
  const received = applySnapshotDelta(s, snapshotDelta(s, economic.state));
  prepareGameView(received);
  expect(retainPieceRead(received)).toBe(retainPieceRead(s));
  expect(readings(received)).toEqual(readings(structuredClone(economic.state)));
  const recruited = applyCommand(received, {
    type: "recruit",
    town: home.id,
    tile: land,
    kind: "heavy",
    count: 100,
  });
  expect(recruited.ok).toBe(true);
  const next = applySnapshotDelta(
    received,
    snapshotDelta(received, recruited.state),
  );
  prepareGameView(next);
  expect(retainPieceRead(next)).not.toBe(retainPieceRead(s));
  expect(allPieces(next)).toHaveLength(101);
  expect(readings(next)).toEqual(readings(structuredClone(recruited.state)));
  expect(readings(s)).toEqual(original);
});
