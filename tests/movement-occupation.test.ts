import { expect, it, vi } from "vitest";
import { friendly } from "../src/game/relations";
import {
  hostileAt,
  movementOccupationKeys,
  prepareGameView,
  withPlanningFrame,
  withSharedPiecePlanningFrame,
  withPieceListPlanningFrame,
  allPieces,
  pathTo,
} from "../src/game/selectors";
import { planningDestinations, planningPath } from "../src/game/ai-paths";
import { formerDeployment } from "./deployment-reference";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import type { Game } from "../src/game/types";

function keys(s: Game) {
  return [
    ...new Set(
      Object.values(s.pieces)
        .filter((u) => !u.carrier)
        .map((u) => `${u.tile}/${u.owner}/${u.naval}/${!!u.seasonStatus}`),
    ),
  ].sort();
}
function hostile(s: Game, tile: string, owner: number, naval?: boolean) {
  return Object.values(s.pieces)
    .filter((u) => u.tile === tile && !u.carrier)
    .filter((u) => naval === undefined || u.naval === naval || !!u.seasonStatus)
    .some((u) => !friendly(s, u.owner, owner));
}
function compare(s: Game) {
  expect(movementOccupationKeys(s)).toEqual(keys(s));
  for (const tile of ["0,0", "1,0", "2,0", "-1,0", "missing"])
    for (const owner of [0, 1, 2, 3])
      for (const naval of [undefined, false, true])
        expect(
          hostileAt(s, tile, owner, naval),
          `${tile}/${owner}/${naval}`,
        ).toBe(hostile(s, tile, owner, naval));
}
function fixture() {
  const { s } = maritimeFixture();
  for (let i = 0; i < 128; i++) {
    const naval = !!(i & 16);
    const u = piece(
      s,
      ["0,0", "1,0", "2,0", "-1,0"][i % 4],
      (i >> 2) % 4,
      naval ? (i % 3 ? "galley" : "fishing") : i % 3 ? "heavy" : "merchant",
      1 + (i % 4),
    );
    if (i & 32) u.seasonStatus = naval ? "icebound" : "adrift";
    if (i & 64) u.carrier = "excluded-carrier";
  }
  return s;
}

it("movement summaries preserve every faction, domain and stranding combination", () => {
  for (let scenario = 0; scenario < 12; scenario++) {
    const s = fixture();
    if (scenario % 3)
      s.alliances = [
        {
          id: "pact",
          members: scenario % 2 ? [0, 1] : [0, 2, 3],
          threat: 1,
          lockedUntil: 20,
        },
      ];
    if (scenario % 2)
      s.pieces = Object.fromEntries(Object.entries(s.pieces).reverse());
    if (scenario > 5)
      for (const u of Object.values(s.pieces)) u.carrier = "all-embarked";
    compare(s);
    withPlanningFrame(s, () => compare(s));
    prepareGameView(s);
    compare(s);
  }
});

it("civilian units still block movement even though they have no combat power", () => {
  for (const kind of [
    "merchant",
    "settler",
    "fishing",
    "settlership",
  ] as const) {
    const { s } = maritimeFixture();
    const u = piece(s, "0,0", 1, kind, 1);
    withPlanningFrame(s, () => {
      expect(hostileAt(s, u.tile, 0, u.naval)).toBe(true);
      expect(hostileAt(s, u.tile, 0, !u.naval)).toBe(false);
      expect(hostileAt(s, u.tile, 0)).toBe(true);
    });
  }
});

it("shared troop summaries read current alliances and leave other drafts independent", () => {
  const s = fixture();
  withPlanningFrame(s, () => {
    const original = movementOccupationKeys(s);
    const allied = {
      ...s,
      alliances: [
        { id: "all", members: [0, 1, 2, 3], threat: 4, lockedUntil: 20 },
      ],
    };
    withSharedPiecePlanningFrame(allied, () => {
      expect(movementOccupationKeys(allied)).toBe(original);
      compare(allied);
      expect(hostileAt(allied, "0,0", 0)).toBe(false);
    });
    const changed = { ...s, pieces: structuredClone(s.pieces) };
    for (const u of Object.values(changed.pieces)) {
      u.tile = "2,0";
      delete u.carrier;
      delete u.seasonStatus;
    }
    expect(() =>
      withSharedPiecePlanningFrame(changed, () => {
        compare(changed);
        expect(movementOccupationKeys(changed)).not.toBe(original);
        throw Error("nested read interrupted");
      }),
    ).toThrow("nested read interrupted");
    expect(movementOccupationKeys(s)).toBe(original);
    compare(s);
  });
});

it("mutable movement, boarding, stranding, capture and deletion rebuild summaries", () => {
  const s = fixture();
  const records = withPlanningFrame(s, () => {
    compare(s);
    return allPieces(s);
  });
  for (const [i, u] of Object.values(s.pieces).entries()) {
    u.tile = i % 2 ? "1,0" : "2,0";
    u.owner = (u.owner + 1) % 4;
    if (i % 2) delete u.carrier;
    else u.carrier = "boarded";
    if (i % 3) delete u.seasonStatus;
    else u.seasonStatus = "icebound";
  }
  withPieceListPlanningFrame(s, records, () => compare(s));
  compare(s);
  for (const id of Object.keys(s.pieces).filter((_, i) => i % 3 === 0))
    delete s.pieces[id];
  piece(s, "0,0", 1, "heavy");
  compare(s);
  withPlanningFrame(s, () => compare(s));
});

it("thousands of colocated units generate one key per occupation and reuse it in the read scope", () => {
  const { s } = maritimeFixture();
  for (let i = 0; i < 6000; i++) piece(s, "0,0", i % 2, "heavy");
  const spy = vi.spyOn(Object, "keys");
  try {
    withPlanningFrame(s, () => {
      const result = movementOccupationKeys(s);
      expect(result).toEqual(["0,0/0/false/false", "0,0/1/false/false"]);
      for (let i = 0; i < 20; i++) {
        expect(movementOccupationKeys(s)).toBe(result);
        expect(hostileAt(s, "0,0", 0, false)).toBe(true);
        expect(hostileAt(s, "0,0", 0, true)).toBe(false);
      }
      expect(
        spy.mock.calls.filter(([value]) => value === s.pieces),
      ).toHaveLength(1);
    });
  } finally {
    spy.mockRestore();
  }
});

it("route-cache reuse and invalidation preserve paths when stacks, boarding and stranding change", () => {
  let { s } = maritimeFixture();
  const u = piece(s, "1,0", 1, "galley");
  for (const change of [
    () => {},
    () => {
      for (let i = 0; i < 500; i++) piece(s, "1,0", 1, "galley");
    },
    () => {
      s.pieces[u.id].seasonStatus = "icebound";
    },
    () => {
      s.pieces[u.id].carrier = "embarked";
    },
    () => {
      s.alliances = [
        { id: "friends", members: [0, 1], threat: 2, lockedUntil: 20 },
      ];
    },
    () => {
      delete s.pieces[u.id].carrier;
      delete s.alliances;
    },
    () => {
      delete s.pieces[u.id];
    },
  ]) {
    s = structuredClone(s);
    change();
    withPlanningFrame(s, () => {
      const expected = formerDeployment(s, "0,0", false, 0);
      expect([...planningDestinations(s, "0,0", false, 0)]).toEqual(
        [...expected].map(([id, route]) => [id, route.length]),
      );
      for (const tile of ["1,0", "2,0", "3,0", "-2,0"])
        expect(planningPath(s, "0,0", tile, false, 0)).toEqual(
          pathTo(s, "0,0", tile, false, 0),
        );
    });
  }
});
