import { funded, run, piece } from "./helpers";
import { ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
export function harvestFixture() {
  const s = funded("harvest-preview");
  s.phase = "roll";
  s.dice = null;
  const preview = run(s, { type: "roll" }),
    total = preview.dice![0] + preview.dice![1];
  for (const tile of Object.values(s.tiles)) tile.number = total;
  for (const town of Object.values(s.towns)) {
    town.level = 2;
    town.turnLevel = 2;
    for (const id of landAtVertex(s, town.vertex)) town.extensions[id] = 1;
  }
  for (const route of Object.values(s.routes).filter(
    (r) => r.owner === 0 && r.kind === "road",
  ))
    for (const id of s.edges[route.edge].tiles)
      if (s.tiles[id].resource !== "water") route.camps[id] = 2;
  for (const town of ownTowns(s, 3))
    for (const id of s.vertices[town.vertex].tiles)
      s.tiles[id].number = total === 7 ? 8 : 7;
  const blocked = landAtVertex(s, ownTowns(s, 1)[0].vertex)[0];
  piece(s, blocked, 2, "light", 1);
  return s;
}
