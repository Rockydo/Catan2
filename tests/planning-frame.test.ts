import { expect, it } from "vitest";
import { funded, piece, run } from "./helpers";
import { applyCommandPlan } from "../src/game/engine";
import { maritimeFixture } from "./maritime-fixture";
import {
  ownTowns,
  ownPieces,
  piecesAt,
  townAt,
  inventory,
  nearestTown,
  withPlanningFrame,
  withSharedPiecePlanningFrame,
  withPieceListPlanningFrame,
  passengersOn,
  reusePlanningFrame,
  allPieces,
  income,
  siegeRequirement,
  siegePower,
  prepareGameView,
} from "../src/game/selectors";
import {
  coord,
  distance,
  landAtVertex,
  vertexNeighbors,
} from "../src/game/world";
import { towerDefense } from "../src/game/maritime";

it("AI indexes preserve selector results and ordering across player views and never leak mutable arrays", () => {
  const s = funded("planning-index");
  const ids = Object.keys(s.tiles);
  for (let i = 0; i < 40; i++)
    piece(
      s,
      ids[i],
      i % 4,
      s.tiles[ids[i]].resource === "water" ? "galley" : "heavy",
    );
  const queries = () =>
    s.players.map((p) => ({
      towns: ownTowns(s, p.id),
      pieces: ownPieces(s, p.id),
      stock: inventory(s, p.id),
      income: income(s, p.id),
      nearby: ids.map((id) => [
        piecesAt(s, id),
        piecesAt(s, id, true),
        piecesAt(s, id, false),
        nearestTown(s, id, p.id),
      ]),
      vertices: Object.keys(s.vertices).map((v) => townAt(s, v)),
    }));
  const expected = queries();
  withPlanningFrame(s, () => {
    expect(queries()).toEqual(expected);
    for (const p of s.players) {
      const view = { ...s, active: p.id };
      expect(ownTowns(view)).toEqual(expected[p.id].towns);
      expect(inventory(view)).toEqual(expected[p.id].stock);
      ownTowns(view).reverse().pop();
      ownPieces(view).reverse().pop();
      inventory(view).grain = -100;
      piecesAt(view, ids[0]).pop();
    }
    expect(queries()).toEqual(expected);
  });
  // Outside a decision, callers can edit fixtures/state without stale reads.
  const town = ownTowns(s)[0];
  town.stock.grain = 789;
  expect(inventory(s).grain).toBe(
    ownTowns(s).reduce((n, t) => n + (t.stock.grain ?? 0), 0),
  );
  piece(s, ids[0], 0, "heavy");
  expect(piecesAt(s, ids[0])).toEqual(
    Object.values(s.pieces).filter((p) => p.tile === ids[0] && !p.carrier),
  );
});

it("engine simulation clones bypass indexes and nested frames restore the previous decision", () => {
  const s = funded("planning-clone");
  withPlanningFrame(s, () => {
    const before = inventory(s);
    const next = run(s, { type: "city", town: ownTowns(s)[0].id });
    expect(inventory(next)).not.toEqual(before);
    expect(ownTowns(next)[0].level).toBe(2);
    withPlanningFrame(next, () => {
      expect(inventory(next)).not.toEqual(before);
      expect(inventory(s)).toEqual(before);
    });
    expect(inventory(s)).toEqual(before);
    expect(() =>
      withPlanningFrame(next, () => {
        throw Error("abort");
      }),
    ).toThrow("abort");
    expect(inventory(s)).toEqual(before);
  });
});

it("nearest warehouse keeps exact distance and town-ID tie breaks", () => {
  const s = funded("nearest-equivalence");
  for (const p of s.players)
    for (const tile of Object.keys(s.tiles)) {
      const old = ownTowns(s, p.id).sort(
        (a, b) =>
          Math.min(...landAtVertex(s, a.vertex).map((t) => distance(tile, t))) -
            Math.min(
              ...landAtVertex(s, b.vertex).map((t) => distance(tile, t)),
            ) || Number(a.id.slice(1)) - Number(b.id.slice(1)),
      )[0];
      expect(nearestTown(s, tile, p.id)).toBe(old);
    }
});

it("bounded coordinate reuse preserves hex distances and public coordinate tuples stay independent", () => {
  for (let i = -9000; i < 9000; i++) {
    const a = `${i},${-i * 2}`,
      b = `${i + 3},${-i * 2 - 7}`;
    expect(distance(a, b)).toBe(7);
  }
  expect(distance("-5,8", "2,-3")).toBe(11);
  const p = coord("-5,8");
  p[0] = 100;
  expect(distance("-5,8", "2,-3")).toBe(11);
});

it("nested AI readers join only the exact active decision and restore it after errors", () => {
  const { s } = maritimeFixture();
  piece(s, "0,0", 0, "cavalry");
  const other = structuredClone(s);
  piece(other, "1,0", 0, "cavalry");
  withPlanningFrame(s, () => {
    const units = allPieces(s);
    const totals = inventory(s);
    reusePlanningFrame(s, () => {
      expect(allPieces(s)).toBe(units);
      expect(inventory(s)).toEqual(totals);
    });
    expect(() =>
      reusePlanningFrame(other, () => {
        expect(allPieces(other)).toHaveLength(2);
        throw Error("stop nested read");
      }),
    ).toThrow("stop nested read");
    expect(allPieces(s)).toBe(units);
    expect(() =>
      reusePlanningFrame(s, () => {
        throw Error("stop shared read");
      }),
    ).toThrow("stop shared read");
    expect(allPieces(s)).toBe(units);
  });
  piece(s, "1,0", 0, "cavalry");
  expect(reusePlanningFrame(s, () => allPieces(s))).toHaveLength(2);
});

it("planned movement shares a read scope but creates a fresh one after every execution", () => {
  const { s } = maritimeFixture();
  const unit = piece(s, "0,0", 0, "cavalry");
  const initial = JSON.stringify(s);
  const scans: ReturnType<typeof allPieces>[] = [];
  const result = applyCommandPlan(s, (view, done) => {
    const tile = `${done.length},0`;
    const units = allPieces(view);
    expect(reusePlanningFrame(view, () => allPieces(view))).toBe(units);
    expect(piecesAt(view, tile).map((u) => u.id)).toEqual([unit.id]);
    if (done.length) expect(piecesAt(view, `${done.length - 1},0`)).toEqual([]);
    scans.push(units);
    return done.length < 2
      ? { type: "move", ids: [unit.id], to: `${done.length + 1},0` }
      : undefined;
  });
  expect(result.ok, result.error).toBe(true);
  expect(new Set(scans).size).toBe(3);
  expect(result.state.pieces[unit.id].tile).toBe("2,0");
  expect(JSON.stringify(s)).toBe(initial);
  expect(allPieces(s)).toEqual([unit]);
});

it("related read views share troops but not changed stores or diplomacy, and restore their parent after errors", () => {
  const { s, home } = maritimeFixture();
  piece(s, "0,0", 0, "cavalry");
  let scans = 0;
  s.pieces = new Proxy(s.pieces, {
    ownKeys(target) {
      scans++;
      return Reflect.ownKeys(target);
    },
  });
  withPlanningFrame(s, () => {
    const units = allPieces(s),
      initialStock = inventory(s),
      initialIncome = income(s);
    const child = {
      ...s,
      towns: structuredClone(s.towns),
      alliances: [
        { id: "changed", members: [0, 1], threat: 2, lockedUntil: 10 },
      ],
    };
    child.towns[home.id].stock.gold = 10;
    expect(() =>
      withSharedPiecePlanningFrame(child, () => {
        expect(allPieces(child)).toBe(units);
        expect(ownPieces(child)).toEqual(ownPieces(s));
        expect(piecesAt(child, "0,0")).toEqual(piecesAt(s, "0,0"));
        expect(inventory(child).gold).not.toBe(initialStock.gold);
        expect(scans).toBe(1);
        throw Error("stop child read");
      }),
    ).toThrow("stop child read");
    expect(allPieces(s)).toBe(units);
    expect(inventory(s)).toEqual(initialStock);
    expect(income(s)).toEqual(initialIncome);

    const changed = { ...child, pieces: { ...s.pieces } };
    piece(changed, "1,0", 1, "heavy");
    withSharedPiecePlanningFrame(changed, () => {
      expect(allPieces(changed)).toHaveLength(2);
      expect(piecesAt(changed, "1,0")).toHaveLength(1);
    });
    expect(piecesAt(s, "1,0")).toEqual([]);
  });
  piece(s, "1,0", 0, "cavalry");
  expect(allPieces(s)).toHaveLength(2);
});

it("siege support stays exact for every town, hypothetical owner and attacking force", () => {
  const s = funded("siege-support-reads");
  for (const [i, vertex] of Object.keys(s.vertices).entries())
    if (i % 4 === 0)
      s.towers[vertex] = {
        id: `test-${i}`,
        vertex,
        owner: i % 3,
        tier: 1 + (i % 4),
      };
  const cannon = piece(s, "0,0", 0, "artillery", 3),
    ship = piece(s, "0,0", 0, "carrack", 4);
  cannon.guildSiege = 4;
  const armies = [[], [cannon], [ship], [cannon, ship]];
  withPlanningFrame(s, () => {
    for (const town of Object.values(s.towns))
      for (const owner of [0, 1, 2])
        for (const units of armies) {
          const target = { ...town, owner };
          expect(siegeRequirement(s, target, units)).toBe(
            Math.max(
              0,
              target.level -
                1 +
                target.wall +
                towerDefense(s, owner, target.vertex) -
                siegePower(units),
            ),
          );
        }
  });
});

it("siege support never leaks between shared troop views, drafts or published snapshots", () => {
  const { s, home } = maritimeFixture(),
    vertex = vertexNeighbors(s, home.vertex)[0];
  s.towers = {
    [vertex]: { id: "support", vertex, owner: home.owner, tier: 2 },
  };
  const base = home.level - 1 + home.wall;
  withPlanningFrame(s, () => {
    expect(siegeRequirement(s, home, [])).toBe(base + 2);
    const draft = { ...s, towers: {} };
    expect(siegeRequirement(draft, home, [])).toBe(base);
    withSharedPiecePlanningFrame(draft, () => {
      expect(siegeRequirement(draft, home, [])).toBe(base);
    });
    draft.towers = { [vertex]: { ...s.towers[vertex], tier: 4 } };
    expect(siegeRequirement(draft, home, [])).toBe(base + 4);
    expect(siegeRequirement(s, home, [])).toBe(base + 2);
  });
  s.towers[vertex].tier = 3;
  expect(siegeRequirement(s, home, [])).toBe(base + 3);
  prepareGameView(s);
  expect(siegeRequirement(s, home, [])).toBe(base + 3);
  const next = structuredClone(s);
  next.towers[vertex].owner = 1;
  prepareGameView(next);
  expect(siegeRequirement(next, next.towns[home.id], [])).toBe(base);
  expect(siegeRequirement(s, home, [])).toBe(base + 3);
});

it("retaining only the troop list rebuilds every derived index after in-place edits", () => {
  const { s } = maritimeFixture();
  s.tiles["1,0"].resource = s.tiles["2,0"].resource = "water";
  s.tiles["1,0"].fish = true;
  const ship = piece(s, "1,0", 0, "merchantship", 3);
  const collector = piece(s, "0,0", 0, "merchant", 3);
  collector.coverage = ["0,1"];
  const soldier = piece(s, "1,0", 0);
  soldier.carrier = ship.id;
  const read = () => ({
    owned: s.players.map((p) => ownPieces(s, p.id)),
    occupants: Object.keys(s.tiles).map((id) => piecesAt(s, id)),
    passengers: passengersOn(s, [ship.id]),
    harvest: s.players.map((p) => income(s, p.id)),
  });
  const list = withPlanningFrame(s, () => {
    read();
    return allPieces(s);
  });
  // The record list remains valid, but no derived map does.
  ship.tile = "2,0";
  collector.tile = "1,1";
  collector.owner = 1;
  delete collector.coverage;
  delete soldier.carrier;
  soldier.tile = "0,0";
  const expected = read();
  let scans = 0;
  s.pieces = new Proxy(s.pieces, {
    ownKeys(target) {
      scans++;
      return Reflect.ownKeys(target);
    },
  });
  const outer = structuredClone({ ...s, pieces: { ...s.pieces } });
  scans = 0;
  withPlanningFrame(outer, () => {
    const original = allPieces(outer);
    expect(() =>
      withPieceListPlanningFrame(s, list, () => {
        expect(allPieces(s)).toBe(list);
        expect(read()).toEqual(expected);
        expect(scans).toBe(0);
        throw Error("stop after fresh reads");
      }),
    ).toThrow("stop after fresh reads");
    expect(allPieces(outer)).toBe(original);
  });
  // Ordinary mutable reads still enumerate current records outside the scope.
  const recruit = piece(s, "0,0");
  expect(allPieces(s)).toContain(recruit);
  expect(scans).toBe(1);
});
