import { expect, it } from "vitest";
import { applyCommand, eliminate, execute } from "../src/game/engine";
import { breakSieges } from "../src/game/military";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { routeSites, settlementSites } from "../src/game/selectors";
import type { Command, Game } from "../src/game/types";
import { piece } from "./helpers";
import { maritimeFixture } from "./maritime-fixture";

const operations = [
  "bank",
  "city",
  "wall",
  "extension",
  "road",
  "route",
  "settlement",
  "camp",
  "tower",
  "guild",
  "contract",
] as const;
function fixture(operation: (typeof operations)[number]) {
  const { s, home, enemy } = maritimeFixture();
  const addRoad = () => {
    const edge = routeSites(s, "road")[0];
    if (!edge) throw Error("Fixture needs a legal road");
    s.routes[edge] = {
      id: `r${s.nextId++}`,
      owner: 0,
      edge,
      kind: "road",
      camps: {},
      born: 0,
    };
    return edge;
  };
  let command: Command;
  switch (operation) {
    case "bank":
      command = { type: "bank", give: { gold: 1 }, take: { grain: 1 } };
      break;
    case "city":
      home.level = home.turnLevel = 1;
      command = { type: "city", town: home.id };
      break;
    case "wall":
      command = { type: "wall", town: home.id };
      break;
    case "extension":
      command = { type: "extension", town: home.id, tile: "0,0" };
      break;
    case "road":
      command = { type: "road", edge: routeSites(s, "road")[0] };
      break;
    case "route":
      for (const tile of s.vertices[home.vertex].tiles.slice(0, 2))
        s.tiles[tile].resource = "water";
      command = { type: "route", edge: routeSites(s, "route")[0] };
      break;
    case "settlement":
      for (let i = 0; i < 25 && !settlementSites(s).length; i++) addRoad();
      command = { type: "settlement", vertex: settlementSites(s)[0] };
      expect(command.vertex).toBeDefined();
      break;
    case "camp": {
      const edge = addRoad();
      command = { type: "camp", edge, tile: s.edges[edge].tiles[0] };
      break;
    }
    case "tower":
      addRoad();
      command = { type: "tower", vertex: home.vertex };
      break;
    case "guild":
      command = { type: "guild", town: home.id, kind: "artisans" };
      break;
    case "contract":
      home.guild = {
        kind: "artisans",
        tier: 3,
        born: 0,
        used: false,
        auto: false,
      };
      command = { type: "guild-order", town: home.id, kind: "coal", tier: 2 };
      break;
  }
  for (let i = 0; i < 80; i++)
    piece(s, i % 2 ? "4,0" : "-4,0", i % 2, "heavy", 2);
  piece(s, "3,0", 1, "merchant", 3);
  return { s, home, enemy, command };
}

function reference(s: Game, command: Command): Game {
  const result = structuredClone(s);
  if (result.phase === "military") result.phase = "economy";
  result.actions++;
  execute(result, command);
  breakSieges(result);
  eliminate(result);
  syncEmergencyCoalition(result);
  return result;
}
function freeze(value: unknown) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}

it.each(operations)(
  "%s retains unchanged troops and geometry with exact full-transaction effects",
  (operation) => {
    const { s, command } = fixture(operation);
    const original = JSON.stringify(s),
      expected = reference(s, command);
    freeze(s);
    const result = applyCommand(s, command);
    expect(result.ok, result.error).toBe(true);
    expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
    expect(JSON.stringify(s)).toBe(original);
    expect(result.state.pieces).toBe(s.pieces);
    expect(result.state.tiles).toBe(s.tiles);
    expect(result.state.vertices).toBe(s.vertices);
    expect(result.state.edges).toBe(s.edges);
    expect(result.state.players).not.toBe(s.players);
    expect(result.state.towns).not.toBe(s.towns);
  },
);

it.each(operations)(
  "a rejected %s purchase leaves the complete input unchanged",
  (operation) => {
    const { s, command } = fixture(operation);
    for (const town of Object.values(s.towns)) town.stock = {};
    const original = JSON.stringify(s);
    freeze(s);
    const result = applyCommand(s, command);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(s);
    expect(JSON.stringify(s)).toBe(original);
  },
);

it("detaches the dictionary when final cleanup can remove a faction's troops", () => {
  const { s, enemy, command } = fixture("bank");
  delete s.towns[enemy.id];
  const expected = reference(s, command),
    original = JSON.stringify(s);
  freeze(s);
  const result = applyCommand(s, command);
  expect(result.ok, result.error).toBe(true);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  expect(result.state.pieces).not.toBe(s.pieces);
  expect(Object.values(result.state.pieces).every((u) => u.owner === 0)).toBe(
    true,
  );
  expect(result.state.winner).toBe(0);
  expect(JSON.stringify(s)).toBe(original);
});

it("keeps existing sieges and coalition cleanup exact without changing troop records", () => {
  const { s, enemy, command } = fixture("bank");
  const attacker = piece(s, "3,0", 0, "heavy");
  const defender = piece(s, "3,0", 1, "heavy");
  s.sieges.enemy = {
    owner: 0,
    town: enemy.id,
    progress: 2,
    last: 9,
    raided: null,
    units: [attacker.id],
  };
  s.alliances = [
    { id: "old-pact", members: [0, 1], threat: 2, lockedUntil: 0 },
  ];
  const expected = reference(s, command);
  freeze(s);
  const result = applyCommand(s, command);
  expect(result.ok, result.error).toBe(true);
  expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  expect(result.state.pieces).toBe(s.pieces);
  expect(result.state.pieces[defender.id]).toBe(defender);
  expect(result.state.sieges).toEqual({});
  expect(s.sieges.enemy).toBeDefined();
});
