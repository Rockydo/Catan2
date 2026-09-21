import { grandAllianceFixture } from "./alliance-fixture";
import { piece } from "./helpers";

export function supportFixture(troops = 36) {
  const { s, towns } = grandAllianceFixture();
  s.pieces = {};
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "snow";
    tile.biome = "snow-plain";
  }
  for (const town of towns) {
    town.level = town.turnLevel = 1;
    town.stock = {};
    town.wall = 0;
  }
  for (let i = 0; i < troops; i++) piece(s, "0,2", 0);
  s.phase = "roll";
  s.dice = null;
  return { s, towns };
}
