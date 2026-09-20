import { seasonAt, seasonalYield, seasonalWorkshopBase } from "../game/seasons";
import { TileSeasonForecast } from "./SeasonCalendar";
import { CLIMATE_INFO } from "../game/climate-content";
import { canChooseWoods } from "../game/selectors";
import { localize as tx, useLocale } from "../i18n";
import { friendly } from "../game/relations";
import { TownDefense } from "./TownDefense";
import {
  ArmyComposition,
  selectHalfForce,
  selectReadyForce,
} from "./ArmyComposition";
import { GuildPanel } from "./Guilds";
import { Recruitment } from "./Recruitment";
import { ResearchArt } from "./ResearchArt";
import { TowerPanel, HarvestPanel } from "./Maritime";
import {
  marineResource,
  tileTerrain,
  tileGood,
  tileGoods,
  tileYield,
  workshopYield,
  tileOptions,
  terrainFamily,
  productiveAtVertex,
  towerDefense,
} from "../game/maritime";
import { shipStats, shipCost, TOWER_COSTS } from "../game/content";
import { SiegeProgress } from "./TownAlerts";
import { useState } from "react";
import {
  Hammer,
  Shield,
  Flag,
  Navigation,
  Anchor,
  Factory,
  ScrollText,
  Compass,
  ArrowRight,
  Package,
  ChevronRight,
  MapPin,
  Users,
  ArrowLeftRight,
} from "lucide-react";
import {
  GOODS,
  RAW,
  type Game,
  type Good,
  type Stock,
  type Command,
  type Raw,
  type UnitClass,
  type ShipClass,
} from "../game/types";
import {
  COSTS,
  CITY_NAMES,
  CITY_RECIPES,
  WALL_NAMES,
  UNIT_INFO,
  SHIP_INFO,
  GOOD_INFO,
  CARDS,
  TERRAIN,
  ROMAN,
  extensionCost,
  extensionName,
  processedFor,
  unitCost,
  campCost,
  expeditionCost,
  RESEARCH_NAMES,
} from "../game/content";
import {
  ownTowns,
  nearestTown,
  inventory,
  ownPieces,
  income,
  townAt,
  piecesAt,
  points,
  power,
  bombardmentPower,
  bombardmentTargets,
  speed,
  ready,
  colonizationSites,
  unitName,
  sumStock,
  besieged,
  protects,
  siegeRequirement,
  towerSiegeRequirement,
  effectiveCost,
  affordable,
  bankRate,
  researchCount,
  expeditionSites,
  relocationSites,
} from "../game/selectors";
import {
  landAtVertex,
  waterAtVertex,
  neighbors,
  expeditionFootprint,
  canOccupy,
} from "../game/world";
import {
  Cost,
  GoodsList,
  ActionButton,
  GoodIcon,
  UnitSymbol,
  UnitPortrait,
  Empty,
  SectionTitle,
} from "./components";
import { type Selection, type BoardMode } from "./Board";
export type PanelTab = "build" | "forces" | "trade" | "research" | "explore";
export type DialogSpec = { type: string; [key: string]: unknown } | null;
interface Props {
  privateHandVisible?: boolean;
  game: Game;
  viewer: number;
  interactive: boolean;
  tab: PanelTab;
  selection: Selection;
  onSelect: (s: Selection) => void;
  mode: BoardMode;
  setMode: (m: BoardMode) => void;
  unitIds: string[];
  setUnitIds: (ids: string[]) => void;
  onAction: (c: Command) => void;
  openDialog: (d: DialogSpec) => void;
  onPreview: (ids: string[]) => void;
}

export function DetailHeader({
  game: s,
  selection,
  unitIds,
  viewer = s.active,
}: {
  game: Game;
  viewer?: number;
  selection: Selection;
  unitIds?: string[];
}) {
  useLocale();

  if (!selection)
    return (
      <div className="panel-intro">
        <span className="eyebrow">{tx("YOUR NEXT MOVE")}</span>
        <h2>{tx("Shape the frontier")}</h2>
        <p>
          {tx(
            "Select a town, army or hex to inspect it. Build an economy worth defending.",
          )}
        </p>
      </div>
    );
  if (selection.type === "vertex") {
    const town = townAt(s, selection.id);
    if (town)
      return (
        <div className="panel-intro">
          <span className="eyebrow" style={{ color: COLORSafe(s, town.owner) }}>
            {tx(s.players[town.owner].name.toUpperCase())}
          </span>
          <h2>{town.name}</h2>
          <p>
            {tx(CITY_NAMES[town.level])}
            {tx(town.wall ? ` · ${WALL_NAMES[town.wall]}` : "")}
            {tx(besieged(s, town.id) ? " · UNDER SIEGE" : "")}
          </p>
          <TownDefense game={s} town={town} ids={unitIds} />
        </div>
      );
  }
  if (selection.type === "tile") {
    const t = s.tiles[selection.id];
    if (t)
      return (
        <div className="panel-intro">
          <span className="eyebrow">{tx(terrainFamily(t).toUpperCase())}</span>
          <h2>{tx(TERRAIN[tileTerrain(t)].name)}</h2>
          <div className="tile-metadata">
            <span
              className="climate-chip"
              style={{
                borderColor: CLIMATE_INFO[t.climate ?? "temperate"].color,
              }}
            >
              {tx(CLIMATE_INFO[t.climate ?? "temperate"].name)}
            </span>
            <span className="tile-position">
              <MapPin size={13} aria-hidden="true" />
              {tx("Position")}:{" "}
              <strong>
                ({t.q}, {t.r})
              </strong>
            </span>
          </div>
          <p>
            {tx(
              !tileGood(t)
                ? t.resource === "water"
                  ? "Fleet movement and transport"
                  : t.resource === "peaks"
                    ? "Impassable. No units can enter. Roads may follow the edges."
                    : t.resource === "ice"
                      ? "Walkable ice. No production. Ships cannot enter."
                      : "No resources. Land units can cross."
                : `${seasonAt(s) ? "Annual average: " : ""}${tileGoods(
                    t,
                    viewer,
                  )
                    .map(
                      (good) =>
                        `${tileYield(t, viewer)[good]} ${GOOD_INFO[good].name}`,
                    )
                    .join(
                      " + ",
                    )} · rolls on ${t.number} · ${(((6 - Math.abs(t.number - 7)) / 36) * 100).toFixed(1)}% chance`,
            )}
          </p>
          <TileSeasonForecast game={s} tile={t} owner={viewer} />
        </div>
      );
  }
  const harbor = s.edges[selection.id]?.harbor;
  return (
    <div className="panel-intro">
      <span className="eyebrow">
        {tx(harbor ? "COASTAL TRADE" : "ROUTE INFRASTRUCTURE")}
      </span>
      {harbor &&
        !s.edges[selection.id].tiles.some((id) =>
          canOccupy(s.tiles[id], true),
        ) && (
          <p className="season-force-warning">
            {tx(
              "Frozen port: improved rates resume after the thaw. Ordinary reserve trading remains available.",
            )}
          </p>
        )}
      <h2>
        {tx(
          harbor
            ? "Harbor"
            : s.routes[selection.id]?.kind === "route"
              ? "Shipping route"
              : "Roadside",
        )}
      </h2>
      <p>
        {tx(
          harbor
            ? `${harbor === "generic" ? "Any raw resource · 3:1" : GOOD_INFO[harbor].name + " · 2:1"}. A town at either end of this coastal edge unlocks the rate.`
            : Object.keys(s.routes[selection.id]?.camps ?? {}).length
              ? "Resource camp established"
              : "Connect your economy to new opportunities.",
        )}
      </p>
    </div>
  );
}
export function Panels(props: Props) {
  useLocale();

  const { tab, game: s, viewer, selection, interactive, onAction } = props;
  const woods =
    selection?.type === "tile" && canChooseWoods(s, selection.id, viewer)
      ? s.tiles[selection.id]
      : undefined;
  return (
    <>
      {woods && (
        <section
          className="woods-choice"
          aria-label={tx("Woods harvest choice")}
        >
          <b>{tx("Your harvest")}</b>
          <div className="woods-choice-buttons">
            {(["lumber", "hides"] as const).map((good) => (
              <button
                key={good}
                type="button"
                aria-pressed={
                  (woods.woodsChoices?.[viewer] ?? "lumber") === good
                }
                disabled={!interactive}
                onClick={() =>
                  onAction({ type: "woods-choice", tile: woods.id, kind: good })
                }
              >
                <GoodIcon good={good} size={22} />
                {tx(GOOD_INFO[good].name)}
              </button>
            ))}
          </div>
          <small>
            {tx(
              "Applies to your towns, camps and collectors on this tile. Other factions choose independently. Existing workshops keep their product.",
            )}
          </small>
        </section>
      )}
      {tx(
        tab === "build" ? (
          <BuildPanel {...props} />
        ) : tab === "forces" ? (
          <ForcesPanel
            key={
              props.selection?.type === "tile"
                ? props.selection.id
                : "recruitment"
            }
            {...props}
          />
        ) : tab === "trade" ? (
          <TradePanel {...props} />
        ) : tab === "research" ? (
          <ResearchPanel {...props} />
        ) : (
          <ExplorePanel {...props} />
        ),
      )}
    </>
  );
}
function BuildPanel({
  game: s,
  openDialog,
  viewer,
  interactive,
  selection,
  onSelect,
  mode,
  setMode,
  onAction,
}: Props) {
  useLocale();

  const town =
      selection?.type === "vertex" ? townAt(s, selection.id) : undefined,
    route = selection?.type === "edge" ? s.routes[selection.id] : undefined;
  return (
    <div className="panel-content" tabIndex={0}>
      <SectionTitle>{tx("Expand your realm")}</SectionTitle>
      <div className="build-tools">
        {tx(
          [
            { mode: "road", name: "Road", icon: Navigation, cost: COSTS.Road },
            {
              mode: "tower",
              name: "Watchtower",
              icon: Shield,
              cost: TOWER_COSTS[1],
            },
            {
              mode: "settlement",
              name: "Settlement",
              icon: Flag,
              cost: COSTS.Settlement,
            },
            {
              mode: "route",
              name: "Ship route",
              icon: Anchor,
              cost: COSTS["Seafarers route ship"],
            },
            {
              mode: "camp",
              name: "Resource camp",
              icon: Factory,
              cost: undefined,
            },
          ].map((item) => (
            <button
              key={item.mode}
              className={`build-tool ${mode === item.mode ? "active" : ""}`}
              disabled={!interactive || s.phase !== "economy"}
              onClick={() =>
                setMode(
                  mode === item.mode ? "inspect" : (item.mode as BoardMode),
                )
              }
            >
              <item.icon size={21} />
              <b>{tx(item.name)}</b>
              {tx(
                item.mode === "tower" ? (
                  <small>{tx("2 Wood OR 2 Stone")}</small>
                ) : item.cost ? (
                  <Cost cost={effectiveCost(s, item.cost, item.mode)} />
                ) : (
                  <small>{tx("2 cards · 1 of each · two tiers")}</small>
                ),
              )}
            </button>
          )),
        )}
      </div>
      {tx(
        mode !== "inspect" && (
          <p className="notice">
            {tx(
              mode === "camp"
                ? "Select an owned road, then choose its land side below."
                : mode === "road"
                  ? "Extend any owned road, sea route or town onto a highlighted land or coastal edge."
                  : mode === "route"
                    ? "Extend any owned road, sea route or town onto a highlighted sea edge."
                    : `Choose a highlighted ${mode === "settlement" || mode === "tower" ? "intersection" : "edge"} on the map to build.`,
            )}
          </p>
        ),
      )}
      {tx(
        selection?.type === "vertex" && (
          <TowerPanel
            game={s}
            viewer={viewer}
            interactive={interactive}
            onAction={onAction}
            vertex={selection.id}
            onInspectSiege={() =>
              openDialog({ type: "tower-siege-info", vertex: selection.id })
            }
          />
        ),
      )}
      {tx(
        route && (
          <>
            <SectionTitle>{tx("Selected route")}</SectionTitle>
            <p className="muted">
              {tx("Owned by ")}
              {s.players[route.owner].name}
            </p>
            {tx(
              s.edges[route.edge].tiles
                .filter(
                  (id) =>
                    route.camps[id] ||
                    (!!tileGood(s.tiles[id]) &&
                      (route.kind === "road"
                        ? s.tiles[id].resource !== "water"
                        : marineResource(s.tiles[id]))),
                )
                .map((id) => {
                  const raw = tileGood(s.tiles[id], route.owner)!,
                    tier = route.camps[id] ?? 0;
                  return (
                    <div className="camp-side" key={id}>
                      <div className="camp-side-heading">
                        <GoodIcon good={raw} size={28} />
                        <span>
                          <b>
                            {tx(
                              s.tiles[id].whale
                                ? "Whaling"
                                : GOOD_INFO[raw].name,
                            )}
                            {tx(" ")}
                            {tx("camp")}
                          </b>
                          <small>
                            {tx("Hex ")}
                            {tx(id)}
                            {tx(" · roll ")}
                            {tx(s.tiles[id].number)} ·{tx(" ")}
                            {tx(
                              tier
                                ? `Tier ${ROMAN[tier]}: ${tileGoods(
                                    s.tiles[id],
                                    route.owner,
                                  )
                                    .map(
                                      (good) =>
                                        `${tier * (seasonalYield(s.tiles[id], route.owner, seasonAt(s))[good] ?? 0)} ${GOOD_INFO[good].name}`,
                                    )
                                    .join(" + ")} per roll`
                                : "Not built",
                            )}
                          </small>
                        </span>
                      </div>
                      <p className="muted">
                        {tx("Stores output in")}
                        {tx(" ")}
                        {tx(
                          nearestTown(s, id, route.owner)?.name ??
                            "the nearest town",
                        )}
                        .
                      </p>
                      {tx(
                        route.owner === viewer && (
                          <ActionButton
                            game={s}
                            command={{
                              type: "camp",
                              edge: route.edge,
                              tile: id,
                            }}
                            onAction={onAction}
                            disabled={!interactive || tier === 2}
                            cost={
                              tier < 2 ? campCost(raw, tier + 1) : undefined
                            }
                          >
                            {tx(
                              tier === 0
                                ? "Build camp"
                                : tier === 1
                                  ? "Upgrade camp to II"
                                  : "Maximum camp tier",
                            )}
                          </ActionButton>
                        ),
                      )}
                    </div>
                  );
                }),
            )}
            {tx(
              route.kind === "route" && route.owner === viewer && (
                <button
                  className="secondary full"
                  disabled={
                    !interactive ||
                    s.phase !== "economy" ||
                    !relocationSites(s, route.edge).length
                  }
                  title={tx(
                    "Requires an open end and another legal connected sea edge.",
                  )}
                  onClick={() => setMode("move-route")}
                >
                  {tx("Relocate open-ended ship route")}
                </button>
              ),
            )}
          </>
        ),
      )}
      {tx(
        town ? (
          <>
            <SectionTitle>
              {tx(
                town.owner === viewer
                  ? "Town development"
                  : "Town intelligence",
              )}
              <span className="tier-badge">
                {tx("Level ")}
                {tx(town.level)}
              </span>
            </SectionTitle>
            {town.level >= 3 && (
              <p className="public-research-note">
                {tx(
                  `Each matching tile adds ${town.level - 2} times its base yield as processed goods, in addition to raw output and workshops.`,
                )}
              </p>
            )}
            <SiegeProgress
              game={s}
              town={town}
              onInspect={() =>
                openDialog({ type: "siege-info", town: town.id })
              }
            />
            {tx(
              towerDefense(s, town.owner, town.vertex) > 0 && (
                <p className="public-research-note">
                  {tx("Watchtower defenses: +")}
                  {tx(towerDefense(s, town.owner, town.vertex))}
                  {tx(" ")}
                  {tx("siege turns.")}
                </p>
              ),
            )}
            {tx(
              town.owner === viewer && (
                <>
                  <ActionButton
                    game={s}
                    command={{ type: "city", town: town.id }}
                    onAction={onAction}
                    cost={
                      town.level < 4
                        ? effectiveCost(
                            s,
                            COSTS[CITY_RECIPES[town.level + 1]],
                            "civic",
                          )
                        : undefined
                    }
                    disabled={!interactive}
                  >
                    <Flag size={16} />
                    {tx(
                      town.level < 4
                        ? `Upgrade to ${CITY_NAMES[town.level + 1]}`
                        : "Maximum city level",
                    )}
                  </ActionButton>
                  <ActionButton
                    game={s}
                    command={{ type: "wall", town: town.id }}
                    onAction={onAction}
                    cost={
                      town.wall < town.level
                        ? effectiveCost(
                            s,
                            COSTS[WALL_NAMES[town.wall + 1]],
                            town.wall === 0 ? "palisade" : "civic",
                          )
                        : undefined
                    }
                    disabled={!interactive}
                  >
                    <Shield size={16} />
                    {tx(
                      town.wall < town.level
                        ? `Build ${WALL_NAMES[town.wall + 1]}`
                        : "Walls at current level cap",
                    )}
                  </ActionButton>
                </>
              ),
            )}
            <GuildPanel
              game={s}
              town={town}
              viewer={viewer}
              interactive={interactive}
              onAction={onAction}
              openDialog={openDialog}
            />
            <section
              aria-label={tx("City extensions")}
              data-testid="city-extensions"
            >
              <SectionTitle>{tx("City extensions")}</SectionTitle>
              <p className="muted small">
                {tx(
                  town.owner === viewer
                    ? "Add processed output. Your raw production stays unchanged."
                    : "Public buildings · output is blocked by enemy occupation.",
                )}
              </p>
              {tx(
                productiveAtVertex(s, town.vertex)
                  .filter((id) => town.owner === viewer || town.extensions[id])
                  .map((id) => {
                    const t = s.tiles[id],
                      raw =
                        town.extensionGoods?.[id] ?? tileGood(t, town.owner)!,
                      current = town.extensions[id] ?? 0,
                      next = current + 1;
                    return (
                      <div
                        className="industry-row"
                        key={id}
                        data-linked-tile={id}
                      >
                        <div>
                          <GoodIcon good={processedFor(raw)} size={23} />
                          <span>
                            <b>{tx(extensionName(raw))}</b>
                            <small>
                              {tx(GOOD_INFO[raw].name)}
                              {tx(" · roll ")}
                              {tx(t.number)} →{tx(" ")}
                              {tx(GOOD_INFO[processedFor(raw)].name)} ·{tx(" ")}
                              {tx(
                                current
                                  ? `Tier ${ROMAN[current]} · +${workshopYield(t, town.owner, raw, current, seasonalWorkshopBase(t, town.owner, raw, seasonAt(s)))} per roll`
                                  : "Not built",
                              )}
                            </small>
                          </span>
                        </div>
                        {tx(
                          town.owner === viewer && (
                            <ActionButton
                              game={s}
                              command={{
                                type: "extension",
                                town: town.id,
                                tile: id,
                              }}
                              onAction={onAction}
                              disabled={!interactive || next > 3}
                              cost={
                                next <= 3
                                  ? effectiveCost(
                                      s,
                                      extensionCost(raw, next),
                                      "industry",
                                    )
                                  : undefined
                              }
                            >
                              {tx(
                                current >= 3
                                  ? "Maximum extension tier"
                                  : current
                                    ? `Upgrade to ${ROMAN[next]}`
                                    : "Build extension",
                              )}
                            </ActionButton>
                          ),
                        )}
                      </div>
                    );
                  }),
              )}
              {tx(
                town.owner !== viewer &&
                  !Object.values(town.extensions).some(Boolean) && (
                    <Empty>{tx("No extensions built.")}</Empty>
                  ),
              )}
            </section>
            {tx(
              town.owner !== viewer && (
                <p className="public-research-note">
                  <ScrollText size={16} /> {s.players[town.owner].name}
                  {tx(" holds")}
                  {tx(" ")}
                  {tx(researchCount(s, town.owner))}
                  {tx(" research cards.")}
                </p>
              ),
            )}
            <SectionTitle>{tx("Local warehouse")}</SectionTitle>
            <GoodsList stock={town.stock} />
          </>
        ) : (
          <>
            <SectionTitle>
              {tx("Your settlements")}
              {tx(" ")}
              <span className="count">{tx(ownTowns(s, viewer).length)}</span>
            </SectionTitle>
            <div className="town-list">
              {tx(
                ownTowns(s, viewer).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelect({ type: "vertex", id: t.vertex })}
                  >
                    <span className="town-level">{tx(ROMAN[t.level])}</span>
                    <span>
                      <b>{t.name}</b>
                      <small>
                        {tx(CITY_NAMES[t.level])} · {tx(sumStock(t.stock))}
                        {tx(" goods")}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                )),
              )}
            </div>
          </>
        ),
      )}
    </div>
  );
}
function ForcesPanel({
  game: s,
  viewer,
  interactive,
  selection,
  onSelect,
  mode,
  setMode,
  unitIds,
  setUnitIds,
  onAction,
  openDialog,
}: Props) {
  useLocale();

  const town =
      (selection?.type === "vertex" ? townAt(s, selection.id) : undefined) ??
      (selection?.type !== "tile" ? ownTowns(s, viewer)[0] : undefined),
    tile = selection?.type === "tile" ? selection.id : undefined,
    units = tile ? piecesAt(s, tile) : [],
    mine = units.filter((u) => u.owner === viewer),
    selected = unitIds.map((id) => s.pieces[id]).filter(Boolean),
    actingNaval =
      selected[0]?.naval ??
      mine.find((u) => ready(s, u))?.naval ??
      units[0]?.naval ??
      false,
    ids = selected.filter((u) => u.owner === s.active).map((u) => u.id),
    adjTowns = tile
      ? Object.values(s.towns).filter((t) =>
          s.vertices[t.vertex].tiles.includes(tile),
        )
      : [];
  const artillery = selected.filter(
      (u) =>
        u.owner === s.active &&
        u.kind === "artillery" &&
        ready(s, u) &&
        speed(u) + u.bonus - u.moved >= 1,
    ),
    artilleryIds = artillery.map((u) => u.id),
    bombardTargets = bombardmentTargets(s, artilleryIds);
  const settler =
    selected.find(
      (u) =>
        u.owner === viewer &&
        (u.kind === "settler" || u.kind === "settlership"),
    ) ??
    mine.find(
      (u) => ready(s, u) && (u.kind === "settler" || u.kind === "settlership"),
    );
  const canFound = !!settler && colonizationSites(s, settler).length > 0;
  const selectedCanSiege =
    selected.length > 0 &&
    selected.every((u) => ready(s, u) && speed(u) + u.bonus - u.moved >= 1);
  return (
    <div className="panel-content" tabIndex={0}>
      {tx(
        town?.owner === viewer && (
          <Recruitment
            game={s}
            town={town}
            viewer={viewer}
            interactive={interactive}
            onAction={onAction}
            onTown={(id) => onSelect({ type: "vertex", id })}
          />
        ),
      )}
      {tx(
        tile && units.length > 0 ? (
          <>
            <SectionTitle>
              {tx(actingNaval ? "Fleet" : "Army")}
              {tx(" at ")}
              {tx(tile)}
            </SectionTitle>

            {tx(
              mine.length > 0 && (
                <div className="force-selection-actions">
                  <button
                    className="text-button"
                    onClick={() => setUnitIds(selectReadyForce(s, mine))}
                  >
                    {tx("Select all ready units")}
                  </button>
                  <button
                    className="text-button"
                    disabled={!selectHalfForce(s, mine).length}
                    title={tx(
                      "Select half the ready force, rounded up, balanced across types and tiers.",
                    )}
                    onClick={() => setUnitIds(selectHalfForce(s, mine))}
                  >
                    {tx("Select half")}
                  </button>
                </div>
              ),
            )}
            <ArmyComposition
              game={s}
              units={units}
              viewer={viewer}
              selectedIds={unitIds}
              onSelect={setUnitIds}
            />
            {tx(
              mine.length > 0 && (
                <>
                  {settler && (
                    <div className="panel-intro">
                      <button
                        className="primary full"
                        disabled={!interactive || !canFound}
                        onClick={() => {
                          setUnitIds([settler.id]);
                          setMode(mode === "colonize" ? "inspect" : "colonize");
                        }}
                      >
                        {tx(
                          mode === "colonize"
                            ? "Choose a highlighted settlement site"
                            : "Found settlement",
                        )}
                      </button>
                      <p>
                        {tx(
                          ready(s, settler) && !canFound
                            ? "No legal site here. Move to a clear tile at least two edges from existing towns."
                            : "Consumes one settler. No road or further payment. Normal spacing and clear adjacent tiles required.",
                        )}
                      </p>
                    </div>
                  )}
                  <button
                    className={`primary full ${mode === "move" ? "selected" : ""}`}
                    disabled={
                      !interactive ||
                      s.phase !== "economy" ||
                      !selected.length ||
                      selected.some((u) => !ready(s, u))
                    }
                    onClick={() =>
                      setMode(mode === "move" ? "inspect" : "move")
                    }
                  >
                    <Navigation size={17} />
                    {tx(
                      mode === "move"
                        ? "Choose a destination…"
                        : "Move / attack with selected",
                    )}
                  </button>

                  {tx(
                    selected.length > 0 &&
                      units.some((u) => !friendly(s, u.owner, viewer)) && (
                        <button
                          className="danger full"
                          disabled={
                            !interactive ||
                            selected.some(
                              (u) =>
                                !ready(s, u) ||
                                speed(u) + u.bonus - u.moved < 1,
                            )
                          }
                          onClick={() =>
                            openDialog({ type: "attack", ids, to: tile })
                          }
                        >
                          {tx("Attack former allies on this tile · 1 MP")}
                        </button>
                      ),
                  )}
                  <p className="muted small">
                    {tx(
                      "1 point per tile, battle, siege/raid or road demolition. Survivors can keep acting while points remain.",
                    )}
                  </p>
                  {tx(
                    bombardTargets.map((target) => {
                      const fleet = piecesAt(s, target, true).filter(
                        (u) => !friendly(s, u.owner, viewer),
                      );
                      return (
                        <button
                          key={target}
                          className="secondary full"
                          disabled={!interactive}
                          onClick={() =>
                            openDialog({
                              type: "attack",
                              bombardment: true,
                              ids: artilleryIds,
                              to: target,
                            })
                          }
                        >
                          {tx("Bombard fleet at ")}
                          {tx(target)} · {tx(bombardmentPower(s, artillery))}
                          {tx(" ")}
                          {tx("vs ")}
                          {tx(power(s, fleet, target))}
                        </button>
                      );
                    }),
                  )}
                  {tx(
                    bombardTargets.length > 0 && (
                      <p className="muted">
                        {tx(
                          "Selected artillery only · 1 movement point · may act again if points remain. Ships retaliate; artillery stays ashore.",
                        )}
                      </p>
                    ),
                  )}
                  {tx(
                    Object.values(s.towers)
                      .filter(
                        (t) =>
                          !friendly(s, t.owner, viewer) &&
                          !!tile &&
                          s.vertices[t.vertex].tiles.includes(tile),
                      )
                      .map((t) => {
                        const siege = s.towerSieges?.[`${viewer}:${t.id}`];
                        const remaining = Math.max(
                          0,
                          towerSiegeRequirement(t, selected) -
                            (siege?.progress ?? 0),
                        );
                        return (
                          <div className="siege-card" key={t.id}>
                            <b>
                              {s.players[t.owner].name}
                              {tx(" watchtower ")}
                              {tx(ROMAN[t.tier])}
                            </b>
                            <small>{tx("1 movement point per unit")}</small>
                            <p>
                              {tx(
                                remaining
                                  ? `${remaining} siege steps before destruction.`
                                  : "Defenses can be overcome now. Destroy immediately.",
                              )}
                            </p>
                            <ActionButton
                              game={s}
                              command={{
                                type: "destroy-tower",
                                vertex: t.vertex,
                                ids,
                              }}
                              disabled={!interactive}
                              onAction={onAction}
                            >
                              {tx(
                                remaining
                                  ? siege
                                    ? "Continue tower siege"
                                    : "Siege watchtower"
                                  : "Destroy watchtower",
                              )}
                            </ActionButton>
                            {tx(
                              siege && (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    openDialog({
                                      type: "tower-siege-info",
                                      vertex: t.vertex,
                                    })
                                  }
                                >
                                  {tx("View tower siege details")}
                                </button>
                              ),
                            )}
                          </div>
                        );
                      }),
                  )}
                  {tx(
                    adjTowns
                      .filter(
                        (t) => !friendly(s, t.owner, viewer) && !actingNaval,
                      )
                      .map((t) => {
                        const siege = s.sieges[`${viewer}:${t.id}`],
                          requirement = siegeRequirement(s, t, selected),
                          canRaid =
                            siege?.raided != null ||
                            (siege?.progress ?? 0) >= requirement,
                          raided = siege?.raided != null;
                        return (
                          <div key={t.id} className="siege-card">
                            <b>{t.name}</b>
                            <small>
                              {tx("Siege / raid: 1 movement point per unit")}
                            </small>
                            <p>
                              {tx(
                                protects(s, t)
                                  ? "Protected by an adjacent defending army."
                                  : raided
                                    ? "Raided. Each later turn: raid new goods or destroy the town."
                                    : canRaid
                                      ? "Defenses can be overcome now. Raid immediately for 1 movement point."
                                      : `${Math.max(0, requirement - (siege?.progress ?? 0))} siege steps remaining before a raid.`,
                              )}
                            </p>
                            {tx(
                              raided && (
                                <ActionButton
                                  game={s}
                                  command={{
                                    type: "destroy-town",
                                    ids,
                                    town: t.id,
                                  }}
                                  disabled={!interactive}
                                  onAction={(c) =>
                                    openDialog({
                                      type: "confirm",
                                      title: `Destroy ${t.name}?`,
                                      text: "The town, all extensions and walls will be permanently destroyed. All remaining stored resources will be transferred to your nearest town.",
                                      command: c,
                                    })
                                  }
                                >
                                  {tx("Destroy town")}
                                </ActionButton>
                              ),
                            )}
                            {tx(
                              canRaid ? (
                                <button
                                  className="danger full"
                                  disabled={
                                    !interactive ||
                                    !selectedCanSiege ||
                                    s.phase !== "economy" ||
                                    protects(s, t) ||
                                    siege?.last === s.players[viewer].turns ||
                                    (raided && sumStock(t.stock) === 0)
                                  }
                                  onClick={() =>
                                    openDialog({
                                      type: "raid",
                                      ids,
                                      town: t.id,
                                    })
                                  }
                                >
                                  {tx(
                                    raided
                                      ? sumStock(t.stock)
                                        ? "Raid again"
                                        : "No new goods to raid"
                                      : "Raid town",
                                  )}
                                </button>
                              ) : (
                                <ActionButton
                                  game={s}
                                  command={{ type: "siege", ids, town: t.id }}
                                  onAction={onAction}
                                  disabled={!interactive}
                                >
                                  {tx(siege ? "Continue siege" : "Begin siege")}
                                </ActionButton>
                              ),
                            )}
                          </div>
                        );
                      }),
                  )}
                  {tx(
                    !actingNaval &&
                      [
                        ...(mine.some(
                          (u) => !u.naval && u.seasonStatus === "adrift",
                        )
                          ? [tile]
                          : []),
                        ...neighbors(tile),
                      ]
                        .filter(
                          (w) =>
                            canOccupy(s.tiles[w], true) &&
                            piecesAt(s, w, true).some(
                              (u) =>
                                u.owner === viewer &&
                                ready(s, u) &&
                                u.moved === 0 &&
                                shipStats(u.kind as ShipClass, u.tier)
                                  .capacity > 0,
                            ),
                        )
                        .map((w) => (
                          <button
                            key={w}
                            className="secondary full"
                            disabled={!interactive || s.phase !== "economy"}
                            onClick={() =>
                              openDialog({
                                type: "transport",
                                land: tile,
                                water: w,
                                unload: false,
                              })
                            }
                          >
                            <Anchor size={16} />
                            {tx("Embark on fleet at ")}
                            {tx(w)}
                          </button>
                        )),
                  )}
                  {tx(
                    actingNaval && (
                      <>
                        <button
                          className="secondary full"
                          disabled={!interactive || s.phase !== "economy"}
                          onClick={() =>
                            openDialog({
                              type: "transport",
                              land: "",
                              water: tile,
                              unload: true,
                            })
                          }
                        >
                          {tx("Disembark passengers")}
                        </button>
                        <SectionTitle>{tx("Passengers")}</SectionTitle>
                        {tx(
                          Object.values(s.pieces)
                            .filter(
                              (u) =>
                                u.carrier &&
                                units.some((v) => v.id === u.carrier),
                            )
                            .map((u) => (
                              <div className="passenger" key={u.id}>
                                <UnitSymbol kind={u.kind} tier={u.tier} />
                                {tx(unitName(u))}
                                <small>
                                  {tx("on ")}
                                  {tx(unitName(s.pieces[u.carrier!]))}
                                </small>
                              </div>
                            )),
                        )}
                      </>
                    ),
                  )}
                  {tx(
                    Object.values(s.routes)
                      .filter(
                        (r) =>
                          s.edges[r.edge].tiles.includes(tile) &&
                          (r.kind === "route") === actingNaval,
                      )
                      .map((r) => (
                        <ActionButton
                          key={r.id}
                          game={s}
                          command={{ type: "destroy-route", ids, edge: r.edge }}
                          disabled={!interactive}
                          onAction={(c) =>
                            openDialog({
                              type: "confirm",
                              title: `Destroy this ${r.kind === "road" ? "road" : "shipping route"}?`,
                              text: Object.keys(r.camps).length
                                ? "Costs 1 movement point per unit. All linked camps will also be destroyed."
                                : "Costs 1 movement point per unit. The force can keep acting with its remaining points.",
                              command: c,
                            })
                          }
                        >
                          {tx("Destroy ")}
                          {s.players[r.owner].name}
                          {tx(" ")}
                          {tx(r.kind === "road" ? "road" : "route")}
                          {tx(Object.keys(r.camps).length ? " + camps" : "")}
                        </ActionButton>
                      )),
                  )}
                </>
              ),
            )}
            <details className="army-composition">
              <summary>
                {tx("Individual units · ")}
                {tx(units.length)}
                {tx(" pieces · ")}
                {tx(unitIds.length)}
                {tx(" ")}
                {tx("selected")}
              </summary>
              <div className="unit-list">
                {tx(
                  units.map((u) => (
                    <label className="unit-choice" key={u.id}>
                      <input
                        type="checkbox"
                        checked={unitIds.includes(u.id)}
                        disabled={u.owner !== viewer}
                        onChange={(e) =>
                          setUnitIds(
                            e.target.checked
                              ? [
                                  ...unitIds.filter(
                                    (id) => s.pieces[id]?.naval === u.naval,
                                  ),
                                  u.id,
                                ]
                              : unitIds.filter((id) => id !== u.id),
                          )
                        }
                      />
                      <UnitPortrait unit={u} />
                      <span>
                        <b>{tx(unitName(u))}</b>
                        <small style={{ color: COLORSafe(s, u.owner) }}>
                          {s.players[u.owner].name} · {tx(points(u))}
                          {tx(" power")}
                          {tx(
                            u.seasonStatus === "icebound"
                              ? " · icebound"
                              : u.seasonStatus === "adrift"
                                ? " · adrift"
                                : u.carrier
                                  ? " · aboard"
                                  : u.born >= s.players[u.owner].turns
                                    ? " · new"
                                    : u.acted
                                      ? " · spent"
                                      : u.moved
                                        ? ` · moved ${u.moved}`
                                        : " · ready",
                          )}
                        </small>
                      </span>
                    </label>
                  )),
                )}
              </div>
            </details>
            <HarvestPanel
              game={s}
              viewer={viewer}
              interactive={interactive}
              onAction={onAction}
              units={units}
            />
          </>
        ) : (
          !town && (
            <Empty>
              {tx(
                "Select an army on the map to command it, or select your town to recruit.",
              )}
            </Empty>
          )
        ),
      )}
      <details className="realm-roster">
        <summary>
          {tx("All armies & fleets · ")}
          {tx(ownPieces(s, viewer).length)}
          {tx(" pieces")}
        </summary>
        <p className="muted">
          {tx(ownPieces(s, viewer).length)}
          {tx(" military pieces. Recruitment is a one-time investment.")}
        </p>
        {tx(
          [
            ...new Set(
              ownPieces(s, viewer)
                .filter((u) => !u.carrier)
                .map((u) => u.tile),
            ),
          ].map((id) => {
            const group = piecesAt(s, id).filter((u) => u.owner === viewer);
            return (
              <button
                className="list-button"
                key={id}
                onClick={() => {
                  onSelect({ type: "tile", id });
                  setUnitIds(selectReadyForce(s, group));
                }}
              >
                <span className="stack-symbols">
                  {tx(
                    [...new Set(group.map((u) => u.kind))].map((kind) => (
                      <UnitSymbol key={kind} kind={kind} />
                    )),
                  )}
                </span>
                <span>
                  {tx(group.length)} {tx(group[0].naval ? "ships" : "units")} ·{" "}
                  {tx(id)}
                </span>
                <ChevronRight size={14} />
              </button>
            );
          }),
        )}
      </details>
    </div>
  );
}
function COLORSafe(s: Game, owner: number) {
  return ["#94521f", "#246b73", "#735086", "#746316"][owner];
}
function TradePanel({
  game: s,
  viewer,
  interactive,
  onAction,
  openDialog,
}: Props) {
  useLocale();

  const [give, setGive] = useState<Good>(
      () =>
        [...GOODS].sort(
          (a, b) =>
            (inventory(s, viewer)[b] ?? 0) - (inventory(s, viewer)[a] ?? 0),
        )[0],
    ),
    [take, setTake] = useState<Good>(give === "ore" ? "lumber" : "ore"),
    [count, setCount] = useState(1);
  const rate = bankRate(s, give, take, viewer),
    receiveCount = rate < 1 ? count * 2 : count,
    giveCount = rate * receiveCount,
    stock = inventory(s, viewer);
  return (
    <div className="panel-content" tabIndex={0}>
      <SectionTitle>{tx("Trade with the bank")}</SectionTitle>
      <p className="muted">
        {tx(
          "Imports remain available even when a resource is missing from the world.",
        )}
      </p>
      <label className="field">
        {tx("Give")}
        <select
          aria-label={tx("Give goods")}
          value={give}
          onChange={(e) => setGive(e.target.value as Good)}
        >
          {tx(
            [...GOODS]
              .sort((a, b) => (stock[b] ?? 0) - (stock[a] ?? 0))
              .map((g) => (
                <option value={g} key={g}>
                  {tx(GOOD_INFO[g].name)} · {tx(stock[g] ?? 0)}
                  {tx(" held")}
                </option>
              )),
          )}
        </select>
      </label>
      <div className="trade-rate">
        <span>
          {tx(rate < 1 ? 1 : rate)} × <GoodIcon good={give} />
        </span>
        <ArrowRight size={20} />
        <span>
          {tx(rate < 1 ? 2 : 1)} × <GoodIcon good={take} />
        </span>
      </div>
      <label className="field">
        {tx("Receive")}
        <select
          aria-label={tx("Receive goods")}
          value={take}
          onChange={(e) => setTake(e.target.value as Good)}
        >
          {tx(
            GOODS.map((g) => (
              <option value={g} key={g}>
                {tx(GOOD_INFO[g].name)}
              </option>
            )),
          )}
        </select>
      </label>
      <label className="field">
        {tx(
          rate < 1
            ? "Pairs to receive (2 goods per Gold bar)"
            : "How many to receive",
        )}
        <input
          type="number"
          min={1}
          max={1000}
          value={count}
          onChange={(e) =>
            setCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))
          }
        />
      </label>
      <ActionButton
        game={s}
        command={{
          type: "bank",
          give: { [give]: giveCount },
          take: { [take]: receiveCount },
        }}
        onAction={onAction}
        disabled={!interactive}
      >
        {tx("Exchange ")}
        {tx(giveCount)} {tx(GOOD_INFO[give].name)}
        {tx(" for ")}
        {tx(receiveCount)}
        {tx(" ")}
        {tx(GOOD_INFO[take].name)}
      </ActionButton>
      <SectionTitle>{tx("Trade with a player")}</SectionTitle>
      <p className="muted">
        {tx(
          "Offer any mixture of raw and processed goods. The other player decides whether to accept.",
        )}
      </p>
      <button
        className="secondary full"
        disabled={!interactive || s.phase !== "economy"}
        onClick={() => openDialog({ type: "trade-compose" })}
      >
        <ArrowLeftRight size={17} />
        {tx("Compose a trade offer")}
      </button>
      <details className="inventory-details">
        <summary>{tx("All stored goods")}</summary>
        <GoodsList stock={stock} />
      </details>
    </div>
  );
}
function ResearchPanel({
  privateHandVisible = true,
  game: s,
  viewer,
  interactive,
  onAction,
  openDialog,
}: Props) {
  useLocale();

  const p = s.players[viewer];
  return (
    <div className="panel-content" tabIndex={0}>
      <SectionTitle>{tx("Research across the realms")}</SectionTitle>
      <p className="muted small">
        {tx("Cards held are public. Rivals’ card identities stay private.")}
      </p>
      <div
        className="research-intelligence"
        aria-label={tx("Faction research counts")}
      >
        {tx(
          s.players.map((realm) => (
            <div key={realm.id} data-testid={`research-count-${realm.id}`}>
              <span className="realm-dot" style={{ background: realm.color }} />
              <span>
                {tx(realm.name)}
                <small>
                  {tx(
                    !realm.alive
                      ? "Eliminated"
                      : realm.researchBought
                        ? "Bought this turn"
                        : "Research in hand",
                  )}
                </small>
              </span>
              <b>{tx(researchCount(s, realm.id))}</b>
              <ScrollText size={16} />
            </div>
          )),
        )}
      </div>
      {tx(
        privateHandVisible &&
          (p.bonuses.routes > 0 ||
            p.bonuses.recruits.length > 0 ||
            p.bonuses.ships.length > 0 ||
            p.bonuses.discount ||
            p.bonuses.expedition) && (
            <aside
              className="notice"
              aria-label={tx("Active research rewards")}
            >
              <b>{tx("Use before ending this turn")}</b>
              {tx(
                p.bonuses.routes > 0 && (
                  <p>
                    {tx(p.bonuses.routes)}
                    {tx(" free roads or ship routes · Build panel")}
                  </p>
                ),
              )}
              {tx(
                p.bonuses.recruits.length > 0 && (
                  <p>
                    {tx("Free recruits:")}
                    {tx(" ")}
                    {tx(
                      p.bonuses.recruits
                        .map((r) => `tier ${ROMAN[r.tier]}`)
                        .join(", "),
                    )}
                    {tx(" ")}
                    {tx("· Forces panel")}
                  </p>
                ),
              )}
              {tx(
                p.bonuses.ships.length > 0 && (
                  <p>
                    {tx(
                      p.bonuses.ships
                        .map(
                          (_, i) =>
                            `free tier ${ROMAN[p.bonuses.shipTiers?.[i] ?? p.bonuses.shipTier ?? 1]} ship`,
                        )
                        .join(", "),
                    )}
                    {tx(" ")}
                    {tx("· Forces panel")}
                  </p>
                ),
              )}
              {tx(
                [p.bonuses.discount, ...(p.bonuses.discounts ?? [])]
                  .filter((d) => d !== undefined)
                  .map((discount, i) => (
                    <p key={i}>
                      {tx("Next")}
                      {tx(" ")}
                      {tx(
                        discount.kind === "industry"
                          ? "extension"
                          : "city or wall",
                      )}
                      {tx(": up to ")}
                      {tx(discount.raw)}
                      {tx(" raw and ")}
                      {tx(discount.processed)}
                      {tx(" processed goods waived · Build panel")}
                    </p>
                  )),
              )}
              {tx(
                p.bonuses.expedition && (
                  <p>
                    {tx("Free tier ")}
                    {tx(ROMAN[p.bonuses.expeditionTier ?? 2])}
                    {tx(" expedition · Explore panel")}
                  </p>
                ),
              )}
            </aside>
          ),
      )}
      {tx(
        p.hand.length > 0 && (
          <>
            <SectionTitle>
              {tx("Your research ")}
              <span className="count">{tx(p.hand.length)}</span>
            </SectionTitle>
            {tx(
              !privateHandVisible && (
                <Empty>
                  {tx(
                    "Research cards are private. They will be revealed on your turn.",
                  )}
                </Empty>
              ),
            )}
            {tx(
              privateHandVisible &&
                p.hand.map((c) => (
                  <article className="hand-card" key={c.id}>
                    <ResearchArt kind={c.kind} />
                    <small>
                      {tx("TIER ")}
                      {tx(ROMAN[c.tier])}
                    </small>
                    <h3>{tx(CARDS[c.kind].name)}</h3>
                    <p>{tx(CARDS[c.kind].text)}</p>
                    <button
                      className="secondary full"
                      disabled={
                        !interactive ||
                        !["roll", "economy", "military"].includes(s.phase)
                      }
                      onClick={() =>
                        openDialog({ type: "research", cardId: c.id })
                      }
                    >
                      {tx("Play card")}
                    </button>
                  </article>
                )),
            )}
          </>
        ),
      )}
      <SectionTitle>{tx("Fund a discovery")}</SectionTitle>
      <p className="muted">
        {tx(
          "Choose one of two distinct random discoveries. Buy and play any number of cards each turn. New cards can be played immediately.",
        )}
      </p>
      <div className="research-catalogue">
        {tx(
          [1, 2, 3, 4].map((tier) => (
            <div className="research-tier" key={tier}>
              <div>
                <ScrollText size={20} />
                <b>{tx(RESEARCH_NAMES[tier])}</b>
                <span>{tx("8 equally likely cards")}</span>
              </div>
              <p className="muted small">
                {tx(
                  tier === 1
                    ? "Settlement · practical expansion and early armies"
                    : tier === 2
                      ? "City I · specialists, workshops and tier-II ships"
                      : tier === 3
                        ? "City II · industry, veterans and siege engineering"
                        : "City III · masterworks, elite forces and great expeditions",
                )}
              </p>
              <details className="research-preview">
                <summary>{tx("Eight card effects")}</summary>
                {tx(
                  Object.entries(CARDS)
                    .filter(([, c]) => c.tier === tier)
                    .map(([key, c]) => (
                      <p key={key}>
                        <b>{tx(c.name)}</b>
                        <br />
                        {tx(c.text)}
                      </p>
                    )),
                )}
              </details>
              <ActionButton
                game={s}
                command={{ type: "buy-research", tier }}
                onAction={onAction}
                cost={COSTS[`Research ${RESEARCH_NAMES[tier]}`]}
                disabled={!interactive}
              >
                {tx(`Fund tier ${ROMAN[tier]} research`)}
              </ActionButton>
            </div>
          )),
        )}
      </div>
    </div>
  );
}
function ExplorePanel({
  game: s,
  selection,
  viewer,
  interactive,
  onAction,
  onPreview,
}: Props) {
  useLocale();

  const [kind, setKind] = useState<"land" | "sea">(
      selection?.type === "tile" && canOccupy(s.tiles[selection.id], true)
        ? "sea"
        : "land",
    ),
    [tier, setTier] = useState(1),
    [vertex, setVertex] = useState(""),
    [direction, setDirection] = useState(0);
  const sites = expeditionSites(s, kind, viewer),
    selectedSite =
      selection?.type === "vertex"
        ? selection.id
        : selection?.type === "tile"
          ? s.tiles[selection.id]?.vertices.find((v) => sites.includes(v))
          : undefined,
    anchor = sites.includes(vertex)
      ? vertex
      : selectedSite && sites.includes(selectedSite)
        ? selectedSite
        : (sites[0] ?? ""),
    preview = anchor ? expeditionFootprint(s, anchor, tier, direction) : [];
  return (
    <div className="panel-content" tabIndex={0}>
      <SectionTitle>{tx("Beyond the known world")}</SectionTitle>
      <p className="muted">
        {tx(
          "Reveal terrain from a frontier town, route, army or fleet. Climate determines the land, water and resource probabilities. No resource is guaranteed.",
        )}
      </p>
      <div className="segmented">
        <button
          className={kind === "land" ? "active" : ""}
          onClick={() => {
            setKind("land");
            onPreview([]);
          }}
        >
          {tx("Land")}
        </button>
        <button
          className={kind === "sea" ? "active" : ""}
          onClick={() => {
            setKind("sea");
            onPreview([]);
          }}
        >
          {tx("Sea")}
        </button>
      </div>
      <label className="field">
        {tx("Expedition size")}
        <select
          value={tier}
          onChange={(e) => {
            setTier(Number(e.target.value));
            onPreview([]);
          }}
        >
          <option value={1}>{tx("Reconnaissance · 10 hexes")}</option>
          <option value={2}>{tx("Survey · 20 hexes")}</option>
          <option value={3}>{tx("Great Expedition · 40 hexes")}</option>
        </select>
      </label>
      <label className="field">
        {tx("Launch point")}
        <select
          value={anchor}
          onChange={(e) => {
            setVertex(e.target.value);
            onPreview([]);
          }}
        >
          {tx(
            !sites.length && (
              <option value="">{tx("No eligible frontier")}</option>
            ),
          )}
          {tx(
            sites.map((v) => (
              <option key={v} value={v}>
                {tx(
                  townAt(s, v)?.name ??
                    (() => {
                      const unit = ownPieces(s, viewer).find(
                        (u) =>
                          !u.carrier &&
                          u.born < s.players[viewer].turns &&
                          u.naval === (kind === "sea") &&
                          s.tiles[u.tile].vertices.includes(v),
                      );
                      return unit
                        ? `${unit.naval ? "Fleet" : "Army"} at ${unit.tile} · frontier ${v}`
                        : `Route endpoint ${v}`;
                    })(),
                )}
              </option>
            )),
          )}
        </select>
      </label>
      <p className="muted">
        {tx(
          "Units and ships can launch after moving, from their next owner turn after recruitment. Embarked troops cannot launch land expeditions. No movement is spent; the normal one-expedition-per-turn limit applies.",
        )}
      </p>
      <label className="field">
        {tx("Outward direction")}
        <select
          value={direction}
          onChange={(e) => {
            setDirection(Number(e.target.value));
            onPreview([]);
          }}
        >
          {tx(
            [
              "East",
              "Southeast",
              "Southwest",
              "West",
              "Northwest",
              "Northeast",
            ].map((v, i) => (
              <option key={v} value={i}>
                {tx(v)}
              </option>
            )),
          )}
        </select>
      </label>
      <button
        className="secondary full"
        disabled={!preview.length}
        onClick={() => onPreview(preview)}
      >
        <Compass size={16} />
        {tx("Preview expedition footprint")}
      </button>
      <ActionButton
        game={s}
        command={{ type: "expedition", vertex: anchor, tier, kind, direction }}
        onAction={(c) => {
          onAction(c);
          onPreview([]);
        }}
        cost={effectiveCost(s, expeditionCost(kind, tier), `expedition${tier}`)}
        disabled={!interactive}
      >
        {tx("Launch expedition")}
      </ActionButton>
      <p className="notice">
        {tx(
          "Neighboring climates tend to continue into the frontier. Finding a resource does not connect it to your economy.",
        )}
      </p>
      <SectionTitle>{tx("World census")}</SectionTitle>
      <div className="world-census">
        {tx(
          RAW.map((g) => (
            <span key={g} data-testid={`census-${g}`}>
              <GoodIcon good={g} />
              {tx(GOOD_INFO[g].name)}
              <b>
                {tx(
                  Object.values(s.tiles).filter((t) =>
                    tileOptions(t).includes(g),
                  ).length,
                )}
              </b>
            </span>
          )),
        )}
        <span data-testid="census-water">
          <Anchor size={15} />
          {tx("Water")}
          <b>
            {tx(
              Object.values(s.tiles).filter((t) => t.resource === "water")
                .length,
            )}
          </b>
        </span>
      </div>
      <p className="muted">
        {tx(
          "Oil counts Whale grounds only. Fish and Whale grounds are included in the water total. Hides counts include Whale grounds.",
        )}
      </p>
    </div>
  );
}
