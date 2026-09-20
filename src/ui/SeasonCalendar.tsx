import { useEffect, useRef, useState } from "react";
import {
  Sprout,
  Sun,
  Leaf,
  Snowflake,
  ChevronDown,
  X,
  Eye,
  CalendarDays,
} from "lucide-react";
import {
  SEASONS,
  seasonAt,
  seasonYear,
  seasonHalf,
  seasonLabel,
  iceOdds,
  iceRisk,
  seasonalProfile,
  seasonalYield,
  seasonWeather,
  frozenInSeason,
  type Season,
} from "../game/seasons";
import type { Game, Good, Hex, Stock } from "../game/types";
import { GOOD_INFO } from "../game/content";
import { localize as tx, useLocale } from "../i18n";
import { ResourceIcon } from "./ResourceIcon";

export const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};
export const SEASON_ICONS = {
  spring: Sprout,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake,
};

function YieldGoods({
  stock,
  empty = "No harvest",
}: {
  stock: Stock;
  empty?: string;
}) {
  const goods = Object.entries(stock).filter(([, n]) => n && n > 0) as [
    Good,
    number,
  ][];
  return goods.length ? (
    <span className="season-goods">
      {goods.map(([good, amount]) => (
        <span key={good} title={tx(GOOD_INFO[good].name)}>
          <ResourceIcon good={good} size={18} />
          <b>{amount}</b>
          <span className="sr-only"> {tx(GOOD_INFO[good].name)}</span>
        </span>
      ))}
    </span>
  ) : (
    <span className="season-no-harvest">{tx(empty)}</span>
  );
}

export function SeasonCalendar({
  game,
  preview,
  onPreview,
}: {
  game: Game;
  preview?: Season;
  onPreview: (season?: Season) => void;
}) {
  useLocale();
  const current = seasonAt(game);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open && !preview) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        onPreview(undefined);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, preview, onPreview]);
  useEffect(() => {
    onPreview(undefined);
  }, [current, onPreview]);
  if (!current)
    return game.calendar ? (
      <div className="season-calendar season-spring">
        <span
          className="season-calendar-trigger"
          title={tx(
            "Seasons begin next round. Current production is unchanged.",
          )}
        >
          <Sprout size={16} />
          <span>
            <b>{tx("Spring next round")}</b>
          </span>
        </span>
      </div>
    ) : null;
  const Icon = SEASON_ICONS[current];
  const nextState = { calendar: game.calendar, round: game.round + 1 };
  const next = seasonAt(nextState)!;
  const doubled = game.calendar?.roundsPerSeason === 2;
  return (
    <div className={`season-calendar season-${current}`} ref={root}>
      <button
        ref={button}
        type="button"
        className="season-calendar-trigger"
        aria-expanded={open}
        aria-controls="season-calendar-panel"
        aria-label={`${tx(seasonLabel(game))} ${tx(`Year ${seasonYear(game)}`)}`}
        title={tx("Open seasonal calendar")}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon size={17} aria-hidden="true" />
        <span>
          <b>{tx(seasonLabel(game))}</b>
          <small>{tx(`Year ${seasonYear(game)}`)}</small>
        </span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <section
          id="season-calendar-panel"
          className="season-calendar-panel"
          aria-label={tx("Seasonal calendar")}
        >
          <div className="season-calendar-heading">
            <div>
              <span className="eyebrow">{tx("SEASONAL CALENDAR")}</span>
              <h2>{tx(`Year ${seasonYear(game)}`)}</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label={tx("Close seasonal calendar")}
              onClick={close}
            >
              <X size={17} />
            </button>
          </div>
          <div className="season-cycle">
            {SEASONS.map((season) => {
              const SeasonIcon = SEASON_ICONS[season];
              return (
                <button
                  type="button"
                  key={season}
                  className={`season-cycle-option season-${season}${season === current ? " current" : ""}${preview === season ? " previewing" : ""}`}
                  aria-pressed={preview === season}
                  onClick={() => {
                    onPreview(
                      preview === season || current === season
                        ? undefined
                        : season,
                    );
                    setOpen(false);
                  }}
                  title={tx(`Preview ${SEASON_LABELS[season]} artwork`)}
                >
                  <SeasonIcon size={23} />
                  <b>{tx(SEASON_LABELS[season])}</b>
                  <small>
                    {tx(season === current ? "CURRENT" : "PREVIEW")}
                  </small>
                </button>
              );
            })}
          </div>
          <p className="season-clock">
            <CalendarDays size={16} />
            <span>
              {tx(
                doubled
                  ? "Each season lasts two full rounds: early, then late. Every faction plays before the half-season changes."
                  : "One season per full round. Every faction plays before the season changes.",
              )}
            </span>
          </p>
          <div className="season-calendar-rule">
            <b>{tx("Harvest windows")}</b>
            <p>
              {tx(
                "A tile produces only in its active seasons, and only when its number is rolled. Every matching roll pays. Miss the window and that harvest is lost.",
              )}
            </p>
            <p>
              {tx(
                "Four seasonal yields total four times the current climate-adjusted baseline. Diversify crops and keep food in reserve.",
              )}
            </p>
          </div>
          <div className="season-calendar-rule">
            <b>
              {tx("Next:")} {tx(seasonLabel(nextState))}
            </b>
            <p>
              {tx(
                doubled
                  ? "Ice is checked at the next round boundary. Select a sea tile to see its freeze or thaw chance before moving."
                  : next === "winter"
                    ? "Cold, Alpine, Arctic, Glacial and Prairie seas freeze. Move ships to warmer waters before the next round."
                    : next === "summer"
                      ? "Seasonal sea ice melts; Glacial pack ice stays frozen. Bring land units ashore or arrange transport before the next round."
                      : "Glacial seas freeze in Spring and Autumn; ice is patchy in other cold regions. Check each tile’s forecast before moving.",
              )}
            </p>
          </div>
          <p className="season-preview-help">
            <Eye size={15} />
            {tx(
              "Season previews change artwork only. Production and movement use the current season.",
            )}
          </p>
          {preview && (
            <button
              type="button"
              className="secondary full"
              onClick={() => onPreview(undefined)}
            >
              {tx("Return to current season")}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export function TileSeasonForecast({
  game,
  tile,
  owner,
}: {
  game: Game;
  tile: Hex;
  owner: number;
}) {
  useLocale();
  const current = seasonAt(game);
  if (!current) return null;
  const profile = seasonalProfile(
    tile.thawGrace ? { ...tile, thawGrace: undefined } : tile,
    owner,
  );
  const output = seasonalYield(tile, owner, current);
  if (tile.thawGrace === current) profile[current] = output;
  const anyYield = SEASONS.some((season) =>
    Object.values(profile[season]).some((n) => !!n),
  );
  const weather = seasonWeather(tile, current);
  const dynamicIce = game.calendar?.iceModel === 2;
  const coldSea =
    ["cold", "alpine", "arctic", "glacial", "prairie"].includes(
      tile.climate ?? "",
    ) && ["water", "ice"].includes(tile.resource);
  const currentIcon = SEASON_ICONS[current];
  const Icon = currentIcon;
  return (
    <section
      className={`tile-season-forecast season-${current}`}
      aria-label={tx("Seasonal production")}
    >
      <div className="tile-season-heading">
        <span>
          <Icon size={16} />
          <b>{tx(seasonLabel(game))}</b>
        </span>
        {anyYield && <YieldGoods stock={output} />}
      </div>
      {(anyYield || coldSea) && (
        <>
          {anyYield && (
            <small className="tile-season-unit">
              {tx(`Per settlement, on roll ${tile.number}`)}
            </small>
          )}
          <div className="tile-season-grid">
            {SEASONS.map((season) => {
              const SeasonIcon = SEASON_ICONS[season];
              return (
                <div
                  className={season === current ? "current" : ""}
                  key={season}
                >
                  <span>
                    <SeasonIcon size={14} />
                    {tx(SEASON_LABELS[season])}
                  </span>
                  {anyYield && <YieldGoods stock={profile[season]} empty="0" />}
                  {coldSea && !dynamicIce && (
                    <small className="season-surface-label">
                      {tx(
                        frozenInSeason(tile, season)
                          ? "Frozen sea"
                          : "Open water",
                      )}
                    </small>
                  )}
                </div>
              );
            })}
          </div>
          {anyYield && (
            <p className="season-note">
              {tx(
                "Cities and camps multiply these yields. Higher-tier cities and merchants also process every resource harvested.",
              )}
            </p>
          )}
        </>
      )}
      {!!weather && (
        <p className="tile-weather">
          <span className="weather-dot" />
          {tx(weather)}
        </p>
      )}
      {coldSea && (
        <p className="season-note">
          {tx(
            tile.climate === "glacial" && tile.resource === "ice"
              ? "Permanent Glacial pack ice: armies can cross; ships cannot enter in any season. No permanent construction on ice."
              : tile.surface === "frozen"
                ? "Frozen sea: armies can cross; ships cannot move. No permanent construction on ice."
                : "Open sea: ships can cross; land units need transport. Check the calendar before the freeze.",
          )}
        </p>
      )}
      {coldSea && dynamicIce && <IceForecast game={game} tile={tile} />}
      {tile.thawGrace === current && !dynamicIce && (
        <p className="season-note">
          {tx(
            "This saved campaign keeps this sea tile open until the next season. Future seasons follow the forecast.",
          )}
        </p>
      )}
    </section>
  );
}

function IceForecast({ game, tile }: { game: Game; tile: Hex }) {
  const next = { calendar: game.calendar, round: game.round + 1 };
  const [freeze, melt] = iceOdds(tile, seasonAt(next)!, seasonHalf(next));
  const iced = tile.surface === "frozen";
  const permanent = tile.resource === "ice" && tile.climate === "glacial";
  return (
    <div className="ice-forecast" aria-label={tx("Sea ice forecast")}>
      <div className="ice-next-risk">
        <Snowflake size={17} />
        <span>
          <b>{tx(seasonLabel(next))}</b>
          <br />
          {permanent ? (
            tx("Permanent pack ice")
          ) : (
            <>
              {Math.round((iced ? melt : freeze) * 100)}%{" "}
              {tx(iced ? "chance to thaw" : "chance to freeze")}
            </>
          )}
        </span>
      </div>
      {!permanent && (
        <details>
          <summary>{tx("Ice outlook for the next eight rounds")}</summary>
          <div className="ice-outlook-grid">
            {Array.from({ length: 8 }, (_, i) => {
              const round = game.round + i + 1,
                at = { calendar: game.calendar, round };
              const risk = iceRisk(game, tile, round);
              return (
                <div key={round}>
                  <span>{tx(seasonLabel(at))}</span>
                  <b>
                    {Math.round(risk * 100)}% {tx("frozen")}
                  </b>
                </div>
              );
            })}
          </div>
          <p>
            {tx(
              "Probabilities, not guaranteed surfaces. Each boundary resolves once; reloading does not reroll weather.",
            )}
          </p>
        </details>
      )}
      <p>
        {tx(
          "Early and late use the same harvest calendar. Frozen water blocks scheduled harvests; missed dice rolls are not stored.",
        )}
      </p>
    </div>
  );
}
