import { expect, it, vi } from "vitest";
import { applyCommand } from "../src/game/engine";
import {
  militaryCommand,
  removePieces,
  setTile,
  setTiles,
} from "../src/game/military";
import type { Game, Piece, ShipClass } from "../src/game/types";
import { shipStats } from "../src/game/content";
import * as content from "../src/game/content";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";

function fleet() {
  const { s } = maritimeFixture();
  for (const tile of ["1,0", "2,0"]) s.tiles[tile].resource = "water";
  return s;
}
function countScans(s: Game) {
  let scans = 0;
  s.pieces = new Proxy(s.pieces, {
    ownKeys(target) {
      scans++;
      return Reflect.ownKeys(target);
    },
  });
  return () => scans;
}

// Independent direct-scan oracle: each berth checks all currently surviving
// passengers. The optimized implementation must keep this exact rescue order.
function referenceLosses(s: Game, ids: string[], friendly: Piece[]) {
  const removed = new Set(ids),
    survivors = friendly.filter((u) => !removed.has(u.id) && s.pieces[u.id]);
  for (const unit of Object.values(s.pieces)) {
    if (removed.has(unit.id) || !unit.carrier || !removed.has(unit.carrier))
      continue;
    const carrier = survivors.find(
      (ship) =>
        ship.naval &&
        ship.tile === unit.tile &&
        ship.owner === unit.owner &&
        Object.values(s.pieces).filter(
          (u) => u.carrier === ship.id && !removed.has(u.id),
        ).length < shipStats(ship.kind as ShipClass, ship.tier).capacity,
    );
    if (carrier) {
      unit.carrier = carrier.id;
      unit.tile = carrier.tile;
      survivors.push(unit);
    } else removed.add(unit.id);
  }
  for (const id of removed) delete s.pieces[id];
}

it("passenger losses retain exact rescue order with mixed owners, locations, tiers and occupied berths", () => {
  for (let scenario = 0; scenario < 32; scenario++) {
    const s = fleet();
    const ships = Array.from({ length: 12 }, (_, i) =>
      piece(
        s,
        i % 3 ? "1,0" : "2,0",
        i % 2,
        i % 4 === 0 ? "galley" : i % 3 ? "convoy" : "transport",
        1 + ((scenario + i) % 4),
      ),
    );
    const passengers = ships.flatMap((ship, i) =>
      Array.from(
        {
          length: Math.max(
            0,
            shipStats(ship.kind as ShipClass, ship.tier).capacity -
              ((scenario + i) % 3),
          ),
        },
        (_, j) => {
          const u = piece(
            s,
            ship.tile,
            ship.owner,
            j % 2 ? "merchant" : "heavy",
            1 + (j % 4),
          );
          u.carrier = ship.id;
          return u;
        },
      ),
    );
    const removed = [
      ...ships.filter((_, i) => (i + scenario) % 3 === 0),
      ...passengers.filter((_, i) => (i + scenario) % 7 === 0),
    ].map((u) => u.id);
    // Reordered records and candidate hulls must affect both versions equally.
    if (scenario % 2)
      s.pieces = Object.fromEntries(Object.entries(s.pieces).reverse());
    const friendly = scenario % 2 ? [...ships].reverse() : ships;
    const expected = structuredClone(s);
    referenceLosses(
      expected,
      removed,
      friendly.map((u) => expected.pieces[u.id]),
    );
    removePieces(s, removed, friendly);
    expect(JSON.stringify(s), `scenario ${scenario}`).toBe(
      JSON.stringify(expected),
    );
  }
});

it("large passenger rescues scan the army once and keep individually selected casualties removed", () => {
  const s = fleet(),
    ships = Array.from({ length: 200 }, () => piece(s, "1,0", 0, "convoy", 4));
  const passengers = ships.slice(0, 100).flatMap((ship) =>
    Array.from({ length: 8 }, () => {
      const u = piece(s, "1,0");
      u.carrier = ship.id;
      return u;
    }),
  );
  for (let i = 0; i < 15000; i++) piece(s, "3,0", 1);
  const scans = countScans(s),
    doomed = passengers[0];
  const capacity = vi.spyOn(content, "shipStats");
  try {
    removePieces(
      s,
      [...ships.slice(0, 100).map((u) => u.id), doomed.id],
      ships,
    );
    expect(capacity.mock.calls.length).toBeLessThanOrEqual(ships.length);
  } finally {
    capacity.mockRestore();
  }
  expect(scans()).toBe(1);
  expect(s.pieces[doomed.id]).toBeUndefined();
  for (const [i, u] of passengers.slice(1).entries())
    expect(s.pieces[u.id].carrier).toBe(ships[100 + Math.floor(i / 8)].id);
});

it("fills selected ships in command order, retaining occupied berths and skipping warships", () => {
  const s = fleet();
  const first = piece(s, "1,0", 0, "convoy", 2);
  const second = piece(s, "1,0", 0, "transport", 3);
  const escort = piece(s, "1,0", 0, "galley", 4);
  const unselected = piece(s, "1,0", 0, "convoy", 4);
  const occupied = [first, second].map((ship) => {
    const u = piece(s, "1,0");
    u.carrier = ship.id;
    return u;
  });
  const recruits = Array.from({ length: 5 }, () =>
    piece(s, "0,0", 0, "merchant", 2),
  );
  for (const u of recruits) u.coverage = ["0,0"];
  const ids = recruits.map((u) => u.id).reverse();
  const result = applyCommand(s, {
    type: "load",
    ids,
    ships: [escort.id, second.id, first.id],
  });
  expect(result.ok).toBe(true);
  expect(ids.map((id) => result.state.pieces[id].carrier)).toEqual([
    second.id,
    second.id,
    first.id,
    first.id,
    first.id,
  ]);
  for (const id of ids) {
    expect(result.state.pieces[id]).toMatchObject({ tile: "1,0", acted: true });
    expect(result.state.pieces[id].coverage).toBeUndefined();
    expect(s.pieces[id].carrier).toBeUndefined();
  }
  for (const u of occupied) expect(result.state.pieces[u.id]).toEqual(u);
  expect(result.state.pieces[unselected.id]).toEqual(unselected);
});

it("rejects insufficient capacity and invalid partial unloading without changing the campaign", () => {
  const s = fleet(),
    ship = piece(s, "1,0", 0, "transport", 1);
  const soldiers = [piece(s, "0,0"), piece(s, "0,0")];
  const before = JSON.stringify(s);
  const result = applyCommand(s, {
    type: "load",
    ids: soldiers.map((u) => u.id),
    ships: [ship.id],
  });
  expect(result.ok).toBe(false);
  expect(result.error).toContain("only 1");
  expect(JSON.stringify(s)).toBe(before);
  for (const u of soldiers) {
    u.tile = ship.tile;
    u.carrier = ship.id;
  }
  soldiers[1].acted = true;
  const loaded = JSON.stringify(s);
  expect(
    applyCommand(s, { type: "unload", ships: [ship.id], to: "0,0" }).ok,
  ).toBe(false);
  expect(JSON.stringify(s)).toBe(loaded);
});

it("keeps boarding and unloading scans independent of fleet and passenger counts", () => {
  const s = fleet();
  const ships = Array.from({ length: 100 }, () =>
    piece(s, "1,0", 0, "convoy", 4),
  );
  const units = Array.from({ length: 800 }, () => piece(s, "0,0"));
  for (let i = 0; i < 3000; i++) piece(s, "3,0", 1);
  const scans = countScans(s);
  militaryCommand(s, {
    type: "load",
    ids: units.map((u) => u.id),
    ships: ships.map((u) => u.id),
  });
  expect(scans()).toBe(1);
  expect(units.map((u) => u.carrier)).toEqual(
    units.map((_, i) => ships[Math.floor(i / 8)].id),
  );
  for (const u of [...ships, ...units]) u.acted = false;
  // Default selection follows campaign insertion order, independent of ship order.
  militaryCommand(s, {
    type: "unload",
    ships: ships.map((u) => u.id).reverse(),
    to: "0,0",
  });
  // Unloading adds one landing-occupancy check and one passenger enumeration.
  expect(scans()).toBe(3);
  expect(units.every((u) => u.tile === "0,0" && !u.carrier && u.acted)).toBe(
    true,
  );
});

it("moves ships and passengers exactly like sequential single-ship moves", () => {
  const s = fleet();
  const ships = Array.from({ length: 40 }, (_, i) =>
    piece(s, "1,0", i % 2, "convoy", 4),
  );
  const ids: string[] = [];
  for (let i = 0; i < 240; i++) {
    const ship = ships[i % ships.length];
    const u = piece(s, ship.tile, ship.owner, i % 2 ? "heavy" : "merchant", 2);
    u.carrier = ship.id;
    u.coverage = ["0,0"];
    ids.push(u.id);
  }
  ships[0].coverage = ["0,0"];
  ships[0].seasonStatus = "icebound";
  ships[1].coverage = ["0,0"];
  ships[1].seasonStatus = "icebound";
  const selected = ships
    .filter((_, i) => i % 3)
    .reverse()
    .map((u) => u.id);
  for (const destination of ["1,0", "2,0"]) {
    const expected = structuredClone(s),
      actual = structuredClone(s);
    for (const id of selected)
      setTile(expected, expected.pieces[id], destination);
    setTiles(
      actual,
      selected.map((id) => actual.pieces[id]),
      destination,
    );
    expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
    expect(actual.pieces[ships[1].id].seasonStatus).toBe(
      destination === "1,0" ? "icebound" : undefined,
    );
    for (const id of ids)
      if (!selected.includes(s.pieces[id].carrier!))
        expect(actual.pieces[id]).toEqual(s.pieces[id]);
  }
});

it("reads passenger membership once for a moving fleet and never for a land formation", () => {
  const s = fleet();
  const ships: Piece[] = [],
    army: Piece[] = [];
  for (let i = 0; i < 300; i++) {
    const ship = piece(s, "1,0", 0, "convoy", 4);
    ships.push(ship);
    piece(s, "1,0").carrier = ship.id;
    army.push(piece(s, "0,0"));
  }
  const scans = countScans(s);
  setTiles(s, ships, "2,0");
  expect(scans()).toBe(1);
  setTiles(s, army, "0,1");
  expect(scans()).toBe(1);
});
