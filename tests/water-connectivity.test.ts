import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WildlifeArt, WILDLIFE_ART } from "../src/ui/WildlifeArt";
import { WILDLIFE_GOODS } from "../src/game/geography";
import type { WildlifeKind } from "../src/game/geography";

import { describe, it, expect } from "vitest";
import {
  generateWorld,
  generateHex,
  neighbors,
  addHexes,
} from "../src/game/world";
import {
  isSmallLake,
  geographyAt,
  landform,
  MAX_LAKE_TILES,
  restoreLakeSizes,
} from "../src/game/geography";
import { newGame } from "../src/game/engine";
import {
  serializePacked,
  deserialize,
  assertInvariants,
} from "../src/game/save";
import {
  waterConnections,
  riverGeometry,
  shoreGeometry,
  bankArt,
} from "../src/ui/water-connectivity";
import type { Hex } from "../src/game/types";
import { existsSync } from "node:fs";
import { CLIMATES } from "../src/game/climate-content";
import { SEASONS } from "../src/game/seasons";
const water = (id: string, river = false): Hex => ({
  ...generateHex("water-test", id),
  resource: "water",
  biome: river ? "river" : "lake",
  geography: {
    elevation: 0.3,
    region: "temperate:0,0",
    waterway: river ? "river" : "lake",
  },
});
function lakeGroups(tiles: Record<string, Hex>) {
  const seen = new Set<string>(),
    groups: Hex[][] = [];
  for (const t of Object.values(tiles)) {
    if (seen.has(t.id) || t.geography?.waterway !== "lake") continue;
    const group = [t];
    seen.add(t.id);
    for (let i = 0; i < group.length; i++)
      for (const id of neighbors(group[i].id)) {
        const n = tiles[id];
        if (n?.geography?.waterway !== "lake" || seen.has(id)) continue;
        seen.add(id);
        group.push(n);
      }
    groups.push(group);
  }
  return groups;
}
describe("bounded lakes", () => {
  it("caps connected lakes across all landforms, even after expeditions", () => {
    const forms = new Set<string>();
    let seas = 0,
      lakes = 0;
    for (let i = 0; i < 32; i++) {
      const seed = `water-coasts-${i}`,
        w = generateWorld(seed, 300, true);
      forms.add(landform(seed));
      addHexes(
        w,
        seed,
        [...new Set(Object.keys(w.tiles).flatMap(neighbors))].filter(
          (id) => !w.tiles[id],
        ),
      );
      for (const g of lakeGroups(w.tiles)) {
        expect(g.length).toBeLessThanOrEqual(MAX_LAKE_TILES);
        lakes++;
      }
      for (const t of Object.values(w.tiles)) {
        if (t.geography?.waterway === "lake")
          expect(isSmallLake(seed, t.id)).toBe(true);
        if (t.geography?.waterway === "deep") seas++;
      }
    }
    expect(forms.size).toBeGreaterThanOrEqual(8);
    expect(seas).toBeGreaterThan(0);
    expect(lakes).toBeGreaterThan(0);
  }, 15000);
  it("generates compact multi-hex lakes without changing their unrevealed extent", () => {
    let single = 0,
      multi = 0;
    const sizes = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const seed = `lake-survey-${i}`,
        w = generateWorld(seed, 300, true);
      for (const group of lakeGroups(w.tiles)) {
        const ids = new Set([group[0].id]),
          queue = [group[0].id];
        for (let j = 0; j < queue.length; j++)
          for (const id of neighbors(queue[j])) {
            const g = geographyAt(seed, id);
            if (ids.has(id) || !g.water || g.downstream) continue;
            ids.add(id);
            queue.push(id);
            expect(queue.length).toBeLessThanOrEqual(MAX_LAKE_TILES);
          }
        sizes.add(ids.size);
        if (ids.size === 1) single++;
        else multi++;
        const before = structuredClone(w.tiles);
        addHexes(
          w,
          seed,
          queue.filter((id) => !w.tiles[id]),
        );
        for (const [id, tile] of Object.entries(before))
          expect(w.tiles[id]).toEqual(tile);
        for (const id of ids)
          expect(w.tiles[id].geography?.waterway).toBe("lake");
      }
    }
    expect(single).toBeGreaterThan(0);
    expect(multi).toBeGreaterThan(single);
    expect([...sizes].some((size) => size >= 5)).toBe(true);
  }, 15000);
  it("leaves a twelve-tile lake alone and converts thirteen without changing geography or contents", () => {
    const w = generateWorld("lake-migration", 30, true);
    w.tiles = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => {
        const t = water(`${i},0`);
        return [t.id, t];
      }),
    );
    const before = structuredClone(w.tiles);
    restoreLakeSizes(w);
    expect(w.tiles).toEqual(before);
    w.tiles["12,0"] = water("12,0");
    const thirteen = structuredClone(w.tiles);
    restoreLakeSizes(w);
    for (const t of Object.values(w.tiles)) {
      expect(t.geography?.waterway).toBe("deep");
      expect(t.biome).toBe("water");
      const expected = thirteen[t.id];
      expected.geography!.waterway = "deep";
      expected.biome = "water";
      expect(t).toEqual(expected);
    }
    const once = structuredClone(w);
    restoreLakeSizes(w);
    expect(w).toEqual(once);
  });
  it("repairs an old oversized lake when loading a packed save without losing populations", () => {
    const s = newGame(
      "water-coasts-4",
      Array.from({ length: 12 }, (_, i) => ({
        name: `Faction ${i}`,
        control: i === 0 ? "human" : "standard",
      })),
    );
    let changed = 0;
    for (const t of Object.values(s.tiles))
      if (t.geography && t.resource === "water" && !t.geography.downstream) {
        t.geography.waterway = "lake";
        t.biome = "lake";
        changed++;
      }
    expect(changed).toBeGreaterThan(12);
    assertInvariants(s);
    const restored = deserialize(serializePacked(s));
    expect(restored.wildlife?.map(({ id, kind }) => ({ id, kind }))).toEqual(
      s.wildlife?.map(({ id, kind }) => ({ id, kind })),
    );
    expect(restored.towns).toEqual(s.towns);
    expect(restored.pieces).toEqual(s.pieces);
    expect(Object.keys(restored.tiles)).toEqual(Object.keys(s.tiles));
    for (const group of lakeGroups(restored.tiles))
      expect(group.length).toBeLessThanOrEqual(12);
    assertInvariants(restored);
  });
});
describe("connected water artwork", () => {
  it("does not draw banks on interior water, ice, rivers or unrevealed frontiers", () => {
    const t = water("0,0"),
      tiles = new Map([[t.id, t]]);
    expect(waterConnections(t, tiles).shore).toBe(0);
    neighbors(t.id).forEach((id, i) => {
      const n = water(id, i === 1);
      if (i === 3) n.resource = "ice";
      tiles.set(id, n);
    });
    expect(waterConnections(t, tiles).shore).toBe(0);
    neighbors(t.id).forEach((id, i) => {
      tiles.get(id)!.resource = "stone";
      expect(waterConnections(t, tiles).shore).toBe((1 << (i + 1)) - 1);
    });
  });
  it("joins downstream bends, tributaries, sea mouths and touching river heads", () => {
    const t = water("0,0", true),
      ids = neighbors(t.id),
      tiles = new Map([[t.id, t]]);
    t.geography!.downstream = ids[0];
    const outlet = water(ids[0], true),
      tributary = water(ids[2], true),
      unrelated = water(ids[3], true);
    tributary.geography!.downstream = t.id;
    [outlet, tributary, unrelated, water(ids[5])].forEach((n) =>
      tiles.set(n.id, n),
    );
    expect(waterConnections(t, tiles).channel).toBe(1 + 4 + 8 + 32);
    expect(waterConnections(outlet, tiles).channel & 8).toBe(8);
    tiles.delete(ids[0]);
    expect(waterConnections(t, tiles).channel & 1).toBe(1);
  });
  it("joins neighboring source pools reciprocally without changing their drainage", () => {
    const a = water("0,0", true),
      b = water(neighbors("0,0")[1], true);
    a.geography!.downstream = neighbors(a.id)[4];
    b.geography!.downstream = neighbors(b.id)[0];
    const tiles = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    const before = structuredClone([a, b]);
    expect(waterConnections(a, tiles).channel & (1 << 1)).toBeTruthy();
    expect(waterConnections(b, tiles).channel & (1 << 4)).toBeTruthy();
    expect([a, b]).toEqual(before);
  });
  it("merges adjacent river reaches even when both already have their own upstream", () => {
    const a = water("0,0", true),
      b = water("1,0", true);
    const upstreamA = water("0,-1", true),
      upstreamB = water("2,-1", true);
    upstreamA.geography!.downstream = a.id;
    upstreamB.geography!.downstream = b.id;
    a.geography!.downstream = "-1,1";
    b.geography!.downstream = "1,1";
    const tiles = new Map([a, b, upstreamA, upstreamB].map((t) => [t.id, t]));
    expect(waterConnections(a, tiles).channel & 1).toBe(1);
    expect(waterConnections(b, tiles).channel & 8).toBe(8);
    expect(riverGeometry(63).line).toBe("");
  });
  it("opens a broad river mouth into the sea without phantom parallel banks", () => {
    const t = water("0,0", true),
      ids = neighbors(t.id);
    const map = new Map([
      [t.id, t],
      [ids[0], water(ids[0])],
      [ids[1], water(ids[1])],
    ]);
    const c = waterConnections(t, map);
    expect(c.river).toBe(false);
    expect(c.shore).toBe(0);
    const land = {
      ...water(ids[3]),
      resource: "stone" as const,
      biome: "stone" as const,
    };
    map.set(land.id, land);
    expect(waterConnections(t, map).shore).toBe(1 << 3);
    expect(t.geography?.waterway).toBe("river");
  });
  it("has finite closed geometry for every shore and river connection pattern", () => {
    for (let mask = 0; mask < 64; mask++) {
      const { water, line } = riverGeometry(mask),
        shore = shoreGeometry(mask);
      expect(water.endsWith("Z")).toBe(true);
      expect(`${water}${line}${shore.banks}`).not.toMatch(
        /NaN|Infinity|undefined/,
      );
      const sides = mask.toString(2).replaceAll("0", "").length;
      expect((shore.line.match(/M/g) ?? []).length).toBe(sides);
      const banks = Array.from({ length: 6 }, (_, i) => i).filter(
        (i) => mask & (1 << i) && !(mask & (1 << ((i + 1) % 6))),
      ).length;
      expect((line.match(/M/g) ?? []).length).toBe(banks);
    }
    expect(shoreGeometry(0)).toEqual({ banks: "", line: "" });
  });
  it("has seasonal bank art for every climate", () => {
    for (const climate of CLIMATES)
      for (const season of SEASONS) {
        const t = { ...water("0,0", true), climate };
        expect(
          existsSync(`public/assets/${bankArt(t, season)}`),
          `${climate}/${season}`,
        ).toBe(true);
      }
  });
});

// Rendering composition must not leave ghosts after migration or fall back to
// resource icons for one of the less common species.
it("paints every wildlife species and removes it when the population leaves", () => {
  expect(Object.keys(WILDLIFE_ART).sort()).toEqual(
    Object.keys(WILDLIFE_GOODS).sort(),
  );
  for (const kind of Object.keys(WILDLIFE_ART) as WildlifeKind[]) {
    expect(existsSync(`public/assets/${WILDLIFE_ART[kind]}`)).toBe(true);
    const t = water("0,0");
    t.geography!.animals = [kind];
    for (const season of SEASONS) {
      const html = renderToStaticMarkup(
        createElement(WildlifeArt, {
          tile: t,
          x: 0,
          y: 0,
          season,
          connections: undefined,
          schematic: true,
        }),
      );
      expect(html).toContain(`data-wildlife-kind="${kind}"`);
      expect(html).toContain(WILDLIFE_ART[kind]);
    }
    t.geography!.animals = [];
    expect(
      renderToStaticMarkup(
        createElement(WildlifeArt, {
          tile: t,
          x: 0,
          y: 0,
          connections: undefined,
          schematic: true,
        }),
      ),
    ).toBe("");
  }
});
it("keeps mixed populations visible without multiplying identical painted groups", () => {
  const t = water("0,0");
  t.geography!.animals = ["fish", "whale", "fish", "cod"];
  const html = renderToStaticMarkup(
    createElement(WildlifeArt, { tile: t, x: 0, y: 0, connections: undefined }),
  );
  expect((html.match(/data-wildlife-kind/g) ?? []).length).toBe(3);
});

it("extends riparian crops and resources onto the matching river bank without changing the channel", () => {
  const t = water("0,0", true);
  const tiles = new Map<string, Hex>([[t.id, t]]);
  const adjacent = neighbors(t.id);
  for (const [side, biome] of [
    "flood-wheat",
    "alluvial-clay",
    "flood-rice",
    "river-woods",
  ].entries()) {
    const n = {
      ...generateHex("banks", adjacent[side]),
      climate: "temperate" as const,
      resource: "grain" as const,
      biome: biome as Hex["biome"],
      geography: { elevation: 0.4, region: "temperate:0,0", floodplain: true },
    };
    tiles.set(n.id, n);
  }
  const spring = waterConnections(t, tiles, "spring");
  const winter = waterConnections(t, tiles, "winter");
  expect(spring.banks?.filter(Boolean)).toHaveLength(4);
  expect(spring.banks?.[0]).toContain("flood-wheat");
  expect(spring.banks?.[1]).toContain("alluvial-clay");
  expect(spring.banks?.[2]).toContain("flood-rice");
  expect(winter.banks?.[0]).not.toBe(spring.banks?.[0]);
  expect(winter.channel).toBe(spring.channel);
  expect(t.biome).toBe("river");
});
