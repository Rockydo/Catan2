import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import type { Command } from "../src/game/types";
import { points, power } from "../src/game/selectors";

// Disposable dense campaign: measure transport and casualty transactions,
// including validation and cleanup. Never access browser storage.
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const { applyCommand } = await import(
  pathToFileURL(resolve(root, "src/game/engine.ts")).href
);
const fleetSize = Number(process.env.SHIPS ?? 40);
const idleUnits = Number(process.env.IDLE_UNITS ?? 15000);
const samples = Number(process.env.SAMPLES ?? 3);
for (const [name, value] of Object.entries({ fleetSize, idleUnits, samples }))
  if (!Number.isSafeInteger(value) || value < 1)
    throw Error(`${name} must be a positive integer.`);
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
if (
  expected &&
  (expected.fleetSize !== fleetSize || expected.idleUnits !== idleUnits)
)
  throw Error("The reference must use the same fleet and campaign size.");
const results = [];
for (const action of ["load", "move", "unload", "rescue"] as const) {
  const { s } = maritimeFixture();
  for (const tile of ["1,0", "2,0"]) s.tiles[tile].resource = "water";
  const ships = Array.from({ length: fleetSize }, () =>
    piece(s, "1,0", 0, "convoy", 4),
  );
  const sunk = Math.ceil(fleetSize / 2);
  const troops = ships.flatMap((ship, i) =>
    Array.from({ length: action === "rescue" && i >= sunk ? 4 : 8 }, () => {
      const u = piece(s, action === "load" ? "0,0" : "1,0");
      if (action !== "load") u.carrier = ship.id;
      return u;
    }),
  );
  for (let i = 0; i < idleUnits; i++) piece(s, "3,0", 1, "heavy", 2);
  if (action === "rescue") {
    const required = ships.slice(0, sunk).reduce((n, u) => n + points(u), 0),
      attackerPower = power(s, ships, "2,0"),
      enemies = Array.from({ length: (attackerPower + required) / 2 }, () =>
        piece(s, "2,0", 1, "galley", 1),
      );
    // A pending losing-attack choice with partially occupied surviving hulls.
    // No retreat is needed; some passengers fit and the rest are lost.
    s.battle = {
      attacker: 0,
      defender: 1,
      attackers: ships.map((u) => u.id),
      defenders: enemies.map((u) => u.id),
      origin: "1,0",
      target: "2,0",
      naval: true,
      attackerPower,
      defenderPower: power(s, enemies, "2,0"),
      loser: 0,
      loss: required,
      required,
    };
  }
  const command: Command =
    action === "rescue"
      ? { type: "resolve-battle", ids: ships.slice(0, sunk).map((u) => u.id) }
      : action === "move"
        ? { type: "move", ids: ships.map((u) => u.id), to: "2,0" }
        : {
            type: action,
            ships: ships.map((u) => u.id),
            ...(action === "load"
              ? { ids: troops.map((u) => u.id) }
              : { to: "0,0" }),
          };
  const original = JSON.stringify(s),
    times = [];
  let finalHash = "";
  for (let sample = 0; sample < samples; sample++) {
    const start = performance.now();
    const result = applyCommand(s, command);
    times.push(performance.now() - start);
    console.log(
      JSON.stringify({ action, sample: sample + 1, ms: times.at(-1) }),
    );
    if (!result.ok) throw Error(result.error);
    const hash = createHash("sha256")
      .update(JSON.stringify(result.state))
      .digest("hex");
    if (finalHash && hash !== finalHash)
      throw Error("Transaction result changed between samples.");
    finalHash = hash;
    if (JSON.stringify(s) !== original)
      throw Error("Transaction mutated its input.");
  }
  if (expected) {
    const reference = expected.results.find((r: any) => r.action === action);
    if (
      JSON.stringify(reference?.command) !== JSON.stringify(command) ||
      reference?.finalHash !== finalHash
    )
      throw Error(`${action} changed its command or complete final campaign.`);
  }
  results.push({
    action,
    passengers: troops.length,
    command,
    medianMs: [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)],
    samplesMs: times,
    finalHash,
  });
}
const report = {
  source: root,
  fleetSize,
  idleUnits,
  results,
};
const label = (process.env.LABEL ?? "result").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
const output = `test-artifacts/fleet-performance-${label}.json`;
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ...report,
      results: results.map(({ command, ...result }) => result),
      output,
    },
    null,
    2,
  ),
);
