import { expect, it } from "vitest";
import { guildMilitaryOrder } from "../src/game/guild-ai";
import { speed, withPlanningFrame } from "../src/game/selectors";
import { guildFixture } from "./guild-fixture";
import { piece } from "./helpers";

for (const naval of [false, true])
  it(`${naval ? "naval" : "land"} supply requires a reachable target beyond the exact remaining movement`, () => {
    const { s, home, enemy } = guildFixture(
      naval ? "navigators" : "commanders",
      1,
    );
    s.players[0].control = "standard";
    for (const tile of Object.values(s.tiles)) tile.resource = "peaks";
    for (const id of ["0,0", "1,0", "2,0", "3,0"])
      s.tiles[id].resource = naval ? "water" : "grain";
    s.tiles["0,-1"].resource = "grain";
    home.vertex = s.tiles["0,0"].vertices[0];
    enemy.vertex = s.tiles["3,0"].vertices[0];
    if (naval) piece(s, "3,0", 1, "galley");
    const unit = piece(s, "0,0", 0, naval ? "galley" : "cavalry");
    unit.bonus = Math.max(0, 3 - speed(unit));
    const order = (game = s) =>
      withPlanningFrame(game, () => guildMilitaryOrder(game));
    expect(order()).toBeNull();
    const short = structuredClone(s);
    short.pieces[unit.id].moved = 1;
    expect(order(short)).toMatchObject({ type: "guild-order", ids: [unit.id] });
    const blocked = structuredClone(short);
    piece(blocked, "1,0", 1, naval ? "galley" : "heavy");
    // A hostile fleet itself is an objective, but this close blocker is already
    // within movement. It cannot make the distant objective reachable.
    expect(order(blocked)).toBeNull();
    const weather = structuredClone(short);
    weather.tiles["2,0"].surface = naval ? "frozen" : "open";
    expect(order(weather)).toBeNull();
    // An earlier immutable position keeps its original route and supply choice.
    expect(order(short)).toMatchObject({ type: "guild-order", ids: [unit.id] });
  });

it("engineers can supply an attack destination but cannot cross a hostile corridor", () => {
  const { s, home, enemy } = guildFixture("engineers", 2);
  s.players[0].control = "standard";
  for (const tile of Object.values(s.tiles)) tile.resource = "peaks";
  for (const id of ["0,0", "1,0", "2,0", "3,0"]) s.tiles[id].resource = "grain";
  home.vertex = s.tiles["0,0"].vertices[0];
  enemy.vertex = s.tiles["3,0"].vertices[0];
  enemy.wall = 3;
  const unit = piece(s, "0,0", 0, "heavy", 4);
  piece(s, "3,0", 1, "heavy");
  expect(withPlanningFrame(s, () => guildMilitaryOrder(s, true))).toMatchObject(
    {
      type: "guild-order",
      guild: "engineers",
      ids: [unit.id],
    },
  );
  const blocked = structuredClone(s);
  piece(blocked, "1,0", 1, "heavy");
  expect(
    withPlanningFrame(blocked, () => guildMilitaryOrder(blocked, true)),
  ).toBeNull();
  const allied = structuredClone(s);
  allied.alliances = [
    { id: "pact", members: [0, 1], threat: 2, lockedUntil: 10 },
  ];
  expect(
    withPlanningFrame(allied, () => guildMilitaryOrder(allied, true)),
  ).toBeNull();
});
