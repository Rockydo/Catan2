import { regionalLandform } from "../game/physical-landforms";
import { LANDFORM_LABELS } from "./landform-labels";
import { FloodplainStatus } from "./FloodplainStatus";
import type { Game, Hex, Command } from "../game/types";
import {
  PROJECTS,
  WILDLIFE_NAMES,
  baseGeographicYield,
  geographicName,
  type Project,
} from "../game/geography";
import {
  environmentSummary,
  environmentRisk,
  WEATHER_NAMES,
} from "../game/environment";
import { SEASONS, seasonAt, seasonYear } from "../game/seasons";
import { projectSite } from "../game/geography-actions";
import { affordable, ownTowns, ready, points, speed } from "../game/selectors";
import { friendly } from "../game/relations";
import { Cost, GoodsList } from "./components";
import { localize as tx, useLocale } from "../i18n";
import { MapSprite } from "./MapSprite";
import { fordStatus } from "./ford-status";
export type GeographyView =
  "normal" | "climate" | "weather" | "wildlife" | "access" | "flooding";
export const GEOGRAPHY_VIEWS: Record<GeographyView, string> = {
  normal: "Terrain",
  climate: "Climates",
  weather: "Weather",
  wildlife: "Wildlife",
  access: "Access",
  flooding: "Floodplains",
};
export const LANDMARKS = {
  "thermal-spring": {
    name: "Thermal spring",
    effect:
      "Adjacent water stays ice-free. Permanent glacial pack ice is unaffected.",
  },
  "natural-harbor": {
    name: "Natural harbor",
    effect:
      "Ships built in adjacent water gain 1 movement point on their first active turn.",
  },
  "fertile-basin": {
    name: "Fertile basin",
    effect: "Adds 1 Grain per producer to each productive harvest.",
  },
  "mineral-vein": {
    name: "Rich mineral vein",
    effect: "Adds 1 raw mineral before producer and seasonal multipliers.",
  },
  "ancient-grove": {
    name: "Ancient grove",
    effect: "Adds 1 Wood before producer and seasonal multipliers.",
  },
} as const;
export function geographyColor(tile: Hex, view: GeographyView): string {
  const g = tile.geography;
  if (view === "flooding")
    return g?.floodplain
      ? g.projects?.levee
        ? "#65a56e"
        : g.access === "flooded"
          ? "#459dcc"
          : "#dfb65c"
      : tile.resource === "water" || tile.resource === "ice"
        ? "#315d7b"
        : "#777d72";
  if (view === "weather")
    return {
      normal: "#93a791",
      wet: "#488dab",
      dry: "#d2af62",
      cold: "#b5d6e3",
      mild: "#aaba6b",
    }[g?.weather ?? "normal"];
  if (view === "wildlife")
    return g?.animals?.length
      ? tile.resource === "water"
        ? "#4ba7b8"
        : "#bf8c4d"
      : tile.resource === "water"
        ? "#375a69"
        : "#6d7960";
  if (tile.resource === "peaks" || g?.access === "closed") return "#535561";
  if (g?.projects?.bridge || g?.access === "ford") return "#e3c578";
  if (g?.access === "flooded") return "#6496a6";
  if (tile.surface === "frozen") return "#cde3e8";
  if (g?.waterway)
    return ["river", "shoal", "reef"].includes(g.waterway)
      ? "#4c919a"
      : "#315d7b";
  return "#91a275";
}
export function GeographyLegend({ view }: { view: GeographyView }) {
  const rows =
    view === "flooding"
      ? [
          ["Flooded now", "#459dcc"],
          ["Dry floodplain", "#dfb65c"],
          ["Protected by levee", "#65a56e"],
          ["Permanent water", "#315d7b"],
          ["Not a floodplain", "#777d72"],
        ]
      : view === "weather"
        ? Object.entries(WEATHER_NAMES).map(([k, label]) => [
            label,
            (
              {
                normal: "#93a791",
                wet: "#488dab",
                dry: "#d2af62",
                cold: "#b5d6e3",
                mild: "#aaba6b",
              } as Record<string, string>
            )[k],
          ])
        : view === "wildlife"
          ? [
              ["Land herds", "#bf8c4d"],
              ["Fish and whales", "#4ba7b8"],
              ["No animals present", "#6d7960"],
            ]
          : [
              ["Land access", "#91a275"],
              ["Open ford or bridge", "#e3c578"],
              ["Frozen water", "#cde3e8"],
              ["Flooded ground", "#6496a6"],
              ["Shallow vessels only", "#4c919a"],
              ["All vessels", "#315d7b"],
              ["Impassable / closed pass", "#535561"],
            ];
  return (
    <div
      className="climate-map-legend geography-legend"
      aria-label={tx(GEOGRAPHY_VIEWS[view])}
    >
      <strong>{tx(GEOGRAPHY_VIEWS[view])}</strong>
      {rows.map(([label, color]) => (
        <span key={label}>
          <i style={{ background: color }} />
          {tx(label)}
        </span>
      ))}
      <small>
        {tx(
          view === "flooding"
            ? "Low basins flood at level 3; higher riverbanks at level 4. Flooded tiles stop producing. Select a tile to see its threshold. A levee keeps it dry."
            : view === "weather"
              ? "Weather affects whole regions. Dry spells reduce sensitive crops and improve salt; rain helps rice but slows logging and salt. Cold reduces crops and pasture. Select a tile for exact harvest changes."
              : view === "wildlife"
                ? "Populations migrate at the start of each season. Farms remain fixed."
                : "Access changes with floods, fords, ice and mountain passes. Select a tile for its calendar.",
        )}
      </small>
    </div>
  );
}
export function GeographyMarker({
  tile,
  x,
  y,
}: {
  tile: Hex;
  x: number;
  y: number;
}) {
  const g = tile.geography;
  if (!g) return null;
  const ford = fordStatus(tile);
  if (ford)
    return (
      <MapSprite
        assetKey={`ford-marker/${ford.kind}`}
        bounds={{ x: -29, y: -8, width: 58, height: 16 }}
        transform={`translate(${x} ${y + 23})`}
        data-ford-status={ford.kind}
        pointerEvents="none"
      >
        <rect
          x="-27"
          y="-7"
          width="54"
          height="14"
          rx="5"
          fill={
            ford.kind === "closed"
              ? "#334c55"
              : ford.kind === "ice"
                ? "#d4edf2"
                : "#f6dd92"
          }
          stroke={ford.kind === "closed" ? "#cad4d3" : "#36584d"}
          strokeWidth="1.3"
        />
        <text
          y="2.5"
          textAnchor="middle"
          fontSize={ford.kind === "ice" ? "6.3" : "7.1"}
          fontWeight="bold"
          fill={ford.kind === "closed" ? "#fff2d4" : "#203f36"}
        >
          {tx(ford.label)}
        </text>
      </MapSprite>
    );
  const symbol =
    g.access === "closed"
      ? "×"
      : g.projects?.bridge
        ? "╪"
        : g.access === "ford"
          ? "≋"
          : g.access === "flooded"
            ? "≈"
            : g.landmark
              ? "✦"
              : g.pass
                ? "⌃"
                : undefined;
  if (!symbol) return null;
  return (
    <MapSprite
      assetKey={`geography/${symbol}`}
      bounds={{ x: -9, y: -9, width: 18, height: 18 }}
      transform={`translate(${x + 23} ${y - 19})`}
    >
      <circle r="8" fill="#183f43" stroke="#eddcad" strokeWidth="1" />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill="#f6e6b8"
      >
        {symbol}
      </text>
    </MapSprite>
  );
}
export function GeographyPanel({
  game: s,
  tile,
  viewer,
  interactive,
  onAction,
  ids = [],
}: {
  game: Game;
  tile: Hex;
  viewer: number;
  interactive: boolean;
  onAction: (c: Command) => void;
  ids?: string[];
}) {
  const locale = useLocale();
  const g = tile.geography;
  if (!g) return null;
  const ford = fordStatus(tile);
  const sites = (Object.keys(PROJECTS) as Project[]).filter((kind) =>
    projectSite(s, tile, kind, viewer),
  );
  const own =
    ownTowns(s, viewer).some((t) =>
      s.vertices[t.vertex].tiles.includes(tile.id),
    ) || tile.edges.some((e) => s.routes[e]?.owner === viewer);
  const troops = ids.map((id) => s.pieces[id]).filter(Boolean);
  const enemy = Object.values(s.towns).some(
    (t) =>
      !friendly(s, viewer, t.owner) &&
      s.vertices[t.vertex].tiles.includes(tile.id),
  );
  const sabotage =
    enemy &&
    (baseGeographicYield(tile).grain ?? 0) > 0 &&
    !Object.values(s.towns).some(
      (t) =>
        friendly(s, viewer, t.owner) &&
        s.vertices[t.vertex].tiles.includes(tile.id),
    ) &&
    !tile.edges.some(
      (e) =>
        s.routes[e]?.camps[tile.id] && friendly(s, viewer, s.routes[e].owner),
    ) &&
    troops.length > 0 &&
    troops.every(
      (u) =>
        u.owner === viewer &&
        u.tile === tile.id &&
        !u.naval &&
        points(u) > 0 &&
        ready(s, u) &&
        speed(u) + u.bonus - u.moved >= 1,
    );
  return (
    <section className="geography-panel" aria-label={tx("Local geography")}>
      <h3>{tx(geographicName(tile) ?? "Local geography")}</h3>
      {ford && (
        <div className={`ford-status ford-${ford.kind}`} role="status">
          <strong>{tx(ford.label)}</strong>
          <p>{tx(ford.detail)}</p>
        </div>
      )}
      {s.geographyVersion && s.geographyVersion >= 3 ? (
        <p className="landform-label">
          {locale === "fr" ? "Paysage régional : " : "Regional landscape: "}
          <strong>
            {
              LANDFORM_LABELS[
                regionalLandform(s.seed, tile.id, s.geographyVersion)
              ][locale]
            }
          </strong>
        </p>
      ) : null}
      <div className="geography-status">
        {environmentSummary(tile, s.tiles).map((text) => (
          <span key={text}>{tx(text)}</span>
        ))}
      </div>
      {g.floodplain && (
        <FloodplainStatus tile={tile} game={s} viewer={viewer} />
      )}
      {(g.floodplain || g.pass || g.ford) && (
        <div
          className="geography-calendar"
          aria-label={tx("Seasonal access risk")}
        >
          {SEASONS.map((season) => (
            <div
              key={season}
              className={seasonAt(s) === season ? "current" : ""}
            >
              <b>{tx(season[0].toUpperCase() + season.slice(1))}</b>
              <span>{Math.round(environmentRisk(tile, season) * 100)}%</span>
            </div>
          ))}
          <small>
            {tx(
              g.pass
                ? "Chance of pass closure"
                : g.ford
                  ? "Chance the ford is closed"
                  : "Flood risk with current protection",
            )}
          </small>
        </div>
      )}
      {g.animals?.length ? (
        <>
          <b>{tx("Wildlife present")}</b>
          <p>
            {[...new Set(g.animals)]
              .map(
                (k) =>
                  `${tx(WILDLIFE_NAMES[k])} ×${g.animals!.filter((v) => v === k).length}`,
              )
              .join(" · ")}
          </p>
          <GoodsList stock={g.fauna ?? {}} />
          <small>
            {tx(
              "Migrates each season. These yields apply while the population is present.",
            )}
          </small>
        </>
      ) : (
        <small>{tx("No migrating animals on this tile.")}</small>
      )}
      {g.landmark && (
        <div className="geography-landmark">
          <img src={`./assets/geography/${g.landmark}.webp`} alt="" />
          <div>
            <b>{tx(LANDMARKS[g.landmark].name)}</b>
            <p>{tx(LANDMARKS[g.landmark].effect)}</p>
          </div>
        </div>
      )}
      {!!Object.keys(g.projects ?? {}).length && (
        <p>
          {Object.entries(g.projects!)
            .map(
              ([kind, p]) =>
                `${tx(PROJECTS[kind as Project].name)} (${s.players[p!.owner].name})`,
            )
            .join(" · ")}
        </p>
      )}
      {!!sites.length && (
        <details>
          <summary>{tx("Local improvements")}</summary>
          {sites.map((kind) => (
            <div className="geography-project" key={kind}>
              <b>{tx(PROJECTS[kind].name)}</b>
              <p>{tx(PROJECTS[kind].description)}</p>
              <Cost cost={PROJECTS[kind].cost} />
              <button
                disabled={
                  !interactive || !affordable(s, PROJECTS[kind].cost, viewer)
                }
                onClick={() =>
                  onAction({ type: "project", tile: tile.id, kind })
                }
              >
                {tx("Build")} {tx(PROJECTS[kind].name)}
              </button>
            </div>
          ))}
        </details>
      )}
      {g.projects?.irrigation?.owner === viewer && (
        <div>
          <label>
            {tx("Next year’s harvest")}
            <select
              value={g.nextHarvestMode ?? g.harvestMode ?? "concentrated"}
              disabled={!interactive || g.harvestChosenYear === seasonYear(s)}
              onChange={(e) =>
                onAction({
                  type: "harvest-mode",
                  tile: tile.id,
                  mode: e.target.value,
                })
              }
            >
              <option value="concentrated">{tx("Concentrated harvest")}</option>
              <option value="spread">{tx("Spread harvest")}</option>
            </select>
          </label>
          <small>
            {tx(
              "Same baseline annual output. One change per year, effective next year.",
            )}
          </small>
        </div>
      )}
      {g.damagedUntil && (
        <p role="status">
          {tx(`Harvest disrupted until round ${g.damagedUntil}`)}{" "}
          {own && (
            <button
              disabled={
                !interactive || !affordable(s, { lumber: 1, stone: 1 }, viewer)
              }
              onClick={() =>
                onAction({ type: "repair-terrain", tile: tile.id })
              }
            >
              {tx("Repair")}
              <Cost cost={{ lumber: 1, stone: 1 }} />
            </button>
          )}
        </p>
      )}
      {sabotage && !g.damagedUntil && (
        <button
          disabled={!interactive}
          onClick={() => onAction({ type: "sabotage", tile: tile.id, ids })}
        >
          {tx("Disrupt crops · 1 movement")}
        </button>
      )}
    </section>
  );
}
