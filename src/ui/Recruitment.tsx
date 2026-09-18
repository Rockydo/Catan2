import { GoldPaymentNotice } from "./components";
import { localize as tx, useLocale } from "../i18n";
import { affordable, recipePayment } from "../game/selectors";
import { useState } from "react";
import {
  Anchor,
  Swords,
  Minus,
  Plus,
  Shield,
  Footprints,
  Users,
} from "lucide-react";
import {
  type Game,
  type Command,
  type Town,
  type UnitClass,
  type ShipClass,
} from "../game/types";
import {
  UNIT_INFO,
  SHIP_INFO,
  ROMAN,
  unitCost,
  shipCost,
  shipStats,
} from "../game/content";
import { landAtVertex, waterAtVertex } from "../game/world";
import { terrainName } from "../game/maritime";
import { ownTowns, hostileAt, inventory } from "../game/selectors";
import { applyCommand } from "../game/engine";
import { UnitPortrait, Cost } from "./components";
function remembered(key: string, fallback: string) {
  try {
    return sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* Preferences are optional. */
  }
}
export function Recruitment({
  game: s,
  town,
  viewer,
  interactive,
  onAction,
  onTown,
}: {
  game: Game;
  town: Town;
  viewer: number;
  interactive: boolean;
  onAction: (c: Command) => void;
  onTown: (id: string) => void;
}) {
  useLocale();

  const [naval, setNaval] = useState(
    () => remembered("frontiers-recruit-domain", "army") === "navy",
  );
  const [tier, setTier] = useState(() =>
    Math.max(
      1,
      Math.min(4, Number(remembered("frontiers-recruit-tier", "1")) || 1),
    ),
  );
  const [deploy, setDeploy] = useState("");
  const [quantity, setQuantity] = useState(1);
  const towns = ownTowns(s, viewer),
    ports = towns.filter((t) => waterAtVertex(s, t.vertex).length);
  const tiles = naval
    ? waterAtVertex(s, town.vertex)
    : landAtVertex(s, town.vertex);
  const destination = tiles.includes(deploy)
    ? deploy
    : (tiles.find((id) => !hostileAt(s, id, viewer, naval)) ?? tiles[0]);
  const count = naval ? quantity : Math.min(quantity, 100);
  const bonus = s.players[viewer].bonuses;
  const kinds = Object.keys(naval ? SHIP_INFO : UNIT_INFO) as (
    UnitClass | ShipClass
  )[];
  function changeDomain(value: boolean) {
    setNaval(value);
    remember("frontiers-recruit-domain", value ? "navy" : "army");
    setQuantity(1);
    if (value && !waterAtVertex(s, town.vertex).length && ports[0])
      onTown(ports[0].vertex);
  }
  return (
    <section className="recruitment-workspace" aria-label={tx("Recruitment")}>
      <div className="recruitment-controls">
        <div
          className="recruit-domain"
          role="group"
          aria-label={tx("Recruitment type")}
        >
          <button aria-pressed={!naval} onClick={() => changeDomain(false)}>
            <Swords size={17} />
            {tx("Army")}
          </button>
          <button aria-pressed={naval} onClick={() => changeDomain(true)}>
            <Anchor size={17} />
            {tx("Navy")}
          </button>
        </div>
        <label className="compact-field">
          <span>{tx(naval ? "Shipyard" : "Recruitment town")}</span>
          <select
            aria-label={tx("Recruitment town")}
            value={town.vertex}
            onChange={(e) => {
              setDeploy("");
              onTown(e.target.value);
            }}
          >
            {tx(
              towns.map((t) => (
                <option key={t.id} value={t.vertex}>
                  {t.name}
                  {tx(" · level ")}
                  {tx(t.turnLevel)}
                  {tx(
                    naval
                      ? ` · ${waterAtVertex(s, t.vertex).length ? "coastal" : "inland"}`
                      : "",
                  )}
                </option>
              )),
            )}
          </select>
        </label>
        <div className="recruit-config">
          <div
            className="recruit-tiers"
            role="group"
            aria-label={tx("Unit tier")}
          >
            {tx(
              [1, 2, 3, 4].map((t) => (
                <button
                  key={t}
                  aria-label={tx(`Tier ${ROMAN[t]}`)}
                  aria-pressed={tier === t}
                  title={tx(
                    t > town.turnLevel
                      ? `Requires town level ${t} at turn start`
                      : `Tier ${ROMAN[t]}`,
                  )}
                  onClick={() => {
                    setTier(t);
                    remember("frontiers-recruit-tier", String(t));
                  }}
                >
                  {tx(ROMAN[t])}
                  {tx(t > town.turnLevel && <span aria-hidden="true">·</span>)}
                </button>
              )),
            )}
          </div>
          <div className="recruit-quantity">
            <button
              aria-label={tx("Recruit one fewer")}
              disabled={count <= 1}
              onClick={() => setQuantity(count - 1)}
            >
              <Minus size={13} />
            </button>
            <input
              aria-label={tx("Recruitment quantity")}
              type="number"
              min={1}
              max={naval ? undefined : 100}
              value={count}
              onChange={(e) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(
                      naval ? Number.MAX_SAFE_INTEGER : 100,
                      Math.floor(Number(e.target.value)) || 1,
                    ),
                  ),
                )
              }
            />
            <button
              aria-label={tx("Recruit one more")}
              disabled={count >= (naval ? Number.MAX_SAFE_INTEGER : 100)}
              onClick={() => setQuantity(count + 1)}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
        <label className="compact-field">
          <span>{tx(naval ? "Launch tile" : "Deploy to")}</span>
          <select
            aria-label={tx(naval ? "Naval deployment" : "Land deployment")}
            value={destination ?? ""}
            onChange={(e) => setDeploy(e.target.value)}
          >
            {tx(
              !tiles.length && (
                <option value="">
                  {tx("No adjacent ")}
                  {tx(naval ? "water" : "land")}
                  {tx(": choose another town")}
                </option>
              ),
            )}
            {tx(
              tiles.map((id) => (
                <option value={id} key={id}>
                  {tx(terrainName(s.tiles[id]))}
                  {tx(" ")}· {tx(id)}
                  {tx(hostileAt(s, id, viewer, naval) ? " · occupied" : "")}
                </option>
              )),
            )}
          </select>
        </label>
        <p className="recruit-status">
          {tx(naval ? "Unlimited shipbuilding" : "Unlimited recruitment")}
          {tx(" · new units act next turn")}
        </p>
      </div>
      <div className="recruit-grid">
        {tx(
          kinds.map((kind) => {
            const ship = naval ? shipStats(kind as ShipClass, tier) : null;
            const unit = !naval ? UNIT_INFO[kind as UnitClass] : null;
            const name = ship?.name ?? unit!.names[tier - 1];
            const command: Command = {
              type: naval ? "ship" : "recruit",
              town: town.id,
              tile: destination,
              kind,
              tier,
              count,
            };
            const free = naval
              ? bonus.ships.filter(
                  (v, i) =>
                    v.includes(kind as ShipClass) &&
                    tier === (bonus.shipTiers?.[i] ?? bonus.shipTier ?? 1),
                ).length
              : bonus.recruits.filter(
                  (v) =>
                    v.tier === tier && v.classes.includes(kind as UnitClass),
                ).length;
            const recipe = naval
              ? shipCost(kind as ShipClass, tier)
              : unitCost(kind as UnitClass, tier);
            const cost = Object.fromEntries(
              Object.entries(recipe).map(([g, n]) => [
                g,
                n! * Math.max(0, count - free),
              ]),
            );
            // Validate one hull for placement/tier, then the complete payment.
            // Previewing a large naval order should never construct that fleet.
            const result = applyCommand(
              s,
              naval ? { ...command, count: 1 } : command,
            );
            const canPay =
              !naval || affordable(s, recipePayment(s, cost, viewer), viewer);
            const available = interactive && result.ok && canPay;
            const explanation = !interactive
              ? "Available during your action phase"
              : (result.error ??
                (!canPay ? "Not enough resources for this order" : undefined));
            return (
              <article
                className="recruit-card compact-recruit"
                key={kind}
                data-testid={`recruit-${kind}`}
              >
                <div className="recruit-heading">
                  <UnitPortrait unit={{ kind, tier, naval, owner: viewer }} />
                  <div>
                    <small className="unit-category">
                      {tx(
                        naval
                          ? kind === "merchantship"
                            ? "Trade ship"
                            : kind === "fishing"
                              ? "Fishing ship"
                              : kind === "convoy"
                                ? "Convoy"
                                : kind === "transport"
                                  ? "Transport"
                                  : "Warship"
                          : unit!.name,
                      )}
                    </small>
                    <b>{tx(name)}</b>
                  </div>
                </div>
                <div className="recruit-facts">
                  <span
                    title={tx("Power before terrain and watchtower bonuses")}
                  >
                    <Shield size={12} />
                    {tx(ship?.power ?? (kind === "merchant" ? 0 : tier))}
                  </span>
                  <span title={tx("Movement per turn")}>
                    <Footprints size={12} />
                    {tx(ship?.speed ?? unit!.speed)}
                  </span>
                  {tx(
                    ship?.capacity ? (
                      <span title={tx("Transport capacity")}>
                        <Users size={12} />
                        {tx(ship.capacity)}
                      </span>
                    ) : null,
                  )}
                  <span>
                    {tx(
                      kind === "merchant" ||
                        kind === "merchantship" ||
                        kind === "fishing"
                        ? `×${tier} harvest`
                        : kind === "artillery"
                          ? `−${tier} siege`
                          : unit?.family
                            ? `×2 ${unit.family}`
                            : "",
                    )}
                  </span>
                  {kind === "fishing" && <span>{tx(`Range ${tier}`)}</span>}
                  {(kind === "merchant" || kind === "merchantship") &&
                    tier >= 3 && <span>{tx(`+${tier - 2} processed`)}</span>}
                </div>
                <button
                  className="action-button recruit-purchase"
                  disabled={!available}
                  title={tx(explanation ?? `Add ${count} ${name}`)}
                  aria-label={tx(
                    `${naval ? "Launch" : "Recruit"} ${count} ${name}`,
                  )}
                  onClick={() => onAction(command)}
                >
                  <span>
                    {tx(naval ? "Launch" : "Recruit")}
                    {tx(count > 1 ? ` ×${count}` : "")}
                  </span>
                  <Cost
                    cost={cost}
                    available={inventory(s, viewer)}
                    payment={recipePayment(s, cost, viewer)}
                  />
                  <GoldPaymentNotice
                    cost={cost}
                    payment={recipePayment(s, cost, viewer)}
                  />
                </button>
                {tx(
                  !result.ok && (
                    <small
                      className="recruit-unavailable"
                      title={tx(explanation)}
                    >
                      {tx(explanation)}
                    </small>
                  ),
                )}
              </article>
            );
          }),
        )}
      </div>
    </section>
  );
}
