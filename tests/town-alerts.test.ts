import { threatenedFixture } from "./town-alert-fixture";
import { describe, expect, it } from "vitest";
import { funded, piece, run, nextOwnerTurn } from "./helpers";
import { landAtVertex } from "../src/game/world";
import { townSiegeStatuses } from "../src/game/siege-status";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { log } from "../src/game/economy";

describe("owner-specific town alerts and siege progress", () => {
  it("reports the victim and location on a siege step and stores the alert in the save", () => {
    const { s, target, attacker } = threatenedFixture();
    const next = run(s, { type: "siege", town: target.id, ids: [attacker.id] });
    const event = next.events.find((e) => e.townAttack)!;
    expect(event).toMatchObject({
      owner: 1,
      townAttack: {
        kind: "siege",
        town: target.id,
        name: target.name,
        defender: 0,
        vertex: target.vertex,
      },
    });
    expect(townSiegeStatuses(next, next.towns[target.id])[0]).toMatchObject({
      required: 5,
      completed: 1,
      remaining: 4,
      breached: false,
      fraction: 0.2,
    });
    expect(deserialize(serialize(next)).events).toEqual(next.events);
  });
  it("records each raid including replenished goods, then preserves the destroyed town's identity", () => {
    let { s, target, attacker } = threatenedFixture(1, 0);
    target.stock = { grain: 4, steel: 2 };
    s = run(s, { type: "siege", town: target.id, ids: [attacker.id] });
    expect(s.events.at(-1)?.townAttack).toMatchObject({
      kind: "raid",
      goods: { grain: 4, steel: 2 },
    });
    nextOwnerTurn(s);
    s.towns[target.id].stock = { grain: 3 };
    s = run(s, { type: "siege", town: target.id, ids: [attacker.id] });
    expect(s.events.filter((e) => e.townAttack?.kind === "raid")).toHaveLength(
      2,
    );
    expect(s.events.at(-1)?.townAttack?.goods).toEqual({ grain: 3 });
    expect(townSiegeStatuses(s, s.towns[target.id])[0]).toMatchObject({
      breached: true,
      destructionReady: false,
    });
    nextOwnerTurn(s);
    s.towns[target.id].stock = { wool: 5 };
    expect(townSiegeStatuses(s, s.towns[target.id])[0].destructionReady).toBe(
      true,
    );
    s = run(s, { type: "destroy-town", town: target.id, ids: [attacker.id] });
    expect(s.towns[target.id]).toBeUndefined();
    expect(s.events.filter((e) => e.townAttack).at(-1)?.townAttack).toEqual({
      kind: "destroy",
      town: target.id,
      name: target.name,
      defender: 0,
      vertex: target.vertex,
      goods: { wool: 5 },
    });
    assertInvariants(deserialize(serialize(s)));
  });
  it("uses artillery on one hex, updates for reinforcements, and clears after withdrawal", () => {
    let { s, target, tile, attacker } = threatenedFixture();
    s = run(s, { type: "siege", town: target.id, ids: [attacker.id] });
    const sides = landAtVertex(s, target.vertex);
    expect(sides.length).toBeGreaterThan(1);
    piece(s, tile, 1, "artillery", 2);
    piece(s, sides[1], 1, "artillery", 2);
    expect(townSiegeStatuses(s, s.towns[target.id])[0]).toMatchObject({
      required: 3,
      remaining: 2,
    });
    piece(s, tile, 1, "artillery", 2);
    expect(townSiegeStatuses(s, s.towns[target.id])[0]).toMatchObject({
      required: 1,
      remaining: 0,
      fraction: 1,
      breached: false,
    });
    for (const u of Object.values(s.pieces)) delete s.pieces[u.id];
    s = run(s, { type: "end-turn" });
    expect(townSiegeStatuses(s, s.towns[target.id])).toEqual([]);
  });
  it("keeps event IDs unique after the history cap and accepts older saves without alert metadata", () => {
    const s = funded();
    for (let i = 0; i < 260; i++) log(s, `Event ${i}`);
    expect(s.events).toHaveLength(240);
    expect(new Set(s.events.map((e) => e.id)).size).toBe(240);
    assertInvariants(deserialize(serialize(s)));
  });
});
