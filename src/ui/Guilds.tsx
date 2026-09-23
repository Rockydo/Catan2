import { tileOptions } from "../game/maritime";
import { extractionGoods } from "../game/guilds";
import { localize as tx, useLocale } from "../i18n";
import { MapSprite } from "./MapSprite";
import { memo, useState } from "react";
import {
  Pickaxe,
  Anvil,
  Scale,
  Swords,
  ShipWheel,
  ChevronDown,
  Wheat,
  Axe,
  Wrench,
  Construction,
  BookOpen,
} from "lucide-react";
import type {
  Command,
  Game,
  Good,
  GuildKind,
  GuildOrder,
  Raw,
  Town,
} from "../game/types";
import { RAW } from "../game/types";
import { GOOD_INFO, ROMAN } from "../game/content";
import {
  GUILDS,
  GUILD_KINDS,
  TRADE_RAW,
  TRADE_PROCESSED,
  economicGuild,
  guildCost,
  guildOrderQuote,
  guildPlacementError,
  guildReadyError,
  guildTierUsed,
  guildStandingOrders,
  guildUnits,
  mineralTiles,
  townGuilds,
  guildCapacity,
  extractionGuild,
  extractionTiles,
  automatableGuild,
  orderCommand,
} from "../game/guilds";
import { inventory, points } from "../game/selectors";
import { ActionButton, Cost, GoodsList, SectionTitle } from "./components";
import type { DialogSpec } from "./Panels";
const EMBLEMS = {
  prospectors: Pickaxe,
  artisans: Anvil,
  merchants: Scale,
  commanders: Swords,
  navigators: ShipWheel,
  farmers: Wheat,
  extractors: Axe,
  engineers: Wrench,
  builders: Construction,
  scholars: BookOpen,
};
export const GuildCrest = memo(function GuildCrest({
  kind,
  tier = 0,
  size = 38,
}: {
  kind: GuildKind;
  tier?: number;
  size?: number;
}) {
  useLocale();

  const Icon = EMBLEMS[kind];
  return (
    <svg
      width={size}
      height={size * 1.14}
      viewBox="0 0 48 55"
      role="img"
      aria-label={tx(`${GUILDS[kind].name}${tier ? ` ${ROMAN[tier]}` : ""}`)}
    >
      <path
        d="M4 5L24 1L44 5V30Q43 43 24 53Q5 43 4 30Z"
        fill={GUILDS[kind].color}
        stroke="#c6a660"
        strokeWidth="2"
      />
      <path
        d="M8 9L24 6L40 9V29Q39 39 24 47Q9 39 8 29Z"
        fill="none"
        stroke="#f1dca2"
        strokeOpacity=".35"
      />
      <Icon
        x={12}
        y={12}
        width={24}
        height={24}
        color="#fff1c9"
        strokeWidth={1.8}
      />
      {tx(
        [0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={18 + i * 6}
            cy={41}
            r={1.6}
            fill={i < tier ? "#ffe5a1" : "#ffffff35"}
          />
        )),
      )}
    </svg>
  );
});
/** The map repeats these crests across cities. Keep their accessible names live
 * while sharing the decorative vectors; panel artwork remains unchanged. */
export const MapGuildCrest = memo(function MapGuildCrest({
  kind,
  tier,
}: {
  kind: GuildKind;
  tier: number;
}) {
  useLocale();
  return (
    <MapSprite
      assetKey={`guild/${kind}/${tier}`}
      bounds={{ x: 0, y: 0, width: 18, height: 18 * 1.14 }}
      className="guild-miniature-art"
      role="img"
      aria-label={tx(`${GUILDS[kind].name} ${ROMAN[tier]}`)}
    >
      <g aria-hidden="true">
        <GuildCrest kind={kind} tier={tier} size={18} />
      </g>
    </MapSprite>
  );
});
interface Props {
  game: Game;
  town: Town;
  viewer: number;
  interactive: boolean;
  onAction: (c: Command) => void;
  openDialog: (d: DialogSpec) => void;
}
export function GuildPanel(props: Props) {
  useLocale();

  const guilds = townGuilds(props.town),
    capacity = guildCapacity(props.town);
  const [selected, setSelected] = useState<GuildKind | "new">(
    guilds[0]?.kind ?? "new",
  );
  const canAdd = props.viewer === props.town.owner && guilds.length < capacity;
  const kind =
    selected === "new" && canAdd
      ? undefined
      : (guilds.find((g) => g.kind === selected)?.kind ?? guilds[0]?.kind);
  const g = guilds.find((g) => g.kind === kind);
  return (
    <div className="city-guilds">
      {tx(
        (guilds.length > 0 || capacity > 0) && (
          <>
            <div className="guild-slot-heading">
              <b>{tx("City guilds")}</b>
              <span>
                {tx(guilds.length)} / {tx(capacity)}
                {tx(" slots")}
              </span>
            </div>
            <div
              className="guild-tabs"
              role="group"
              aria-label={tx("City guild selector")}
            >
              {tx(
                guilds.map((guild) => (
                  <button
                    key={guild.kind}
                    aria-pressed={kind === guild.kind}
                    onClick={() => setSelected(guild.kind)}
                    title={tx(
                      `${GUILDS[guild.kind].name} ${ROMAN[guild.tier]}`,
                    )}
                  >
                    <GuildCrest kind={guild.kind} tier={guild.tier} size={22} />
                    <span>
                      {tx(GUILDS[guild.kind].name.replace("’ Guild", ""))}
                      {tx(" ")}
                      {tx(ROMAN[guild.tier])}
                    </span>
                  </button>
                )),
              )}
              {tx(
                canAdd && (
                  <button aria-pressed={!g} onClick={() => setSelected("new")}>
                    {tx("+ Add guild")}
                  </button>
                ),
              )}
            </div>
          </>
        ),
      )}
      <SingleGuildPanel
        key={`${props.town.id}:${g?.kind ?? "new"}`}
        {...props}
        town={{ ...props.town, guild: g }}
        onAction={(c) => {
          props.onAction(c);
          if (c.type === "guild" && c.kind) setSelected(c.kind as GuildKind);
        }}
        established={guilds.map((g) => g.kind)}
        slots={capacity}
      />
    </div>
  );
}
function SingleGuildPanel(
  props: Props & { established: GuildKind[]; slots: number },
) {
  useLocale();

  const { game: s, town, viewer, interactive, onAction, openDialog } = props;
  const [choice, setChoice] = useState<GuildKind>(
    !props.established.includes("artisans")
      ? "artisans"
      : (GUILD_KINDS.find((kind) => !props.established.includes(kind)) ??
          "artisans"),
  );
  const owned = town.owner === viewer,
    g = town.guild;
  if (town.level < 2 && !g)
    return (
      <p className="muted small">
        {tx("City I unlocks a guild specialization.")}
      </p>
    );
  return (
    <section
      className="guild-panel"
      aria-label={tx("City guild")}
      data-testid="city-guild"
    >
      <SectionTitle>
        {tx(g ? "Guild orders" : "Choose a specialization")}
      </SectionTitle>
      {tx(
        !g && owned ? (
          <>
            <p className="muted small">
              {tx(
                "City I / II / III supports 1 / 2 / 3 different guilds. Each guild has three tiers and opens next turn.",
              )}
            </p>
            <div className="guild-choices">
              {tx(
                GUILD_KINDS.filter(
                  (kind) => !props.established.includes(kind),
                ).map((kind) => (
                  <button
                    key={kind}
                    className={`guild-choice ${choice === kind ? "selected" : ""}`}
                    aria-pressed={choice === kind}
                    onClick={() => setChoice(kind)}
                  >
                    <GuildCrest kind={kind} size={28} />
                    <span>{tx(GUILDS[kind].name.replace("’ Guild", ""))}</span>
                  </button>
                )),
              )}
            </div>
            <p className="guild-effect">
              <b>{tx(GUILDS[choice].purpose)}</b>
              <br />
              {tx(GUILDS[choice].tiers[0])}
            </p>
            <ActionButton
              game={s}
              command={{ type: "guild", town: town.id, kind: choice }}
              cost={guildCost(choice, 1)}
              onAction={onAction}
              disabled={!interactive}
            >
              {tx("Establish ")}
              {tx(GUILDS[choice].name)}
            </ActionButton>
            {tx(
              guildPlacementError(s, town, choice) && (
                <p className="muted small">
                  {tx(guildPlacementError(s, town, choice))}
                </p>
              ),
            )}
            <GuildProgress kind={choice} />
          </>
        ) : g ? (
          <>
            <div className="guild-heading">
              <GuildCrest kind={g.kind} tier={g.tier} />
              <div>
                <b>
                  {tx(GUILDS[g.kind].name)} {tx(ROMAN[g.tier])}
                </b>
                <small>{tx(GUILDS[g.kind].purpose)}</small>
              </div>
            </div>
            {tx(
              !owned && (
                <p className="guild-effect">
                  {tx(GUILDS[g.kind].tiers[g.tier - 1])}
                </p>
              ),
            )}
            <p className="guild-status" role="status">
              {tx(
                guildReadyError(s, town) ??
                  "One separate order per unlocked tier each turn.",
              )}
            </p>
            {tx(
              owned && (
                <GuildWorkOrder key={`${town.id}:${g.kind}`} {...props} />
              ),
            )}
            <GuildProgress kind={g.kind} />
            {tx(
              owned && (
                <details className="guild-management">
                  <summary>{tx("Upgrade or change guild")}</summary>
                  {tx(
                    g.tier < 3 && (
                      <ActionButton
                        game={s}
                        command={{ type: "guild", town: town.id, kind: g.kind }}
                        cost={guildCost(g.kind, g.tier + 1)}
                        onAction={onAction}
                        disabled={!interactive}
                      >
                        {tx("Upgrade guild to ")}
                        {tx(ROMAN[g.tier + 1])}
                      </ActionButton>
                    ),
                  )}
                  <button
                    className="text-button"
                    disabled={!interactive}
                    onClick={() =>
                      openDialog({
                        type: "confirm",
                        title: `Dissolve ${GUILDS[g.kind].name}?`,
                        text: "All guild tiers are removed with no refund. You can establish another specialization, which opens next turn.",
                        command: {
                          type: "guild-dismantle",
                          town: town.id,
                          guild: g.kind,
                        },
                      })
                    }
                  >
                    {tx("Dissolve guild")}
                  </button>
                </details>
              ),
            )}
            {tx(
              !owned && (
                <p className="muted small">
                  {tx(
                    "Public specialization · siege closes the guild · destruction removes it.",
                  )}
                </p>
              ),
            )}
          </>
        ) : (
          <p className="muted">{tx("No guild established.")}</p>
        ),
      )}
    </section>
  );
}
function GuildProgress({ kind }: { kind: GuildKind }) {
  useLocale();

  return (
    <details className="guild-reference">
      <summary>
        <ChevronDown size={14} />
        {tx(" All three tiers & costs")}
      </summary>
      {tx(
        [1, 2, 3].map((tier) => (
          <div key={tier}>
            <b>
              {tx(ROMAN[tier])}
              {tx(" · City ")}
              {tx(ROMAN[tier])}
            </b>
            <p>{tx(GUILDS[kind].tiers[tier - 1])}</p>
            <Cost cost={guildCost(kind, tier)} />
          </div>
        )),
      )}
    </details>
  );
}
function GuildWorkOrder({ game: s, town, interactive, onAction }: Props) {
  useLocale();

  const g = town.guild!,
    stock = inventory(s, town.owner);
  const [operatingTier, setOperatingTier] = useState(g.order?.tier ?? g.tier);
  const savedOrder = guildStandingOrders(g).find(
    (o) => o.tier === operatingTier,
  );
  const [raw, setRaw] = useState<Raw>(
    g.order?.raw ??
      [...RAW].sort((a, b) => (stock[b] ?? 0) - (stock[a] ?? 0))[0],
  );
  const [give, setGive] = useState<Good>(
    g.order?.give ??
      [...TRADE_RAW].sort((a, b) => (stock[b] ?? 0) - (stock[a] ?? 0))[0],
  );
  const [take, setTake] = useState<Good>(
    g.order?.take ?? (give === "coal" ? "stone" : "coal"),
  );
  const [mine, setMine] = useState(
    g.order?.tile ?? extractionTiles(s, town)[0] ?? "",
  );
  const [formation, setFormation] = useState("");
  const units = guildUnits(s, town).sort((a, b) => points(b) - points(a)),
    tiles = [...new Set(units.map((u) => u.tile))],
    tile = tiles.includes(formation) ? formation : tiles[0],
    local = units.filter((u) => u.tile === tile),
    ids = local.map((u) => u.id);
  const selection: GuildOrder =
    g.kind === "artisans"
      ? { raw }
      : g.kind === "merchants"
        ? { give, take }
        : { tile: mine };
  const order = { ...selection, tier: operatingTier };
  const command: Command = economicGuild(g.kind)
    ? orderCommand(town, order)
    : {
        type: "guild-order",
        town: town.id,
        guild: g.kind,
        ids,
        tier: operatingTier,
      };
  let quote: ReturnType<typeof guildOrderQuote> | undefined;
  let draftError = "";
  try {
    quote = guildOrderQuote(s, town, order, ids);
  } catch (error) {
    draftError =
      error instanceof Error ? error.message : "Choose a valid order.";
  }
  const tradeGoods: readonly Good[] =
    operatingTier === 3 ? [...TRADE_RAW, ...TRADE_PROCESSED] : TRADE_RAW;
  return (
    <div className="guild-order">
      {tx(
        g.tier > 1 && (
          <label className="field">
            {tx("Operating tier")}
            <select
              aria-label={tx("Guild operating tier")}
              value={operatingTier}
              disabled={!interactive}
              onChange={(e) => {
                const tier = Number(e.target.value);
                setOperatingTier(tier);
                if (tier < 3 && !TRADE_RAW.includes(give as Raw)) {
                  setGive("salt");
                  setTake("coal");
                }
                const saved = guildStandingOrders(g).find(
                  (o) => o.tier === tier,
                );
                if (saved?.raw) setRaw(saved.raw);
                if (saved?.tile) setMine(saved.tile);
                if (saved?.give && saved.take) {
                  setGive(saved.give);
                  setTake(saved.take);
                }
              }}
            >
              {tx(
                Array.from({ length: g.tier }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {tx("Tier ")}
                    {tx(ROMAN[i + 1])} ·{tx(" ")}
                    {tx(guildTierUsed(g, i + 1) ? "Completed" : "Available")}
                  </option>
                )),
              )}
            </select>
          </label>
        ),
      )}
      <p className="guild-effect">
        {tx(GUILDS[g.kind].tiers[operatingTier - 1])}
      </p>
      {tx(
        guildTierUsed(g, operatingTier) && (
          <p className="guild-status">
            {tx("Tier ")}
            {tx(ROMAN[operatingTier])}
            {tx(" has completed its order this turn.")}
          </p>
        ),
      )}
      {tx(
        extractionGuild(g.kind) && (
          <label className="field">
            {tx("Deposit")}
            <select
              aria-label={tx("Guild deposit")}
              value={mine}
              disabled={!interactive}
              onChange={(e) => setMine(e.target.value)}
            >
              {tx(
                extractionTiles(s, town, g.kind).map((id) => (
                  <option value={id} key={id}>
                    {tx(
                      GOOD_INFO[
                        tileOptions(s.tiles[id]).find((good) =>
                          extractionGoods(g.kind).includes(good),
                        )!
                      ].name,
                    )}{" "}
                    · {tx(id)}
                  </option>
                )),
              )}
            </select>
          </label>
        ),
      )}
      {tx(
        g.kind === "artisans" && (
          <label className="field">
            {tx("Material")}
            <select
              aria-label={tx("Guild raw material")}
              value={raw}
              disabled={!interactive}
              onChange={(e) => setRaw(e.target.value as Raw)}
            >
              {tx(
                RAW.map((good) => (
                  <option value={good} key={good}>
                    {tx(GOOD_INFO[good].name)} · {tx(stock[good] ?? 0)}
                    {tx(" owned")}
                  </option>
                )),
              )}
            </select>
          </label>
        ),
      )}
      {tx(
        g.kind === "merchants" && (
          <div className="guild-trade-fields">
            <label className="field">
              {tx("Give")}
              <select
                aria-label={tx("Guild contract give")}
                value={give}
                disabled={!interactive}
                onChange={(e) => {
                  const good = e.target.value as Good;
                  setGive(good);
                  const family: readonly Good[] = TRADE_RAW.includes(
                    good as Raw,
                  )
                    ? TRADE_RAW
                    : TRADE_PROCESSED;
                  if (good === take || !family.includes(take))
                    setTake(family.find((v) => v !== good)!);
                }}
              >
                {tx(
                  tradeGoods.map((good) => (
                    <option key={good} value={good}>
                      {tx(GOOD_INFO[good].name)} · {tx(stock[good] ?? 0)}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label className="field">
              {tx("Receive")}
              <select
                aria-label={tx("Guild contract receive")}
                value={take}
                disabled={!interactive}
                onChange={(e) => setTake(e.target.value as Good)}
              >
                {tx(
                  (TRADE_RAW.includes(give as Raw)
                    ? TRADE_RAW
                    : TRADE_PROCESSED
                  )
                    .filter((good) => good !== give)
                    .map((good) => (
                      <option key={good} value={good}>
                        {tx(GOOD_INFO[good].name)}
                      </option>
                    )),
                )}
              </select>
            </label>
          </div>
        ),
      )}
      {tx(
        !economicGuild(g.kind) && (
          <>
            <label className="field">
              {tx("Nearby formation")}
              <select
                aria-label={tx("Guild formation")}
                value={tile ?? ""}
                disabled={!interactive}
                onChange={(e) => {
                  setFormation(e.target.value);
                }}
              >
                {tx(
                  !tiles.length && (
                    <option value="">{tx("No eligible formation")}</option>
                  ),
                )}
                {tx(
                  tiles.map((id) => (
                    <option key={id} value={id}>
                      {tx(g.kind === "navigators" ? "Fleet" : "Army")}
                      {tx(" at ")}
                      {tx(id)}
                    </option>
                  )),
                )}
              </select>
            </label>
            {tx(
              !!local.length && (
                <p className="guild-effect">
                  {tx("Entire ")}
                  {tx(g.kind === "navigators" ? "fleet" : "army")} ·{" "}
                  {tx(ids.length)}
                  {tx(" ")}
                  {tx("eligible ")}
                  {tx(g.kind === "navigators" ? "ships" : "units")}
                  {tx(" · no size limit")}
                </p>
              ),
            )}
            <p className="muted small">
              {tx(
                s.players[town.owner].control === "human"
                  ? "Human combat guilds can stack their separate tier contracts on the same formation. Guild tier I reaches adjacent tiles; tier II reaches one tile farther; tier III reaches two tiles farther. Bonuses affect every eligible unit. New recruits, embarked troops and units that ended their activation are excluded."
                  : "Every eligible unit in the formation receives this guild’s equipment once per turn. New recruits, embarked troops and units that ended their activation are excluded. Spent movement is not refunded; remaining points can fund movement, battles or raids.",
              )}
            </p>
          </>
        ),
      )}
      {tx(
        quote?.routes ? (
          <p className="guild-receive">
            {tx(quote.routes)}
            {tx(" free road or sea-route builds, usable this turn.")}
          </p>
        ) : null,
      )}
      {tx(
        quote?.researchTier ? (
          <p className="guild-receive">
            {tx("Choose one of two random tier-")}
            {tx(ROMAN[quote.researchTier])}
            {tx(" research cards.")}
          </p>
        ) : null,
      )}
      {tx(
        quote?.siege ? (
          <p className="guild-receive">
            +{tx(quote.siege)}
            {tx(
              " siege power for this army until your next turn. Does not stack with another Engineer order.",
            )}
          </p>
        ) : null,
      )}
      {tx(
        quote && Object.keys(quote.gain).length > 0 && (
          <div className="guild-receive">
            <small>{tx("Delivered to this city")}</small>
            <GoodsList stock={quote.gain} />
          </div>
        ),
      )}
      {tx(draftError && <p className="muted small">{tx(draftError)}</p>)}
      <ActionButton
        game={s}
        command={command}
        onAction={onAction}
        cost={quote?.cost}
        exactCost={g.kind === "merchants"}
        disabled={!interactive}
      >
        {tx(
          economicGuild(g.kind)
            ? "Complete guild order"
            : g.kind === "engineers"
              ? "Equip siege tools"
              : "Supply formation",
        )}
      </ActionButton>
      {tx(
        automatableGuild(g.kind) && (
          <label className="guild-auto">
            <input
              type="checkbox"
              checked={!!savedOrder}
              disabled={!interactive || (!savedOrder && !quote)}
              onChange={(e) =>
                onAction({
                  ...orderCommand(town, order),
                  type: "guild-configure",
                  mode: e.target.checked ? "auto" : "manual",
                })
              }
            />
            <span>
              {tx("Standing order for tier ")}
              {tx(ROMAN[operatingTier])}
              {tx(" after my dice roll")}
              <small>
                {tx(
                  "Uses this tier’s saved recipe when affordable. Changing the recipe requires saving it again.",
                )}
              </small>
            </span>
          </label>
        ),
      )}
      {tx(
        savedOrder && automatableGuild(g.kind) && (
          <button
            className="text-button"
            disabled={!interactive || !quote}
            onClick={() =>
              onAction({
                ...orderCommand(town, order),
                type: "guild-configure",
                mode: "auto",
              })
            }
          >
            {tx("Save selected standing order")}
          </button>
        ),
      )}
    </div>
  );
}
