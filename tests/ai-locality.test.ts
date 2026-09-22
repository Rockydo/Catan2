import { expect, it } from "vitest";
import { funded, piece } from "./helpers";
import {
  ownPieces,
  ownPiecesAtVertex,
  ownTowns,
  withPlanningFrame,
} from "../src/game/selectors";
import { guildUnits } from "../src/game/guilds";
import { leavesTownExposed, townGuardPower } from "../src/game/ai-strategy";
import { walkableAtVertex } from "../src/game/world";
import type { GuildKind } from "../src/game/types";

it("nearby guild forces retain campaign ordering, exclude passengers and refresh after movement", () => {
  const s = funded("guild-locality");
  const town = ownTowns(s)[0],
    tiles = s.vertices[town.vertex].tiles;
  s.pieces = {};
  for (let i = 0; i < 60; i++) {
    const u = piece(
      s,
      i % 5 === 0 ? "30,30" : tiles[i % tiles.length],
      Math.floor(i / 2) % 4,
      i % 2 ? "heavy" : "galley",
    );
    if (i % 7 === 0) u.carrier = "passenger";
    if (i % 11 === 0) u.acted = true;
    if (i % 13 === 0) u.guildSupplied = true;
  }
  const check = () => {
    const expected = ownPieces(s, town.owner).filter(
      (u) => !u.carrier && tiles.includes(u.tile),
    );
    const guilds = (
      ["commanders", "navigators", "engineers"] as GuildKind[]
    ).map((kind) => ({
      ...town,
      guild: { kind, tier: 2, born: 0, used: false, auto: false },
    }));
    const unindexed = guilds.map((t) => guildUnits(s, t));
    withPlanningFrame(s, () => {
      expect(ownPiecesAtVertex(s, town.vertex)).toEqual(expected);
      ownPiecesAtVertex(s, town.vertex).reverse();
      expect(ownPiecesAtVertex(s, town.vertex)).toEqual(expected);
      guilds.forEach((t, i) => expect(guildUnits(s, t)).toEqual(unindexed[i]));
    });
  };
  check();
  ownPieces(s)[0].tile = "40,40";
  check();
});

it("garrison checks keep identical results as a detachment shrinks or replaces a soldier", () => {
  const s = funded("departure-locality");
  s.pieces = {};
  const town = ownTowns(s)[0],
    tiles = walkableAtVertex(s, town.vertex);
  const home = tiles[0];
  const group = Array.from({ length: 8 }, () => piece(s, home));
  const replacement = piece(s, home, 0, "heavy", 4);
  const enemy = piece(s, tiles.at(-1)!, 1, "heavy", 4);
  piece(s, tiles.at(-1)!, 1, "heavy", 4);
  const detachments = [
    group.slice(),
    group.slice(0, 7),
    group.slice(0, 4),
    [replacement, ...group.slice(1, 4)],
  ];
  const expected = detachments.map((units) => ({
    exposure: leavesTownExposed(s, units),
    defended: leavesTownExposed(s, units, home),
    defeated: leavesTownExposed(s, units, undefined, [enemy.id]),
    power: townGuardPower(
      s,
      town,
      units.map((u) => u.id),
    ),
  }));
  expect(
    new Set(expected.map((value) => value.defeated)).size,
    JSON.stringify(expected),
  ).toBe(2);
  withPlanningFrame(s, () => {
    const mutable = group.slice();
    detachments.forEach((units, i) => {
      mutable.length = 0;
      for (const u of units) mutable.push(u);
      expect({
        exposure: leavesTownExposed(s, mutable),
        defended: leavesTownExposed(s, mutable, home),
        defeated: leavesTownExposed(s, mutable, undefined, [enemy.id]),
        power: townGuardPower(
          s,
          town,
          mutable.map((u) => u.id),
        ),
      }).toEqual(expected[i]);
    });
  });
});
