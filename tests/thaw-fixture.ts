import { maritimeFixture } from "./maritime-fixture";

/** Two distant home islands, an open sea, and a controlled thaw site. */
export function thawFixture() {
  const { s, home, enemy } = maritimeFixture();
  s.calendar = {
    startRound: 1,
    startSeason: "spring",
    roundsPerSeason: 2,
    iceModel: 2,
  };
  s.round = 3;
  s.active = 1;
  for (const tile of Object.values(s.tiles)) {
    Object.assign(tile, {
      resource: "water",
      climate: "cold",
      surface: "open",
      iceWeather: { round: 3, season: "summer", half: "early" },
    });
    delete tile.biome;
  }
  const land = (id: string) => {
    s.tiles[id].resource = "grain";
    delete s.tiles[id].surface;
    delete s.tiles[id].iceWeather;
    delete s.tiles[id].freezeRoll;
  };
  const ice = (id: string) => {
    s.tiles[id].surface = "frozen";
  };
  land("-4,0");
  land("4,0");
  home.vertex = s.tiles["-4,0"].vertices[0];
  enemy.vertex = s.tiles["4,0"].vertices[0];
  ice("0,0");
  return { s, land, ice };
}
