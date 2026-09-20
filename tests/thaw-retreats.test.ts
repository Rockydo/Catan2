import { describe, expect, it } from "vitest";
import { thawFixture } from "./thaw-fixture";
import { piece, run } from "./helpers";
import { canApplyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { thawLanding } from "../src/game/thaw-retreats";

function finish(s: ReturnType<typeof thawFixture>["s"]) {
  syncSeasonSurfaces(s);
  assertInvariants(s);
  const result = run(s, { type: "end-turn" });
  assertInvariants(result);
  return result;
}

describe("automatic retreat when sea ice melts", () => {
  it("lands even exhausted and newly recruited units, without spending movement or mutating command previews", () => {
    const { s, land } = thawFixture();
    land("1,0");
    const u = piece(s, "0,0", 1);
    Object.assign(u, { moved: 1, acted: true, born: s.players[1].turns });
    syncSeasonSurfaces(s);
    const before = structuredClone(s);
    expect(canApplyCommand(s, { type: "end-turn" })).toBe(true);
    expect(s).toEqual(before);
    const next = finish(s);
    expect(next.pieces[u.id]).toMatchObject({
      tile: "1,0",
      moved: 1,
      acted: true,
    });
    expect(next.pieces[u.id].seasonStatus).toBeUndefined();
    expect(next.battle).toBeUndefined();
    expect(next.thawRetreats).toBeUndefined();
    expect(next.active).toBe(0);
    expect(next.phase).toBe("roll");
    expect(next.round).toBe(4);
  });

  it("crosses the melting ice sheet to the nearest safe shore and ignores a closer hostile landing", () => {
    const { s, land, ice } = thawFixture();
    ice("1,0");
    ice("2,0");
    land("3,0");
    land("0,1");
    const u = piece(s, "0,0", 1),
      foe = piece(s, "0,1", 0);
    const next = finish(s);
    expect(next.pieces[u.id].tile).toBe("3,0");
    expect(next.pieces[foe.id].tile).toBe("0,1");
    expect(next.battle).toBeUndefined();
  });

  it("can share the safe landing with an allied army", () => {
    const { s, land } = thawFixture();
    land("1,0");
    s.alliances = [
      { id: "test-pact", members: [0, 1], threat: 2, lockedUntil: 20 },
    ];
    piece(s, "1,0", 0);
    expect(thawLanding(s, "0,0", 1, new Set(["0,0"]))).toMatchObject({
      tile: "1,0",
      defenders: [],
    });
  });

  it.each(["open sea", "Bare Peaks", "hostile ice"])(
    "never retreats through %s to reach distant land",
    (barrier) => {
      const { s, land, ice } = thawFixture();
      land("2,0");
      if (barrier === "Bare Peaks") {
        land("1,0");
        s.tiles["1,0"].resource = "peaks";
      }
      if (barrier === "hostile ice") {
        ice("1,0");
        piece(s, "1,0", 0);
      }
      const u = piece(s, "0,0", 1);
      // Search before the other army moves, as it would at this queue position.
      expect(
        thawLanding(
          s,
          "0,0",
          1,
          new Set(["0,0", ...(barrier === "hostile ice" ? ["1,0"] : [])]),
        ),
      ).toBeUndefined();
      if (barrier !== "hostile ice") {
        const next = finish(s);
        expect(next.pieces[u.id]).toMatchObject({
          tile: "0,0",
          seasonStatus: "adrift",
        });
      }
    },
  );

  it("leaves ships and embarked passengers in place while unembarked troops land", () => {
    const { s, land } = thawFixture();
    land("1,0");
    const ship = piece(s, "0,0", 1, "transport"),
      passenger = piece(s, "0,0", 1),
      army = piece(s, "0,0", 1);
    passenger.carrier = ship.id;
    const next = finish(s);
    expect(next.pieces[army.id].tile).toBe("1,0");
    expect(next.pieces[ship.id].tile).toBe("0,0");
    expect(next.pieces[ship.id].seasonStatus).toBeUndefined();
    expect(next.pieces[passenger.id]).toMatchObject({
      tile: "0,0",
      carrier: ship.id,
    });
  });

  it("uses the nearest hostile shore, then weaker defenses as a distance tie-break", () => {
    const { s, land } = thawFixture();
    land("1,0");
    land("0,1");
    piece(s, "1,0", 0, "heavy", 4);
    piece(s, "0,1", 0, "heavy", 1);
    expect(thawLanding(s, "0,0", 1, new Set(["0,0"]))?.tile).toBe("0,1");
  });

  it("forces a normal battle, pauses the turn, rounds casualties to whole units and resumes a saved queue", () => {
    const { s, land, ice } = thawFixture();
    land("1,0");
    land("1,2");
    ice("0,2");
    const a = piece(s, "0,0", 1, "heavy", 4),
      b = piece(s, "0,2", 1, "heavy", 4);
    const d1 = piece(s, "1,0", 0, "heavy", 3),
      d2 = piece(s, "1,2", 0, "heavy", 1);
    let next = finish(s);
    expect(next.battle).toMatchObject({
      thawRetreat: true,
      attacker: 1,
      loser: 0,
      loss: 1,
      required: 3,
      target: "1,0",
    });
    expect(next.thawRetreats?.pending).toHaveLength(1);
    expect(canApplyCommand(next, { type: "roll" })).toBe(false);
    const loaded = deserialize(serialize(next));
    expect(loaded).toEqual(next);
    next = run(loaded, { type: "resolve-battle", actor: 0, ids: [d1.id] });
    assertInvariants(next);
    expect(next.pieces[a.id].tile).toBe("1,0");
    expect(next.battle?.target).toBe("1,2");
    expect(next.thawRetreats?.pending).toHaveLength(0);
    next = run(deserialize(serialize(next)), {
      type: "resolve-battle",
      actor: 0,
      ids: [d2.id],
    });
    expect(next.pieces[b.id].tile).toBe("1,2");
    expect(next.pieces[b.id].moved).toBe(0);
    expect(next.battle).toBeUndefined();
    expect(next.thawRetreats).toBeUndefined();
    expect(next.active).toBe(0);
    expect(canApplyCommand(next, { type: "roll" })).toBe(true);
    assertInvariants(next);
  });

  it("applies the landing terrain's bonuses and lets AI resolve a losing forced landing outside its turn", () => {
    const { s, land } = thawFixture();
    land("1,0");
    s.tiles["1,0"].resource = "ore";
    const a = piece(s, "0,0", 1, "light", 3),
      d = piece(s, "1,0", 0, "heavy", 2);
    let next = finish(s);
    expect(next.battle).toMatchObject({
      attackerPower: 3,
      defenderPower: 4,
      loser: 1,
      required: 3,
    });
    const action = chooseAIAction(next);
    expect(action).toMatchObject({
      type: "resolve-battle",
      actor: 1,
      ids: [a.id],
    });
    next = run(next, action);
    expect(next.pieces[a.id]).toBeUndefined();
    expect(next.pieces[d.id].tile).toBe("1,0");
    expect(next.active).toBe(0);
    expect(next.thawRetreats).toBeUndefined();
    assertInvariants(next);
  });

  it("keeps survivors available for rescue after a tied landing and destroys exposed civilian units", () => {
    const { s, land } = thawFixture();
    land("1,0");
    const a = piece(s, "0,0", 1),
      merchant = piece(s, "0,0", 1, "merchant");
    piece(s, "1,0", 0);
    const next = finish(s);
    expect(next.pieces[a.id]).toMatchObject({
      tile: "0,0",
      seasonStatus: "adrift",
    });
    expect(next.pieces[merchant.id]).toBeUndefined();
    expect(next.battle).toBeUndefined();
    expect(next.thawRetreats).toBeUndefined();
  });

  it("loads old adrift troops without moving them, then tries a landing at the next round boundary", () => {
    const { s, land } = thawFixture();
    land("1,0");
    s.tiles["0,0"].surface = "open";
    const a = piece(s, "0,0", 1);
    syncSeasonSurfaces(s);
    const save = JSON.parse(serialize(s));
    save.version = 13;
    const loaded = deserialize(JSON.stringify(save));
    expect(loaded.pieces[a.id]).toEqual(a);
    expect(finish(loaded).pieces[a.id].tile).toBe("1,0");
  });

  it("rejects corrupt or detached pending landings", () => {
    const { s, land, ice } = thawFixture();
    land("1,0");
    land("1,2");
    ice("0,2");
    piece(s, "0,0", 1, "heavy", 4);
    piece(s, "0,2", 1, "heavy", 4);
    piece(s, "1,0", 0);
    piece(s, "1,2", 0);
    const next = finish(s);
    const duplicate = structuredClone(next);
    duplicate.thawRetreats!.pending[0].ids.push(
      duplicate.thawRetreats!.pending[0].ids[0],
    );
    expect(() => deserialize(serialize(duplicate))).toThrow(
      "Invalid thaw retreat queue",
    );
    const detached = structuredClone(next);
    delete detached.battle;
    expect(() => deserialize(serialize(detached))).toThrow(
      "Invalid thaw retreat queue",
    );
    const missing = structuredClone(next);
    delete missing.thawRetreats;
    expect(() => deserialize(serialize(missing))).toThrow(
      "Invalid thaw retreat battle",
    );
  });
});
