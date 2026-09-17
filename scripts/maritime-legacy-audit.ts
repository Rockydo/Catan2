import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { deserialize, assertInvariants, serialize } from "../src/game/save";
import { hash } from "../src/game/world";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
const results = [];
for (const file of readdirSync("test-artifacts/nine-goods-saves").filter((f) =>
  f.endsWith(".json"),
)) {
  const text = readFileSync(`test-artifacts/nine-goods-saves/${file}`, "utf8"),
    old = JSON.parse(text).game ?? JSON.parse(text);
  const envelope = JSON.stringify({
    format: "catane-frontiers",
    version: old.version,
    game: old,
    checksum: hash(JSON.stringify(old)).toString(16),
  });
  let s = deserialize(envelope);
  assertInvariants(s);
  for (const tile of Object.values(old.tiles) as any[]) {
    const now = s.tiles[tile.id];
    if (now.resource !== tile.resource || now.number !== tile.number)
      throw Error(`Changed old terrain ${file} ${tile.id}`);
  }
  if (
    JSON.stringify(old.dice) !== JSON.stringify(s.dice) ||
    JSON.stringify(old.rng) !== JSON.stringify(s.rng)
  )
    throw Error(`Changed dice ${file}`);
  const startRound = s.round,
    commands: Record<string, number> = {};
  let actions = 0;
  while (s.phase !== "finished" && s.round < startRound + 3 && actions < 300) {
    const c = chooseAIAction(s),
      r = applyCommand(s, c);
    if (!r.ok) throw Error(`${file} ${JSON.stringify(c)} ${r.error}`);
    s = r.state;
    actions++;
    commands[c.type] = (commands[c.type] ?? 0) + 1;
    if (actions % 25 === 0) assertInvariants(s);
  }
  assertInvariants(deserialize(serialize(s)));
  const result = {
    file,
    sourceVersion: old.version,
    version: s.version,
    startRound,
    endRound: s.round,
    actions,
    commands,
    preservedTerrain: true,
    preservedDice: true,
  };
  results.push(result);
  console.log(JSON.stringify(result));
}
writeFileSync(
  "test-artifacts/maritime-legacy.json",
  JSON.stringify(results, null, 2),
);
