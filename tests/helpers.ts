import { generateWorld, generateHex, addHexes } from "../src/game/world";
import { newGame, applyCommand, beginTurn } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import {
  GOODS,
  type Game,
  type Command,
  type UnitClass,
  type ShipClass,
  type Piece,
} from "../src/game/types";
import { ownTowns } from "../src/game/selectors";
export function run(s: Game, c: Command): Game {
  const r = applyCommand(s, c);
  if (!r.ok) throw new Error(`${c.type}: ${r.error}`);
  return r.state;
}
// Existing scenario tests deliberately model pre-climate saves. Keep their
// fixed geography/yields independent of the current new-campaign generator.
export function legacyGame(...args: Parameters<typeof newGame>): Game {
  const s = newGame(...args);
  const world = generateWorld(
    s.seed,
    s.players.length >= 8 ? 220 : s.players.length === 4 ? 100 : 110,
  );
  world.tiles = Object.fromEntries(
    Object.keys(world.tiles).map((id) => [
      id,
      { ...generateHex(s.seed, id), climate: "temperate" as const },
    ]),
  );
  delete world.climatePlan;
  for (const edge of Object.values(world.edges)) delete edge.harbor;
  addHexes(world, s.seed, []);
  Object.assign(s, world);
  delete s.climatePlan;
  s.generation = 4;
  return s;
}
export function started(seed = "test-frontier"): Game {
  let s = legacyGame(
    seed,
    ["Emberhold", "Tidewatch", "Violet Reach", "Golden Vale"].map(
      (name, id) => ({ name, control: id === 0 ? "human" : "standard" }),
    ),
  );
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  return s;
}
export function funded(seed = "test-frontier"): Game {
  const s = started(seed);
  for (const p of s.players)
    for (const g of GOODS) ownTowns(s, p.id)[0].stock[g] = 200;
  s.phase = "economy";
  return s;
}
export function piece(
  s: Game,
  tile: string,
  owner = 0,
  kind: UnitClass | ShipClass = "heavy",
  tier = 1,
): Piece {
  const naval = [
      "transport",
      "convoy",
      "galley",
      "carrack",
      "fishing",
      "merchantship",
      "settlership",
    ].includes(kind),
    id = `u${s.nextId++}`;
  const u: Piece = {
    id,
    owner,
    kind,
    tier,
    naval,
    tile,
    born: 0,
    moved: 0,
    acted: false,
    bonus: 0,
  };
  s.pieces[id] = u;
  return u;
}
export function nextOwnerTurn(s: Game) {
  beginTurn(s);
  s.phase = "military";
}
