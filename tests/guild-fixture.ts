import { maritimeFixture } from "./maritime-fixture";
import type { GuildKind } from "../src/game/types";
export function guildFixture(kind?: GuildKind, tier = 1) {
  const f = maritimeFixture();
  const [mineral, water, land] = f.s.vertices[f.home.vertex].tiles;
  f.s.tiles[mineral].resource = "coal";
  f.s.tiles[water].resource = "water";
  f.s.tiles[land].resource = "grain";
  if (kind) f.home.guild = { kind, tier, born: 0, used: false, auto: false };
  return { ...f, mineral, water, land };
}
