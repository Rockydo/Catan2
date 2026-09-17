import { newGame, random } from "../src/game/engine";
import { writeFileSync } from "node:fs";
const trialsPerSeed = 100000,
  seeds = 20;
const totals = Array(13).fill(0),
  pairs = Array(36).fill(0),
  runs = [];
for (let seed = 0; seed < seeds; seed++) {
  const s = newGame(`dice-audit-${seed}`),
    counts = Array(13).fill(0);
  for (let i = 0; i < trialsPerSeed; i++) {
    const a = 1 + Math.floor(random(s) * 6),
      b = 1 + Math.floor(random(s) * 6);
    counts[a + b]++;
    totals[a + b]++;
    pairs[(a - 1) * 6 + b - 1]++;
  }
  runs.push({ seed, eights: counts[8], counts: counts.slice(2) });
}
const n = seeds * trialsPerSeed;
const distribution = Array.from({ length: 11 }, (_, i) => {
  const total = i + 2,
    expected = (6 - Math.abs(7 - total)) / 36;
  return {
    total,
    count: totals[total],
    observedPercent: (totals[total] * 100) / n,
    expectedPercent: expected * 100,
  };
});
const pairChiSquare = pairs.reduce(
  (chi, count) => chi + (count - n / 36) ** 2 / (n / 36),
  0,
);
const result = {
  rolls: n,
  seeds,
  trialsPerSeed,
  distribution,
  pairChiSquare,
  pairDegreesOfFreedom: 35,
  runs,
  note: "Uses the production engine's seeded PRNG and the exact two independent draws used by roll. This is a diagnostic sample, not proof of perfect randomness or an audit of a particular player's save.",
};
writeFileSync("test-artifacts/v24-dice.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, runs: undefined }, null, 2));
if (
  pairChiSquare > 100 ||
  distribution.some(
    (d) => Math.abs(d.observedPercent - d.expectedPercent) > 0.15,
  )
)
  throw Error("Dice distribution requires investigation");
