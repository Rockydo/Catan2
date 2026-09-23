import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tradeFixture } from "../tests/trade-fixture";
import { piece } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { canOccupy } from "../src/game/world";
import { GOODS, type Game, type Stock } from "../src/game/types";

// Exact economic decisions against a reference checkout, using public-board
// variations and private disposable copies. No browser or saved game is touched.
if (!process.env.SOURCE_ROOT)
  throw Error("Set SOURCE_ROOT to the reference checkout.");
async function planner(root: string) {
  const moduleAt = (name: string) =>
    pathToFileURL(resolve(root, "src/game", `${name}.ts`)).href;
  const ai = await import(moduleAt("ai"));
  const { withPlanningFrame } = await import(moduleAt("selectors"));
  const { withSeasonalPlanning } = await import(moduleAt("ai-seasonal"));
  return (position: Game, framed: boolean) => {
    const s = structuredClone(position),
      before = JSON.stringify(s);
    const costs: Stock[] = [
      { grain: 2, ore: 1 },
      { lumber: 1, brick: 1 },
      { hides: 2, salt: 2 },
      { coke: 2, goldbars: 1 },
    ];
    const run = () => ({
      offers: costs.map((cost) => ai.playerTradeToward(s, cost)),
      aid: ai.coalitionTrade(s),
      accept: s.players
        .filter((p) => p.alive && p.id !== s.active)
        .map((p) => {
          const view = {
            ...s,
            trade: {
              from: s.active,
              to: p.id,
              give: { lumber: 2 },
              take: { grain: 1 },
            },
          };
          return ai.shouldAcceptTrade(view);
        }),
    });
    const result = withSeasonalPlanning(() =>
      framed ? withPlanningFrame(s, run) : run(),
    );
    if (JSON.stringify(s) !== before)
      throw Error("Trade planning mutated the campaign.");
    return JSON.stringify(result);
  };
}
const current = await planner("."),
  previous = await planner(process.env.SOURCE_ROOT);
const hash = createHash("sha256");
let comparisons = 0,
  offers = 0,
  aid = 0,
  accepted = 0;
for (let scenario = 0; scenario < 48; scenario++) {
  const s = tradeFixture();
  s.active = scenario % s.players.length;
  for (const p of s.players) {
    p.control = (["easy", "standard", "hard"] as const)[(scenario + p.id) % 3];
    p.turns = 12;
    p.tradeOffered = false;
    for (const town of ownTowns(s, p.id)) town.stock = {};
    const home = ownTowns(s, p.id)[0];
    if (scenario % 8 < 4) {
      for (const [index, good] of GOODS.entries()) {
        const value = (index * 11 + scenario * 7 + p.id * 3) % 17;
        if (value < 9) home.stock[good] = value;
      }
    } else if (scenario % 8 === 4) home.stock = { lumber: 20, grain: 20 };
    else if (scenario % 8 === 5) home.stock = { ore: 1 };
    else if (scenario % 8 === 6)
      home.stock = p.id === s.active ? { lumber: 20 } : { grain: 20 };
    if (scenario % 6 === 1) home.level = home.turnLevel = 4;
  }
  if (scenario >= 8) {
    const leader = (s.active + 1) % s.players.length;
    const tile = Object.values(s.tiles).find((t) => canOccupy(t))!.id;
    for (let i = 0; i < (scenario % 2 ? 100 : 8); i++)
      piece(s, tile, leader, "heavy", 1 + (scenario % 4));
    if (scenario % 6 === 2)
      s.alliances = [
        {
          id: "audit",
          members: s.players.filter((p) => p.id !== leader).map((p) => p.id),
          threat: leader,
          lockedUntil: 20,
          emergency: "locked",
        },
      ];
    else if (scenario % 6 === 3)
      s.alliances = [
        {
          id: "audit",
          members: [s.active, (s.active + 2) % s.players.length],
          threat: leader,
          lockedUntil: 20,
        },
      ];
  }
  if (scenario % 12 === 8) s.players[s.active].tradeOffered = true;
  if (scenario % 12 === 9) s.phase = "military";
  if (scenario % 12 === 10)
    s.trade = {
      from: s.active,
      to: (s.active + 1) % s.players.length,
      give: { lumber: 1 },
      take: { ore: 1 },
    };
  for (const framed of [false, true]) {
    const expected = previous(s, framed),
      actual = current(s, framed);
    // Both entry modes must retain the previous public decisions.
    if (actual !== expected) {
      mkdirSync("test-artifacts", { recursive: true });
      writeFileSync("test-artifacts/trade-reference.json", expected);
      writeFileSync("test-artifacts/trade-current.json", actual);
      throw Error(
        `Trade scenario ${scenario} (framed=${framed}) changed a decision.`,
      );
    }
    const result = JSON.parse(actual);
    offers += result.offers.filter(Boolean).length;
    aid += Number(!!result.aid);
    accepted += result.accept.filter(Boolean).length;
    hash.update(actual);
    comparisons++;
  }
}
console.log(
  JSON.stringify({
    scenarios: 48,
    comparisons,
    offers,
    aid,
    accepted,
    exact: true,
    hash: hash.digest("hex"),
  }),
);
