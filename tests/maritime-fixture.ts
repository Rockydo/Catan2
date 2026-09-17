import { funded } from "./helpers";
import { ownTowns } from "../src/game/selectors";
export function maritimeFixture() {
  const s = funded("maritime-fixture");
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    delete tile.fish;
    delete tile.whale;
    tile.number = 7;
  }
  const home = ownTowns(s, 0)[0],
    enemy = ownTowns(s, 1)[0];
  home.vertex = s.tiles["0,0"].vertices[0];
  enemy.vertex = s.tiles["3,0"].vertices[0];
  home.level = home.turnLevel = 4;
  enemy.level = enemy.turnLevel = 1;
  home.extensions = {};
  enemy.extensions = {};
  home.launched = 0;
  s.towns = { [home.id]: home, [enemy.id]: enemy };
  s.routes = {};
  s.pieces = {};
  s.towers = {};
  s.sieges = {};
  s.players[2].alive = s.players[3].alive = false;
  s.players.forEach((p) => {
    p.hand = [];
    p.turns = 10;
  });
  s.phase = "economy";
  for (const e of Object.values(s.edges)) delete e.harbor;
  return { s, home, enemy };
}
export function fishingFixture() {
  const f = maritimeFixture();
  const edge = f.s.vertices[f.home.vertex].edges
    .map((id) => f.s.edges[id])
    .find((e) => e.tiles.length === 2)!;
  for (const id of edge.tiles) f.s.tiles[id].resource = "water";
  const water = edge.tiles[0];
  f.s.tiles[water].fish = true;
  return { ...f, edge, water };
}
