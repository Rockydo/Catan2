import { expect, it, vi } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import * as world from "../src/game/world";
import * as selectors from "../src/game/selectors";
import { colonistAction, colonistProjects } from "../src/game/ai-colonization";
import { friendly } from "../src/game/relations";
import { isSettler } from "../src/game/content";

it("retains blockade answers across factions, civilians, passengers and stranded units", () => {
  const { s } = maritimeFixture();
  const tiles = Object.keys(s.tiles);
  for (let i = 0; i < 120; i++) {
    const kind = (
      [
        "heavy",
        "merchant",
        "settler",
        "fishing",
        "settlership",
        "galley",
      ] as const
    )[i % 6];
    const u = piece(s, tiles[Math.floor(i / 6) % 6], i % 3, kind, 1);
    if (i % 11 === 0) u.carrier = "excluded";
    if (i % 5 === 0) u.seasonStatus = u.naval ? "icebound" : "adrift";
  }
  const check = (view: typeof s) => {
    for (const owner of view.players.map((p) => p.id))
      for (const tile of [...tiles.slice(0, 8), "missing"])
        for (const naval of [false, true]) {
          const expected = Object.values(view.pieces).some(
            (u) =>
              u.tile === tile &&
              u.naval === naval &&
              !u.carrier &&
              !friendly(view, u.owner, owner) &&
              (naval ? !isSettler(u.kind) : selectors.points(u) > 0),
          );
          const actual = naval ? selectors.navalBlockAt : selectors.blockAt;
          expect(actual(view, tile, owner)).toBe(expected);
        }
  };
  const before = JSON.stringify(s);
  selectors.withPlanningFrame(s, () => {
    check(s);
    check({
      ...s,
      alliances: [{ id: "pact", members: [0, 1], threat: 2, lockedUntil: 9 }],
    });
    const draft = structuredClone(s);
    draft.pieces = {};
    check(draft);
    check(s);
  });
  expect(JSON.stringify(s)).toBe(before);
  const first = Object.values(s.pieces)[0];
  first.tile = tiles[7];
  delete first.carrier;
  check(s); // Unregistered mutable games always use current records.
  selectors.withPlanningFrame(s, () => check(s));
});

it("answers repeated blockade queries without rereading every member of a large stack", () => {
  const { s } = maritimeFixture();
  const tile = "0,0";
  let reads = 0;
  for (let i = 0; i < 2000; i++) {
    const u = piece(s, tile, 0, i % 2 ? "heavy" : "fishing");
    Object.defineProperty(u, "owner", {
      get() {
        reads++;
        return 0;
      },
      enumerable: true,
    });
  }
  selectors.withPlanningFrame(s, () => {
    expect(selectors.blockAt(s, tile, 1)).toBe(true);
    expect(reads).toBeGreaterThan(0);
    reads = 0;
    for (let i = 0; i < 30; i++) {
      expect(selectors.blockAt(s, tile, 0)).toBe(false);
      expect(selectors.blockAt(s, tile, 1)).toBe(true);
      expect(selectors.navalBlockAt(s, tile, 0)).toBe(false);
      expect(selectors.navalBlockAt(s, tile, 1)).toBe(true);
    }
    expect(reads).toBe(0);
  });
});

it("shares one ordered site scan per faction, retaining independent arrays and fresh draft results", () => {
  const { s, home } = maritimeFixture();
  s.vertices = Object.fromEntries(Object.entries(s.vertices).reverse());
  const tile = "-3,0";
  s.routes[s.tiles[tile].edges[0]] = {
    id: "road-access",
    born: 0,
    edge: s.tiles[tile].edges[0],
    owner: 0,
    kind: "road",
    camps: {},
  };
  const expected = s.players.map((p) => [
    selectors.settlementSites(s, p.id),
    selectors.settlementSites(s, p.id, true),
  ]);
  const scan = vi.spyOn(world, "solidAtVertex");
  try {
    selectors.withPlanningFrame(s, () => {
      for (const p of s.players) {
        const start = scan.mock.calls.length;
        expect(selectors.settlementSites(s, p.id)).toEqual(expected[p.id][0]);
        expect(selectors.settlementSites(s, p.id, true)).toEqual(
          expected[p.id][1],
        );
        selectors.settlementSites(s, p.id).reverse().pop();
        selectors.settlementSites(s, p.id, true).splice(0);
        expect(selectors.settlementSites(s, p.id, true)).toEqual(
          expected[p.id][1],
        );
        expect(scan.mock.calls.length - start).toBe(
          Object.keys(s.vertices).length,
        );
      }
      const next = {
        ...s,
        towns: {
          ...s.towns,
          [home.id]: { ...home, vertex: expected[0][1][0] },
        },
      };
      const changed = selectors.settlementSites(next, 0, true);
      expect(changed).not.toContain(expected[0][1][0]);
      expect(selectors.settlementSites(s, 0, true)).toEqual(expected[0][1]);
    });
  } finally {
    scan.mockRestore();
  }
  const vacant = expected[0][1][0];
  home.vertex = vacant;
  expect(selectors.settlementSites(s, 0, true)).not.toContain(vacant);
  selectors.withPlanningFrame(s, () => {
    expect(selectors.settlementSites(s, 0, true)).not.toContain(vacant);
  });
});

it("skips world-site scans for threatened colonists and road checks for travelling parties", () => {
  const { s } = maritimeFixture();
  piece(s, "-3,0", 0, "settler");
  const enemy = piece(s, "-2,0", 1, "heavy");
  const sites = vi.spyOn(selectors, "settlementSites");
  try {
    expect(selectors.withPlanningFrame(s, () => colonistAction(s))).toBeNull();
    expect(sites).not.toHaveBeenCalled();
    delete s.pieces[enemy.id];
    const action = selectors.withPlanningFrame(s, () => colonistAction(s));
    expect(action).toBeTruthy();
    expect(sites).toHaveBeenCalled();
    expect(sites.mock.calls.every((call) => call[2] === true)).toBe(true);
    s.pieces = {};
    sites.mockClear();
    const projects = selectors.withPlanningFrame(s, () => colonistProjects(s));
    expect(projects.some((p) => p.action.kind === "settler")).toBe(true);
    expect(sites.mock.calls.some((call) => !call[2])).toBe(true);
  } finally {
    sites.mockRestore();
  }
});
