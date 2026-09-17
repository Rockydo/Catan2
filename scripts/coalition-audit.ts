import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import {
  dominance,
  coalitionSupport,
  warTarget,
} from "../src/game/ai-strategy";
import { REALM_NAMES } from "../src/game/content";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { ownTowns, ownPieces } from "../src/game/selectors";
import { writeFileSync } from "node:fs";

const rounds = Number(process.env.ROUNDS ?? 35);
const results = [];
for (const seats of [4, 8]) {
  let s = newGame(
    `coalition-audit-${seats}`,
    REALM_NAMES.slice(0, seats).map((name) => ({ name, control: "standard" })),
  );
  const counts: Record<string, number> = {};
  let attacks = 0,
    leaderAttacks = 0,
    aidOffers = 0,
    acceptedAid = 0,
    paidExpeditions = 0,
    maxMs = 0,
    lastRound = 0;
  while (s.phase !== "finished" && s.round <= rounds) {
    const at = performance.now();
    const c = chooseAIAction(s),
      crisis = dominance(s);
    maxMs = Math.max(maxMs, performance.now() - at);
    counts[c.type] = (counts[c.type] ?? 0) + 1;
    if (c.type === "expedition" && !s.players[s.active].bonuses.expedition)
      paidExpeditions++;
    if (c.type === "offer-trade" && coalitionSupport(s, c.partner!) > 0.2)
      aidOffers++;
    if (
      c.type === "respond-trade" &&
      c.mode === "accept" &&
      s.trade &&
      coalitionSupport(s, s.trade.to, s.trade.from) > 0.2
    )
      acceptedAid++;
    if (c.type === "move") {
      const enemies = Object.values(s.pieces).filter(
        (u) => u.owner !== s.active && u.tile === c.to && !u.carrier,
      );
      if (enemies.length) {
        attacks++;
        if (crisis.severity > 0.2 && enemies[0].owner === crisis.leader)
          leaderAttacks++;
        if (!warTarget(s, enemies[0].owner))
          throw Error("AI attacked a truce partner");
      }
    }
    const result = applyCommand(s, c);
    if (!result.ok)
      throw Error(
        JSON.stringify({ seats, round: s.round, c, error: result.error }),
      );
    s = result.state;
    if (s.actions % 25 === 0) assertInvariants(s);
    if (s.actions > rounds * seats * 100) throw Error("AI command loop");
    if (s.round !== lastRound && s.round % 5 === 0) {
      lastRound = s.round;
      console.log(
        JSON.stringify({
          seats,
          round: s.round,
          actions: s.actions,
          tiles: Object.keys(s.tiles).length,
          attacks,
          paidExpeditions,
          counts,
        }),
      );
      writeFileSync(
        `test-artifacts/coalition-audit-${seats}-save.json`,
        serialize(s),
      );
    }
  }
  assertInvariants(deserialize(serialize(s)));
  const result = {
    seats,
    round: s.round,
    winner: s.winner,
    actions: s.actions,
    tiles: Object.keys(s.tiles).length,
    attacks,
    leaderAttacks,
    aidOffers,
    acceptedAid,
    paidExpeditions,
    maxDecisionMs: Math.round(maxMs),
    counts,
    towns: s.players.map((p) => ownTowns(s, p.id).length),
    units: s.players.map((p) => ownPieces(s, p.id).length),
  };
  results.push(result);
  console.log(JSON.stringify(result));
  writeFileSync(
    "test-artifacts/coalition-audit-summary.json",
    JSON.stringify(results, null, 2),
  );
}
