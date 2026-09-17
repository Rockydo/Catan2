import { readFileSync, writeFileSync } from "node:fs";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
import {
  guildCost,
  GUILD_KINDS,
  guildOrderQuote,
  townGuilds,
  extractionGuild,
  extractionTiles,
} from "../src/game/guilds";
import {
  RAW,
  PROCESSED,
  type Stock,
  type Good,
  type GuildOrder,
} from "../src/game/types";
import { COSTS } from "../src/game/content";
import { probability } from "../src/game/selectors";
import { guildFixture } from "../tests/guild-fixture";
const value = (stock: Stock, scarce?: Good) =>
  Object.entries(stock).reduce(
    (n, [good, q]) =>
      n +
      q! *
        (good === scarce ? 3 : 1) *
        (good === "goldbars"
          ? 4
          : good === "gold"
            ? 2
            : PROCESSED.includes(good as (typeof PROCESSED)[number])
              ? 3
              : 1),
    0,
  );
const prefix = process.env.AUDIT_PREFIX ?? "guilds";
const balance = [];
for (const kind of GUILD_KINDS)
  for (const tier of [1, 2, 3]) {
    const { s, home, mineral, land } = guildFixture(kind, tier);
    if (kind === "extractors") s.tiles[land].resource = "lumber";
    const capital = Array.from({ length: tier }, (_, i) =>
      value(guildCost(kind, i + 1)),
    ).reduce((a, b) => a + b, 0);
    const orders: GuildOrder[] = extractionGuild(kind)
      ? extractionTiles(s, home).map((tile) => ({ tile }))
      : kind === "artisans"
        ? RAW.map((raw) => ({ raw }))
        : kind === "merchants"
          ? [
              { give: "salt", take: "coal" },
              ...(tier === 3
                ? [{ give: "coke" as const, take: "steel" as const }]
                : []),
            ]
          : kind === "builders" || kind === "scholars"
            ? [{}]
            : [];
    for (const order of orders) {
      const q = guildOrderQuote(s, home, order);
      const services =
        q.routes * 2 +
        (q.researchTier
          ? value(
              COSTS[
                `Research ${["", "I · Practical Knowledge", "II · Guild Knowledge", "III · Engineering", "IV · Statecraft"][q.researchTier]}`
              ],
            )
          : 0);
      const net = value(q.gain) + services - value(q.cost);
      balance.push({
        kind,
        tier,
        order,
        cost: q.cost,
        gain: q.gain,
        capital,
        netRawEquivalent: net,
        neutralPaybackOwnerTurns:
          net > 0 ? Number((capital / net).toFixed(2)) : null,
        coalScarcityNet:
          value(q.gain, "coal") + services - value(q.cost, "coal"),
      });
    }
  }
const opportunity = [];
for (const kind of [
  "prospectors",
  "artisans",
  "merchants",
  "farmers",
  "extractors",
] as const) {
  for (const tier of [1, 2, 3]) {
    const { s, home, mineral, land } = guildFixture(kind, tier);
    if (kind === "extractors") s.tiles[land].resource = "lumber";
    const capital = Array.from({ length: tier }, (_, i) =>
      value(guildCost(kind, i + 1)),
    ).reduce((a, b) => a + b, 0);
    const cityCapital = [
      "City I / level 2",
      "City II / level 3",
      "City III / level 4",
    ]
      .slice(0, tier)
      .reduce((n, key) => n + value(COSTS[key]), 0);
    const orders = Array.from({ length: tier }, (_, i) =>
      guildOrderQuote(
        s,
        home,
        extractionGuild(kind)
          ? { tier: i + 1, tile: kind === "prospectors" ? mineral : land }
          : kind === "artisans"
            ? { tier: i + 1, raw: "ore" }
            : i === 2
              ? { tier: 3, give: "coke", take: "steel" }
              : { tier: i + 1, give: "salt", take: "stone" },
      ),
    );
    const net = orders.reduce((n, q) => n + value(q.gain) - value(q.cost), 0);
    opportunity.push({
      kind,
      tier,
      capital,
      cityCapital,
      orders: orders.map((q) => ({ cost: q.cost, gain: q.gain })),
      netAllUnlockedOrders: net,
      paybackGuildOnly: net > 0 ? capital / net : null,
      paybackIncludingCityUnlocks:
        net > 0 ? (capital + cityCapital) / net : null,
    });
  }
}
const passiveAlternatives = [4, 8].flatMap((factions) =>
  [2, 6, 7, 8, 12].map((number) => ({
    factions,
    number,
    expectedRollsPerOwnerTurn: factions,
    campOneRawPerHit: probability(number) * factions,
    forgeOneProcessedPerHit: probability(number) * factions * 3,
    campCapital: value(COSTS["Ore camp"]),
    forgeCapital: value(COSTS["Forge I"]),
  })),
);
writeFileSync(
  `test-artifacts/${prefix}-balance.json`,
  JSON.stringify(
    {
      method:
        "Neutral replacement proxy: ordinary raw=1, Gold=2, processed=3, Gold bars=4. Coal scarcity multiplies Coal by 3. Excludes opportunity cost of city itself and dice production. Payback is illustrative, not a win-rate estimate.",
      balance,
      opportunity,
      passiveAlternatives,
      opportunityMethod:
        "All unlocked orders are independent. Compare full guild costs and optionally all city unlock costs; cities also provide their own income, so charging their full cost solely to guilds is an upper-bound attribution. Passive alternatives assume existing access/roads and no occupation; no compounding or winning-strategy claim.",
    },
    null,
    2,
  ),
);
const campaigns = [];
for (const seats of [4, 8]) {
  let s = deserialize(
    readFileSync(`test-artifacts/rebellions-audit-${seats}-save.json`, "utf8"),
  );
  const startRound = s.round,
    startActions = s.actions,
    counts: Record<string, number> = {},
    guilds: Record<string, number> = {},
    times: number[] = [];
  while (
    s.phase !== "finished" &&
    s.round < startRound + 12 &&
    s.actions < startActions + 4000
  ) {
    const at = performance.now(),
      c = chooseAIAction(s);
    times.push(performance.now() - at);
    const r = applyCommand(s, c);
    if (!r.ok) throw Error(JSON.stringify({ c, error: r.error }));
    counts[c.type] = (counts[c.type] ?? 0) + 1;
    if (c.type === "guild") {
      const key = `${c.kind}-${townGuilds(r.state.towns[c.town!]).find((g) => g.kind === c.kind)!.tier}`;
      guilds[key] = (guilds[key] ?? 0) + 1;
    }
    if (c.type === "guild-order") {
      const key = `orders-${c.guild ?? townGuilds(s.towns[c.town!])[0].kind}`;
      guilds[key] = (guilds[key] ?? 0) + 1;
    }
    s = r.state;
    if (s.actions % 40 === 0) assertInvariants(s);
  }
  assertInvariants(deserialize(serialize(s)));
  times.sort((a, b) => a - b);
  const report = {
    seats,
    startRound,
    endRound: s.round,
    actions: s.actions - startActions,
    tiles: Object.keys(s.tiles).length,
    pieces: Object.keys(s.pieces).length,
    counts,
    guilds,
    decisionMedianMs: times[Math.floor(times.length * 0.5)],
    decisionP95Ms: times[Math.floor(times.length * 0.95)],
  };
  campaigns.push(report);
  console.log(JSON.stringify(report));
  writeFileSync(`test-artifacts/${prefix}-ai-${seats}-save.json`, serialize(s));
}
writeFileSync(
  `test-artifacts/${prefix}-ai.json`,
  JSON.stringify(campaigns, null, 2),
);
