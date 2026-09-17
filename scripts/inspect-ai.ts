import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { ownTowns, ownPieces } from "../src/game/selectors";
import { serialize } from "../src/game/save";
import { writeFileSync } from "node:fs";
let s = newGame(
  "soak-1",
  Array.from({ length: 4 }, (_, i) => ({
    name: `Realm ${i}`,
    control: "standard" as const,
  })),
);
while (s.round <= 180 && s.phase !== "finished") {
  const r = applyCommand(s, chooseAIAction(s));
  if (!r.ok) throw Error(r.error);
  s = r.state;
}
writeFileSync("test-artifacts/ai-debug.json", serialize(s));
for (const p of s.players)
  console.log(
    p.id,
    ownTowns(s, p.id).map((t) => ({
      name: t.name,
      vertex: t.vertex,
      level: t.level,
      stock: t.stock,
    })),
    ownPieces(s, p.id).reduce<Record<string, number>>((a, u) => {
      const k = `${u.tile}/${u.kind}/${u.carrier ? "aboard" : "ashore"}`;
      a[k] = (a[k] ?? 0) + 1;
      return a;
    }, {}),
  );
