import { expect, it, vi } from "vitest";
import {
  applyPublishedDelta,
  publishedSnapshotDelta,
} from "../src/game/published-delta";
import {
  applySnapshotDelta,
  composeSnapshotDeltas,
  snapshotDelta,
} from "../src/game/snapshot-delta";
import { type Game } from "../src/game/types";
import { funded, piece, run } from "./helpers";

function freeze(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const item of Object.values(value)) freeze(item);
}
function same(actual: Game, expected: Game) {
  expect(actual).toStrictEqual(expected);
  expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
}
function fixture() {
  const s = funded("published-deltas");
  s.pieces = {};
  piece(s, "0,0", 0, "heavy", 4);
  piece(s, "0,0", 1, "light", 3);
  return s;
}

it("forwards the exact immutable received patch without reading roster keys again", () => {
  const original = fixture(),
    expected = structuredClone(original),
    id = Object.keys(expected.pieces)[0];
  expected.pieces[id].tile = "1,0";
  expected.actions++;
  const delta = snapshotDelta(original, expected);
  freeze(original);
  freeze(delta);
  const received = applyPublishedDelta(original, delta);
  freeze(received);
  const keys = vi.spyOn(Object, "keys");
  try {
    expect(publishedSnapshotDelta(original, received)).toBe(delta);
    expect(keys).not.toHaveBeenCalled();
  } finally {
    keys.mockRestore();
  }
  same(applySnapshotDelta(original, delta), expected);
});

it("composes coalesced moves, recruitment, losses and record reordering without rescanning the roster", () => {
  const original = fixture(),
    id = Object.keys(original.pieces)[0],
    second = Object.keys(original.pieces)[1];
  const snapshots = [original];
  for (let i = 0; i < 8; i++) {
    const before = snapshots.at(-1)!,
      expected = structuredClone(before);
    expected.actions++;
    expected.pieces[id].moved = i;
    if (i === 1) piece(expected, "1,0", 1, "heavy", 4);
    if (i === 2) delete expected.pieces[second];
    if (i === 3)
      expected.pieces[second] = structuredClone(original.pieces[second]);
    if (i === 4) {
      const record = expected.pieces[id];
      delete expected.pieces[id];
      expected.pieces[id] = record;
    }
    expected.players[0].bonuses.discount =
      i % 2 ? undefined : { kind: "civic", raw: 2, processed: 0 };
    const delta = snapshotDelta(before, expected);
    freeze(before);
    freeze(delta);
    snapshots.push(applyPublishedDelta(before, delta));
  }
  const after = snapshots.at(-1)!;
  freeze(after);
  const keys = vi.spyOn(Object, "keys");
  let composed;
  try {
    composed = publishedSnapshotDelta(original, after);
    expect(
      keys.mock.calls.some(([value]) =>
        snapshots.some((s) => s.pieces === value),
      ),
    ).toBe(false);
  } finally {
    keys.mockRestore();
  }
  same(applySnapshotDelta(original, composed), after);
  for (const before of snapshots)
    same(
      applySnapshotDelta(before, publishedSnapshotDelta(before, after)),
      after,
    );
});

it("composes top-level deletions, undefined values and full-map replacements exactly", () => {
  const s = fixture();
  const snapshots: Game[] = [s];
  const changes = [
    (next: Game) => {
      delete next.climatePlan;
      next.towerSieges = undefined;
    },
    (next: Game) => {
      next.climatePlan = { "0,0": "cold" };
      next.towerSieges = {};
    },
    (next: Game) => {
      next.climatePlan!["1,0"] = "arctic";
    },
    (next: Game) => {
      delete next.climatePlan;
      delete next.towerSieges;
    },
    (next: Game) => {
      next.climatePlan = {};
      next.towerSieges = undefined;
    },
    (next: Game) => {
      next.climatePlan!["0,0"] = "temperate";
    },
  ];
  let composed = snapshotDelta(s, s);
  for (const change of changes) {
    const before = snapshots.at(-1)!,
      after = structuredClone(before);
    change(after);
    const delta = snapshotDelta(before, after);
    freeze(delta);
    composed = composeSnapshotDeltas(composed, delta);
    const received = applyPublishedDelta(before, delta);
    snapshots.push(received);
    same(applySnapshotDelta(s, composed), after);
    same(applySnapshotDelta(s, publishedSnapshotDelta(s, received)), after);
  }
});

it("preserves literal IDs, explicit undefined entries, empty maps and insertion order", () => {
  const initial = fixture();
  const record = Object.values(initial.pieces)[0];
  const dictionaries = [
    { "3": record, u7: record, u2: undefined },
    { u2: undefined, "1": record, u7: record },
    {},
    Object.fromEntries([
      ["__proto__", record],
      ["constructor", undefined],
      ["u7", record],
    ]),
    { u7: record },
  ];
  let before = initial,
    combined = snapshotDelta(initial, initial);
  for (const records of dictionaries) {
    const after = { ...before, pieces: records as Game["pieces"] };
    const delta = snapshotDelta(before, after);
    combined = composeSnapshotDeltas(combined, delta);
    const actual = applySnapshotDelta(initial, combined);
    same(actual, after);
    expect(Object.getPrototypeOf(actual.pieces)).toBe(Object.prototype);
    before = after;
  }
});

it("uses the exact fallback for human orders, unrelated branches and missing links", () => {
  const base = fixture(),
    a = run(base, { type: "bank", give: { gold: 1 }, take: { grain: 1 } }),
    b = run(base, { type: "bank", give: { gold: 2 }, take: { lumber: 2 } });
  const first = applyPublishedDelta(base, snapshotDelta(base, a));
  const branch = applyPublishedDelta(base, snapshotDelta(base, b));
  const human = run(first, {
    type: "bank",
    give: { gold: 1 },
    take: { grain: 1 },
  });
  const next = { ...human, actions: human.actions + 1 };
  const after = applyPublishedDelta(human, snapshotDelta(human, next));
  for (const [before, target] of [
    [first, branch],
    [base, human],
    [base, after],
    [after, base],
    [base, base],
  ]) {
    expect(publishedSnapshotDelta(before, target)).toStrictEqual(
      snapshotDelta(before, target),
    );
    same(
      applySnapshotDelta(before, publishedSnapshotDelta(before, target)),
      target,
    );
  }
});

it("falls back when a predecessor was collected instead of matching counters or seed", () => {
  const references: { value?: Game }[] = [];
  class Collectible {
    ref: { value?: Game };
    constructor(value: Game) {
      this.ref = { value };
      references.push(this.ref);
    }
    deref() {
      return this.ref.value;
    }
  }
  vi.stubGlobal("WeakRef", Collectible);
  try {
    const before = fixture(),
      next = { ...before, actions: before.actions + 1 },
      after = applyPublishedDelta(before, snapshotDelta(before, next));
    delete references[0].value;
    const current = publishedSnapshotDelta(before, after);
    expect(current).toStrictEqual(snapshotDelta(before, after));
    same(applySnapshotDelta(before, current), next);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("bounds composed history and changed-record work without skipping any update", () => {
  const before = fixture(),
    history = [before];
  for (let i = 0; i < 33; i++) {
    const base = history.at(-1)!,
      next = { ...base, actions: base.actions + 1 };
    history.push(applyPublishedDelta(base, snapshotDelta(base, next)));
  }
  expect(publishedSnapshotDelta(before, history.at(-1)!)).toStrictEqual(
    snapshotDelta(before, history.at(-1)!),
  );
  const large = structuredClone(before);
  for (let i = 0; i < 4200; i++) piece(large, "0,0");
  const first = applyPublishedDelta(before, snapshotDelta(before, large));
  const next = { ...first, actions: first.actions + 1 },
    after = applyPublishedDelta(first, snapshotDelta(first, next));
  expect(publishedSnapshotDelta(before, after)).toStrictEqual(
    snapshotDelta(before, after),
  );
  same(
    applySnapshotDelta(before, publishedSnapshotDelta(before, after)),
    after,
  );
});

it("matches all intermediate origins through deterministic mixed record and field edits", () => {
  const initial = fixture(),
    history = [initial];
  let random = 7193;
  const draw = (n: number) => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return random % n;
  };
  for (let step = 0; step < 24; step++) {
    const before = history.at(-1)!,
      after = structuredClone(before),
      keys = Object.keys(after.pieces);
    switch (draw(6)) {
      case 0:
        piece(after, "1,0", draw(4), "heavy", 1 + draw(4));
        break;
      case 1:
        if (keys.length) delete after.pieces[keys[draw(keys.length)]];
        break;
      case 2:
        if (keys.length) after.pieces[keys[draw(keys.length)]].moved = draw(5);
        break;
      case 3:
        after.pieces = Object.fromEntries(
          Object.entries(after.pieces).reverse(),
        );
        break;
      case 4:
        after.productionSupport = undefined;
        break;
      case 5:
        delete after.productionSupport;
        break;
    }
    after.actions++;
    if (step % 3 === 0) delete after.towerSieges;
    if (step % 3 === 1) after.towerSieges = {};
    history.push(applyPublishedDelta(before, snapshotDelta(before, after)));
    for (const origin of history) {
      const target = history.at(-1)!;
      same(
        applySnapshotDelta(origin, publishedSnapshotDelta(origin, target)),
        target,
      );
    }
  }
});
