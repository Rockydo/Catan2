import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { newGame } from "../src/game/engine";
import { neighbors, coord } from "../src/game/world";
import { withPlanningFrame } from "../src/game/selectors";
import { planningDestinations, planningDistances } from "../src/game/ai-paths";
import { formerDeployment } from "../tests/deployment-reference";

// Route-only scaling diagnostic. Fresh processes isolate retained memory and
// explicit GC separates live route data from temporary allocations. These open
// and corridor graphs are not complete playable campaigns or AI-turn timings.
const count = Number(process.env.TILES ?? 2000);
if (!Number.isInteger(count) || count < 2 || count > 10000)
  throw Error("TILES must be an integer from 2 through 10000.");
const mode = process.env.PATH_MEMORY_MODE,
  shape = process.env.PATH_MEMORY_SHAPE;
interface Sample {
  mode: string;
  shape: string;
  count: number;
  buildMs: number;
  retainedHeapBytes: number;
  reachable: number;
  routeSteps: number;
  distanceHash: string;
}
if (mode) {
  if (
    !["legacy", "compact"].includes(mode) ||
    !["open", "corridor"].includes(shape ?? "")
  )
    throw Error("Invalid route diagnostic mode.");
  if (!global.gc) throw Error("The child process requires --expose-gc.");
  const s = newGame("route-memory"),
    template = Object.values(s.tiles)[0],
    ids = ["0,0"],
    seen = new Set(ids);
  if (shape === "corridor") for (let i = 1; i < count; i++) ids.push(`${i},0`);
  else
    for (let i = 0; ids.length < count; i++)
      for (const id of neighbors(ids[i])) {
        if (ids.length >= count) break;
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
  s.tiles = Object.fromEntries(
    ids.map((id) => {
      const [q, r] = coord(id);
      return [
        id,
        {
          ...template,
          id,
          q,
          r,
          resource: "grain",
          surface: undefined,
          biome: undefined,
        },
      ];
    }),
  );
  // Warm the coordinate helpers equally in both processes; no path is built.
  for (const id of ids) neighbors(id);
  global.gc();
  const before = process.memoryUsage().heapUsed,
    started = performance.now(),
    retained = withPlanningFrame(s, () =>
      mode === "legacy"
        ? formerDeployment(s, "0,0", false, s.active)
        : planningDistances(s, "0,0", false, s.active),
    ),
    buildMs = performance.now() - started;
  // Retaining the result prevents GC from treating the measured tree as dead.
  Object.assign(globalThis, { pathMemoryResult: retained });
  global.gc();
  const retainedHeapBytes = process.memoryUsage().heapUsed - before,
    hash = createHash("sha256");
  let reachable = 0,
    routeSteps = 0;
  const entries =
    mode === "legacy"
      ? [...(retained as Map<string, string[]>)].map(
          ([id, path]) => [id, path.length] as const,
        )
      : planningDestinations(s, "0,0", false, s.active);
  for (const [id, steps] of entries) {
    reachable++;
    routeSteps += steps;
    hash.update(JSON.stringify([id, steps]));
  }
  console.log(
    JSON.stringify({
      mode,
      shape,
      count,
      buildMs,
      retainedHeapBytes,
      reachable,
      routeSteps,
      distanceHash: hash.digest("hex"),
    }),
  );
} else {
  const results = [];
  for (const shape of ["open", "corridor"]) {
    const modes: Record<string, Sample[]> = {};
    for (const mode of ["legacy", "compact"]) {
      modes[mode] = [];
      for (let run = 0; run < 3; run++) {
        const child = spawnSync(
          process.execPath,
          ["--expose-gc", "--import", "tsx", fileURLToPath(import.meta.url)],
          {
            env: {
              ...process.env,
              PATH_MEMORY_MODE: mode,
              PATH_MEMORY_SHAPE: shape,
            },
            encoding: "utf8",
            timeout: 60000,
          },
        );
        if (child.error || child.status !== 0)
          throw Error(
            child.error?.message ?? child.stderr ?? "Route diagnostic failed.",
          );
        modes[mode].push(JSON.parse(child.stdout));
      }
    }
    const samples = Object.values(modes).flat();
    if (
      samples.some(
        (v) =>
          v.reachable !== count || v.distanceHash !== samples[0].distanceHash,
      )
    )
      throw Error("Destination order or distances changed.");
    const median = (values: number[]) => values.sort((a, b) => a - b)[1];
    results.push({
      shape,
      count,
      exact: true,
      distanceHash: samples[0].distanceHash,
      modes: Object.fromEntries(
        Object.entries(modes).map(([mode, samples]) => [
          mode,
          {
            medianBuildMs: median(samples.map((s) => s.buildMs)),
            medianRetainedHeapBytes: median(
              samples.map((s) => s.retainedHeapBytes),
            ),
            samples,
          },
        ]),
      ),
    });
  }
  mkdirSync("test-artifacts", { recursive: true });
  writeFileSync(
    "test-artifacts/path-memory-performance.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
}
