import { localize as tx, useLocale } from "../i18n";
import type { Game, Good, Raw } from "../game/types";
import {
  RAW,
  PROCESSED,
  GOOD_INFO,
  COSTS,
  extensionName,
  processedFor,
} from "../game/content";
import { inventory, ownTowns, income } from "../game/selectors";
import { GoodIcon, Modal, Cost } from "./components";
const USES: Record<Good, string> = {
  meat: "Livestock produces Meat during its harvest seasons. Meat replaces Grain one-for-one in recipes, after Grain and Fish. It can be processed into Rations. Trades transfer the exact named goods.",
  oil: "Whales and Seal hunting grounds produce Oil alongside Hides. Oil replaces Coal one-for-one in recipes: Coal is spent first, then Oil covers a shortfall automatically. Artisans can refine Oil into Fuel. Trades transfer the exact named goods.",
  fish: "Replaces Grain one-for-one in any building or recruitment recipe. Grain is spent first; Fish covers a shortfall automatically. Smokehouses add Rations without consuming your Fish.",
  gold: "Exchange 1 Gold for any raw good, or 2 Gold for any processed good. Gold occurs at different rates in each climate.",
  goldbars:
    "Exchange 1 Gold bar for 2 raw goods of one type or 1 processed good. Produced by Goldsmiths.",
  lumber: "Roads, settlements, ships and camp frames.",
  brick: "Roads, settlements and camp foundations.",
  wool: "Settlements, sails, research and light infantry.",
  grain: "Settlements, cities, early troops, research and expeditions.",
  ore: "Cities, tools, heavy infantry, artillery and research.",
  stone: "Quarries, mine supports, walls and the foundations of every guild.",
  hides:
    "Produced by forests, Steppe, Seal hunting grounds and Whales. Used for harvest bags, mine hauling, ballista torsion, cavalry and leather-making.",
  salt: "Food preservation, sea supplies, textile washing, tanning and chemicals.",
  coal: "Kilns, forges, tier-II guild construction and coal-fired work orders.",
  planks: "Ship hulls, artillery frames, advanced cities and mine supports.",
  ceramics:
    "City services, bakeries, chemical vessels, farm equipment and research.",
  cloth: "Sails, city growth, cavalry equipment and research.",
  provisions: "One-time recruitment costs, expeditions and research.",
  steel: "Armor, weapons, tools, artillery, warships and strong walls.",
  masonry: "Cities, fortifications, catapult counterweights, kilns and mines.",
  leather:
    "Armor, cavalry tack, siege torsion, ship straps, exploration and camps.",
  reagents:
    "Textile dyes, ore treatment, water treatment, tanning, research and gunpowder.",
  coke: "Refined coal fuel for metallurgy, tier-III guilds, industrial work orders, army and fleet supply.",
};
export function GoodGuide({
  game,
  good,
  viewer,
  onClose,
  onTrade,
}: {
  game: Game;
  good: Good;
  viewer: number;
  onClose: () => void;
  onTrade: () => void;
}) {
  useLocale();

  const raw = (
      RAW.includes(good as Raw)
        ? good
        : RAW[PROCESSED.indexOf(good as (typeof PROCESSED)[number])]
    ) as Raw,
    processed = processedFor(raw),
    isRaw = raw === good;
  const holdings = inventory(game, viewer),
    rate = income(game, viewer)[good] ?? 0;
  const recipes = Object.entries(COSTS).filter(
    ([, c]) =>
      c[good] ||
      ((good === "fish" || good === "meat") && c.grain) ||
      (good === "oil" && c.coal),
  );
  return (
    <Modal title={tx(GOOD_INFO[good].name)} onClose={onClose} wide>
      <div className="good-guide-heading">
        <GoodIcon good={good} size={74} />
        <div>
          <span className="eyebrow">
            {tx(isRaw ? "RAW RESOURCE" : "PROCESSED GOOD")}
          </span>
          <p>{tx(USES[good])}</p>
          <b>
            {tx(holdings[good] ?? 0)}
            {tx(" stored · ")}
            {tx(rate.toFixed(2))}
            {tx(" expected per dice roll, annual average")}
          </b>
        </div>
      </div>
      <div className="production-chain">
        <GoodIcon good={raw} size={32} />
        <b>{tx(GOOD_INFO[raw].name)}</b>
        <span>
          → {tx(raw === "oil" ? "Artisans’ Guild" : extensionName(raw))} →
        </span>
        <GoodIcon good={processed} size={32} />
        <b>{tx(GOOD_INFO[processed].name)}</b>
      </div>
      <p className="muted">
        {tx(
          isRaw
            ? "Towns and camps collect this resource when their linked tile rolls during an active season."
            : "A city extension produces this good when its linked raw-resource tile rolls during an active season. It consumes no stored raw goods.",
        )}
        {tx(" ")}
        {tx("Enemy occupation blocks that tile’s production.")}
      </p>
      <h3>{tx("Stored in your towns")}</h3>
      <div className="guide-stores">
        {tx(
          ownTowns(game, viewer).map((t) => (
            <span key={t.id}>
              {t.name}
              <b>{tx(t.stock[good] ?? 0)}</b>
            </span>
          )),
        )}
      </div>
      <details className="guide-recipes">
        <summary>
          {tx("Used in ")}
          {tx(recipes.length)}
          {tx(" recipes")}
        </summary>
        {tx(
          recipes.map(([name, cost]) => (
            <div key={name}>
              <span>
                {tx(
                  name
                    .replace("Lumber camp", "Wood camp")
                    .replace("Brick camp", "Clay camp")
                    .replace("Ore camp", "Iron ore camp"),
                )}
              </span>
              <Cost cost={cost} />
            </div>
          )),
        )}
      </details>
      <button className="primary full" onClick={onTrade}>
        {tx("Open bank trading")}
      </button>
    </Modal>
  );
}
