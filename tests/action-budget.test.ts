import { expect, it } from "vitest";
import { maritimeFixture } from "./maritime-fixture";
import { guildFixture } from "./guild-fixture";
import { piece, run } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { moveTargets, speed } from "../src/game/selectors";
import { serialize, deserialize } from "../src/game/save";

it("four points fund three consecutive battles then a raid, including a save mid-battle", () => {
  let { s, home, enemy } = maritimeFixture();
  home.stock = {};
  enemy.stock = { gold: 7 };
  const army = [
    piece(s, "0,0", 0, "cavalry", 4),
    piece(s, "0,0", 0, "cavalry", 3),
  ];
  army.forEach((u) => (u.bonus = 1));
  for (const tile of ["1,0", "2,0", "3,0"]) piece(s, tile, 1, "heavy", 1);
  const ids = army.map((u) => u.id);
  for (let i = 1; i <= 3; i++) {
    s = run(s, { type: "move", ids, to: `${i},0` });
    expect(s.battle).toBeDefined();
    s = deserialize(serialize(s));
    s = run(s, chooseAIAction(s));
    for (const id of ids)
      expect(s.pieces[id]).toMatchObject({
        tile: `${i},0`,
        moved: i,
        acted: false,
      });
  }
  s = run(s, { type: "siege", ids, town: enemy.id });
  expect(s.towns[home.id].stock).toEqual({ gold: 7 });
  expect(s.towns[enemy.id].stock).toEqual({});
  for (const id of ids) expect(s.pieces[id].moved).toBe(4);
  expect(moveTargets(s, ids)).toEqual({});
  expect(applyCommand(s, { type: "move", ids, to: "2,0" }).ok).toBe(false);
  expect(
    applyCommand(s, { type: "destroy-town", ids, town: enemy.id }).ok,
  ).toBe(false);
});

it.each([false, true])(
  "ties spend one point, not the remaining activation (naval=%s)",
  (naval) => {
    let { s } = maritimeFixture();
    if (naval) for (const t of Object.values(s.tiles)) t.resource = "water";
    const a = piece(s, "0,0", 0, naval ? "galley" : "heavy", 2);
    piece(s, "1,0", 1, naval ? "galley" : "heavy", 2);
    a.bonus = 4 - speed(a);
    for (let i = 1; i <= 4; i++) {
      s = run(s, { type: "move", ids: [a.id], to: "1,0" });
      expect(s.battle).toBeUndefined();
      expect(s.pieces[a.id]).toMatchObject({
        moved: i,
        tile: "0,0",
        acted: false,
      });
    }
    expect(applyCommand(s, { type: "move", ids: [a.id], to: "1,0" }).ok).toBe(
      false,
    );
  },
);

it("surviving losing attackers can withdraw using their remaining points", () => {
  let { s } = maritimeFixture();
  const a = piece(s, "0,0", 0, "heavy", 1),
    b = piece(s, "0,0", 0, "heavy", 1);
  a.bonus = b.bonus = 3;
  piece(s, "1,0", 1, "heavy", 3);
  s = run(s, { type: "move", ids: [a.id, b.id], to: "1,0" });
  s = run(s, { type: "resolve-battle", actor: 0, ids: [a.id] });
  s = run(s, { type: "move", ids: [b.id], to: "-1,0" });
  expect(s.pieces[b.id]).toMatchObject({
    moved: 2,
    tile: "-1,0",
    acted: false,
  });
});

it("AI continues a victorious attack with an adjacent raid in the same turn", () => {
  let { s, enemy } = maritimeFixture();
  const u = piece(s, "2,0", 0, "cavalry", 4);
  piece(s, "3,0", 1, "heavy", 1);
  s = run(s, { type: "move", ids: [u.id], to: "3,0" });
  s = run(s, chooseAIAction(s));
  const action = chooseAIAction(s);
  expect(action).toMatchObject({ type: "siege", town: enemy.id });
  s = run(s, action);
  expect(s.pieces[u.id].moved).toBe(2);
});

it("supply after combat restores options for a whole army without refunding spent points", () => {
  let { s, home, land } = guildFixture("commanders", 3);
  const army = Array.from({ length: 25 }, () => piece(s, land, 0, "heavy", 2));
  const ids = army.map((u) => u.id);
  // Model one already-spent combat/movement point for the ready formation.
  army.forEach((u) => (u.moved = 1));
  const held = piece(s, land);
  held.acted = true;
  const recruit = piece(s, land);
  recruit.born = 10;
  const supplied = piece(s, land);
  supplied.guildSupplied = true;
  supplied.bonus = 2;
  const other = piece(s, "-4,0");
  s = run(s, { type: "guild-order", town: home.id, tier: 3, ids: [ids[0]] });
  for (const id of ids)
    expect(s.pieces[id]).toMatchObject({
      moved: 1,
      bonus: 4,
      guildSupplied: true,
      acted: false,
    });
  expect(s.pieces[held.id]).toEqual(held);
  expect(s.pieces[recruit.id]).toEqual(recruit);
  expect(s.pieces[supplied.id]).toEqual(supplied);
  expect(s.pieces[other.id]).toEqual(other);
  expect(
    applyCommand(s, { type: "guild-order", town: home.id, tier: 1, ids }).ok,
  ).toBe(false);
});

it("a supplied battery can bombard repeatedly while points remain", () => {
  let { s } = maritimeFixture();
  s.tiles["1,0"].resource = "water";
  const gun = piece(s, "0,0", 0, "artillery", 4);
  gun.bonus = 2;
  for (let i = 0; i < 3; i++) piece(s, "1,0", 1, "transport", 2);
  for (let i = 1; i <= 3 && Object.values(s.pieces).some((u) => u.naval); i++) {
    s = run(s, { type: "bombard", ids: [gun.id], to: "1,0" });
    if (s.battle) s = run(s, chooseAIAction(s));
    expect(s.pieces[gun.id]).toMatchObject({ moved: i, acted: false });
  }
  expect(Object.values(s.pieces).filter((u) => u.naval)).toHaveLength(0);
});
