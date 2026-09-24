import type { Game, Good } from "./types";
import { BIOME_INFO } from "./climate-content";
import { PROJECTS, WILDLIFE_GOODS } from "./geography";
import { rule, validStock } from "./economy";

/** Validate persisted environmental state before any UI, production or AI reads it. */
export function validateGeography(s: Game): void {
  if (s.geographyVersion === undefined) {
    rule(
      !s.wildlife && !Object.values(s.tiles).some((t) => t.geography),
      "Geography state needs a world version.",
    );
    return;
  }
  rule(
    [1, 2, 3, 4, 5, 6].includes(s.geographyVersion),
    "Unsupported geography version.",
  );
  rule(
    Number.isSafeInteger(s.environmentRound) &&
      s.environmentRound! >= 1 &&
      s.environmentRound! <= s.round,
    "Invalid environment round.",
  );
  rule(
    Array.isArray(s.wildlife) &&
      s.wildlife.length <= Object.keys(s.tiles).length,
    "Invalid wildlife populations.",
  );
  const ids = new Set<string>(),
    fauna = new Map<string, Partial<Record<Good, number>>>(),
    animals = new Map<string, string[]>();
  for (const herd of s.wildlife!) {
    rule(
      herd &&
        typeof herd === "object" &&
        typeof herd.id === "string" &&
        herd.id.length < 100 &&
        !ids.has(herd.id) &&
        !!s.tiles[herd.tile] &&
        Object.hasOwn(WILDLIFE_GOODS, herd.kind),
      "Invalid wildlife record.",
    );
    rule(
      Number.isSafeInteger(herd.lastRound) &&
        herd.lastRound >= 1 &&
        herd.lastRound <= s.round,
      "Invalid migration round.",
    );
    rule(
      herd.dormant === undefined || herd.dormant === true,
      "Invalid dormant wildlife.",
    );
    ids.add(herd.id);
    if (herd.dormant) continue;
    const stock = fauna.get(herd.tile) ?? {};
    for (const [good, n] of Object.entries(WILDLIFE_GOODS[herd.kind]))
      stock[good as Good] = (stock[good as Good] ?? 0) + n!;
    fauna.set(herd.tile, stock);
    animals.set(herd.tile, [...(animals.get(herd.tile) ?? []), herd.kind]);
  }
  for (const tile of Object.values(s.tiles)) {
    const g = tile.geography;
    rule(
      g &&
        typeof g === "object" &&
        Number.isFinite(g.elevation) &&
        g.elevation >= 0 &&
        g.elevation <= 1 &&
        typeof g.region === "string" &&
        g.region.length < 100,
      "Invalid tile geography.",
    );
    rule(
      g.weatherSeason === undefined ||
        ["spring", "summer", "autumn", "winter"].includes(g.weatherSeason),
      "Invalid weather season.",
    );
    rule(
      g.depth === undefined ||
        (Number.isFinite(g.depth) && g.depth >= 0 && g.depth <= 1),
      "Invalid water depth.",
    );
    rule(
      g.waterway === undefined ||
        ["river", "lake", "coast", "deep", "shoal", "reef"].includes(
          g.waterway,
        ),
      "Invalid waterway.",
    );
    rule(
      g.access === undefined ||
        ["normal", "ford", "flooded", "closed"].includes(g.access),
      "Invalid seasonal access.",
    );
    rule(
      g.weather === undefined ||
        ["normal", "wet", "dry", "cold", "mild"].includes(g.weather),
      "Invalid regional weather.",
    );
    rule(
      g.landmark === undefined ||
        [
          "thermal-spring",
          "natural-harbor",
          "fertile-basin",
          "mineral-vein",
          "ancient-grove",
        ].includes(g.landmark),
      "Invalid landmark.",
    );
    rule(
      g.floodThreshold === undefined || [3, 4].includes(g.floodThreshold),
      "Invalid flood threshold.",
    );
    for (const key of [
      "ford",
      "floodplain",
      "delta",
      "pass",
      "newlyRevealed",
      "gazelleSurveyed",
      "coastal",
      "warmed",
    ] as const)
      rule(
        g[key] === undefined || typeof g[key] === "boolean",
        "Invalid geography flag.",
      );
    rule(
      !g.waterway || ["water", "ice"].includes(tile.resource),
      "Waterways must be water terrain.",
    );
    rule(!g.pass || tile.biome === "mountain-pass", "Invalid mountain pass.");
    rule(
      !g.downstream ||
        (typeof g.downstream === "string" &&
          /^-?\d+,-?\d+$/.test(g.downstream)),
      "Invalid river course.",
    );
    rule(
      !g.damagedUntil ||
        (Number.isSafeInteger(g.damagedUntil) && g.damagedUntil > s.round),
      "Invalid crop disruption.",
    );
    for (const mode of [g.harvestMode, g.nextHarvestMode])
      rule(
        mode === undefined || mode === "spread" || mode === "concentrated",
        "Invalid harvest mode.",
      );
    if (g.harvestChosenYear !== undefined)
      rule(
        Number.isSafeInteger(g.harvestChosenYear) && g.harvestChosenYear >= 1,
        "Invalid harvest year.",
      );
    if (g.projects !== undefined) {
      rule(
        g.projects &&
          typeof g.projects === "object" &&
          !Array.isArray(g.projects),
        "Invalid improvements.",
      );
      for (const [kind, project] of Object.entries(g.projects)) {
        rule(
          Object.hasOwn(PROJECTS, kind) &&
            project &&
            Number.isSafeInteger(project.owner) &&
            !!s.players[project.owner] &&
            Number.isSafeInteger(project.born) &&
            project.born >= 1 &&
            project.born <= s.round,
          "Invalid improvement.",
        );
        rule(
          kind !== "bridge" || g.waterway === "river",
          "Bridges must cross rivers.",
        );
        rule(
          !["levee", "irrigation"].includes(kind) ||
            g.floodplain ||
            (tile.biome && BIOME_INFO[tile.biome].family === "rugged"),
          "This improvement requires a floodplain.",
        );
      }
    }
    validStock(g.fauna ?? {}, true);
    const expected = fauna.get(tile.id) ?? {};
    rule(
      Object.keys({ ...expected, ...g.fauna }).every(
        (k) => (expected[k as Good] ?? 0) === (g.fauna?.[k as Good] ?? 0),
      ),
      "Wildlife yields do not match the populations.",
    );
    rule(
      Array.isArray(g.animals) &&
        JSON.stringify([...g.animals].sort()) ===
          JSON.stringify((animals.get(tile.id) ?? []).sort()),
      "Wildlife markers do not match populations.",
    );
  }
}
