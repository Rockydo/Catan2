import { localize as tx, useLocale } from "../i18n";
import { useCallback, useState } from "react";
import { ShieldAlert, MapPin, X } from "lucide-react";
import type { Game, Event, Town } from "../game/types";
import { sumStock } from "../game/selectors";
import { townSiegeStatuses } from "../game/siege-status";

export function useTownAlerts() {
  const [notices, setNotices] = useState<Event[]>([]);
  const capture = useCallback((before: Game, after: Game) => {
    const old = new Set(before.events.map((e) => e.id));
    const added = after.events.filter(
      (e) =>
        !old.has(e.id) &&
        (e.rebellion ||
          e.frontierReturn ||
          (e.townAttack &&
            after.players[e.townAttack.defender].control === "human")),
    );
    if (added.length)
      setNotices((previous) => {
        let result = previous;
        for (const event of added) {
          // Repeated siege steps update that town's warning; raids remain distinct.
          if (event.townAttack?.kind === "siege")
            result = result.filter(
              (e) =>
                !(
                  e.townAttack?.town === event.townAttack!.town &&
                  e.townAttack.kind === "siege"
                ),
            );
          result = [...result, event];
        }
        return result.slice(-30);
      });
  }, []);
  const dismiss = useCallback(
    (id: number) => setNotices((n) => n.filter((e) => e.id !== id)),
    [],
  );
  const reset = useCallback(() => setNotices([]), []);
  return { notices, capture, dismiss, reset };
}
export function SiegeProgress({
  game,
  town,
  onInspect,
}: {
  game: Game;
  town: Town;
  onInspect?: () => void;
}) {
  useLocale();

  return (
    <div className="town-sieges">
      {tx(
        townSiegeStatuses(game, town).map((status) => (
          <div
            className="town-siege-progress"
            key={status.siege.owner}
            data-testid={`siege-progress-${town.id}-${status.siege.owner}`}
          >
            {tx(
              onInspect && (
                <button className="text-button" onClick={onInspect}>
                  {tx("View full siege details")}
                </button>
              ),
            )}
            <strong>
              <ShieldAlert size={15} />
              {game.players[status.siege.owner].name} ·{tx(" ")}
              {tx(status.breached ? "Breached" : "Under siege")}
            </strong>
            <div
              className="siege-meter"
              role="progressbar"
              aria-label={tx(
                `Siege of ${town.name} by ${game.players[status.siege.owner].name}`,
              )}
              aria-valuemin={0}
              aria-valuemax={Math.max(1, status.required)}
              aria-valuenow={
                status.breached
                  ? Math.max(1, status.required)
                  : status.required
                    ? status.completed
                    : 1
              }
              aria-valuetext={status.label}
            >
              <span style={{ width: `${status.fraction * 100}%` }} />
            </div>
            <span>{tx(status.label)}</span>
            {tx(
              !status.breached && (
                <small>
                  {tx(status.completed)} / {tx(status.required)}
                  {tx(" siege steps completed · raid is a separate operation")}
                </small>
              ),
            )}
            <small>
              {tx(
                "Based on the strongest adjacent artillery group. Reinforcements or withdrawal can change the siege.",
              )}
            </small>
          </div>
        )),
      )}
    </div>
  );
}
export function TownAlerts({
  game,
  viewer,
  notices,
  onDismiss,
  onShow,
}: {
  game: Game;
  viewer: number;
  notices: Event[];
  onDismiss: (id: number) => void;
  onShow: (vertex: string, id: number) => void;
}) {
  useLocale();

  const mine = notices.filter((e) => e.townAttack?.defender === viewer);
  const event = mine.at(-1);
  if (!event) return null;
  const a = event.townAttack!,
    town = game.towns[a.town];
  const title =
    a.kind === "destroy"
      ? "Town destroyed"
      : a.kind === "raid"
        ? "Town raided"
        : "Town under siege";
  return (
    <aside
      className="town-alert"
      role="alert"
      aria-label={tx(title)}
      data-testid="town-attack-alert"
    >
      <div className="town-alert-title">
        <ShieldAlert size={21} />
        <strong>{tx(title)}</strong>
        <button
          aria-label={tx("Dismiss town alert")}
          onClick={() => onDismiss(event.id)}
        >
          <X size={17} />
        </button>
      </div>
      <h3>{tx(a.name)}</h3>
      <p>
        {tx(game.players[event.owner!]?.name ?? "An enemy")}
        {tx(
          a.kind === "destroy"
            ? " destroyed your town, its walls and extensions."
            : a.kind === "raid"
              ? ` stole ${sumStock(a.goods ?? {})} goods from this warehouse.`
              : " is besieging your town.",
        )}
      </p>
      {tx(town && <SiegeProgress game={game} town={town} />)}
      {tx(
        a.kind === "destroy" && (
          <p>
            {tx(sumStock(a.goods ?? {}))}
            {tx(" remaining stored goods seized by the attacker.")}
          </p>
        ),
      )}
      <div className="town-alert-footer">
        <button onClick={() => onShow(a.vertex, event.id)}>
          <MapPin size={15} />
          {tx("Show location")}
        </button>
        <small>
          {tx(
            mine.length > 1
              ? `${mine.length - 1} earlier alerts`
              : `Round ${event.turn}`,
          )}
        </small>
      </div>
    </aside>
  );
}

export function RebellionAlert({
  game,
  notices,
  onDismiss,
  onShow,
}: {
  game: Game;
  notices: Event[];
  onDismiss: (id: number) => void;
  onShow: (vertex: string, id: number) => void;
}) {
  useLocale();

  const events = notices.filter((e) => e.rebellion || e.frontierReturn);
  const event = events[0];
  if (event?.frontierReturn) {
    const r = event.frontierReturn;
    return (
      <aside
        className="rebellion-alert"
        role="status"
        aria-label={tx("Faction returns")}
        data-testid="frontier-return-alert"
      >
        <div className="town-alert-title">
          <ShieldAlert size={20} />
          <strong>
            {game.players[r.faction].name}
            {tx(" returns")}
          </strong>
          <button
            aria-label={tx("Dismiss frontier return announcement")}
            onClick={() => onDismiss(event.id)}
          >
            <X size={17} />
          </button>
        </div>
        <p>
          {tx(
            "A lost faction has established a foothold on the newly explored frontier.",
          )}
        </p>
        <div className="rebellion-totals">
          <span>
            {tx(r.towns)} {tx(r.towns === 1 ? "settlement" : "settlements")}
          </span>
          <span>
            {tx(r.troops)} {tx(r.troops === 1 ? "troop" : "troops")}
          </span>
        </div>
        <button
          className="secondary"
          onClick={() => onShow(r.vertex, event.id)}
        >
          <MapPin size={14} />
          {tx("Show new territory")}
        </button>
      </aside>
    );
  }
  if (!event?.rebellion) return null;
  const r = event.rebellion;
  return (
    <aside
      className="rebellion-alert"
      role="status"
      aria-label={tx("Rebellion")}
      data-testid="rebellion-alert"
    >
      <div className="town-alert-title">
        <ShieldAlert size={20} />
        <strong>
          {tx("Rebellion · ")}
          {game.players[r.rebel].name}
          {tx(" returns")}
        </strong>
        <button
          aria-label={tx("Dismiss rebellion announcement")}
          onClick={() => onDismiss(event.id)}
        >
          <X size={17} />
        </button>
      </div>
      <p>
        <b>{game.players[r.victim].name}</b>
        {tx(" has fractured. A regional uprising claimed a ")}
        {tx(r.share)}
        {tx("% share of its realm.")}
      </p>
      <div className="rebellion-totals">
        <span>
          {tx(r.towns)} {tx(r.towns === 1 ? "town" : "towns")}
        </span>
        <span>
          {tx(r.troops)} {tx(r.troops === 1 ? "troop" : "troops")}
        </span>
        <span>
          {tx(r.ships)} {tx(r.ships === 1 ? "ship" : "ships")}
        </span>
        <span>
          {tx(r.goods)}
          {tx(" goods")}
        </span>
        <span>
          {tx(r.cards)}
          {tx(" research ")}
          {tx(r.cards === 1 ? "card" : "cards")}
        </span>
      </div>
      <small>
        {tx(
          "Whole buildings, ships and their passengers stay together; indivisible assets are rounded.",
        )}
      </small>
      <button className="secondary" onClick={() => onShow(r.vertex, event.id)}>
        <MapPin size={14} />
        {tx(" Show rebel territory")}
      </button>
      {tx(
        events.length > 1 && (
          <small>
            {tx(events.length - 1)}
            {tx(" more rebellion announcements")}
          </small>
        ),
      )}
    </aside>
  );
}
