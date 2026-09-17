import { describe, expect, it } from "vitest";
import { canApplyCommand, applyCommand } from "../src/game/engine";
import { chooseAIAction, economyProjects } from "../src/game/ai";
import { campaignPowerTarget, conquestDrive } from "../src/game/ai-strategy";
import {
  neighbors,
  unknownAtVertex,
  tileVertices,
  coord,
} from "../src/game/world";
import { coastalFixture, frontierUnitFixture } from "./coastal-fixture";
import { piece } from "./helpers";
import type { Command } from "../src/game/types";

describe("conquest priorities and lossless planning optimizations", () => {
  it("increases a leading realm's offensive commitment without inspecting private stocks", () => {
    const { s, home } = coastalFixture();
    const baseline = conquestDrive(s),
      target = campaignPowerTarget(s);
    const stronger = structuredClone(s);
    stronger.towns[home.id].level = stronger.towns[home.id].turnLevel = 4;
    for (let n = 0; n < 8; n++) piece(stronger, "2,0", 0, "heavy", 4);
    expect(conquestDrive(stronger)).toBeGreaterThan(baseline);
    expect(campaignPowerTarget(stronger)).toBeGreaterThan(target);
    const rich = structuredClone(stronger);
    rich.towns[home.id].stock.gold = 10000;
    expect(conquestDrive(rich)).toBe(conquestDrive(stronger));
  });
  it("validates preview commands exactly and never mutates frozen geometry or the input", () => {
    const { s, gun, home, water } = coastalFixture();
    const before = structuredClone(s);
    function freeze(value: object) {
      Object.freeze(value);
      for (const child of Object.values(value))
        if (child && typeof child === "object") freeze(child);
    }
    freeze(s.tiles);
    freeze(s.vertices);
    freeze(s.edges);
    const commands: Command[] = [
      { type: "bombard", ids: [gun.id], to: water },
      { type: "move", ids: [gun.id], to: "2,0" },
      { type: "move", ids: [gun.id], to: water },
      { type: "wall", town: home.id },
      { type: "city", town: home.id },
      { type: "bank", give: { gold: 1 }, take: { grain: 1 } },
      ...economyProjects(s)
        .slice(0, 15)
        .map((p) => p.action),
    ];
    for (const c of commands)
      expect(canApplyCommand(s, c)).toBe(applyCommand(s, c).ok);
    expect(s).toEqual(before);
    const { s: border } = frontierUnitFixture();
    border.players[0].bonuses.expedition = true;
    border.players[0].bonuses.expeditionTier = 1;
    const c = economyProjects(border).find(
      (p) => p.action.type === "expedition",
    )!.action;
    const untouched = structuredClone(border);
    expect(canApplyCommand(border, c)).toBe(true);
    expect(border).toEqual(untouched);
  });
  it("preserves frontier ordering exactly and does not expose cached neighbor arrays", () => {
    const { s } = frontierUnitFixture();
    for (const v of Object.keys(s.vertices)) {
      const original = [
        ...new Set(s.vertices[v].tiles.flatMap(neighbors)),
      ].filter((t) => !s.tiles[t] && tileVertices(...coord(t)).includes(v));
      expect(unknownAtVertex(s, v)).toEqual(original);
    }
    const expected = neighbors("0,0");
    neighbors("0,0").reverse().pop();
    expect(neighbors("0,0")).toEqual(expected);
  });
  it("takes a favorable attack immediately and still refuses a losing assault", () => {
    const { s, gun, ship } = coastalFixture();
    expect(chooseAIAction(s).type).toBe("bombard");
    const weak = structuredClone(s);
    weak.pieces[gun.id].tier = 1;
    weak.pieces[ship.id].tier = 4;
    expect(chooseAIAction(weak).type).not.toBe("bombard");
  });
});
