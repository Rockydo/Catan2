import { describe, expect, it } from "vitest";
import { groupMapUnits, townMapView } from "../src/ui/map-scene";
import { piece } from "./helpers";
import { maritimeFixture } from "./maritime-fixture";
import type { Game, Piece } from "../src/game/types";

function units() {
  const s = { pieces: {}, nextId: 1 } as Game;
  const a = piece(s, "0,0"),
    b = piece(s, "0,0"),
    c = piece(s, "1,0", 1),
    ship = piece(s, "2,0", 0, "convoy"),
    passenger = piece(s, "2,0");
  passenger.carrier = ship.id;
  return { s, a, b, c, ship, passenger };
}
const record = (...pieces: Piece[]) => pieces;

describe("map formations", () => {
  it("reuses ordered formations, excludes passengers and never mutates prior arrays", () => {
    const { s, a, b, c, ship } = units();
    const first = groupMapUnits(Object.values(s.pieces));
    expect(first).toEqual({ "0,0": [a, b], "1,0": [c], "2,0": [ship] });
    for (const group of Object.values(first)) Object.freeze(group);
    const second = groupMapUnits(Object.values({ ...s.pieces }), first);
    expect(Object.keys(second)).toEqual(Object.keys(first));
    for (const tile of Object.keys(first))
      expect(second[tile]).toBe(first[tile]);
  });

  it("updates both ends of moves and releases empty groups", () => {
    const { s, a, b, c, ship } = units();
    const before = groupMapUnits(Object.values(s.pieces));
    const moved = { ...c, tile: a.tile };
    const after = groupMapUnits(record(a, b, moved, ship), before);
    expect(after).toEqual({ "0,0": [a, b, moved], "2,0": [ship] });
    expect(after[ship.tile]).toBe(before[ship.tile]);
    expect(before[a.tile]).toEqual([a, b]);
    expect(before[c.tile]).toEqual([c]);
    expect(groupMapUnits([], after)).toEqual({});
  });

  it("handles casualties, recruitment, embarking and disembarking in exact record order", () => {
    const { s, a, b, c, ship, passenger } = units();
    const before = groupMapUnits(Object.values(s.pieces)),
      fresh = { ...b, id: "u9" },
      landed = { ...passenger, tile: a.tile, carrier: undefined },
      aboard = { ...c, carrier: ship.id };
    const after = groupMapUnits(
      record(ship, b, a, fresh, landed, aboard),
      before,
    );
    expect(Object.keys(after)).toEqual([ship.tile, a.tile]);
    expect(after[a.tile]).toEqual([b, a, fresh, landed]);
    expect(after[ship.tile]).toBe(before[ship.tile]);
    const casualty = groupMapUnits(record(ship, b), after);
    expect(casualty[a.tile]).toEqual([b]);
    expect(casualty[ship.tile]).toBe(before[ship.tile]);
    expect(after[a.tile]).toEqual([b, a, fresh, landed]);
  });

  it("invalidates a formation when any member changes without moving", () => {
    const { s, a, b, c, ship } = units();
    const before = groupMapUnits(Object.values(s.pieces)),
      updated = { ...b, moved: 2, owner: 1, tier: 4, guildPower: 2 };
    const after = groupMapUnits(record(a, updated, c, ship), before);
    expect(after[a.tile]).not.toBe(before[a.tile]);
    expect(after[a.tile]).toEqual([a, updated]);
    expect(after[c.tile]).toBe(before[c.tile]);
    expect(before[a.tile][1]).toBe(b);
  });
});

describe("town map appearance", () => {
  it("ignores stocks and orders but retains all visible town and guild changes", () => {
    const { s, home } = maritimeFixture();
    const before = townMapView(s, home, false);
    home.stock.gold = 500;
    home.recruited = 8;
    expect(townMapView(s, home, false)).toEqual(before);
    home.level = 3;
    home.wall = 2;
    home.name = "New name";
    home.extensions.a = 1;
    home.guilds = [
      { kind: "artisans", tier: 2, used: false, born: 0, auto: false },
      { kind: "builders", tier: 1, used: false, born: 0, auto: false },
    ];
    const changed = townMapView(s, home, false);
    expect(changed).toMatchObject({
      level: 3,
      wall: 2,
      name: "New name",
      extensionCount: 1,
      guildKind: "artisans",
      guildTier: 2,
      guildCount: 2,
    });
    expect(changed.guildLabel).toContain("tier 2");
    expect(changed.guildTitle).toContain("Builders");
    home.guilds[0].used = true;
    expect(townMapView(s, home, false)).toEqual(changed);
    home.owner = 1;
    s.players[1].name = "Rebels";
    expect(townMapView(s, home, false)).toMatchObject({
      owner: 1,
      ownerName: "Rebels",
    });
  });

  it("updates siege appearance from artillery and attacker turns outside the town", () => {
    const { s, enemy } = maritimeFixture();
    enemy.level = 4;
    enemy.wall = 2;
    const tile = s.vertices[enemy.vertex].tiles[0];
    const gun = piece(s, tile, 0, "artillery", 1);
    s.sieges[`0:${enemy.id}`] = {
      owner: 0,
      town: enemy.id,
      progress: 1,
      last: 10,
      raided: null,
      units: [gun.id],
    };
    expect(townMapView(s, enemy, true)).toMatchObject({
      siegeBadge: "SIEGE 1/4",
      siegeFraction: 0.25,
    });
    const changed = {
      ...s,
      pieces: { ...s.pieces, [gun.id]: { ...gun, tier: 3 } },
    };
    expect(townMapView(changed, enemy, true)).toMatchObject({
      siegeBadge: "SIEGE 1/2",
      siegeFraction: 0.5,
    });
    s.sieges[`0:${enemy.id}`].raided = 10;
    expect(townMapView(s, enemy, true).siegeLabel).toContain(
      "next attacker turn",
    );
    s.players[0].turns++;
    expect(townMapView(s, enemy, true)).toMatchObject({
      siegeBadge: "BREACHED",
      siegeFraction: 1,
      siegeLabel: "Breached · destruction possible now",
    });
    expect(townMapView(s, enemy, false).siegeBadge).toBeUndefined();
  });
});
