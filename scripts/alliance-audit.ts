import { readFileSync, writeFileSync } from "node:fs";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import { friendly } from "../src/game/relations";
const label = process.env.LABEL ?? "alliance";
const reports = [];
for (const seats of [4, 8]) {
  let s = deserialize(
    readFileSync(
      `test-artifacts/guild-expansion-ai-${seats}-save.json`,
      "utf8",
    ),
  );
  for (const p of s.players) p.control = "standard";
  const startRound = s.round,
    counts: Record<string, number> = {},
    times: number[] = [],
    applyTimes: number[] = [];
  let alliances = 0,
    mergers = 0,
    departures = 0,
    sharedStacks = 0;
  for (let n = 0; n < 500 && s.phase !== "finished"; n++) {
    const at = performance.now(),
      command = chooseAIAction(s);
    times.push(performance.now() - at);
    const before = s.events.at(-1)?.id ?? -1;
    const start = performance.now(),
      result = applyCommand(s, command);
    applyTimes.push(performance.now() - start);
    if (!result.ok)
      throw Error(
        JSON.stringify({
          seats,
          n,
          round: s.round,
          command,
          error: result.error,
        }),
      );
    s = result.state;
    counts[command.type] = (counts[command.type] ?? 0) + 1;
    const events = s.events.filter((e) => e.id > before);
    alliances += events.filter((e) =>
      e.text.includes("formed an alliance"),
    ).length;
    mergers += events.filter((e) =>
      e.text.includes("merged their alliances"),
    ).length;
    departures += events.filter((e) =>
      e.text.includes("left the alliance"),
    ).length;
    if (
      Object.values(s.pieces).some(
        (u) =>
          !u.carrier &&
          Object.values(s.pieces).some(
            (v) =>
              !v.carrier &&
              v.tile === u.tile &&
              v.owner !== u.owner &&
              friendly(s, u.owner, v.owner),
          ),
      )
    )
      sharedStacks++;
    if (n % 20 === 0 || s.battle || s.allianceOffer) assertInvariants(s);
    if (n % 100 === 0) s = deserialize(serialize(s));
  }
  assertInvariants(s);
  times.sort((a, b) => a - b);
  applyTimes.sort((a, b) => a - b);
  const report = {
    seats,
    startRound,
    endRound: s.round,
    actions: times.length,
    alliances,
    mergers,
    departures,
    sharedStackActions: sharedStacks,
    counts,
    medianDecisionMs: times[Math.floor(times.length * 0.5)],
    p95DecisionMs: times[Math.floor(times.length * 0.95)],
    p95ApplyMs: applyTimes[Math.floor(applyTimes.length * 0.95)],
    activeAlliances: s.alliances,
  };
  reports.push(report);
  console.log(JSON.stringify(report));
  writeFileSync(`test-artifacts/${label}-ai-${seats}-save.json`, serialize(s));
}
writeFileSync(
  `test-artifacts/${label}-ai.json`,
  JSON.stringify(reports, null, 2),
);
