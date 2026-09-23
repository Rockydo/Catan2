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

it("engineering supply compares full formations and preserves ties after tower defenses change", () => {
  const { s, home, enemy } = guildFixture("engineers", 3);
  s.players[0].control = "standard";
  for (const tile of Object.values(s.tiles)) tile.resource = "peaks";
  for (const id of ["0,-1", "0,0", "1,0", "2,0", "3,0"])
    s.tiles[id].resource = "grain";
  home.vertex = s.tiles["0,0"].vertices.find((vertex) =>
    s.vertices[vertex].tiles.includes("0,-1"),
  )!;
  enemy.vertex = s.tiles["3,0"].vertices[0];
  enemy.level = enemy.turnLevel = 4;
  enemy.wall = 4;
  const artillery = piece(s, "0,0", 0, "artillery", 4),
    infantry = piece(s, "0,-1", 0, "heavy", 4);
  const order = (game: typeof s) =>
    withPlanningFrame(game, () => guildMilitaryOrder(game, true));
  // Existing artillery leaves less siege work, so the other formation benefits
  // more. The highest guild tier still equips the complete chosen formation.
  expect(order(s)).toMatchObject({ tier: 3, ids: [infantry.id] });
  const reinforced = structuredClone(s);
  reinforced.towers[enemy.vertex] = {
    id: "defense",
    vertex: enemy.vertex,
    owner: enemy.owner,
    tier: 4,
  };
  // Both formations now benefit from all six siege points. Original army order
  // breaks the tie; the older position must retain its earlier choice.
  expect(order(reinforced)).toMatchObject({ tier: 3, ids: [artillery.id] });
  expect(order(s)).toMatchObject({ tier: 3, ids: [infantry.id] });
  const blocked = structuredClone(reinforced);
  piece(blocked, "1,0", 1, "heavy");
  expect(order(blocked)).toBeNull();
});
