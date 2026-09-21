import { appendValues } from "./aggregate";
import { aiExpeditionAllowed, AI_EXPEDITION_RESTRICTION } from "./ai-expansion";
import {
  type Game,
  type Command,
  type ShipClass,
  type UnitClass,
} from "./types";
import {
  CARDS,
  SHIP_INFO,
  RESEARCH_GOODS,
  RESEARCH_MARCH,
  RESEARCH_RECRUITS,
  RESEARCH_SHIPS,
  RESEARCH_EXPEDITIONS,
} from "./content";
import {
  ownTowns,
  besieged,
  sumStock,
  ready,
  expeditionSites,
  routeSites,
  siegeRequirement,
  hostileAt,
} from "./selectors";
import { gain, spend, rawOnly, processedOnly, rule, log } from "./economy";
import { siegeArmy } from "./military";
import { canOccupy } from "./world";
const ALL_CLASSES: UnitClass[] = [
  "heavy",
  "light",
  "cavalry",
  "artillery",
  "merchant",
];
export function playResearch(s: Game, c: Command) {
  const p = s.players[s.active],
    card = p.hand.find((v) => v.id === c.card);
  rule(card, "Choose one of your research cards.");
  const kind = card.kind,
    b = p.bonuses;
  function addShips(tier: number, classes: ShipClass[][]) {
    b.shipTiers ??= b.ships.map(() => b.shipTier ?? 1);
    appendValues(
      b.shipTiers,
      classes.map(() => tier),
    );
    appendValues(b.ships, classes);
    b.shipTier = tier;
  }
  function addDiscount(discount: NonNullable<typeof b.discount>) {
    if (b.discount) (b.discounts ??= []).push(discount);
    else b.discount = discount;
  }
  const hasTown = (min = 1) =>
    ownTowns(s).some((t) => t.level >= min && !besieged(s, t.id));
  if (RESEARCH_GOODS[kind]) {
    const goods = c.goods ?? {},
      reward = RESEARCH_GOODS[kind];
    rule(
      sumStock(goods) === reward.total,
      `Choose exactly ${reward.total} goods.`,
    );
    rule(
      reward.processed ? processedOnly(goods) : rawOnly(goods),
      "Choose the correct category of goods.",
    );
    rule(
      Object.values(goods).filter((n) => n && n > 0).length <= reward.types,
      "Too many different goods selected.",
    );
    gain(s, goods);
  } else if (RESEARCH_RECRUITS[kind]) {
    const reward = RESEARCH_RECRUITS[kind];
    rule(
      ownTowns(s).some((t) => t.turnLevel >= reward.tier && !besieged(s, t.id)),
      "No town has the required recruitment level.",
    );
    appendValues(
      b.recruits,
      Array.from({ length: reward.count }, () => ({
        tier: reward.tier,
        classes: [...reward.classes],
      })),
    );
  } else if (RESEARCH_SHIPS[kind]) {
    const reward = RESEARCH_SHIPS[kind];
    rule(
      ownTowns(s).some(
        (t) =>
          t.turnLevel >= reward.tier &&
          !besieged(s, t.id) &&
          s.vertices[t.vertex].tiles.some(
            (id) =>
              canOccupy(s.tiles[id], true) && !hostileAt(s, id, s.active, true),
          ),
      ),
      "An eligible coastal town is required.",
    );
    addShips(
      reward.tier,
      Array.from({ length: reward.count }, () => [...reward.classes]),
    );
  } else if (kind === "merchant") {
    rule(
      c.give &&
        c.take &&
        sumStock(c.give) > 0 &&
        sumStock(c.give) <= 6 &&
        sumStock(c.give) === sumStock(c.take) &&
        rawOnly(c.give) &&
        rawOnly(c.take),
      "Exchange one to six raw goods for the same number of raw goods.",
    );
    rule(
      Object.keys(c.give).every((g) => !c.take![g as keyof typeof c.take]),
      "Do not exchange a good for itself.",
    );
    spend(s, c.give);
    gain(s, c.take);
  } else if (kind === "roads") {
    rule(
      hasTown() &&
        (routeSites(s, "road").length || routeSites(s, "route").length),
      "No legal road or sea-route placement remains.",
    );
    b.routes += 3;
  } else if (kind === "palisade") {
    gain(s, { lumber: 2, stone: 2 });
  } else if (["levy", "volunteers", "skilled", "muster"].includes(kind)) {
    const tier =
      kind === "levy"
        ? 1
        : kind === "volunteers"
          ? 2
          : kind === "skilled"
            ? 3
            : c.mode === "two"
              ? 3
              : 4;
    rule(
      ownTowns(s).some((t) => t.turnLevel >= tier && !besieged(s, t.id)),
      "No town has the required recruitment level.",
    );
    appendValues(
      b.recruits,
      Array.from(
        {
          length: kind === "levy" || (kind === "muster" && tier === 3) ? 2 : 1,
        },
        () => ({
          tier,
          classes:
            kind === "levy"
              ? ALL_CLASSES.filter((k) => k !== "artillery" && k !== "merchant")
              : ALL_CLASSES,
        }),
      ),
    );
  } else if (kind === "industry" || kind === "workshops") {
    rule(hasTown(2), "An eligible city is required.");
    addDiscount({
      kind: "industry",
      raw: kind === "industry" ? 6 : 4,
      processed: kind === "industry" ? 4 : 2,
    });
  } else if (kind === "civic" || kind === "masonry") {
    rule(
      ownTowns(s).some(
        (t) => !besieged(s, t.id) && (t.level < 4 || t.wall < t.level),
      ),
      "No eligible upgrade remains.",
    );
    addDiscount({
      kind: "civic",
      raw: kind === "masonry" ? 4 : 6,
      processed: kind === "masonry" ? 2 : 8,
    });
  } else if (["patrol", "naval", "admiralty"].includes(kind)) {
    const tier = kind === "patrol" ? 2 : kind === "naval" ? 3 : 4;
    rule(
      ownTowns(s).some(
        (t) =>
          t.turnLevel >= tier &&
          !besieged(s, t.id) &&
          s.vertices[t.vertex].tiles.some(
            (v) =>
              canOccupy(s.tiles[v], true) && !hostileAt(s, v, s.active, true),
          ),
      ),
      "An eligible coastal town is required.",
    );
    addShips(tier, [Object.keys(SHIP_INFO) as ShipClass[]]);
  } else if (RESEARCH_EXPEDITIONS[kind]) {
    rule(aiExpeditionAllowed(s), AI_EXPEDITION_RESTRICTION);
    rule(
      !p.expeditionUsed &&
        (expeditionSites(s, "land").length || expeditionSites(s, "sea").length),
      "No eligible unused frontier launch.",
    );
    rule(!b.expedition, "An expedition is already funded for this turn.");
    b.expedition = true;
    b.expeditionTier = RESEARCH_EXPEDITIONS[kind];
    if (kind === "frontier") b.routes += 6;
  } else if (RESEARCH_MARCH[kind] || kind === "engineers") {
    const ids = kind === "engineers" ? [] : (c.ids ?? []),
      units = ids.map((id) => s.pieces[id]);
    const max = RESEARCH_MARCH[kind]?.groups ?? 0;
    rule(
      new Set(ids).size === ids.length &&
        units.every(
          (u) => u && u.owner === s.active && !u.carrier && ready(s, u),
        ),
      "Select units or ships that have not fought, performed a spent action, or been recruited this turn. Ordinary movement is allowed.",
    );
    rule(
      new Set(units.map((u) => u.tile)).size <= max,
      `Choose at most ${max} armies.`,
    );
    let siegeEffect = false;
    if (kind === "engineers" || (kind === "campaign" && c.town)) {
      const { units: besiegers, town } = siegeArmy(s, {
        ...c,
        ids: kind === "campaign" ? c.siegeIds : c.ids,
      });
      const key = `${s.active}:${town.id}`;
      rule(
        !s.sieges[key] || s.sieges[key].last !== p.turns,
        "This town already received an operation this turn.",
      );
      rule(
        !s.sieges[key] || s.sieges[key].raided === null,
        "This town has already been raided.",
      );
      rule(
        !besiegers.some((u) => ids.includes(u.id) && kind === "campaign"),
        "The same units cannot receive march and siege effects.",
      );
      rule(
        siegeRequirement(s, town, besiegers) > (s.sieges[key]?.progress ?? 0),
        "This army can already raid; siege progress would have no effect.",
      );
      s.sieges[key] ??= {
        owner: s.active,
        town: town.id,
        progress: 0,
        last: -1,
        raided: null,
      };
      s.sieges[key].progress += kind === "engineers" ? 3 : 2;
      siegeEffect = true;
    }
    rule(units.length > 0 || siegeEffect, "Select an eligible army or siege.");
    if (kind !== "engineers")
      units.forEach((u) => (u.bonus += RESEARCH_MARCH[kind].movement));
  } else throw new Error("Unknown research effect.");
  p.hand = p.hand.filter((v) => v.id !== card.id);
  p.researchPlayed = true;
  log(s, `${p.name} played ${CARDS[kind].name}.`, "research", s.active);
}
