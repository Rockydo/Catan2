import type { Hex } from "../src/game/types";
import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateHex, neighbors } from "../src/game/world";
import { iceOdds, localIceOdds, SEASONS } from "../src/game/seasons";
import { waterConnections } from "../src/ui/water-connectivity";
import { ConnectedWater, WaterDefinitions } from "../src/ui/ConnectedWater";
it("gives Steppe and Prairie identical baseline and exposure-adjusted odds in every half-season", () => {
  const t = {
    ...generateHex("ice", "0,0"),
    resource: "water" as const,
    geography: {
      elevation: 0,
      region: "steppe:0,0",
      waterway: "deep" as const,
    },
  };
  for (const season of SEASONS)
    for (const half of ["early", "late"] as const)
      for (const weather of ["normal", "cold", "mild"] as const) {
        expect(iceOdds({ ...t, climate: "steppe" }, season, half)).toEqual(
          iceOdds({ ...t, climate: "prairie" }, season, half),
        );
        expect(
          localIceOdds({}, { ...t, climate: "steppe" }, season, half, weather),
        ).toEqual(
          localIceOdds({}, { ...t, climate: "prairie" }, season, half, weather),
        );
      }
});
it("breaks every exposed frozen water variant into floes and keeps fully enclosed ice solid", () => {
  for (const biome of [
    "water",
    "fish",
    "cod",
    "whale",
    "ice",
    "river",
    "lake",
  ] as const) {
    const t = {
      ...generateHex("ice", "0,0"),
      resource: "ice" as const,
      biome,
      climate: "glacial" as const,
    };
    const tiles = new Map<string, Hex>([
      [t.id, t],
      ...neighbors(t.id).map(
        (id) =>
          [
            id,
            { ...generateHex("ice", id), resource: "grain" as const },
          ] as const,
      ),
    ]);
    expect(waterConnections(t, tiles, "winter").openIce).toBe(0);
    const east = neighbors(t.id)[0];
    tiles.set(east, {
      ...tiles.get(east)!,
      resource: "water",
      climate: "temperate",
      biome: "water",
    });
    const c = waterConnections(t, tiles, "winter");
    expect(c.openIce).toBe(1);
    const html = renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(WaterDefinitions, { connections: [c] }),
        createElement(ConnectedWater, {
          tile: t,
          connections: c,
          x: 0,
          y: 0,
          season: "winter",
        }),
      ),
    );
    expect(html).toContain("exposed-pack-ice-v1.webp");
    expect(html).toContain("connected-water.webp");
  }
});
