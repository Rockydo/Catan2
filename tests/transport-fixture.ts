import { funded, piece } from "./helpers";
import { addHexes } from "../src/game/world";
import { ownTowns } from "../src/game/selectors";
import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
export function crossing(bridge = true) {
  const s = funded("campaign-crossings");
  s.phase = "military";
  const land = [
    "-4,0",
    "-4,-1",
    "-4,-2",
    "-4,-3",
    "-3,-4",
    "-2,-4",
    "-1,-4",
    "0,-4",
    "1,-4",
    "2,-4",
    "3,-4",
    "3,-3",
    "3,-2",
    "3,-1",
    "3,0",
    "4,0",
  ];
  addHexes(s, s.seed, land);
  for (const t of Object.values(s.tiles)) {
    t.resource = "water";
    delete t.biome;
    delete t.fish;
    delete t.whale;
  }
  for (const id of bridge ? land : ["-4,0", "3,-2", "3,-1", "3,0", "4,0"])
    s.tiles[id].resource = "grain";
  const home = ownTowns(s, 0)[0],
    enemy = ownTowns(s, 1)[0];
  home.vertex = s.tiles["-4,0"].vertices[3];
  enemy.vertex = s.tiles["4,0"].vertices[0];
  home.stock = enemy.stock = {};
  home.extensions = enemy.extensions = {};
  home.level = home.turnLevel = enemy.level = enemy.turnLevel = 1;
  home.wall = enemy.wall = 0;
  s.towns = { [home.id]: home, [enemy.id]: enemy };
  s.routes = {};
  s.towers = {};
  s.pieces = {};
  s.sieges = {};
  s.towerSieges = {};
  for (const p of s.players) {
    p.control = "standard";
    p.turns = 20;
    p.hand = [];
    p.alive = p.id < 2;
  }
  // Dominance comes from an enemy fleet in the far south, not an unbeatable shore guard.
  for (let i = 0; i < 35; i++) piece(s, "0,4", 1, "galley", 4);
  syncEmergencyCoalition(s);
  return { s, home, enemy };
}
