/**
 * Reproducible season/AI soak: npx tsx scripts/seasons-audit.ts [--rounds=8]
 * Large-map decision sample: npx tsx scripts/seasons-audit.ts --stress
 * Test fixtures receive resources and units once; gameplay then uses real commands.
 */
import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { ownTowns } from "../src/game/selectors";
import { canOccupy, generateWorld, addHexes } from "../src/game/world";
import { CLIMATES, type Climate } from "../src/game/climate-content";
import { GOODS, type Game, type Piece } from "../src/game/types";
import { seasonAt, syncSeasonSurfaces } from "../src/game/seasons";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--stress" && !/^--rounds=\d+$/.test(arg)))
  throw new Error("Usage: seasons-audit.ts [--rounds=1..24] [--stress]");
const rounds = Number(
  args.find((arg) => arg.startsWith("--rounds="))?.split("=")[1] ?? 8,
);
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 24)
  throw new Error("Choose 1 to 24 rounds.");

function game(seed: string, control: "standard" | "hard") {
  return newGame(
    seed,
    Array.from({ length: 5 }, (_, id) => ({
      name: `Realm ${id}`,
      control,
    })),
  );
}
function step(s: Game) {
  const start = performance.now(),
    command = chooseAIAction(s),
    ms = performance.now() - start;
  const result = applyCommand(s, command);
  if (!result.ok)
    throw new Error(
      `${s.seed}/${s.round}/${s.active}: ${JSON.stringify(command)}: ${result.error}`,
    );
  return { state: result.state, command, ms };
}
function setup(s: Game) {
  for (let i = 0; s.phase.startsWith("setup"); i++) {
    if (i >= 100) throw new Error(`Setup did not finish: ${s.seed}`);
    s = step(s).state;
  }
  return s;
}
function unit(
  s: Game,
  owner: number,
  kind: Piece["kind"],
  tier: number,
  tile: string,
  naval: boolean,
) {
  const id = `u${s.nextId++}`;
  s.pieces[id] = {
    id,
    owner,
    kind,
    tier,
    tile,
    naval,
    born: 0,
    moved: 0,
    acted: false,
    bonus: 0,
  };
}
function validate(s: Game) {
  assertInvariants(s);
  assertInvariants(deserialize(serialize(s)));
}
function stats(times: number[]) {
  times.sort((a, b) => a - b);
  return {
    medianMs: times[Math.floor(times.length * 0.5)],
    p95Ms: times[Math.floor(times.length * 0.95)],
    maxMs: times.at(-1),
  };
}

function soak() {
  const candidates = Array.from({ length: 24 }, (_, i) =>
    game(`season-validation-${i}`, "standard"),
  );
  const missing = new Set<Climate>(CLIMATES),
    selected: Game[] = [];
  while (missing.size) {
    const best = candidates
      .filter((s) => !selected.includes(s))
      .map((s) => ({
        s,
        climates: new Set(
          Object.values(s.tiles)
            .map((t) => t.climate!)
            .filter((c) => missing.has(c)),
        ),
      }))
      .sort((a, b) => b.climates.size - a.climates.size)[0];
    if (!best?.climates.size)
      throw new Error(`Uncovered climates: ${[...missing]}`);
    selected.push(best.s);
    for (const climate of best.climates) missing.delete(climate);
  }
  let total = 0;
  const started = performance.now();
  for (const candidate of selected) {
    let s = setup(candidate);
    for (const player of s.players) {
      const home = ownTowns(s, player.id)[0];
      for (const good of GOODS) home.stock[good] = 12;
      for (const naval of [false, true]) {
        const tile = s.vertices[home.vertex].tiles.find(
          (id) =>
            canOccupy(s.tiles[id], naval) &&
            Object.values(s.pieces).every(
              (u) => u.tile !== id || u.owner === player.id,
            ),
        );
        if (tile)
          unit(s, player.id, naval ? "transport" : "light", 1, tile, naval);
      }
    }
    syncSeasonSurfaces(s);
    validate(s);
    let actions = 0,
      turnActions = 0,
      turn = "",
      lastRound = s.round,
      moves = 0,
      battles = 0;
    const times: number[] = [];
    while (s.phase !== "finished" && s.round <= rounds) {
      const nextTurn = `${s.round}/${s.active}`;
      if (nextTurn !== turn) {
        turn = nextTurn;
        turnActions = 0;
      }
      if (++turnActions > 1500 || actions >= rounds * 2000)
        throw new Error(`Action bound exceeded: ${s.seed}/${turn}`);
      const result = step(s);
      times.push(result.ms);
      if (result.command.type === "move") moves++;
      if (result.state.battle && !s.battle) battles++;
      s = result.state;
      actions++;
      total++;
      if (actions % 25 === 0) assertInvariants(s);
      if (s.round !== lastRound) {
        validate(s);
        lastRound = s.round;
      }
    }
    validate(s);
    console.log(
      JSON.stringify({
        seed: s.seed,
        round: s.round,
        actions,
        moves,
        battles,
        ...stats(times),
      }),
    );
  }
  console.log(
    JSON.stringify({
      complete: true,
      scenarios: selected.length,
      climates: CLIMATES.length,
      actions: total,
      elapsedSeconds: (performance.now() - started) / 1000,
    }),
  );
}

function stress() {
  const base = setup(game("season-late-stress", "hard"));
  for (const count of [125, 500, 1000, 2500]) {
    let s = structuredClone(base);
    addHexes(s, s.seed, Object.keys(generateWorld(s.seed, count).tiles));
    s.phase = "economy";
    s.round = 6;
    syncSeasonSurfaces(s);
    for (const player of s.players) {
      player.turns = 20;
      for (const town of ownTowns(s, player.id)) {
        town.level = town.turnLevel = 4;
        for (const good of GOODS) town.stock[good] = 20;
      }
      const home = ownTowns(s, player.id)[0];
      for (const [kind, tier, quantity, naval] of [
        ["heavy", 4, 60, false],
        ["light", 3, 20, false],
        ["cavalry", 4, 10, false],
        ["artillery", 4, 6, false],
        ["merchant", 4, 10, false],
        ["convoy", 4, 5, true],
        ["fishing", 4, 5, true],
      ] as const) {
        const tile = s.vertices[home.vertex].tiles.find(
          (id) =>
            canOccupy(s.tiles[id], naval) &&
            Object.values(s.pieces).every(
              (u) => u.tile !== id || u.owner === player.id,
            ),
        );
        if (tile)
          for (let i = 0; i < quantity; i++)
            unit(s, player.id, kind, tier, tile, naval);
      }
    }
    const populated = s;
    for (const round of [6, 8, 10, 12]) {
      s = structuredClone(populated);
      s.round = round;
      syncSeasonSurfaces(s);
      validate(s);
      const times: number[] = [],
        commands: string[] = [];
      for (let i = 0; i < 12; i++) {
        const result = step(s);
        times.push(result.ms);
        commands.push(result.command.type);
        s = result.state;
      }
      validate(s);
      console.log(
        JSON.stringify({
          tiles: count,
          season: seasonAt(s),
          pieces: Object.keys(s.pieces).length,
          commands,
          ...stats(times),
        }),
      );
    }
  }
}

if (args.includes("--stress")) stress();
else soak();
