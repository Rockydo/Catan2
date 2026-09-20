import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BIOME_INFO } from "../src/game/climate-content";
import { production } from "../src/game/economy";
import { seasonalProfile, seasonalYield } from "../src/game/seasons";
import { setLocale } from "../src/i18n";
import { ProductionToken } from "../src/ui/MapPieces";
import { TileSeasonForecast } from "../src/ui/SeasonCalendar";
import { maritimeFixture } from "./maritime-fixture";

const grounds = ["seal-grounds", "reindeer-range"] as const;
const seasons = ["summer", "winter"] as const;

function fixture(
  biome: (typeof grounds)[number],
  season: (typeof seasons)[number],
) {
  const { s, home } = maritimeFixture();
  s.calendar = { startRound: 1, startSeason: season };
  s.round = 1;
  for (const tile of Object.values(s.tiles)) {
    tile.biome = "snow-plain";
    tile.resource = "snow";
    tile.climate = "arctic";
  }
  for (const town of Object.values(s.towns)) town.stock = {};
  const tile = s.tiles["0,0"];
  Object.assign(tile, {
    biome,
    resource: BIOME_INFO[biome].resource,
    number: 8,
  });
  home.level = home.turnLevel = 1;
  return { s, home, tile };
}

describe("year-round Arctic hunting", () => {
  it.each(grounds)(
    "keeps both %s products available in every season",
    (biome) => {
      const { tile } = fixture(biome, "summer");
      const expected =
        biome === "seal-grounds" ? { hides: 1, oil: 1 } : { meat: 1, hides: 1 };
      expect(seasonalProfile(tile, 0)).toEqual({
        spring: expected,
        summer: expected,
        autumn: expected,
        winter: expected,
      });
    },
  );

  it("preserves the separate cattle range harvest calendar", () => {
    const { tile } = fixture("reindeer-range", "summer");
    tile.biome = "cattle-savanna";
    tile.climate = "savanna";
    expect(seasonalProfile(tile, 0)).toEqual({
      spring: { meat: 1, hides: 1 },
      summer: {},
      autumn: { meat: 2, hides: 2 },
      winter: { meat: 1, hides: 1 },
    });
  });

  for (const biome of grounds)
    for (const season of seasons) {
      it.each(["settlement", "camp", "workshop", "city"] as const)(
        `${biome} pays a %s on each matching ${season} roll`,
        (producer) => {
          const { s, home, tile } = fixture(biome, season);
          if (producer === "camp") {
            home.vertex = s.tiles["-4,0"].vertices[0];
            const edge = tile.edges[0];
            s.routes[edge] = {
              id: edge,
              edge,
              owner: 0,
              kind: "road",
              camps: { [tile.id]: 2 },
              born: 0,
            };
          } else if (producer === "workshop" || producer === "city") {
            home.level = home.turnLevel = producer === "city" ? 4 : 2;
            home.extensions[tile.id] = producer === "city" ? 3 : 1;
            home.extensionGoods = {
              [tile.id]: biome === "seal-grounds" ? "hides" : "meat",
            };
          }
          const expected =
            biome === "seal-grounds"
              ? {
                  settlement: { hides: 1, oil: 1 },
                  camp: { hides: 2, oil: 2 },
                  workshop: { hides: 2, oil: 2, leather: 1 },
                  city: { hides: 4, oil: 4, leather: 5, coke: 2 },
                }[producer]
              : {
                  settlement: { meat: 1, hides: 1 },
                  camp: { meat: 2, hides: 2 },
                  workshop: { meat: 2, hides: 2, provisions: 1 },
                  city: { meat: 4, hides: 4, provisions: 5, leather: 2 },
                }[producer];
          production(s, 6);
          expect(home.stock).toEqual({});
          production(s, 8);
          expect(home.stock).toEqual(expected);
          expect(s.production[0]).toEqual(expected);
          production(s, 8);
          expect(s.production[0]).toEqual(expected);
          expect(home.stock).toEqual(
            Object.fromEntries(
              Object.entries(expected).map(([good, amount]) => [
                good,
                amount! * 2,
              ]),
            ),
          );
        },
      );

      it(`shows both ${biome} products on the ${season} map token and forecast`, () => {
        setLocale("en");
        const { s, tile } = fixture(biome, season);
        const label =
          biome === "seal-grounds" ? "1 Hides + 1 Oil" : "1 Meat + 1 Hides";
        const token = renderToStaticMarkup(
          createElement(ProductionToken, {
            resource: biome === "seal-grounds" ? "hides" : "meat",
            output: seasonalYield(tile, 0, season),
            number: tile.number,
            active: false,
            showNumber: true,
          }),
        );
        expect(token).toContain(`aria-label="${label}"`);
        expect(token).not.toContain("No harvest");
        const forecast = renderToStaticMarkup(
          createElement(TileSeasonForecast, { game: s, tile, owner: 0 }),
        );
        expect(forecast).not.toContain("season-no-harvest");
        for (const good of label.split(" + ").map((part) => part.slice(2)))
          expect(forecast).toContain(`title="${good}"`);
      });
    }
});
