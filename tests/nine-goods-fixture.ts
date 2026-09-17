import { funded } from "./helpers";
import { ownTowns } from "../src/game/selectors";
import { hash, landAtVertex } from "../src/game/world";

export function oldGoodsFixture() {
  const s = funded();
  const town = ownTowns(s)[0];
  const tile = landAtVertex(s, town.vertex)[0];
  const edge = s.tiles[tile].edges.find((id) =>
    s.edges[id].vertices.includes(town.vertex),
  )!;
  const old = structuredClone(s) as any;
  old.version = 3;
  old.generation = 2;
  old.tiles[tile].resource = "flax";
  for (const t of Object.values(old.tiles) as any[])
    t.number = t.id === tile ? 7 : 2;
  old.towns[town.id].level = old.towns[town.id].turnLevel = 4;
  old.towns[town.id].extensions[tile] = 2;
  old.towns[town.id].stock = { flax: 4, salt: 3, rope: 5, reagents: 2 };
  old.routes[edge] = {
    id: edge,
    edge,
    owner: 0,
    kind: "road",
    born: 0,
    camps: { [tile]: 2 },
  };
  old.production[0] = { flax: 1, salt: 2, rope: 3 };
  const port = Object.values(old.edges).find((e: any) => e.harbor) as any;
  port.harbor = "flax";
  return { old, town: town.id, tile, edge, port: port.id };
}
export function wrapOldGame(game: any, version = game.version) {
  return JSON.stringify({
    format: "catane-frontiers",
    version,
    game,
    checksum: hash(JSON.stringify(game)).toString(16),
  });
}
