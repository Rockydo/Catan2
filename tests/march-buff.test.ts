import { it, expect } from "vitest";
import { maritimeFixture, fishingFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import { applyCommand, beginTurn } from "../src/game/engine";
import { CARDS } from "../src/game/content";
import { researchAction, researchUtility } from "../src/game/ai";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
function fixture(kind = "march") {
  const f = maritimeFixture();
  f.s.players[0].hand = [
    { id: `c${f.s.nextId++}`, kind, tier: CARDS[kind].tier, bought: 0 },
  ];
  return f;
}
it.each([
  ["march", 1, 3],
  ["logistics", 2, 3],
  ["coordinated", 3, 4],
  ["campaign", 4, 5],
] as const)(
  "%s gives its exact bonus to its expanded group cap",
  (kind, groups, bonus) => {
    const { s } = fixture(kind);
    const units = Array.from({ length: groups + 1 }, (_, i) =>
      piece(s, `${i},0`),
    );
    const c = {
      type: "play-research",
      card: s.players[0].hand[0].id,
      ids: units.map((u) => u.id),
    };
    expect(applyCommand(s, c).ok).toBe(false);
    const n = run(s, { ...c, ids: c.ids.slice(0, groups) });
    for (const u of units.slice(0, groups))
      expect(n.pieces[u.id].bonus).toBe(bonus);
    expect(n.pieces[units[groups].id].bonus).toBe(0);
    assertInvariants(deserialize(serialize(n)));
  },
);
it("an infantry army can use all normal movement, receive Forced March, then travel three more tiles", () => {
  let { s } = fixture();
  const u = piece(s, "0,0");
  s = run(s, { type: "move", ids: [u.id], to: "1,0" });
  expect(applyCommand(s, { type: "move", ids: [u.id], to: "2,0" }).ok).toBe(
    false,
  );
  expect(researchUtility(s, "march")).toBeGreaterThan(0);
  const ai = researchAction(s, s.players[0].hand[0].id)!;
  expect(ai.ids).toContain(u.id);
  s = run(s, ai);
  expect(s.pieces[u.id].moved).toBe(1);
  s = run(s, { type: "move", ids: [u.id], to: "4,0" });
  expect(s.pieces[u.id].moved).toBe(4);
  expect(applyCommand(s, { type: "move", ids: [u.id], to: "5,0" }).ok).toBe(
    false,
  );
  expect(deserialize(serialize(s)).pieces[u.id].bonus).toBe(3);
  beginTurn(s);
  expect(s.pieces[u.id].bonus).toBe(0);
});
it("the bonus cannot bypass enemy blockers", () => {
  let { s } = fixture();
  for (const t of Object.values(s.tiles)) if (t.r !== 0) t.resource = "water";
  const u = piece(s, "0,0");
  piece(s, "1,0", 1);
  s = run(s, {
    type: "play-research",
    card: s.players[0].hand[0].id,
    ids: [u.id],
  });
  expect(applyCommand(s, { type: "move", ids: [u.id], to: "2,0" }).ok).toBe(
    false,
  );
  expect(applyCommand(s, { type: "move", ids: [u.id], to: "1,0" }).ok).toBe(
    true,
  );
});
it.each(["spent", "new", "embarked"] as const)(
  "does not reactivate %s units",
  (status) => {
    const { s } = fixture();
    const u = piece(s, "0,0");
    if (status === "spent") u.acted = true;
    if (status === "new") u.born = s.players[0].turns;
    if (status === "embarked") u.carrier = "ship";
    expect(
      applyCommand(s, {
        type: "play-research",
        card: s.players[0].hand[0].id,
        ids: [u.id],
      }).ok,
    ).toBe(false);
  },
);
it("fleets can receive the same bonus after ordinary sailing", () => {
  const { s, water } = fishingFixture();
  s.players[0].hand = [
    { id: `c${s.nextId++}`, kind: "logistics", tier: 2, bought: 0 },
  ];
  const u = piece(s, water, 0, "galley", 1);
  u.moved = 2;
  const n = run(s, {
    type: "play-research",
    card: s.players[0].hand[0].id,
    ids: [u.id],
  });
  expect(n.pieces[u.id]).toMatchObject({ moved: 2, bonus: 3, acted: false });
});
