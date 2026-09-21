import { minValue } from "../game/aggregate";
import { localize as tx, useLocale } from "../i18n";
import { ResearchArt } from "./ResearchArt";
import { RESEARCH_GOODS, RESEARCH_MARCH } from "../game/content";
import { applyCommand } from "../game/engine";
import { useState } from "react";
import {
  Download,
  Upload,
  Check,
  Shield,
  Swords,
  ArrowRight,
  Anchor,
  ScrollText,
  Compass,
} from "lucide-react";
import {
  GOODS,
  RAW,
  PROCESSED,
  type Game,
  type Command,
  type Stock,
  type Good,
  type Piece,
  type ShipClass,
} from "../game/types";
import {
  CARDS,
  GOOD_INFO,
  shipStats,
  RESEARCH_NAMES,
  COSTS,
  UNIT_INFO,
} from "../game/content";
import {
  inventory,
  ownPieces,
  points,
  casualtySelection,
  retreatOptions,
  sumStock,
  nearestTown,
  power,
  unitName,
  fresh,
  ready,
  speed,
  hostileAt,
  ownTowns,
} from "../game/selectors";
import { neighbors, landAtVertex, canOccupy } from "../game/world";
import { terrainName } from "../game/maritime";
import {
  Modal,
  GoodsPicker,
  GoodsList,
  Cost,
  UnitSymbol,
  UnitPortrait,
} from "./components";

export function BattleDialog({
  game: s,
  onAction,
}: {
  game: Game;
  onAction: (c: Command) => void;
}) {
  useLocale();

  const b = s.battle!,
    losers = (b.loser === b.attacker ? b.attackers : b.defenders).map(
      (id) => s.pieces[id],
    );
  const [ids, setIds] = useState(() => casualtySelection(losers, b.required));
  const remaining = losers.filter((u) => !ids.includes(u.id) && points(u) > 0);
  const options =
    b.loser === b.defender
      ? retreatOptions(
          s,
          b.target,
          b.loser,
          b.naval,
          b.origin,
          remaining,
        ).filter((tile) => remaining.every((u) => !hostileAt(s, tile, u.owner)))
      : [];
  const [selectedRetreat, setRetreat] = useState(options[0] ?? "");
  const retreat = options.includes(selectedRetreat)
    ? selectedRetreat
    : (options[0] ?? "");
  const lost = ids.reduce((n, id) => n + points(s.pieces[id]), 0),
    survives = ids.length < losers.length;
  return (
    <Modal
      title={tx(
        b.bombardment ? "Resolve shore bombardment" : "Resolve the battle",
      )}
    >
      {b.thawRetreat && (
        <p className="notice">
          {tx(
            "Melting ice forced this army to land here. No safe landing was reachable. Normal combat and casualty rules apply; other thaw retreats resume after this battle.",
          )}
        </p>
      )}
      {tx(
        b.bombardment && (
          <p className="notice">
            {tx(
              "Artillery stays on land. Icebound ships cannot retreat; land escorts on their hex defend them. Other defeated ships retreat if a water exit is available.",
            )}
          </p>
        ),
      )}
      <div className="battle-powers">
        <div>
          <small>{s.players[b.attacker].name}</small>
          <strong>{tx(b.attackerPower)}</strong>
          <span>{tx("Attacking")}</span>
        </div>
        <SwordsArt />
        <div>
          <small>
            {tx(
              [...new Set(b.defenders.map((id) => s.pieces[id].owner))]
                .map((id) => s.players[id].name)
                .join(" & "),
            )}
          </small>
          <strong>{tx(b.defenderPower)}</strong>
          <span>{tx("Defending")}</span>
        </div>
      </div>
      <p>
        <b>{s.players[b.loser].name}</b>
        {tx(" must remove")}
        {tx(" ")}
        <b>
          {tx(b.required)}
          {tx(" unit points")}
        </b>
        {tx(". The power difference is ")}
        {tx(b.loss)}
        {tx("; casualties round up to the nearest possible whole-unit total.")}
      </p>
      <div className="unit-list">
        {tx(
          losers.map((u) => (
            <label className="unit-choice" key={u.id}>
              <input
                type="checkbox"
                checked={ids.includes(u.id)}
                onChange={(e) =>
                  setIds((v) =>
                    e.target.checked
                      ? [...v, u.id]
                      : v.filter((id) => id !== u.id),
                  )
                }
              />
              <UnitPortrait unit={u} />
              <span>
                <b>{tx(unitName(u))}</b>
                <small>
                  {s.players[u.owner].name} · {tx(points(u))}
                  {tx(" points")}
                  {tx(
                    u.naval &&
                      Object.values(s.pieces).some((p) => p.carrier === u.id)
                      ? " · carrying troops"
                      : "",
                  )}
                </small>
              </span>
            </label>
          )),
        )}
      </div>
      <div className={`selection-total ${lost === b.required ? "valid" : ""}`}>
        {tx(lost)} / {tx(b.required)}
        {tx(" casualty points selected")}
      </div>
      {tx(
        survives && options.length > 0 && (
          <label className="field">
            {tx("Retreat to")}
            <select
              value={retreat}
              onChange={(e) => setRetreat(e.target.value)}
            >
              {tx(
                options.map((id) => (
                  <option key={id} value={id}>
                    {tx(terrainName(s.tiles[id]))}
                    {tx(" ")}· {tx(id)}
                  </option>
                )),
              )}
            </select>
          </label>
        ),
      )}
      {tx(
        survives && b.loser === b.defender && !options.length && (
          <p className="notice">
            {tx(
              "No retreat is available. Your survivors hold this hex; the attacker remains outside.",
            )}
          </p>
        ),
      )}
      <button
        className="primary full"
        disabled={
          lost !== b.required || (survives && options.length > 0 && !retreat)
        }
        onClick={() =>
          onAction({ type: "resolve-battle", actor: b.loser, ids, retreat })
        }
      >
        {tx("Confirm casualties")}
      </button>
    </Modal>
  );
}
function SwordsArt() {
  useLocale();

  return (
    <span className="crossed-swords" aria-hidden="true">
      <Swords size={32} strokeWidth={1.6} />
    </span>
  );
}
export function DrawDialog({
  game: s,
  onAction,
}: {
  game: Game;
  onAction: (c: Command) => void;
}) {
  useLocale();

  return (
    <Modal title={tx("Choose your discovery")}>
      <p>
        {tx(
          "Keep one card. Every purchase draws afresh from all eight cards in its tier. No deck depletion or discard pile. Your new card can be played immediately.",
        )}
      </p>
      <div className="research-draw">
        {tx(
          s.researchChoice!.map((card, i) => (
            <button
              className="research-card"
              key={card.id}
              onClick={() => onAction({ type: "choose-research", index: i })}
            >
              <ResearchArt kind={card.kind} />
              <small>
                {tx("Tier ")}
                {tx(card.tier)}
              </small>
              <h3>{tx(CARDS[card.kind].name)}</h3>
              <p>{tx(CARDS[card.kind].text)}</p>
              <span>
                {tx("Keep this card ")}
                <ArrowRight size={15} />
              </span>
            </button>
          )),
        )}
      </div>
    </Modal>
  );
}
export function TradeResponse({
  game: s,
  onAction,
}: {
  game: Game;
  onAction: (c: Command) => void;
}) {
  useLocale();

  const t = s.trade!;
  return (
    <Modal
      title={tx(`${s.players[t.from].name} offers a trade`)}
      onClose={() =>
        onAction({ type: "respond-trade", actor: t.to, mode: "decline" })
      }
    >
      <p className="muted small">
        {tx("For ")}
        {s.players[t.to].name}
        {tx(
          ". Decline, close or press Escape to dismiss without exchanging goods.",
        )}
      </p>
      <div className="trade-columns">
        <div>
          <h3>{tx("You receive")}</h3>
          <GoodsList stock={t.give} />
        </div>
        <div>
          <h3>{tx("You give")}</h3>
          <GoodsList stock={t.take} />
        </div>
      </div>
      <div className="button-row">
        <button
          className="secondary"
          onClick={() =>
            onAction({ type: "respond-trade", actor: t.to, mode: "decline" })
          }
        >
          {tx("Decline")}
        </button>
        <button
          className="primary"
          onClick={() =>
            onAction({ type: "respond-trade", actor: t.to, mode: "accept" })
          }
        >
          {tx("Accept trade")}
        </button>
      </div>
    </Modal>
  );
}
export function RaidDialog({
  game: s,
  ids,
  town,
  onAction,
  onClose,
}: {
  game: Game;
  ids: string[];
  town: string;
  onAction: (c: Command) => void;
  onClose: () => void;
}) {
  useLocale();

  const target = s.towns[town],
    destination = nearestTown(s, s.pieces[ids[0]].tile, s.active);
  return (
    <Modal title={tx(`Raid ${target.name}`)} onClose={onClose}>
      <p>
        {tx("Seize the entire warehouse. All ")}
        {tx(sumStock(target.stock))}
        {tx(" goods go directly to ")}
        <b>{tx(destination?.name)}</b>
        {tx(", your nearest town.")}
      </p>
      <GoodsList stock={target.stock} />
      <p className="notice">
        {tx(
          "This costs 1 movement point per unit. On your next turn, raid any new goods or destroy the town.",
        )}
      </p>
      <button
        className="danger full"
        onClick={() => onAction({ type: "siege", ids, town })}
      >
        {tx("Raid all goods")}
      </button>
    </Modal>
  );
}
export function ResearchPlayDialog({
  game: s,
  cardId,
  onAction,
  onClose,
}: {
  game: Game;
  cardId: string;
  onAction: (c: Command) => void;
  onClose: () => void;
}) {
  useLocale();

  const card = s.players[s.active].hand.find((c) => c.id === cardId)!,
    info = CARDS[card.kind],
    kind = card.kind;
  const [goods, setGoods] = useState<Stock>({}),
    [give, setGive] = useState<Stock>({}),
    [mode, setMode] = useState("one"),
    [ids, setIds] = useState<string[]>([]),
    [town, setTown] = useState(""),
    [siegeIds, setSiegeIds] = useState<string[]>([]);
  const march = Boolean(RESEARCH_MARCH[kind]),
    siege = kind === "engineers" || kind === "campaign",
    resource = Boolean(RESEARCH_GOODS[kind]) || kind === "merchant",
    total = kind === "merchant" ? 6 : (RESEARCH_GOODS[kind]?.total ?? 0);
  const groups = Object.values(s.pieces)
    .filter((u) => u.owner === s.active && !u.carrier && ready(s, u))
    .reduce<Record<string, Piece[]>>((a, u) => {
      (a[u.tile] ??= []).push(u);
      return a;
    }, {});
  const command: Command = {
    type: "play-research",
    card: cardId,
    goods,
    give,
    take: goods,
    mode,
    ids: kind === "engineers" ? siegeIds : ids,
    town: town || undefined,
    siegeIds,
  };
  return (
    <Modal title={tx(info.name)} onClose={onClose}>
      <p>{tx(info.text)}</p>
      {tx(
        resource && (
          <>
            {tx(
              kind === "merchant" && (
                <>
                  <h3>{tx("Give raw goods")}</h3>
                  <GoodsPicker
                    value={give}
                    onChange={setGive}
                    goods={RAW}
                    available={inventory(s)}
                    totalLimit={6}
                  />
                  <h3>{tx("Receive raw goods")}</h3>
                </>
              ),
            )}
            <GoodsPicker
              value={goods}
              onChange={setGoods}
              goods={
                kind === "merchant" || !RESEARCH_GOODS[kind]?.processed
                  ? RAW
                  : PROCESSED
              }
              totalLimit={total}
            />
            <p className="selection-total">
              {tx(sumStock(goods))}
              {tx(" selected")}
              {tx(
                kind === "merchant"
                  ? ` · ${sumStock(give)} offered`
                  : ` / ${total}`,
              )}
            </p>
          </>
        ),
      )}
      {tx(
        kind === "muster" && (
          <label className="field">
            {tx("Choose your commission")}
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="one">{tx("One tier-IV unit")}</option>
              <option value="two">{tx("Two tier-III units")}</option>
            </select>
          </label>
        ),
      )}
      {tx(
        march && (
          <>
            <h3>{tx("Armies and fleets receiving movement")}</h3>
            <p className="muted">
              {tx("Choose up to ")}
              {tx(RESEARCH_MARCH[kind].groups)}
              {tx(" groups. Each gains +")}
              {tx(RESEARCH_MARCH[kind].movement)}
              {tx(
                " movement this turn. Units that already moved can participate; new or spent units cannot.",
              )}
            </p>
            {tx(
              Object.entries(groups).map(([tile, units]) => (
                <label className="unit-choice" key={tile}>
                  <input
                    type="checkbox"
                    checked={units.every((u) => ids.includes(u.id))}
                    onChange={(e) =>
                      setIds((v) =>
                        e.target.checked
                          ? [...new Set([...v, ...units.map((u) => u.id)])]
                          : v.filter((id) => !units.some((u) => u.id === id)),
                      )
                    }
                  />
                  <span>
                    {tx(units.length)} {tx(units[0].naval ? "ships" : "units")}
                    {tx(" at ")}
                    {tx(tile)}
                    <small>
                      {tx(
                        Math.max(
                          0,
                          minValue(
                            units.map((u) => speed(u) + u.bonus - u.moved),
                          ),
                        ),
                      )}
                      {tx(" ")}→{tx(" ")}
                      {tx(
                        minValue(
                          units.map((u) => speed(u) + u.bonus - u.moved),
                        ) + RESEARCH_MARCH[kind].movement,
                      )}
                      {tx(" ")}
                      {tx("movement remaining")}
                    </small>
                  </span>
                </label>
              )),
            )}
          </>
        ),
      )}
      {tx(
        siege && (
          <>
            <label className="field">
              {tx("Siege target")}
              {tx(kind === "campaign" ? " (optional)" : "")}
              <select
                value={town}
                onChange={(e) => {
                  setTown(e.target.value);
                  setSiegeIds([]);
                }}
              >
                <option value="">{tx("Select a town")}</option>
                {tx(
                  Object.values(s.towns)
                    .filter((t) => t.owner !== s.active)
                    .map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.name}
                      </option>
                    )),
                )}
              </select>
            </label>
            {tx(
              town &&
                Object.entries(groups)
                  .map(([tile, units]) => ({
                    tile,
                    units: units.filter((u) => !u.naval && fresh(s, u)),
                  }))
                  .filter(
                    ({ tile, units }) =>
                      units.length > 0 &&
                      canOccupy(s.tiles[tile], false) &&
                      s.vertices[s.towns[town].vertex].tiles.includes(tile),
                  )
                  .map(({ tile, units }) => (
                    <label className="unit-choice" key={tile}>
                      <input
                        type="radio"
                        name="siege-army"
                        checked={siegeIds[0] === units[0].id}
                        onChange={() => setSiegeIds(units.map((u) => u.id))}
                      />
                      <span>
                        {tx(units.length)}
                        {tx(" besiegers at ")}
                        {tx(tile)}
                      </span>
                    </label>
                  )),
            )}
          </>
        ),
      )}
      {tx(
        !applyCommand(s, command).ok && (
          <p className="muted" role="status">
            {tx(applyCommand(s, command).error)}
          </p>
        ),
      )}
      <button
        className="primary full"
        disabled={!applyCommand(s, command).ok}
        onClick={() => {
          onAction(command);
        }}
      >
        {tx("Play research")}
      </button>
      <p className="muted">
        {tx(
          "All placement, tier and recruitment limits still apply. Material discounts are used on your next eligible construction this turn.",
        )}
      </p>
    </Modal>
  );
}
export function TransportDialog({
  game: s,
  land,
  water,
  unload,
  onAction,
  onClose,
}: {
  game: Game;
  land: string;
  water: string;
  unload: boolean;
  onAction: (c: Command) => void;
  onClose: () => void;
}) {
  useLocale();

  const carriers = Object.values(s.pieces).filter(
    (u) => u.owner === s.active && u.naval && u.tile === water && fresh(s, u),
  );
  const [ships, setShips] = useState(
    carriers
      .filter((u) => shipStats(u.kind as ShipClass, u.tier).capacity > 0)
      .map((u) => u.id),
  );
  const troops = Object.values(s.pieces).filter(
    (u) =>
      u.owner === s.active &&
      !u.naval &&
      (unload
        ? u.carrier && carriers.some((c) => c.id === u.carrier)
        : u.tile === land && fresh(s, u)),
  );
  const [ids, setIds] = useState(troops.map((u) => u.id)),
    [to, setTo] = useState(land);
  const berths = carriers
    .filter((u) => ships.includes(u.id))
    .reduce(
      (n, u) =>
        n +
        shipStats(u.kind as ShipClass, u.tier).capacity -
        Object.values(s.pieces).filter((p) => p.carrier === u.id).length,
      0,
    );
  return (
    <Modal
      title={tx(unload ? "Land your troops" : "Embark your army")}
      onClose={onClose}
    >
      <p>
        {tx(
          "One unit needs one berth. Loading or unloading spends both the unit and its carrier’s turn.",
        )}
      </p>
      <h3>{tx("Carriers")}</h3>
      {tx(
        carriers.map((u) => (
          <label className="unit-choice" key={u.id}>
            <input
              type="checkbox"
              checked={ships.includes(u.id)}
              onChange={(e) =>
                setShips((v) =>
                  e.target.checked
                    ? [...v, u.id]
                    : v.filter((id) => id !== u.id),
                )
              }
            />
            <UnitPortrait unit={u} />
            <span>
              {tx(unitName(u))} ·{" "}
              {tx(shipStats(u.kind as ShipClass, u.tier).capacity)}
              {tx(" berths")}
            </span>
          </label>
        )),
      )}
      <h3>{tx("Troops")}</h3>
      <div className="unit-list">
        {tx(
          troops.map((u) => (
            <label className="unit-choice" key={u.id}>
              <input
                type="checkbox"
                checked={ids.includes(u.id)}
                onChange={(e) =>
                  setIds((v) =>
                    e.target.checked
                      ? [...v, u.id]
                      : v.filter((id) => id !== u.id),
                  )
                }
              />
              <UnitPortrait unit={u} />
              <span>{tx(unitName(u))}</span>
            </label>
          )),
        )}
      </div>
      {tx(
        unload ? (
          <label className="field">
            {tx("Landing beach")}
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">{tx("Choose an empty beach")}</option>
              {tx(
                neighbors(water)
                  .filter(
                    (t) =>
                      s.tiles[t] && canOccupy(s.tiles[t]) && !hostileAt(s, t),
                  )
                  .map((t) => (
                    <option value={t} key={t}>
                      {tx(terrainName(s.tiles[t]))} · {tx(t)}
                    </option>
                  )),
              )}
            </select>
          </label>
        ) : (
          <p>
            {tx(ids.length)}
            {tx(" troops selected · ")}
            {tx(berths)}
            {tx(" free berths")}
          </p>
        ),
      )}
      <button
        className="primary full"
        disabled={
          !ids.length ||
          !ships.length ||
          (!unload && ids.length > berths) ||
          (unload && !to)
        }
        onClick={() =>
          onAction({ type: unload ? "unload" : "load", ids, ships, to })
        }
      >
        {tx(unload ? "Disembark troops" : "Load transports")}
      </button>
    </Modal>
  );
}
