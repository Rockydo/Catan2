import { expect, it } from "vitest";
import {
  applyCommand,
  applyCommandPlan,
  canApplyCommand,
  commandError,
} from "../src/game/engine";
import { GUILD_KINDS } from "../src/game/guilds";
import type { Command, Game } from "../src/game/types";
import { guildFixture } from "./guild-fixture";
import { piece } from "./helpers";
import { maritimeFixture } from "./maritime-fixture";

function freeze(root: object) {
  const queue = [root],
    seen = new Set<object>();
  for (let i = 0; i < queue.length; i++) {
    const value = queue[i];
    if (seen.has(value)) continue;
    seen.add(value);
    Object.freeze(value);
    for (const child of Object.values(value))
      if (child && typeof child === "object") queue.push(child);
  }
}

function equivalent(s: Game, command: Command, succeeds?: boolean) {
  const expected = applyCommand(s, command),
    before = structuredClone(s);
  if (succeeds !== undefined) expect(expected.ok).toBe(succeeds);
  freeze(s);
  expect(canApplyCommand(s, command)).toBe(expected.ok);
  expect(commandError(s, command)).toBe(expected.error);
  expect(s).toEqual(before);
}

it.each(GUILD_KINDS)(
  "%s contract previews isolate all affected records at every tier",
  (kind) => {
    for (const tier of [1, 2, 3]) {
      const { s, home, land, water, mineral } = guildFixture(kind, tier);
      s.players[0].control = "standard";
      if (kind === "extractors") s.tiles[land].resource = "brick";
      const unit = piece(
        s,
        kind === "navigators" ? water : land,
        0,
        kind === "navigators" ? "galley" : "heavy",
      );
      // An order supplying one selected member also changes the unlisted member.
      piece(s, unit.tile, 0, unit.kind);
      const command: Command = {
        type: "guild-order",
        town: home.id,
        tier,
        kind: "coal",
        from: "salt",
        to: "stone",
        ids: [unit.id],
        tile: kind === "prospectors" ? mineral : land,
      };
      const poor = structuredClone(s);
      for (const town of Object.values(poor.towns)) town.stock = {};
      equivalent(poor, command, false);
      equivalent(s, command, true);
    }
  },
);

it("bank previews preserve every warehouse on success, insufficient funds and invalid rates", () => {
  for (const give of [{ gold: 1 }, { gold: 100000 }, { gold: 2 }]) {
    const { s, home, enemy } = guildFixture();
    enemy.owner = 0;
    home.stock = { gold: 3 };
    enemy.stock = { gold: 7 };
    equivalent(s, { type: "bank", give, take: { grain: 1 } }, give.gold === 1);
  }
});

it("routine previews still obey pending player decisions", () => {
  for (const phase of [
    "battle",
    "trade",
    "allianceOffer",
    "researchChoice",
  ] as const) {
    const { s } = guildFixture();
    // Only the pending-decision gate is read for an unrelated bank command.
    Object.assign(s, { [phase]: phase === "researchChoice" ? [] : {} });
    equivalent(
      s,
      { type: "bank", give: { gold: 1 }, take: { grain: 1 } },
      false,
    );
  }
});

it("recruitment shares immutable existing units and geometry without touching the source", () => {
  const { s, home, land } = guildFixture();
  const old = piece(s, land, 0, "heavy");
  const before = structuredClone(s);
  freeze(s);
  const command = {
    type: "recruit",
    town: home.id,
    tile: land,
    kind: "heavy",
    tier: 1,
    count: 100,
  };
  const result = applyCommand(s, command);
  expect(result.ok).toBe(true);
  expect(s).toEqual(before);
  expect(result.state.pieces[old.id]).toBe(old);
  expect(result.state.tiles).toBe(s.tiles);
  expect(result.state.pieces).not.toBe(s.pieces);
  expect(canApplyCommand(s, command)).toBe(true);
  expect(s).toEqual(before);
});

it("uncontested movement copies its ship and passengers while preserving frozen stationary records", () => {
  const { s } = maritimeFixture();
  s.tiles["0,0"].resource = s.tiles["1,0"].resource = "water";
  const ship = piece(s, "0,0", 0, "transport"),
    passenger = piece(s, "0,0", 0, "merchant", 3),
    stationary = piece(s, "0,0", 0, "galley"),
    ally = piece(s, "1,0", 1, "galley");
  passenger.carrier = ship.id;
  passenger.coverage = ["0,1"];
  ship.campaign = { enemy: 1, target: "3,0" };
  s.alliances = [{ id: "pact", members: [0, 1], threat: 2, lockedUntil: 20 }];
  const before = structuredClone(s);
  freeze(s);
  const command = { type: "move", ids: [ship.id], to: "1,0" };
  expect(canApplyCommand(s, command)).toBe(true);
  const result = applyCommand(s, command);
  expect(result.ok).toBe(true);
  expect(result.state.tiles).toBe(s.tiles);
  expect(result.state.pieces[ship.id]).toMatchObject({ tile: "1,0", moved: 1 });
  expect(result.state.pieces[passenger.id]).toMatchObject({
    tile: "1,0",
    carrier: ship.id,
  });
  expect(result.state.pieces[ship.id].campaign).toBeUndefined();
  expect(result.state.pieces[passenger.id].coverage).toBeUndefined();
  expect(result.state.pieces[stationary.id]).toBe(stationary);
  expect(result.state.pieces[ally.id]).toBe(ally);
  expect(s).toEqual(before);
  const failure = applyCommand(s, { ...command, to: "3,0" });
  expect(failure.ok).toBe(false);
  expect(failure.state).toBe(s);
  expect(s).toEqual(before);
});

it("a move followed by combat detaches defenders and rolls back a failing later order", () => {
  const { s } = maritimeFixture();
  const attacker = piece(s, "0,0", 0, "cavalry", 4),
    defender = piece(s, "2,0", 1, "heavy", 2);
  const commands: Command[] = [
    { type: "move", ids: [attacker.id], to: "1,0" },
    { type: "move", ids: [attacker.id], to: "2,0" },
  ];
  const before = structuredClone(s);
  freeze(s);
  let expected = s;
  for (const command of commands) {
    const result = applyCommand(expected, command);
    expect(result.ok).toBe(true);
    expected = result.state;
  }
  const result = applyCommandPlan(s, (_, done) => commands[done.length]);
  expect(result.ok).toBe(true);
  expect(result.state.battle).toBeDefined();
  expect(result.state).toEqual(expected);
  expect(result.state.pieces[defender.id]).not.toBe(defender);
  expect(s).toEqual(before);
  const failed = applyCommandPlan(
    s,
    (_, done) =>
      commands[done.length] ??
      (done.length === 2
        ? { type: "move", ids: [attacker.id], to: "3,0" }
        : undefined),
  );
  expect(failed.ok).toBe(false);
  expect(failed.state).toBe(s);
  expect(s).toEqual(before);
});
