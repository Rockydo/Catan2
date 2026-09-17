import { readFileSync, writeFileSync } from "node:fs";
import { deserialize, assertInvariants } from "../src/game/save";
import { ownTowns, ownPieces } from "../src/game/selectors";
const results = JSON.parse(
  readFileSync("test-artifacts/coalition-audit-summary.json", "utf8"),
);
if (!results.some((r: { seats: number }) => r.seats === 8)) {
  const lines = readFileSync("test-artifacts/coalition-campaigns.log", "utf8")
    .split("\n")
    .filter((l) => l.startsWith("{"));
  const checkpoint = lines
    .map((l) => JSON.parse(l))
    .filter((r) => r.seats === 8)
    .at(-1);
  const s = deserialize(
    readFileSync("test-artifacts/coalition-audit-8-save.json", "utf8"),
  );
  assertInvariants(s);
  if (s.actions !== checkpoint.actions || s.round !== checkpoint.round)
    throw Error("Snapshot mismatch");
  results.push({
    ...checkpoint,
    completedRounds: s.round - 1,
    cutoff: "bounded checkpoint; subsequent partial round excluded",
    towns: s.players.map((p) => ownTowns(s, p.id).length),
    units: s.players.map((p) => ownPieces(s, p.id).length),
    snapshotValidated: true,
  });
  writeFileSync(
    "test-artifacts/coalition-audit-summary.json",
    JSON.stringify(results, null, 2),
  );
}
console.log(JSON.stringify(results));
