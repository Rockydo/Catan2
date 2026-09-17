import { writeFileSync, readFileSync } from "node:fs";
import { GUILDS, GUILD_KINDS, guildCost } from "../src/game/guilds";
import { GOOD_INFO } from "../src/game/content";
import type { Good } from "../src/game/types";
const format = (c: ReturnType<typeof guildCost>) =>
  Object.entries(c)
    .map(([g, n]) => `${n} ${GOOD_INFO[g as Good].name}`)
    .join(" + ");
let doc = readFileSync("GUILDS.md", "utf8");
doc = doc.replace(
  "It occupies **one specialization slot per city**.",
  "City I, II and III provide **one, two and three different guild slots**, respectively. A guild’s own maximum tier still follows the city tier.",
);
doc = doc.replace(
  "Economic guilds can save an optional standing recipe",
  "Economic guilds except Scholars can save an optional standing recipe",
);
doc = doc.replace(
  "Prospectors also need their selected deposit clear",
  "Prospectors, Farmers and Extractors also need their selected deposit clear",
);
doc = doc.replace(
  /Guilds and their tiers are publicly visible\.(?! The map keeps)/,
  "Guilds and their tiers are publicly visible. The map keeps one crest plus a guild-count badge; selecting the city exposes compact tabs for each guild’s orders, tiers and costs. Every guild retains its own independent contracts.",
);
const table = GUILD_KINDS.map(
  (kind) =>
    `| ${GUILDS[kind].name} | ${[1, 2, 3].map((t) => format(guildCost(kind, t))).join(" | ")} |`,
).join("\n");
const begin = doc.indexOf("| Guild |"),
  end = doc.indexOf("\n\n", begin);
doc =
  doc.slice(0, begin) +
  "| Guild | Tier I | Tier II | Tier III |\n|---|---|---|---|\n" +
  table +
  doc.slice(end);
const additions = GUILD_KINDS.slice(5)
  .map(
    (kind) =>
      `### ${GUILDS[kind].name}\n\n${GUILDS[kind].purpose}\n\n| Tier | Work order |\n|---|---|\n${GUILDS[kind].tiers.map((effect, i) => `| ${["I", "II", "III"][i]} | ${effect} |`).join("\n")}\n`,
  )
  .join("\n");
const notes = `\nFarmers work only adjoining Grain or Wool **land** tiles: mineral supplements, heated cultivation and chemical fertilizer support the agricultural chain. Hides, Whales and Fish are not farmed. Existing Hides orders are cleared on load; a previously built guild without Grain or Wool remains dormant. Extractors require adjacent Wood or Clay land. Both use the exact selected deposit, need it free of enemy armies, and deliver output into the guild city without consuming or reducing normal production.\n\nEngineer equipment applies to every eligible land combat unit in the selected adjacent formation. The army receives a flat +2/+4/+6 siege power, using the **highest equipment bonus** among its units rather than summing it. Splitting keeps tools with equipped units; merging never multiplies the bonus. Each unit can receive Engineer tools once per owner turn, separately from Commander movement supplies. Tools expire at the start of the owner’s next turn, affect both city and watchtower sieges, and never change battle power. New units and embarked units cannot receive tools.\n\nBuilders grant 2/3/6 free road or shipping-route builds for the rest of the current turn. These commissions stack with other route grants, expire next owner turn, and obey every normal placement, ownership and blocking rule. They do not construct settlements or camps for free.\n\nScholars fund tier-II/III/IV discoveries respectively. Each uses the normal full eight-card catalogue, gives two distinct random choices and keeps one, without a discard pile or reroll. There is no bonus card; the chosen card can be played immediately. Complete the current discovery before another order. Scholars have **manual orders only**, since each discovery requires a player choice; each unlocked guild tier still has an independent order.\n\nThe town inspector always shows total siege resistance and its city/wall/watchtower components, plus current siege progress. With no siege equipment, resistance N means N siege-only operations followed by a raid; destruction becomes legal on a later attacker turn. Selected hostile army equipment shows its reduction. Defending armies must still be cleared first.\n`;
const marker = "### Farmers’ Guild";
if (doc.includes(marker)) doc = doc.slice(0, doc.indexOf(marker));
doc += "\n" + additions + notes;
writeFileSync("GUILDS.md", doc);
let design = readFileSync("docs/design/DESIGN.md", "utf8");
const a = design.indexOf("**Guilds of the Frontier**"),
  b = design.indexOf("**14. AI priorities and implementation**", a);
const section = doc
  .replace(/^# Guilds of the Frontier/m, "**Guilds of the Frontier**")
  .replace(/^#{2,3} (.+)$/gm, "**$1**");
design = design.slice(0, a) + section + "\n\n" + design.slice(b);
design = design.replace(
  "The strongest faction must exceed the runner-up by more than **25% plus six strength points** before any coalition pressure appears. Pressure then rises nonlinearly with the gap, up to a sixfold target preference against overwhelming dominance.",
  "Coalition pressure starts only beyond a **25% lead or six strength points, whichever is larger**. It then ramps sharply: a 409-to-248 lead produces about 78% crisis severity; a leader at 1.8 times the runner-up reaches the maximum sixfold target preference. Small differences remain ordinary rivalry.",
);
design = design.replace(
  "troops can rendezvous with transports and seek another island.",
  "troops can rendezvous with transports and seek another island or another beach on the same island behind a blocked choke point.",
);
design = design.replace(
  "The military planner finishes legal sieges before moving armies away,",
  "The military planner equips useful Engineer siege tools before an operation and finishes legal sieges before moving armies away,",
);
const raidSection = design.indexOf(
  "\n**Anti-leader raids and naval pressure.**",
);
if (raidSection >= 0) design = design.slice(0, raidSection);
design +=
  "\n**Anti-leader raids and naval pressure.** Unbeatable occupied destinations are excluded before selecting a strategic target. Guarded towns are less attractive than exposed warehouses; cheap fast detachments can bypass defenses to raid, destroy camps and roads, or suppress production. Arriving with one movement point left for an immediate raid is rewarded. Infantry guards still protect threatened towns and favorable defensive sorties take priority. Land detours and same-island transport bypasses use only revealed legal paths. Warships can blockade productive water even without a hostile fleet; limited blockade hulls compete for supplies, while loaded transports retain their landing task. Nearby weaker factions are spared and receive bounded favorable military trades as crisis severity rises. No intentionally losing frontal attacks are added: losers cannot damage winners under these battle rules.\n";
writeFileSync("docs/design/DESIGN.md", design);
