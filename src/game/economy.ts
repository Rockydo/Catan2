import {
  GOODS,
  RAW,
  PROCESSED,
  type Game,
  type Stock,
  type Good,
} from "./types";
import {
  inventory,
  recipePayment,
  forEachProduction,
  ownTowns,
  effectiveCost,
  sumStock,
  blockAt,
  nearestTown,
} from "./selectors";
import { processedFor, GOOD_INFO } from "./content";
import { dominanceSupport } from "./ai-support";
export function rule(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function validStock(
  stock: unknown,
  allowEmpty = false,
): asserts stock is Stock {
  rule(
    stock && typeof stock === "object" && !Array.isArray(stock),
    "Choose valid goods.",
  );
  for (const [g, n] of Object.entries(stock))
    rule(
      GOODS.includes(g as Good) &&
        Number.isSafeInteger(n) &&
        n >= 0 &&
        n <= Number.MAX_SAFE_INTEGER,
      "Goods must be known types with nonnegative whole quantities.",
    );
  rule(allowEmpty || sumStock(stock) > 0, "Choose at least one good.");
}
export function addStock(target: Stock, source: Stock) {
  for (const g of GOODS) {
    const n = source[g] ?? 0;
    if (n) target[g] = (target[g] ?? 0) + n;
  }
}
export function spend(s: Game, cost: Stock, p = s.active) {
  validStock(cost, true);
  const towns = ownTowns(s, p),
    total = inventory(s, p);
  for (const g of GOODS) {
    const amount = cost[g] ?? 0;
    rule(
      (total[g] ?? 0) >= amount,
      `Not enough ${GOOD_INFO[g].name}: need ${amount}, have ${total[g] ?? 0}.`,
    );
    if (!amount) continue;
    const base = towns.map((t) =>
      Math.floor((amount * (t.stock[g] ?? 0)) / total[g]!),
    );
    let left = amount - base.reduce((a, b) => a + b, 0);
    const order = towns
      .map((_, i) => i)
      .sort(
        (a, b) =>
          ((amount * (towns[b].stock[g] ?? 0)) % total[g]!) -
            ((amount * (towns[a].stock[g] ?? 0)) % total[g]!) || a - b,
      );
    for (const i of order) {
      if (!left) break;
      base[i]++;
      left--;
    }
    towns.forEach((t, i) => {
      if (base[i]) {
        t.stock[g] = (t.stock[g] ?? 0) - base[i];
        if (!t.stock[g]) delete t.stock[g];
      }
    });
  }
}
export function pay(s: Game, cost: Stock, kind = "", p = s.active) {
  spend(s, recipePayment(s, effectiveCost(s, cost, kind, p), p), p);
  const b = s.players[p].bonuses;
  if ((kind === "road" || kind === "route") && b.routes) b.routes--;
  else if (kind === "palisade" && b.palisades) b.palisades--;
  else if (kind === `expedition${b.expeditionTier ?? 2}` && b.expedition)
    b.expedition = false;
  else if (b.discount?.kind === kind) {
    const next = b.discounts?.shift();
    if (next) b.discount = next;
    else delete b.discount;
  } else {
    const index = b.discounts?.findIndex((d) => d.kind === kind) ?? -1;
    if (index >= 0) b.discounts!.splice(index, 1);
  }
}
export function gain(s: Game, goods: Stock, p = s.active) {
  const home = ownTowns(s, p)[0];
  rule(home, "No town remains to store resources.");
  addStock(home.stock, goods);
}
export function log(
  s: Game,
  text: string,
  kind: Game["events"][number]["kind"] = "info",
  owner?: number,
  tile?: string,
) {
  const event: Game["events"][number] = {
    id: Math.max(
      s.actions * 1000 + s.events.length,
      (s.events.at(-1)?.id ?? -1) + 1,
    ),
    turn: s.round,
    text,
    kind,
    owner,
    tile,
  };
  s.events.push(event);
  if (s.events.length > 240) s.events.splice(0, s.events.length - 240);
  return event;
}
export function production(s: Game, total: number) {
  const support = dominanceSupport(s);
  delete s.productionSupport;
  s.production = {};
  for (const p of s.players) s.production[p.id] = {};
  function produce(owner: number, stock: Stock, g: Good, amount: number) {
    if (!amount) return;
    // Each delivery contains one known good. Avoid scanning every good twice
    // for each town, camp or collector, while retaining individual additions.
    stock[g] = (stock[g] ?? 0) + amount;
    const report = s.production[owner];
    report[g] = (report[g] ?? 0) + amount;
  }
  // Only stores and the roll report change while consuming this read. Neither
  // affects terrain yields, blockades, coverage or warehouse selection.
  forEachProduction(s, "current", (owner, town, tile, good, amount) => {
    if (s.tiles[tile].number === total)
      produce(owner, town.stock, good, amount);
  });
  if (support) {
    const gold: Record<number, number> = {};
    const goldbars: Record<number, number> = {};
    for (const town of Object.values(s.towns)) {
      const owner = s.players[town.owner];
      if (!owner.alive || owner.id === support.leader) continue;
      produce(owner.id, town.stock, "gold", support.perTown);
      gold[owner.id] = (gold[owner.id] ?? 0) + support.perTown;
      if (town.level >= 2 && support.perCity > 0) {
        produce(owner.id, town.stock, "goldbars", support.perCity);
        goldbars[owner.id] = (goldbars[owner.id] ?? 0) + support.perCity;
      }
    }
    if (Object.keys(gold).length)
      s.productionSupport = {
        perTown: support.perTown,
        perCity: support.perCity,
        gold,
        goldbars,
      };
  }
  const generated = Object.values(s.production).reduce(
    (n, v) => n + sumStock(v),
    0,
  );
  log(
    s,
    `${s.players[s.active].name} rolled ${total}. ${generated} goods produced.`,
    "production",
    s.active,
  );
}
export const rawOnly = (s: Stock) =>
  Object.keys(s).every((g) => RAW.includes(g as (typeof RAW)[number]));
export const processedOnly = (s: Stock) =>
  Object.keys(s).every((g) =>
    PROCESSED.includes(g as (typeof PROCESSED)[number]),
  );
