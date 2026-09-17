import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { neighbors } from "../src/game/world";
export function coastalFixture() {
  const { s, home, enemy } = maritimeFixture();
  const water = "0,0",
    shore = "1,0";
  s.tiles[water].resource = "water";
  s.tiles[water].number = 7;
  const gun = piece(s, shore, 0, "artillery", 2);
  const ship = piece(s, water, 1, "galley", 1);
  return { s, home, enemy, water, shore, gun, ship };
}
export function frontierUnitFixture(sea = false) {
  const { s, home, enemy } = maritimeFixture();
  const tile = Object.values(s.tiles).find(
    (t) =>
      neighbors(t.id).some((n) => !s.tiles[n]) &&
      !t.vertices.includes(home.vertex) &&
      !t.vertices.includes(enemy.vertex),
  )!;
  if (sea) {
    tile.resource = "water";
    tile.number = 7;
  }
  const unit = piece(s, tile.id, 0, sea ? "fishing" : "light");
  return { s, tile, unit };
}
