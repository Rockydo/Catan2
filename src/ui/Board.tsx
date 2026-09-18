import {
  CLIMATES,
  CLIMATE_INFO,
  BIOMES,
  BIOME_INFO,
  type Biome,
  type TerrainResource,
} from "../game/climate-content";
import type { TerrainKey } from "../game/content";
import { localize as tx, useLocale } from "../i18n";
import { friendly } from "../game/relations";
import { GuildCrest } from "./Guilds";
import { GUILDS, townGuilds } from "../game/guilds";
import { MapLabel, MapLabelDefinitions } from "./MapLabel";
import { ResourceIcon } from "./ResourceIcon";
import {
  marineResource,
  tileTerrain,
  tileGood,
  tileYield,
  harvestTiles,
  towerSites,
  towerName,
} from "../game/maritime";
import {
  townSiegeStatuses,
  siegeParticipants,
  towerSiegeStatuses,
} from "../game/siege-status";
import { ArmyMiniature } from "./MilitaryArt";
import { TownMiniature, ProductionToken } from "./MapPieces";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useMapCamera } from "./useMapCamera";
import { ZoomIn, ZoomOut, Focus, Map as MapIcon, Flag } from "lucide-react";
import { type Game, type Raw, type Piece } from "../game/types";
import { TERRAIN, GOOD_INFO, COLORS } from "../game/content";
import {
  hexCenter,
  vertexPoint,
  edgeMidpoint,
  hash,
  coord,
} from "../game/world";
import {
  settlementSites,
  canRoute,
  moveTargets,
  piecesAt,
  points,
  unitName,
  blockAt,
  probability,
  relocationSites,
} from "../game/selectors";
export type Selection = { type: "tile" | "vertex" | "edge"; id: string } | null;
export type BoardMode =
  | "inspect"
  | "road"
  | "route"
  | "settlement"
  | "camp"
  | "move"
  | "move-route"
  | "tower";
interface Props {
  game: Game;
  viewer?: number;
  selection: Selection;
  onSelect: (v: Selection) => void;
  onInspectSiege: (town: string) => void;
  onInspectTowerSiege: (vertex: string) => void;
  mode: BoardMode;
  unitIds: string[];
  onBuild: (type: string, id: string) => void;
  onMove: (id: string) => void;
  interactive: boolean;
  focus?: { vertex: string; request: number } | null;
  expeditionPreview?: string[];
  rolling?: boolean;
  productionTiles?: string[];
}
const TERRAIN_ORDER = [
  "lumber",
  "brick",
  "wool",
  "grain",
  "ore",
  "stone",
  "unused",
  "hides",
  "salt",
  "coal",
];
const TerrainPatterns = memo(function TerrainPatterns() {
  useLocale();

  return (
    <>
      {tx(
        [
          ...new Set([
            ...TERRAIN_ORDER.filter((g) => g !== "unused"),
            "gold",
            "fish",
            "whale",
            ...BIOMES.filter((b) => b !== "water"),
          ]),
        ].map((resource) => {
          const art = BIOME_INFO[resource as Biome]?.art ?? resource,
            index = TERRAIN_ORDER.indexOf(art),
            dedicated = index < 0;
          return (
            <pattern
              key={resource}
              id={`terrain-${resource}`}
              width="1"
              height="1"
              patternUnits="objectBoundingBox"
              viewBox={
                dedicated
                  ? "0 0 100 100"
                  : `${(index % 5) * 100} ${Math.floor(index / 5) * 100} 100 100`
              }
              preserveAspectRatio="xMidYMid slice"
            >
              <image
                href={
                  dedicated
                    ? ["gold", "fish", "whale"].includes(art)
                      ? `./assets/terrain-${art}-${art === "fish" ? "v2" : "v1"}.png`
                      : `./assets/terrain-${art}-v1.webp`
                    : "./assets/terrain-atlas-v2.png"
                }
                width={dedicated ? 100 : 500}
                height={dedicated ? 100 : 200}
              />
            </pattern>
          );
        }),
      )}
    </>
  );
});
const TerrainArt = memo(function TerrainArt({
  resource,
  x,
  y,
  seed,
}: {
  resource: TerrainKey;
  x: number;
  y: number;
  seed: number;
}) {
  useLocale();

  if (resource === "water")
    return seed % 3 === 0 ? (
      <path
        pointerEvents="none"
        fill="none"
        stroke="#a4d3d5"
        strokeWidth=".7"
        opacity=".3"
        d={`M${x - 17} ${y + 2}q8-3 16 0t16 0`}
      />
    ) : null;
  return (
    <polygon
      pointerEvents="none"
      points={`${x},${y - 43} ${x + 37.2},${y - 21.5} ${x + 37.2},${y + 21.5} ${x},${y + 43} ${x - 37.2},${y + 21.5} ${x - 37.2},${y - 21.5}`}
      fill={`url(#terrain-${resource})`}
      opacity={resource === "fish" || resource === "whale" ? 0.78 : 1}
    />
  );
});
const TerrainLayer = memo(function TerrainLayer({
  terrainRef,
  oceanRef,
  bounds,
  tiles,
  shapes,
  compact,
  numbers,
  climates,
  total,
  viewer,
}: {
  terrainRef: RefObject<SVGSVGElement | null>;
  oceanRef: RefObject<SVGRectElement | null>;
  bounds: { x: number; y: number; w: number; h: number };
  tiles: Game["tiles"][string][];
  shapes: Record<string, string>;
  compact: Record<string, Piece[]>;
  numbers: boolean;
  climates: boolean;
  total: number | null;
  viewer: number;
}) {
  useLocale();

  return (
    <svg
      ref={terrainRef}
      className="terrain-map"
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
      aria-hidden="true"
    >
      <defs>
        <TerrainPatterns />
        <MapLabelDefinitions />
        <linearGradient id="water-tile" x2="0" y2="1">
          <stop stopColor="#378e9e" />
          <stop offset="1" stopColor="#2d7b90" />
        </linearGradient>
        <linearGradient id="token-paper" x2="0" y2="1">
          <stop stopColor="#fffbee" />
          <stop offset="1" stopColor="#eee0b8" />
        </linearGradient>
        <linearGradient id="land-shade" x2="0" y2="1">
          <stop stopColor="#fff3c1" stopOpacity=".04" />
          <stop offset="1" stopColor="#183b36" stopOpacity=".12" />
        </linearGradient>
        <filter id="tile-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="1.2"
            floodColor="#355d59"
            floodOpacity=".17"
          />
        </filter>
        <pattern
          id="sea-lines"
          width="110"
          height="84"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 28q14-4 28 0t28 0m20 36q14-3 28 0"
            fill="none"
            stroke="#8ac6d5"
            strokeWidth=".6"
            opacity=".12"
          />
        </pattern>
        <filter id="piece-shadow" x="-60%" y="-60%" width="220%" height="230%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="1.5"
            floodColor="#102a31"
            floodOpacity=".65"
          />
        </filter>
        <filter id="selected-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#fff4c8" />
        </filter>
      </defs>
      <rect
        ref={oceanRef}
        x={bounds.x}
        y={bounds.y}
        width={bounds.w}
        height={bounds.h}
        fill="url(#sea-lines)"
      />

      {tx(
        tiles.map((tile) => {
          const { x, y } = hexCenter(tile),
            good = tileGood(tile, viewer),
            poly = shapes[tile.id],
            small = !!compact[tile.id]?.length;
          return (
            <g key={tile.id} data-map-x={x} data-map-y={y}>
              <polygon
                points={poly}
                fill={
                  tile.resource === "water" ? "url(#water-tile)" : "#c9b98c"
                }
                stroke={tile.resource === "water" ? "#95bcb155" : "#e2d4ad"}
                strokeWidth={tile.resource === "water" ? 0.7 : 1}
                filter="url(#tile-shadow)"
              />
              <TerrainArt
                resource={tileTerrain(tile)}
                x={x}
                y={y}
                seed={hash(tile.id)}
              />
              {climates && tile.climate && (
                <polygon
                  points={poly}
                  fill={CLIMATE_INFO[tile.climate].color}
                  fillOpacity=".4"
                  stroke={CLIMATE_INFO[tile.climate].color}
                  strokeWidth="3"
                />
              )}
              {tx(
                good && (
                  <>
                    {tx(
                      tile.resource !== "water" && (
                        <polygon points={poly} fill="url(#land-shade)" />
                      ),
                    )}
                    <g
                      transform={`translate(${x - (small ? 12 : 0)} ${y - 12})`}
                    >
                      <ProductionToken
                        resource={good}
                        output={
                          tile.biome ? tileYield(tile, viewer) : undefined
                        }
                        label={tile.whale ? "Whales" : undefined}
                        number={tile.number}
                        compact={small}
                        showNumber={numbers}
                        active={total === tile.number}
                      />
                    </g>
                  </>
                ),
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
});

interface MapHexProps {
  id: string;
  resource: TerrainResource;
  good: Raw | undefined;
  outputLabel?: string;
  terrain: TerrainKey;
  number: number;
  x: number;
  y: number;
  poly: string;
  selected: boolean;
  movable: boolean;
  occupied: boolean;
  compact: boolean;
  covered: boolean;
  towerCovered: boolean;
  production: boolean;
  active: boolean;
  numbers: boolean;
  activate: (id: string, movable: boolean, keyboard?: boolean) => void;
}
const MapHex = memo(function MapHex({
  id,
  resource,
  good,
  outputLabel,
  terrain,
  number,
  x,
  y,
  poly,
  selected,
  movable,
  occupied,
  compact,
  covered,
  towerCovered,
  production,
  active,
  numbers,
  activate,
}: MapHexProps) {
  useLocale();

  const style = TERRAIN[terrain];
  return (
    <g
      key={id}
      className={`map-tile ${resource === "water" ? "sea-tile" : "land-tile"} ${selected ? "selected" : ""} ${movable ? "reachable" : ""}`}
      data-testid={`hex-${id}`}
      data-map-x={x}
      data-map-y={y}
      role="button"
      tabIndex={0}
      aria-label={tx(
        `${style.name}, ${good ? `${outputLabel ?? (terrain === "whale" ? "Hides + Oil" : GOOD_INFO[good].name)}, roll ${number}` : resource === "water" ? "water" : "No resources"}, hex ${id}${movable ? ", reachable" : ""}`,
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(id, movable, true);
        }
      }}
      onClick={() => activate(id, movable)}
    >
      <polygon points={poly} fill="transparent" stroke="transparent" />
      {tx(
        covered && (
          <polygon
            data-testid={`harvest-coverage-${id}`}
            className="harvest-outline"
            points={poly}
          />
        ),
      )}
      {tx(
        towerCovered && <polygon className="harvest-outline" points={poly} />,
      )}
      <polygon
        className="hex-outline"
        points={poly}
        fill="none"
        pointerEvents="none"
        stroke={selected ? "#ffe1a0" : movable ? "#fff1b9" : "transparent"}
        strokeWidth={selected ? 3 : 2}
      />
      {tx(
        production && (
          <polygon
            className="production-flare"
            points={poly}
            pointerEvents="none"
          />
        ),
      )}
      {tx(
        occupied && resource !== "water" && (
          <path
            d={`M${x - 33} ${y + 31}l8-8m-4 8 8-8`}
            stroke="#923f36"
            strokeWidth="2"
            opacity=".8"
          />
        ),
      )}
      {tx(
        movable && (
          <circle
            cx={x + 25}
            cy={y - 21}
            r="5"
            fill={occupied ? "#a84536" : "#fff1b2"}
            stroke="#735b29"
          />
        ),
      )}
    </g>
  );
});

export function Board({
  game: s,
  viewer = s.active,
  selection,
  onSelect,
  onInspectSiege,
  onInspectTowerSiege,
  mode,
  unitIds,
  onBuild,
  onMove,
  interactive,
  expeditionPreview = [],
  rolling = false,
  productionTiles = [],
  focus,
}: Props) {
  useLocale();

  const [climates, setClimates] = useState(false);
  const [numbers, setNumbers] = useState(true);
  const lastAlertFocus = useRef<Props["focus"]>(null);
  const tiles = useMemo(() => Object.values(s.tiles), [s.tiles]),
    edges = useMemo(() => Object.values(s.edges), [s.edges]),
    towns = useMemo(() => Object.values(s.towns), [s.towns]),
    bounds = useMemo(() => {
      const centers = [
        ...Object.values(s.tiles).map((t) => hexCenter(t)),
        ...expeditionPreview.map((id) => {
          const [q, r] = coord(id);
          return hexCenter({ q, r });
        }),
      ];
      const minX = Math.min(...centers.map((p) => p.x)) - 75,
        maxX = Math.max(...centers.map((p) => p.x)) + 75,
        minY = Math.min(...centers.map((p) => p.y)) - 70,
        maxY = Math.max(...centers.map((p) => p.y)) + 70;
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }, [s.seed, Object.keys(s.tiles).length, expeditionPreview.join(";")]);
  const sites = useMemo(
      () =>
        new Set(
          s.phase === "setup-town" || mode === "settlement"
            ? settlementSites(s, s.active, s.phase === "setup-town")
            : [],
        ),
      [s, mode],
    ),
    targets = useMemo(
      () => (mode === "move" ? moveTargets(s, unitIds) : {}),
      [s, mode, unitIds.join(",")],
    );
  const relocations = new Set(
    mode === "move-route" && selection?.type === "edge"
      ? relocationSites(s, selection.id)
      : [],
  );

  const groupUnits = useMemo(
    () =>
      Object.values(s.pieces)
        .filter((u) => !u.carrier)
        .reduce<Record<string, Piece[]>>((groups, u) => {
          (groups[u.tile] ??= []).push(u);
          return groups;
        }, {}),
    [s.pieces],
  );
  const coverage = useMemo(
    () =>
      new Set(
        selection?.type === "tile"
          ? (groupUnits[selection.id] ?? [])
              .filter((u) => !unitIds.length || unitIds.includes(u.id))
              .flatMap((u) => harvestTiles(s, u))
          : [],
      ),
    [s, selection?.type, selection?.id, unitIds.join(",")],
  );
  const coastlines = useMemo(
    () =>
      edges
        .filter(
          (e) =>
            e.tiles.length === 2 &&
            e.tiles.some((id) => s.tiles[id].resource === "water") &&
            e.tiles.some((id) => s.tiles[id].resource !== "water"),
        )
        .map((e) => ({
          id: e.id,
          a: vertexPoint(s.vertices[e.vertices[0]]),
          b: vertexPoint(s.vertices[e.vertices[1]]),
        })),
    [s.tiles, s.edges, s.vertices],
  );
  const tileShapes = useMemo(
    () =>
      Object.fromEntries(
        tiles.map((tile) => [
          tile.id,
          tile.vertices
            .map((v) => {
              const p = vertexPoint(s.vertices[v]);
              return `${p.x},${p.y}`;
            })
            .join(" "),
        ]),
      ),
    [s.tiles, s.vertices],
  );
  const {
    svg,
    terrain,
    layer,
    ocean,
    hitArea,
    setPan,
    setZoom,
    pointerDown,
    pointerMove,
    pointerUp,
    clicked,
  } = useMapCamera(
    bounds,
    Math.max(6, Math.sqrt(tiles.length / 100) * 4),
    s.seed,
  );
  const actions = useRef({ onMove, onSelect, mode, interactive, clicked });
  actions.current = { onMove, onSelect, mode, interactive, clicked };
  const activateTile = useCallback(
    (id: string, movable: boolean, keyboard = false) => {
      const a = actions.current;
      const action = () =>
        a.mode === "move" && movable && a.interactive
          ? a.onMove(id)
          : a.onSelect({ type: "tile", id });
      if (keyboard) action();
      else a.clicked(action);
    },
    [],
  );
  useEffect(() => {
    if (!focus || !s.vertices[focus.vertex] || lastAlertFocus.current === focus)
      return;
    lastAlertFocus.current = focus;
    const point = vertexPoint(s.vertices[focus.vertex]);
    setPan({
      x: point.x - bounds.x - bounds.w / 2,
      y: point.y - bounds.y - bounds.h / 2,
    });
    setZoom((z) => Math.max(z, 2));
  }, [focus, s.vertices, bounds.x, bounds.y, bounds.w, bounds.h]);
  return (
    <div className={`board-frame mode-${mode}`}>
      <div ref={layer} className="map-camera-layer">
        <TerrainLayer
          viewer={viewer}
          terrainRef={terrain}
          oceanRef={ocean}
          bounds={bounds}
          tiles={tiles}
          shapes={tileShapes}
          compact={groupUnits}
          numbers={numbers}
          climates={climates}
          total={!rolling && s.dice ? s.dice[0] + s.dice[1] : null}
        />
        <svg
          ref={svg}
          className="world-map"
          role="application"
          aria-label={tx(
            "Hexagonal game map. Select tiles, towns and routes to inspect or build.",
          )}
          viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          <rect
            ref={hitArea}
            x={bounds.x}
            y={bounds.y}
            width={bounds.w}
            height={bounds.h}
            fill="transparent"
          />
          {tx(
            tiles.map((tile) => {
              const { x, y } = hexCenter(tile);
              return (
                <MapHex
                  key={tile.id}
                  id={tile.id}
                  resource={tile.resource}
                  good={tileGood(tile, viewer)}
                  outputLabel={
                    tile.biome
                      ? Object.entries(tileYield(tile, viewer))
                          .map(([g, n]) => `${n} ${GOOD_INFO[g as Raw].name}`)
                          .join(" + ")
                      : undefined
                  }
                  terrain={tileTerrain(tile)}
                  number={tile.number}
                  x={x}
                  y={y}
                  poly={tileShapes[tile.id]}
                  selected={
                    selection?.type === "tile" && selection.id === tile.id
                  }
                  movable={!!targets[tile.id]}
                  occupied={(groupUnits[tile.id] ?? []).some(
                    (u) => !friendly(s, u.owner, s.active),
                  )}
                  compact={!!groupUnits[tile.id]?.length}
                  covered={coverage.has(tile.id)}
                  towerCovered={
                    !!(
                      selection?.type === "vertex" &&
                      s.towers[selection.id] &&
                      s.vertices[selection.id].tiles.includes(tile.id)
                    )
                  }
                  production={productionTiles.includes(tile.id)}
                  active={
                    !rolling &&
                    !!s.dice &&
                    s.dice[0] + s.dice[1] === tile.number
                  }
                  numbers={numbers}
                  activate={activateTile}
                />
              );
            }),
          )}
          <g className="coastlines" pointerEvents="none">
            {tx(
              coastlines.map(({ id, a, b }) => {
                return (
                  <path
                    key={id}
                    data-map-x={(a.x + b.x) / 2}
                    data-map-y={(a.y + b.y) / 2}
                    d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                    fill="none"
                    stroke="#f3e5be"
                    strokeWidth="1.25"
                  />
                );
              }),
            )}
          </g>
          {tx(
            selection?.type === "vertex" &&
              towns
                .filter((t) => t.vertex === selection.id)
                .map((t) => {
                  const a = vertexPoint(s.vertices[t.vertex]);
                  return (
                    <g key={t.id} pointerEvents="none">
                      {tx(
                        Object.keys(t.extensions).map((id) => {
                          const b = hexCenter(s.tiles[id]);
                          return (
                            <path
                              key={id}
                              d={`M${a.x} ${a.y}L${b.x} ${b.y - 15}`}
                              stroke="#fff0bb"
                              strokeWidth="1.8"
                              strokeDasharray="3 3"
                              opacity=".8"
                            />
                          );
                        }),
                      )}
                    </g>
                  );
                }),
          )}
          {tx(
            expeditionPreview.map((id) => {
              const [q, r] = id.split(",").map(Number),
                { x, y } = hexCenter({ q, r });
              return (
                <g key={id} pointerEvents="none">
                  <polygon
                    points={Array.from({ length: 6 }, (_, i) => {
                      const a = (Math.PI / 3) * i - Math.PI / 2;
                      return `${x + 44 * Math.cos(a)},${y + 44 * Math.sin(a)}`;
                    }).join(" ")}
                    fill="#e8da9d55"
                    stroke="#8b7947"
                    strokeDasharray="4 4"
                  />
                  <MapLabel
                    x={x}
                    y={y + 5}
                    textAnchor="middle"
                    fill="#32412e"
                    fontSize="18"
                  >
                    ?
                  </MapLabel>
                </g>
              );
            }),
          )}
          {tx(
            edges
              .filter((e) => e.harbor)
              .map((e) => {
                const mid = edgeMidpoint(s, e),
                  sea = e.tiles.find((id) => s.tiles[id].resource === "water");
                if (!sea) return null;
                const center = hexCenter(s.tiles[sea]),
                  dx = center.x - mid.x,
                  dy = center.y - mid.y,
                  len = Math.hypot(dx, dy),
                  x = mid.x + (dx / len) * 18,
                  y = mid.y + (dy / len) * 18;
                const label =
                  e.harbor === "generic"
                    ? "Any raw resource, 3:1"
                    : `${GOOD_INFO[e.harbor as Raw].name}, 2:1`;
                return (
                  <g
                    key={`harbor${e.id}`}
                    className="map-harbor"
                    data-map-x={x}
                    data-map-y={y}
                    role="button"
                    tabIndex={0}
                    aria-label={tx(`Harbor: ${label}`)}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      clicked(() => onSelect({ type: "edge", id: e.id }));
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        onSelect({ type: "edge", id: e.id });
                      }
                    }}
                  >
                    <title>
                      {tx(label)}
                      {tx(
                        ". Build a town at either end of the coastal edge to use this harbor.",
                      )}
                    </title>
                    <path
                      d={`M${mid.x} ${mid.y}L${x} ${y}`}
                      stroke="#e5d2a1"
                      strokeWidth="2"
                      strokeDasharray="2 2"
                      pointerEvents="none"
                    />
                    <rect
                      x={x - 14}
                      y={y - 8}
                      width="28"
                      height="16"
                      rx="6"
                      fill="#173f4b"
                      stroke="#e8d8aa"
                      strokeWidth=".85"
                    />
                    {tx(
                      e.harbor === "generic" ? (
                        <path
                          transform={`translate(${x - 7} ${y})`}
                          d="M0-5V5M-4 1Q-4 7 0 5Q4 7 4 1M-2-2H2"
                          fill="none"
                          stroke="#efdca6"
                          strokeWidth="1.1"
                          pointerEvents="none"
                        />
                      ) : (
                        <svg
                          x={x - 13}
                          y={y - 6}
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          pointerEvents="none"
                        >
                          <ResourceIcon good={e.harbor as Raw} size={24} />
                        </svg>
                      ),
                    )}
                    <MapLabel
                      x={x + 5}
                      y={y + 2.7}
                      textAnchor="middle"
                      fill="#fff3ce"
                      fontSize="7"
                      fontWeight="750"
                      pointerEvents="none"
                    >
                      {tx(e.harbor === "generic" ? "3:1" : "2:1")}
                    </MapLabel>
                  </g>
                );
              }),
          )}
          {tx(
            Object.values(s.routes).map((r) => {
              const e = s.edges[r.edge],
                a = vertexPoint(s.vertices[e.vertices[0]]),
                b = vertexPoint(s.vertices[e.vertices[1]]);
              return (
                <g
                  key={r.id}
                  data-testid={`road-${r.edge}`}
                  data-map-x={(a.x + b.x) / 2}
                  data-map-y={(a.y + b.y) / 2}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    clicked(() => onSelect({ type: "edge", id: r.edge }));
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={tx(
                    `${s.players[r.owner].name} ${r.kind === "road" ? "road" : "shipping route"}${Object.keys(r.camps).length ? ", with camps" : ""}`,
                  )}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter")
                      onSelect({ type: "edge", id: r.edge });
                  }}
                >
                  <circle
                    cx={(a.x + b.x) / 2}
                    cy={(a.y + b.y) / 2}
                    r="9"
                    fill="transparent"
                  />
                  <path
                    d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                    stroke="#ece0bb"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={(a.x + b.x) / 2}
                    cy={(a.y + b.y) / 2}
                    r="9"
                    fill="transparent"
                  />
                  <path
                    d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                    stroke={COLORS[r.owner]}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={r.kind === "route" ? "8 5" : undefined}
                  />
                  {tx(
                    Object.entries(r.camps).map(([tile, tier]) => {
                      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
                        center = hexCenter(s.tiles[tile]),
                        dx = center.x - mid.x,
                        dy = center.y - mid.y,
                        len = Math.hypot(dx, dy);
                      return (
                        <g
                          key={tile}
                          transform={`translate(${mid.x + (dx / len) * 14} ${mid.y + (dy / len) * 14})`}
                        >
                          <path
                            d="M-7 6V-3L0-10 7-3V6Z"
                            fill="#fff1ce"
                            stroke={COLORS[r.owner]}
                            strokeWidth="2"
                          />
                          <path
                            d="M-9-3L0-11 9-3"
                            stroke="#66482c"
                            strokeWidth="2"
                            fill="none"
                          />
                          <MapLabel
                            textAnchor="middle"
                            y="4"
                            fontSize="8"
                            fontWeight="800"
                            fill="#3b3529"
                          >
                            {tx(tier === 2 ? "II" : "I")}
                          </MapLabel>
                        </g>
                      );
                    }),
                  )}
                </g>
              );
            }),
          )}
          {tx(
            edges
              .filter((e) => {
                if (s.phase === "setup-route")
                  return (
                    !!s.setupVertex &&
                    s.vertices[s.setupVertex].edges.includes(e.id) &&
                    canRoute(s, e.id, mode === "route" ? "route" : "road")
                  );
                if (mode === "move-route") return relocations.has(e.id);
                if (mode === "road" || mode === "route")
                  return canRoute(s, e.id, mode);
                if (mode === "camp")
                  return (
                    s.routes[e.id]?.owner === s.active &&
                    s.edges[e.id].tiles.some(
                      (id) =>
                        (s.routes[e.id].kind === "road"
                          ? s.tiles[id].resource !== "water"
                          : marineResource(s.tiles[id])) &&
                        (s.routes[e.id].camps[id] ?? 0) < 2,
                    )
                  );
                return false;
              })
              .map((e) => {
                const a = vertexPoint(s.vertices[e.vertices[0]]),
                  b = vertexPoint(s.vertices[e.vertices[1]]),
                  setup = s.phase === "setup-route";
                return (
                  <g
                    key={`target${e.id}`}
                    className="route-target"
                    role="button"
                    tabIndex={interactive ? 0 : -1}
                    aria-label={tx(
                      `Build ${mode === "route" ? "shipping route" : "road"} on ${e.id}`,
                    )}
                    data-testid={`edge-target-${e.id}`}
                    data-map-x={(a.x + b.x) / 2}
                    data-map-y={(a.y + b.y) / 2}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      clicked(() => {
                        if (interactive)
                          onBuild(setup ? "setup-route" : mode, e.id);
                      });
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" && interactive)
                        onBuild(setup ? "setup-route" : mode, e.id);
                    }}
                  >
                    <circle
                      cx={(a.x + b.x) / 2}
                      cy={(a.y + b.y) / 2}
                      r="9"
                      fill="transparent"
                    />
                    <path
                      d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                      stroke="transparent"
                      strokeWidth="18"
                    />
                    <path
                      d={`M${a.x * 0.82 + b.x * 0.18} ${a.y * 0.82 + b.y * 0.18}L${b.x * 0.82 + a.x * 0.18} ${b.y * 0.82 + a.y * 0.18}`}
                      stroke="#fff3ab"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeDasharray="3 4"
                    />
                  </g>
                );
              }),
          )}
          {tx(
            Object.values(s.towers).flatMap((tower) =>
              towerSiegeStatuses(s, tower).flatMap(({ siege, groups }) => {
                const target = vertexPoint(s.vertices[tower.vertex]);
                const linked = groups.filter((g) =>
                  g.units.some((u) => siege.units?.includes(u.id)),
                );
                return (linked.length ? linked : groups).map(({ tile }) => {
                  const origin = hexCenter(s.tiles[tile]);
                  const d = `M${origin.x + 38} ${origin.y + 12} Q${Math.max(origin.x, target.x) + 40} ${(origin.y + target.y) / 2} ${target.x} ${target.y}`;
                  return (
                    <g
                      key={`${siege.owner}-${tower.id}-${tile}`}
                      role="button"
                      tabIndex={0}
                      className="map-siege-link"
                      aria-label={tx(
                        `Inspect ${towerName(tower)} siege by ${s.players[siege.owner].name}`,
                      )}
                      data-testid={`tower-siege-link-${tower.id}-${tile}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        clicked(() => onInspectTowerSiege(tower.vertex));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onInspectTowerSiege(tower.vertex);
                        }
                      }}
                    >
                      <path
                        d={d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="18"
                        pointerEvents="stroke"
                      />
                      <path
                        d={d}
                        fill="none"
                        stroke="#3d2624"
                        strokeWidth="5"
                      />
                      <path
                        d={d}
                        fill="none"
                        stroke={COLORS[siege.owner]}
                        strokeWidth="3"
                        strokeDasharray="5 3"
                      />
                    </g>
                  );
                });
              }),
            ),
          )}
          {tx(
            Object.values(s.towers).map((t) => {
              const siege = towerSiegeStatuses(s, t)[0];
              const v = vertexPoint(s.vertices[t.vertex]);
              const townHere = towns.some((town) => town.vertex === t.vertex);
              const x = v.x + (townHere ? 19 : 0),
                y = v.y + (townHere ? 9 : 0);
              return (
                <g
                  key={t.id}
                  transform={`translate(${x} ${y})`}
                  data-testid={`tower-${t.vertex}`}
                  data-map-x={x}
                  data-map-y={y}
                  role="button"
                  tabIndex={0}
                  aria-label={tx(
                    `${s.players[t.owner].name} ${towerName(t)}, tier ${t.tier}${siege ? ", under siege, inspect details" : ""}`,
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    clicked(() =>
                      siege
                        ? onInspectTowerSiege(t.vertex)
                        : onSelect({ type: "vertex", id: t.vertex }),
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      siege
                        ? onInspectTowerSiege(t.vertex)
                        : onSelect({ type: "vertex", id: t.vertex });
                    }
                  }}
                >
                  {tx(
                    siege && (
                      <g data-testid={`tower-siege-badge-${t.vertex}`}>
                        <rect
                          x="-30"
                          y="-36"
                          width="60"
                          height="17"
                          rx="4"
                          fill="#823b2e"
                          stroke="#ffe6bd"
                        />
                        <MapLabel
                          textAnchor="middle"
                          y="-24"
                          fontSize="8"
                          fontWeight="800"
                          fill="#fff3db"
                        >
                          {tx(
                            siege.remaining
                              ? `SIEGE ${Math.min(siege.siege.progress, siege.required)}/${siege.required}`
                              : "EXPOSED",
                          )}
                        </MapLabel>
                      </g>
                    ),
                  )}
                  <circle
                    r="13"
                    fill="#153b43"
                    stroke={COLORS[t.owner]}
                    strokeWidth="2"
                  />
                  <path
                    d="M-7 7-5-5H-7V-11H-3V-7H3V-11H7V-5H5L7 7Z"
                    fill={COLORS[t.owner]}
                    stroke="#f5e6bb"
                    strokeWidth=".8"
                  />
                  <path d="M-2 6V0H2V6" fill="#18383d" />
                  <rect
                    x="-7"
                    y="8"
                    width="14"
                    height="9"
                    rx="3"
                    fill="#f5e5b4"
                  />
                  <MapLabel
                    textAnchor="middle"
                    y="15"
                    fontSize="8"
                    fontWeight="900"
                    fill="#264a4a"
                  >
                    {tx(t.tier)}
                  </MapLabel>
                </g>
              );
            }),
          )}
          {tx(
            (s.phase === "setup-town" || mode === "settlement") &&
              [...sites].map((v) => {
                const { x, y } = vertexPoint(s.vertices[v]);
                return (
                  <g
                    key={`site${v}`}
                    className="settlement-target"
                    role="button"
                    tabIndex={interactive ? 0 : -1}
                    aria-label={tx(`Found settlement at ${v}`)}
                    data-testid={`settlement-target-${v}`}
                    data-map-x={x}
                    data-map-y={y}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      clicked(() => {
                        if (interactive)
                          onBuild(
                            s.phase === "setup-town"
                              ? "setup-town"
                              : "settlement",
                            v,
                          );
                      });
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" && interactive)
                        onBuild(
                          s.phase === "setup-town"
                            ? "setup-town"
                            : "settlement",
                          v,
                        );
                    }}
                  >
                    <circle cx={x} cy={y} r="10" fill="transparent" />
                    <circle
                      cx={x}
                      cy={y}
                      r="4.8"
                      fill="#fbf3c8"
                      stroke="#42755d"
                      strokeWidth="1.5"
                    />
                    <path
                      d={`M${x - 2} ${y}h4m-2-2v4`}
                      stroke="#42755d"
                      strokeWidth="1"
                    />
                  </g>
                );
              }),
          )}
          {tx(
            Object.values(s.sieges).flatMap((siege) => {
              const town = s.towns[siege.town];
              if (!town) return [];
              const target = vertexPoint(s.vertices[town.vertex]);
              return [
                ...new Set(
                  siegeParticipants(s, town, siege.owner).map((u) => u.tile),
                ),
              ].map((tile) => {
                const origin = hexCenter(s.tiles[tile]);
                const d = `M${origin.x + 38} ${origin.y + 12} Q${Math.max(origin.x + 21, target.x) + 48} ${(origin.y + 12 + target.y) / 2} ${target.x + 20} ${target.y - 4}`;
                return (
                  <g
                    key={`${siege.owner}-${town.id}-${tile}`}
                    role="button"
                    tabIndex={0}
                    aria-label={tx(
                      `Inspect siege of ${town.name} by ${s.players[siege.owner].name}`,
                    )}
                    className="map-siege-link"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      clicked(() => onInspectSiege(town.id));
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        ev.stopPropagation();
                        onInspectSiege(town.id);
                      }
                    }}
                    data-testid={`siege-link-${siege.owner}-${town.id}-${tile}`}
                  >
                    <title>
                      {s.players[siege.owner].name}
                      {tx(" besieging ")}
                      {town.name}
                    </title>
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="18"
                      pointerEvents="stroke"
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke="#3d2624"
                      strokeWidth="5"
                      opacity=".8"
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={COLORS[siege.owner]}
                      strokeWidth="3"
                      strokeDasharray="5 3"
                    />
                    <circle
                      cx={target.x}
                      cy={target.y}
                      r="19"
                      fill="none"
                      stroke="#a94b36"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  </g>
                );
              });
            }),
          )}
          {tx(
            towns.map((t) => {
              const { x, y } = vertexPoint(s.vertices[t.vertex]),
                siege = townSiegeStatuses(s, t)[0],
                guilds = townGuilds(t),
                selected =
                  selection?.type === "vertex" && selection.id === t.vertex;
              return (
                <g key={t.id}>
                  <g
                    className="map-town"
                    data-map-x={x}
                    data-map-y={y}
                    filter="url(#piece-shadow)"
                    role="button"
                    tabIndex={0}
                    aria-label={tx(
                      `${t.name}, level ${t.level}, wall ${t.wall}, ${s.players[t.owner].name}${guilds.length ? `, ${guilds.map((g) => `${GUILDS[g.kind].name} tier ${g.tier}`).join(", ")}` : ""}${siege ? `, ${siege.label}` : ""}`,
                    )}
                    data-testid={`town-${t.id}`}
                    transform={`translate(${x} ${y})`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      clicked(() => onSelect({ type: "vertex", id: t.vertex }));
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter")
                        onSelect({ type: "vertex", id: t.vertex });
                    }}
                  >
                    <circle r="17" fill="transparent" />
                    <title>
                      {t.name} ·{tx(" ")}
                      {tx(
                        ["", "Settlement", "City I", "City II", "City III"][
                          t.level
                        ],
                      )}
                      {tx(" ")}
                      {tx("· wall ")}
                      {tx(t.wall)} · {tx(Object.keys(t.extensions).length)}
                      {tx(" ")}
                      {tx("extensions")}
                      {tx(
                        guilds
                          .map((g) => ` · ${GUILDS[g.kind].name} ${g.tier}`)
                          .join(""),
                      )}
                      {tx(siege ? ` · ${siege.label}` : "")}
                    </title>
                    <TownMiniature
                      town={t}
                      color={COLORS[t.owner]}
                      selected={selected}
                    />
                    {tx(
                      guilds.length > 0 && (
                        <g
                          transform="translate(13 -30)"
                          pointerEvents="none"
                          data-testid={`guild-badge-${t.id}`}
                        >
                          <GuildCrest
                            kind={guilds[0].kind}
                            tier={guilds[0].tier}
                            size={18}
                          />
                          {tx(
                            guilds.length > 1 && (
                              <g>
                                <circle
                                  cx="19"
                                  cy="4"
                                  r="7"
                                  fill="#153e37"
                                  stroke="#f4dba0"
                                />
                                <text
                                  x="19"
                                  y="7"
                                  textAnchor="middle"
                                  fontSize="8"
                                  fontWeight="800"
                                  fill="#fff0c9"
                                >
                                  {tx(guilds.length)}
                                </text>
                              </g>
                            ),
                          )}
                        </g>
                      ),
                    )}
                  </g>
                  {tx(
                    siege && (
                      <g
                        className="map-siege-badge"
                        transform={`translate(${x} ${y - 72})`}
                        role="button"
                        tabIndex={0}
                        aria-label={tx(`Inspect siege of ${t.name}`)}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          clicked(() => onInspectSiege(t.id));
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            ev.stopPropagation();
                            onInspectSiege(t.id);
                          }
                        }}
                        data-testid={`siege-badge-${t.id}`}
                      >
                        <title>{tx("Click for full siege details")}</title>
                        <rect
                          x="-33"
                          y="15"
                          width="66"
                          height="29"
                          fill="transparent"
                        />
                        <rect
                          x="-29"
                          y="20"
                          width="58"
                          height="16"
                          rx="5"
                          fill="#823b2e"
                          stroke="#ffe6bd"
                          strokeWidth="1"
                        />
                        <MapLabel
                          x="0"
                          y="31"
                          textAnchor="middle"
                          fill="#fff3db"
                          fontSize="8"
                          fontWeight="800"
                        >
                          {tx(
                            siege.breached
                              ? "BREACHED"
                              : siege.remaining === 0
                                ? "EXPOSED"
                                : `SIEGE ${siege.completed}/${siege.required}`,
                          )}
                        </MapLabel>
                        <rect
                          x="-25"
                          y="37"
                          width="50"
                          height="3"
                          rx="1.5"
                          fill="#392b28"
                        />
                        <rect
                          x="-25"
                          y="37"
                          width={50 * siege.fraction}
                          height="3"
                          rx="1.5"
                          fill="#f1b56b"
                        />
                      </g>
                    ),
                  )}
                </g>
              );
            }),
          )}
          {tx(
            Object.entries(groupUnits).map(([tile, units]) => {
              const { x, y } = hexCenter(s.tiles[tile]),
                p = units[0].owner,
                naval = units[0].naval,
                selected = unitIds.some((id) => units.some((u) => u.id === id));
              const activate = () =>
                mode === "move" && targets[tile] && interactive
                  ? onMove(tile)
                  : onSelect({ type: "tile", id: tile });
              return (
                <g
                  key={`army${tile}`}
                  className="army-token"
                  data-map-x={x}
                  data-map-y={y}
                  filter="url(#piece-shadow)"
                  role="button"
                  tabIndex={0}
                  aria-label={tx(
                    `${[...new Set(units.map((u) => u.owner))].map((id) => s.players[id].name).join(" & ")} ${naval ? "fleet" : "army"}, ${units.length} pieces, ${units.reduce((n, u) => n + points(u), 0)} base power; ${[...new Set(units.map(unitName))].map((name) => `${units.filter((u) => unitName(u) === name).length} ${name}`).join(", ")}`,
                  )}
                  data-testid={`army-${tile}`}
                  transform={`translate(${x + 21} ${y + 12})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    clicked(activate);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") activate();
                  }}
                >
                  <title>{tx(units.map(unitName).join(" · "))}</title>
                  <rect
                    x="-17"
                    y="-21"
                    width="34"
                    height="44"
                    rx="12"
                    fill="transparent"
                    pointerEvents="all"
                  />
                  {tx(
                    [...new Set(units.map((u) => u.owner))].length > 1 && (
                      <g aria-hidden="true" className="alliance-map-badges">
                        {tx(
                          [...new Set(units.map((u) => u.owner))].map(
                            (owner, i) => (
                              <circle
                                key={owner}
                                cx={-18 + i * 10}
                                cy={-27}
                                r={5}
                                fill={COLORS[owner]}
                                stroke="#f3e4bf"
                                strokeWidth={1.5}
                              />
                            ),
                          ),
                        )}
                      </g>
                    ),
                  )}
                  <ArmyMiniature
                    units={units}
                    color={COLORS[p]}
                    selected={selected}
                  />
                </g>
              );
            }),
          )}
          {tx(
            mode === "tower" &&
              towerSites(s).map((v) => {
                const { x, y } = vertexPoint(s.vertices[v]);
                return (
                  <g
                    key={`tower-site-${v}`}
                    role="button"
                    tabIndex={interactive ? 0 : -1}
                    aria-label={tx(`Build watchtower at ${v}`)}
                    data-testid={`tower-target-${v}`}
                    data-map-x={x}
                    data-map-y={y}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (interactive) onBuild("tower", v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && interactive) onBuild("tower", v);
                    }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r="11"
                      fill="#fff0a080"
                      stroke="#fff4bb"
                      strokeWidth="2"
                    />
                    <path
                      d={`M${x - 5} ${y + 5}V${y - 6}h3v3h4v-3h3v11Z`}
                      fill="#496965"
                    />
                  </g>
                );
              }),
          )}
        </svg>
      </div>
      <div
        className="map-controls"
        role="group"
        aria-label={tx("Map view controls")}
      >
        {tx(
          selection && (
            <button
              className="icon-button"
              aria-label={tx("Center selected location")}
              title={tx("Center selected location")}
              onClick={() => {
                const p =
                  selection.type === "tile"
                    ? hexCenter(s.tiles[selection.id])
                    : selection.type === "vertex"
                      ? vertexPoint(s.vertices[selection.id])
                      : edgeMidpoint(s, s.edges[selection.id]);
                setPan({
                  x: p.x - bounds.x - bounds.w / 2,
                  y: p.y - bounds.y - bounds.h / 2,
                });
                setZoom((z) =>
                  Math.max(z, Math.sqrt(tiles.length / 100) * 1.8),
                );
              }}
            >
              <Flag size={18} />
            </button>
          ),
        )}
        <button
          className="icon-button"
          aria-label={tx("Zoom in")}
          title={tx("Zoom in")}
          onClick={() =>
            setZoom((z) =>
              Math.min(
                Math.max(6, Math.sqrt(tiles.length / 100) * 4),
                z + 0.25,
              ),
            )
          }
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="icon-button"
          aria-label={tx("Zoom out")}
          title={tx("Zoom out")}
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="icon-button"
          aria-label={tx("Fit entire map")}
          title={tx("Fit entire map")}
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <Focus size={18} />
        </button>
        <button
          className="icon-button"
          aria-label={tx("Show climates")}
          title={tx("Show climates")}
          aria-pressed={climates}
          onClick={() => setClimates((v) => !v)}
        >
          ◈
        </button>
        <button
          className="icon-button"
          aria-label={tx(numbers ? "Hide dice numbers" : "Show dice numbers")}
          title={tx(numbers ? "Hide dice numbers" : "Show dice numbers")}
          onClick={() => setNumbers((v) => !v)}
        >
          <MapIcon size={18} />
        </button>
      </div>
      {climates && (
        <div className="climate-map-legend" aria-label={tx("Climates")}>
          {CLIMATES.filter((c) => tiles.some((t) => t.climate === c)).map(
            (c) => (
              <span key={c}>
                <i style={{ background: CLIMATE_INFO[c].color }} />
                {tx(CLIMATE_INFO[c].name)}
              </span>
            ),
          )}
        </div>
      )}
      <div className="map-caption">
        <span className="north-arrow">{tx("N ↑")}</span>
        <span>
          {tx(tiles.length)}
          {tx(" hexes charted")}
        </span>
        <span>{tx("Drag to pan · scroll to zoom")}</span>
      </div>
    </div>
  );
}
