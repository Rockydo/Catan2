import { fishingFixture } from "./maritime-fixture";
import { routeKind } from "../src/game/selectors";

/** A land–sea–land chain, with no town at either sea junction. */
export function mixedRoutesFixture() {
  const { s, home, enemy, edge: sea } = fishingFixture();
  const [start, landing] = sea.vertices;
  const roadAt = (v: string) =>
    s.vertices[v].edges.find((e) => routeKind(s, e) === "road")!;
  const road = roadAt(start),
    beachRoad = roadAt(landing);
  home.vertex = s.edges[road].vertices.find((v) => v !== start)!;
  return { s, home, enemy, sea: sea.id, road, beachRoad, start, landing };
}
