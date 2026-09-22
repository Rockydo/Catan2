import { expect, it } from "vitest";
import {
  applyCommand,
  canApplyCommand,
  commandError,
} from "../src/game/engine";
import { GUILD_KINDS } from "../src/game/guilds";
import type { Command, Game } from "../src/game/types";
import { guildFixture } from "./guild-fixture";
import { piece } from "./helpers";

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
