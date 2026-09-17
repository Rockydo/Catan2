import { funded, piece } from "./helpers";
import { ownTowns } from "../src/game/selectors";
import { acceptAlliance } from "../src/game/diplomacy";
import type { Game } from "../src/game/types";
export function allianceFixture() {
  const s = funded("alliance-fixture");
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    tile.number = 7;
    delete tile.fish;
    delete tile.whale;
  }
  const locations = ["-2,0", "0,0", "2,0", "0,2"];
  const towns = s.players.map((p) => ownTowns(s, p.id)[0]);
  s.towns = {};
  s.routes = {};
  s.pieces = {};
  s.towers = {};
  s.sieges = {};
  s.round = 10;
  for (const p of s.players) {
    p.turns = 10;
    p.control = p.id === 0 ? "human" : "standard";
    p.diplomacyDone = false;
    const t = towns[p.id];
    t.vertex = s.tiles[locations[p.id]].vertices[0];
    t.level = t.turnLevel = p.id === 3 ? 4 : 1;
    t.extensions = {};
    t.wall = 0;
    s.towns[t.id] = t;
  }
  for (let i = 0; i < 25; i++) piece(s, "0,2", 3, "heavy", 4);
  return { s, towns };
}
export function pact(s: Game, members = [0, 1], threat = 3) {
  acceptAlliance(s, { from: members[0], to: members[1], threat });
  for (const to of members.slice(2))
    acceptAlliance(s, { from: members[0], to, threat });
  return s;
}
export function grandAllianceFixture() {
  const { s, towns } = allianceFixture();
  for (let id = 4; id < 8; id++) {
    s.players.push({
      ...structuredClone(s.players[2]),
      id,
      name: `Realm ${id}`,
      color: ["#ac542d", "#2d725e", "#674580", "#8b7229"][id - 4],
    });
    const tile = ["4,-1", "2,-3", "-2,-3", "-4,1"][id - 4];
    const t = {
      ...structuredClone(towns[2]),
      id: `t${s.nextId++}`,
      owner: id,
      vertex: s.tiles[tile].vertices[0],
    };
    s.towns[t.id] = t;
    towns.push(t);
  }
  return { s, towns };
}

export function mergerFixture(humans: number[] = []) {
  const { s } = grandAllianceFixture();
  for (const p of s.players)
    p.control = humans.includes(p.id) ? "human" : "standard";
  pact(s, [0, 1]);
  pact(s, [2, 4]);
  s.active = 1;
  return s;
}
