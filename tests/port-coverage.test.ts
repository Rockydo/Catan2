import { expect, it } from "vitest";
import { newGame } from "../src/game/engine";
import { deserialize, serialize, assertInvariants } from "../src/game/save";
import { bankRate, inventory } from "../src/game/selectors";
import { syncSeasonSurfaces } from "../src/game/seasons";
import {
  generateWorld,
  ensurePortCoverage,
  portCoast,
  PORT_RESOURCES,
  solidAtVertex,
  addHexes,
  neighbors,
  randomAt,
} from "../src/game/world";
import { fishingFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";

it("repairs the reproduced all-generic Grand Campaign without rerolling its ports or terrain", () => {
  const seed = "port-audit-13";
  const world = generateWorld(seed, 320, true);
  // Remove only the coverage additions to reconstruct the old seeded result.
  for (const e of Object.values(world.edges))
    if (randomAt(seed, e.id, "harbor") >= 0.1) delete e.harbor;
  const original = Object.values(world.edges).filter((e) => e.harbor);
  expect(original.map((e) => e.harbor)).toEqual(Array(4).fill("generic"));
  const before = structuredClone(world.tiles);
  ensurePortCoverage(world, seed);
  const ports = Object.values(world.edges).filter((e) => e.harbor);
  expect(ports.length).toBeGreaterThanOrEqual(6);
  expect(
    new Set(ports.filter((e) => e.harbor !== "generic").map((e) => e.harbor))
      .size,
  ).toBeGreaterThanOrEqual(3);
  for (const e of original) expect(world.edges[e.id].harbor).toBe("generic");
  expect(world.tiles).toEqual(before);
  const repaired = structuredClone(world);
  ensurePortCoverage(world, seed);
  expect(world).toEqual(repaired);
});

it("keeps specialist variety, legal coasts, spacing and deterministic placement across modern maps", () => {
  const resources = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const seed = `port-audit-${i}`,
      world = generateWorld(seed, 320, true);
    const coasts = Object.values(world.edges).filter(
      (e) =>
        portCoast(world, e.tiles) &&
        e.vertices.some((v) => solidAtVertex(world, v).length),
    );
    const target = Math.min(6, Math.floor(coasts.length / 8));
    const ports = Object.values(world.edges).filter((e) => e.harbor);
    const specific = new Set(
      ports.filter((e) => e.harbor !== "generic").map((e) => e.harbor!),
    );
    expect(ports.length, seed).toBeGreaterThanOrEqual(target);
    expect(specific.size, seed).toBeGreaterThanOrEqual(Math.ceil(target / 2));
    if (target >= 2)
      expect(
        ports.some((e) => e.harbor === "generic"),
        seed,
      ).toBe(true);
    const vertices = new Set<string>();
    for (const port of ports) {
      expect(portCoast(world, port.tiles)).toBe(true);
      for (const v of port.vertices) {
        expect(vertices.has(v)).toBe(false);
        vertices.add(v);
      }
      if (port.harbor !== "generic") resources.add(port.harbor!);
    }
    if (i === 13) expect(generateWorld(seed, 320, true)).toEqual(world);
  }
  expect([...resources].sort()).toEqual([...PORT_RESOURCES].sort());
}, 30000);

it("repairs sparse current saves on load, preserves gameplay state, and stays stable after exploration", () => {
  const s = newGame(
    "port-audit-13",
    Array.from({ length: 12 }, (_, i) => ({
      name: `Realm ${i}`,
      control: "human" as const,
    })),
  );
  for (const e of Object.values(s.edges))
    if (e.harbor !== "generic") delete e.harbor;
  const restored = deserialize(serialize(s));
  expect(
    Object.values(restored.edges).filter(
      (e) => e.harbor && e.harbor !== "generic",
    ).length,
  ).toBeGreaterThanOrEqual(3);
  // Only port metadata is repaired; terrain, economy, turn and RNG are intact.
  expect({ ...restored, edges: s.edges }).toEqual(s);
  expect(deserialize(serialize(restored))).toEqual(restored);
  const border = [
    ...new Set(Object.keys(restored.tiles).flatMap(neighbors)),
  ].filter((id) => !restored.tiles[id]);
  addHexes(restored, restored.seed, border);
  syncSeasonSurfaces(restored);
  assertInvariants(restored);
  expect(deserialize(serialize(restored))).toEqual(restored);
});

it("does not invent ports on rivers, ice or inaccessible peak coasts, and leaves older geography alone", () => {
  const world = generateWorld("port-audit-13", 320, true);
  for (const e of Object.values(world.edges)) delete e.harbor;
  for (const t of Object.values(world.tiles)) {
    if (t.resource === "water") t.geography!.waterway = "river";
  }
  ensurePortCoverage(world, "no-river-ports");
  expect(Object.values(world.edges).some((e) => e.harbor)).toBe(false);
  for (const t of Object.values(world.tiles)) {
    if (t.resource === "water") t.resource = "ice";
  }
  ensurePortCoverage(world, "no-ice-ports");
  expect(Object.values(world.edges).some((e) => e.harbor)).toBe(false);
  for (const t of Object.values(world.tiles)) {
    if (t.resource === "ice") {
      t.resource = "water";
      delete t.geography;
    } else t.resource = "peaks";
  }
  ensurePortCoverage(world, "no-peak-ports");
  expect(Object.values(world.edges).some((e) => e.harbor)).toBe(false);
  const old = generateWorld("old-ports", 125);
  const before = structuredClone(old);
  ensurePortCoverage(old, "old-ports");
  expect(old).toEqual(before);
});

it.each(PORT_RESOURCES)(
  "%s ports execute 2:1 trades and close on ice or blockade",
  (good) => {
    const { s, home, edge } = fishingFixture();
    edge.harbor = good;
    const take = good === "grain" ? "lumber" : "grain";
    expect(bankRate(s, good, take)).toBe(2);
    expect(bankRate(s, take, good)).toBe(4);
    const before = inventory(s);
    const after = run(s, {
      type: "bank",
      give: { [good]: 2 },
      take: { [take]: 1 },
    });
    expect(inventory(after)[good]).toBe(before[good]! - 2);
    expect(inventory(after)[take]).toBe(before[take]! + 1);
    for (const id of edge.tiles) s.tiles[id].surface = "frozen";
    expect(bankRate(s, good, take)).toBe(4);
    for (const id of edge.tiles) s.tiles[id].surface = "open";
    expect(bankRate(s, good, take)).toBe(2);
    piece(s, edge.tiles[0], 1, "galley");
    expect(bankRate(s, good, take)).toBe(4);
    expect(s.towns[home.id].stock).toEqual(home.stock);
  },
);
