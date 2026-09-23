import { syncEmergencyCoalition } from "./emergency-coalition";
import { copyRecords } from "./record-copy";
import { startThawRetreats, continueThawRetreats } from "./thaw-retreats";
import {
  SEASONS,
  seasonAt,
  seasonLabel,
  seasonYear,
  syncSeasonSurfaces,
} from "./seasons";
import { tileYield } from "./maritime";
import { canChooseWoods } from "./selectors";
import { allianceResponder } from "./relations";
import { tryFrontierReturns } from "./frontier-returns";
import {
  acceptAlliance,
  diplomacyCommand,
  pruneAlliances,
  manageAlliance,
} from "./diplomacy";
import { random } from "./random";
export { random } from "./random";
import { drawResearch } from "./research-draw";
import { tryRebellions } from "./rebellions";
import { townGuilds, guildCommand, standingGuildOrders } from "./guilds";
import { aiExpeditionAllowed, AI_EXPEDITION_RESTRICTION } from "./ai-expansion";
import {
  marineResource,
  tileGoods,
  tileGood,
  productiveAtVertex,
  towerSites,
} from "./maritime";
import { shipCost, shipStats, TOWER_COSTS } from "./content";
import {
  GOODS,
  RAW,
  type Game,
  type Command,
  type Result,
  type PlayerConfig,
  type Stock,
  type UnitClass,
  type ShipClass,
  type Raw,
  type Piece,
} from "./types";
import {
  COLORS,
  NAMES,
  REALM_NAMES,
  COSTS,
  CITY_RECIPES,
  WALL_NAMES,
  CARDS,
  RESEARCH_NAMES,
  UNIT_INFO,
  SHIP_INFO,
  unitCost,
  extensionCost,
  extensionName,
  campCost,
  expeditionCost,
} from "./content";
import {
  canOccupy,
  generateWorld,
  hash,
  randomAt,
  nextRandom,
  landAtVertex,
  waterAtVertex,
  withTerrainRead,
} from "./world";
import { addHexes, expeditionFootprint, neighbors } from "./world";
import {
  withPlanningFrame,
  retainPieceRead,
  withRetainedPieceRead,
  type RetainedPieceRead,
  withSharedPiecePlanningFrame,
  withPieceListPlanningFrame,
  withProductionTerrainRead,
  allPieces,
  ownTowns,
  ownPieces,
  inventory,
  unusedBonuses,
  settlementSites,
  colonizationSites,
  canCompleteSetup,
  canRoute,
  restoreCoastalRoads,
  besieged,
  hostileAt,
  blockAt,
  bankRate,
  movableRoutes,
  expeditionSites,
  effectiveCost,
  affordable,
  sumStock,
} from "./selectors";
import {
  rule,
  validStock,
  spend,
  pay,
  gain,
  addStock,
  log,
  production,
} from "./economy";
import {
  militaryCommand,
  resolveBattle,
  removePieces,
  breakSieges,
} from "./military";
import { playResearch } from "./research";
export function setupOrder(count: number): number[] {
  const seats = Array.from({ length: count }, (_, i) => i);
  return [...seats, ...seats.reverse()];
}
export const SETUP_ORDER = setupOrder(4);
const nextId = (s: Game, prefix: string) => `${prefix}${s.nextId++}`;
export function shuffle(s: Game, values: string[]): string[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random(s, true) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function newGame(
  seed: string,
  config: PlayerConfig[] = REALM_NAMES.slice(0, 5).map((name, i) => ({
    name,
    control: i === 0 ? "human" : "standard",
  })),
): Game {
  rule(
    [4, 5, 8, 10].includes(config.length),
    "Choose five or ten player slots (legacy four/eight saves remain supported).",
  );
  rule(
    typeof seed === "string" && seed.length > 0 && seed.length <= 120,
    "Use a seed between 1 and 120 characters.",
  );
  const s: Game = {
    ...generateWorld(seed, config.length * 25),
    version: 5,
    generation: 5,
    calendar: {
      startRound: 1,
      iceModel: 2,
      roundsPerSeason: 2,
      // A separate seeded draw leaves map generation and dice streams intact.
      startSeason: SEASONS[Math.floor(randomAt(seed, "calendar", "start") * 4)],
    },
    seed,
    rng: hash(seed + "dice"),
    deckRng: hash(seed + "deck"),
    rebellionRng: hash(seed + "rebellions"),
    nextId: 1,
    players: config.map((p, id) => ({
      id,
      name: p.name.trim().slice(0, 30) || REALM_NAMES[id],
      control: p.control,
      color: COLORS[id],
      alive: true,
      turns: 0,
      hand: [],
      researchBought: false,
      researchPlayed: false,
      expeditionUsed: false,
      routeMoved: false,
      bonuses: unusedBonuses(),
    })),
    active: 0,
    phase: "setup-town",
    round: 1,
    setupIndex: 0,
    towns: {},
    towers: {},
    routes: {},
    pieces: {},
    sieges: {},
    dice: null,
    production: {},
    events: [],
    winner: null,
    actions: 0,
  };
  syncSeasonSurfaces(s);
  rule(
    canCompleteSetup(s, config.length * 2),
    `Unstartable seed “${seed}”: this exact map cannot support ${config.length * 2} legal starting settlements. Choose another seed explicitly.`,
  );
  log(
    s,
    "The frontier awaits. Place two settlements and their first routes in snake order.",
  );
  return s;
}
export function beginTurn(s: Game) {
  const p = s.players[s.active];
  p.turns++;
  p.researchBought = false;
  p.researchPurchases = 0;
  p.tradeOffered = false;
  p.diplomacyDone = false;
  p.researchPlayed = false;
  p.expeditionUsed = false;
  p.routeMoved = false;
  p.bonuses = unusedBonuses();
  for (const t of ownTowns(s)) {
    t.turnLevel = t.level;
    t.recruited = 0;
    t.launched = 0;
    for (const g of townGuilds(t)) {
      g.used = false;
      g.usedTiers = [];
    }
  }
  for (const u of ownPieces(s)) {
    u.moved = 0;
    u.acted = false;
    u.bonus = 0;
    delete u.guildSupplied;
    delete u.guildSiege;
  }
  s.phase = "roll";
  s.dice = null;
  log(s, `${p.name} begins turn ${p.turns}.`, "info", p.id);
  tryRebellions(s);
}
function nextTurn(s: Game) {
  for (const [id, x] of Object.entries(s.towerSieges ?? {}))
    if (x.owner === s.active && x.last < s.players[s.active].turns)
      delete s.towerSieges![id];
  for (const [id, x] of Object.entries(s.sieges))
    if (x.owner === s.active && x.last < s.players[s.active].turns)
      delete s.sieges[id];
  const old = s.active;
  let previousIce: string[] | undefined;
  do {
    s.active = (s.active + 1) % s.players.length;
  } while (!s.players[s.active].alive);
  if (s.active <= old) {
    previousIce = Object.values(s.tiles)
      .filter((tile) => tile.surface === "frozen")
      .map((tile) => tile.id);
    s.round++;
    syncSeasonSurfaces(s);
    const season = seasonAt(s);
    if (season)
      log(s, `Year ${seasonYear(s)}: ${seasonLabel(s)} begins.`, "info");
  }
  beginTurn(s);
  if (previousIce) startThawRetreats(s, previousIce);
}
export function eliminate(s: Game) {
  if (s.phase.startsWith("setup")) return;
  for (const p of s.players)
    if (p.alive && !ownTowns(s, p.id).length) {
      p.alive = false;
      p.hand = [];
      for (const [id, r] of Object.entries(s.routes))
        if (r.owner === p.id) delete s.routes[id];
      for (const [id, u] of Object.entries(s.pieces))
        if (u.owner === p.id) delete s.pieces[id];
      for (const [id, tower] of Object.entries(s.towers))
        if (tower.owner === p.id) delete s.towers[id];
      for (const [id, x] of Object.entries(s.sieges))
        if (x.owner === p.id || !s.towns[x.town]) delete s.sieges[id];
      for (const [id, x] of Object.entries(s.towerSieges ?? {}))
        if (x.owner === p.id || !s.towers[x.vertex]) delete s.towerSieges![id];
      log(s, `${p.name} has been eliminated.`, "battle", p.id);
    }
  pruneAlliances(s);
  const alive = s.players.filter((p) => p.alive);
  if (alive.length === 1) {
    s.winner = alive[0].id;
    s.phase = "finished";
    log(
      s,
      `${alive[0].name} rules the frontier. Victory!`,
      "battle",
      alive[0].id,
    );
  }
}
function townOwned(s: Game, id: string | undefined) {
  const town = s.towns[id ?? ""];
  rule(town && town.owner === s.active, "Choose an owned town.");
  rule(
    !besieged(s, town.id),
    "Break the siege before building or recruiting here.",
  );
  return town;
}
function createTown(s: Game, vertex: string, setup = false) {
  const id = nextId(s, "t"),
    p = s.players[s.active];
  const t = (s.towns[id] = {
    id,
    owner: s.active,
    vertex,
    name: `${p.name.split(" ")[0]} ${ownTowns(s).length + 1}`,
    level: 1,
    wall: 0,
    stock: {},
    extensions: {},
    born: p.turns,
    turnLevel: setup ? 1 : 0,
    recruited: 0,
    launched: 0,
  });
  return t;
}
function buildRoute(
  s: Game,
  edge: string,
  kind: "road" | "route",
  free = false,
) {
  rule(
    canRoute(s, edge, kind),
    "This route must connect to your own road, sea route or town, and cannot cross an enemy position.",
  );
  if (!free)
    pay(s, COSTS[kind === "road" ? "Road" : "Seafarers route ship"], kind);
  s.routes[edge] = {
    id: nextId(s, "r"),
    owner: s.active,
    edge,
    kind,
    camps: {},
    born: s.players[s.active].turns,
  };
}
function payload(c: Command) {
  rule(
    c && typeof c === "object" && typeof c.type === "string",
    "Invalid command.",
  );
  for (const key of ["goods", "give", "take"] as const)
    if (c[key] !== undefined) validStock(c[key], true);
  for (const key of ["ids", "keep", "ships", "siegeIds"] as const)
    if (c[key] !== undefined)
      rule(
        Array.isArray(c[key]) &&
          c[key]!.length <= 10000 &&
          c[key]!.every((v) => typeof v === "string"),
        "Invalid unit selection.",
      );
  for (const key of [
    "tier",
    "actor",
    "index",
    "partner",
    "direction",
    "count",
  ] as const)
    if (c[key] !== undefined)
      rule(
        Number.isSafeInteger(c[key]) && c[key]! >= 0,
        "Choose a valid whole-number option.",
      );
}

export function applyCommand(state: Game, c: Command): Result {
  return commandResult(state, c, false);
}
// These orders edit only selected troops and campaign records, never terrain
// or unselected troops. Elimination deletes keys from the private piece map.
const LOCAL_MILITARY_COMMANDS = new Set([
  "siege",
  "destroy-town",
  "destroy-tower",
  "destroy-route",
  "hold",
  "load",
  "unload",
  "colonize",
]);
// These orders cannot edit, add or remove troops. Final cleanup may still
// eliminate a faction, so sharing the whole dictionary needs a separate check.
const STATIONARY_RECORD_COMMANDS = new Set([
  "bank",
  "road",
  "route",
  "settlement",
  "city",
  "wall",
  "extension",
  "camp",
  "tower",
  "guild",
]);
const LOCAL_RECORD_COMMANDS = new Set([
  ...STATIONARY_RECORD_COMMANDS,
  "recruit",
  "ship",
  "guild-order",
  ...LOCAL_MILITARY_COMMANDS,
]);
function preservesTroopRecords(c: Command): boolean {
  return (
    STATIONARY_RECORD_COMMANDS.has(c.type) ||
    (c.type === "guild-order" && !c.ids?.length)
  );
}
function survivingFactionsHaveTowns(s: Game): boolean {
  const owners = new Set(Object.values(s.towns).map((town) => town.owner));
  return s.players.every((player) => !player.alive || owners.has(player.id));
}
/** Only an uncontested move can share stationary troops. Combat may displace
 * defenders, rescue passengers or trigger other mutations, so it keeps the
 * fully isolated transaction. Validation still runs through militaryCommand. */
export function peacefulMove(s: Game, c: Command): boolean {
  const first = s.pieces[c.ids?.[0] ?? ""];
  return (
    c.type === "move" &&
    !!first &&
    !!c.to &&
    !hostileAt(s, c.to, first.owner, first.naval)
  );
}
function detachMovingPieces(
  original: Game,
  draft: Game,
  command: Command,
  units?: readonly Piece[],
): readonly Piece[] | undefined {
  let replaced = false;
  const carriers = new Set<string>();
  for (const id of command.ids ?? []) {
    const unit = draft.pieces[id];
    if (!unit) continue;
    if (unit.naval) carriers.add(id);
    if (unit === original.pieces[id]) {
      draft.pieces[id] = { ...unit };
      replaced = true;
    }
  }
  if (carriers.size)
    for (const unit of units ?? Object.values(draft.pieces))
      if (
        unit.carrier &&
        carriers.has(unit.carrier) &&
        unit === original.pieces[unit.id]
      ) {
        draft.pieces[unit.id] = { ...unit };
        replaced = true;
      }
  // Only references to copied records change. Membership and dictionary order
  // are unchanged between the planner read and this uncontested move.
  return replaced ? units?.map((unit) => draft.pieces[unit.id]) : units;
}
function detachMilitaryPieces(original: Game, draft: Game, command: Command) {
  const ids = new Set([...(command.ids ?? []), ...(command.ships ?? [])]);
  if (command.type === "unload" && command.ids === undefined) {
    const carriers = new Set(command.ships);
    for (const unit of allPieces(draft))
      if (unit.carrier && carriers.has(unit.carrier)) ids.add(unit.id);
  }
  for (const id of ids) {
    const unit = draft.pieces[id];
    if (unit && unit === original.pieces[id]) draft.pieces[id] = { ...unit };
  }
}
/** Supply IDs name a whole formation. Copy every friendly unit on that tile,
 * including unlisted soldiers, before its movement or siege bonuses change.
 * Economic guild orders have no selected formation and edit no troop records. */
function detachSuppliedPieces(
  original: Game,
  draft: Game,
  command: Command,
  units?: readonly Piece[],
) {
  const tile = draft.pieces[command.ids?.[0] ?? ""]?.tile;
  if (!tile) return;
  for (const unit of units ?? allPieces(draft))
    if (
      unit.owner === draft.active &&
      unit.tile === tile &&
      unit === original.pieces[unit.id]
    )
      draft.pieces[unit.id] = { ...unit };
}
/** Plan and execute a private sequence with one copy of the campaign. Each
 * decision sees the preceding order's complete result, including coalitions.
 * The draft never escapes on failure and the caller's campaign stays intact.
 * Views are temporary: the planner must not retain them after it returns. */
export function applyCommandPlan(
  state: Game,
  choose: (view: Game, commands: readonly Command[]) => Command | undefined,
): Result & { commands: Command[] } {
  // The input terrain is never edited: routine commands share it read-only,
  // and other orders detach it before execution. Mutable detached terrain does
  // not match this scope and must always rebuild its production fingerprint.
  return withProductionTerrainRead(state.tiles, () =>
    withTerrainRead(state.tiles, () => commandPlan(state, choose)),
  );
}
function commandPlan(
  state: Game,
  choose: (view: Game, commands: readonly Command[]) => Command | undefined,
): Result & { commands: Command[] } {
  const commands: Command[] = [];
  try {
    // Routine purchases edit stores/buildings and add soldiers. Guild supply
    // and local military orders copy affected troops below. Other commands
    // detach remaining soldiers and terrain, including unknown future types.
    let detached = false;
    let view: Game = {
      ...structuredClone({
        ...state,
        tiles: undefined,
        vertices: undefined,
        edges: undefined,
        climatePlan: undefined,
        pieces: undefined,
      }),
      tiles: state.tiles,
      vertices: state.vertices,
      edges: state.edges,
      climatePlan: state.climatePlan,
      pieces: copyRecords(state.pieces),
    };
    const select = (sharePieces = false) => {
      // Selection, batch boundaries and copy-on-write classification inspect
      // the same unmodified position. Share its index, then close the scope
      // before executing anything on the private draft.
      const frame = sharePieces
        ? withSharedPiecePlanningFrame
        : withPlanningFrame;
      return frame(view, () => {
        const command = choose(view, commands);
        if (command) payload(command);
        const moving =
          !!command &&
          !detached &&
          !LOCAL_RECORD_COMMANDS.has(command.type) &&
          peacefulMove(view, command);
        return {
          command,
          moving,
          retained:
            command && (preservesTroopRecords(command) || moving)
              ? retainPieceRead(view)
              : undefined,
          // Reuse the planner's troop list when copy-on-write detaches a
          // supplied formation. The read scope closes before any edits.
          units:
            moving ||
            (!detached &&
              command?.type === "guild-order" &&
              command.ids?.length)
              ? allPieces(view)
              : undefined,
        };
      });
    };
    let selection = select();
    for (;;) {
      const { command, moving, units, retained } = selection;
      if (!command) break;
      // Planning caches are keyed by Game identity. Execution gets a fresh key
      // before changing any draft data, just as an ordinary transaction does.
      const next = { ...view };
      let movementUnits: readonly Piece[] | undefined;
      if (!detached && command.type === "guild-order")
        detachSuppliedPieces(state, next, command, units);
      if (!detached && LOCAL_MILITARY_COMMANDS.has(command.type))
        detachMilitaryPieces(state, next, command);
      if (!detached && !LOCAL_RECORD_COMMANDS.has(command.type)) {
        if (moving)
          movementUnits = detachMovingPieces(state, next, command, units);
        else {
          Object.assign(
            next,
            structuredClone({
              tiles: next.tiles,
              vertices: next.vertices,
              edges: next.edges,
              climatePlan: next.climatePlan,
              pieces: next.pieces,
            }),
          );
          detached = true;
        }
      }
      advanceCommand(
        next,
        command,
        false,
        (sharePieces) => {
          view = { ...next };
          commands.push(command);
          // Cleanup has finished. Reuse only its unchanged troop inputs in a
          // fresh decision view; stores, sieges and diplomacy need new memos.
          // Finish this read before the loop executes another order. No nested
          // execution or retained draft index grows with the batch length.
          selection = select(sharePieces);
        },
        movementUnits,
        retained,
      );
    }
    return { ok: true, state: commands.length ? view : state, commands };
  } catch (error) {
    return {
      ok: false,
      state,
      commands: [],
      error:
        error instanceof Error
          ? error.message
          : "The action could not be completed.",
    };
  }
}
/** Full rule validation for AI previews, without copying read-only map geometry.
 * Expeditions and Woods changes retain a fully isolated world copy. End-turn
 * and surrender previews also isolate sea tiles at possible season boundaries.
 * Routine economic orders copy only the records their real rules may change.
 * Recruitment and local military transactions also reuse immutable geometry
 * and unchanged troops. Copy affected formations or passengers before editing
 * them. Follow-up cleanup only deletes keys from the copied piece map.
 * This never publishes the preview.
 */
export function canApplyCommand(state: Game, c: Command): boolean {
  return commandResult(state, c, true).ok;
}
export function commandError(state: Game, c: Command): string | undefined {
  return commandResult(state, c, true).error;
}
function commandResult(state: Game, c: Command, preview: boolean): Result {
  try {
    payload(c);
    const moving = peacefulMove(state, c);
    const shareUnits = moving || LOCAL_RECORD_COMMANDS.has(c.type);
    const localOrder =
      preview &&
      [
        "recruit",
        "ship",
        "city",
        "wall",
        "extension",
        "guild",
        "bank",
        "guild-order",
      ].includes(c.type);
    // Purchases leave troops unchanged, and none of these orders removes a
    // town. If all living factions already own one, cleanup cannot delete any
    // troops either. Keep the immutable dictionary, including its UI identity.
    const retainUnits =
      !localOrder &&
      preservesTroopRecords(c) &&
      survivingFactionsHaveTowns(state);
    const s: Game = localOrder
      ? localOrderDraft(state, c)
      : (preview && !["expedition", "woods-choice"].includes(c.type)) ||
          shareUnits
        ? {
            ...structuredClone({
              ...state,
              tiles: undefined,
              climatePlan: undefined,
              vertices: undefined,
              edges: undefined,
              ...(shareUnits ? { pieces: undefined } : {}),
            }),
            ...(shareUnits
              ? {
                  pieces: retainUnits
                    ? state.pieces
                    : copyRecords(state.pieces),
                }
              : {}),
            tiles:
              ["end-turn", "surrender"].includes(c.type) && state.calendar
                ? Object.fromEntries(
                    Object.entries(state.tiles).map(([id, tile]) => [
                      id,
                      tile.resource === "water" || tile.resource === "ice"
                        ? { ...tile }
                        : tile,
                    ]),
                  )
                : state.tiles,
            climatePlan: state.climatePlan,
            vertices: state.vertices,
            edges: state.edges,
          }
        : structuredClone(state);
    if (moving) detachMovingPieces(state, s, c);
    if (LOCAL_MILITARY_COMMANDS.has(c.type)) detachMilitaryPieces(state, s, c);
    if (!localOrder && c.type === "guild-order")
      detachSuppliedPieces(
        state,
        s,
        c,
        c.ids?.length ? allPieces(state) : undefined,
      );
    if (localOrder) {
      // Use the actual order rules and payments, but do not process
      // unrelated sieges/eliminations when only checking a menu option.
      if (s.phase === "military") s.phase = "economy";
      s.actions++;
      execute(s, c, true);
    } else advanceCommand(s, c, preview);
    return { ok: true, state: { ...s } };
  } catch (error) {
    return {
      ok: false,
      state,
      error:
        error instanceof Error
          ? error.message
          : "The action could not be completed.",
    };
  }
}
/** These orders change only the active owner's stores/vouchers, the selected
 * town, newly recruited or supplied pieces and log. Copy the selected town
 * deeply for guild and workshop changes. This draft is never published. */
function localOrderDraft(state: Game, command: Command): Game {
  const draft: Game = {
    ...state,
    towns: Object.fromEntries(
      Object.entries(state.towns).map(([id, town]) => [
        id,
        town.id === command.town
          ? structuredClone(town)
          : town.owner === state.active
            ? { ...town, stock: { ...town.stock } }
            : town,
      ]),
    ),
    players: state.players.map((player) =>
      player.id === state.active
        ? { ...player, bonuses: structuredClone(player.bonuses) }
        : player,
    ),
    pieces:
      command.type === "guild-order" && command.ids?.length
        ? copyRecords(state.pieces)
        : state.pieces,
    events: [...state.events],
  };
  if (command.type === "guild-order")
    detachSuppliedPieces(
      state,
      draft,
      command,
      command.ids?.length ? allPieces(state) : undefined,
    );
  return draft;
}
function advanceCommand(
  s: Game,
  c: Command,
  preview: boolean,
  afterCleanup?: (sharePieces: boolean) => void,
  movementUnits?: readonly Piece[],
  retained?: RetainedPieceRead,
) {
  if (s.phase === "military") s.phase = "economy";
  s.actions++;
  let movedPieces: readonly Piece[] | undefined;
  executeOrder(
    s,
    c,
    false,
    true,
    (units) => (movedPieces = units),
    movementUnits,
    c.type === "move" ? retained : undefined,
  );
  const finish = (sharePieces: boolean) => {
    breakSieges(s, { reuseFrame: sharePieces });
    eliminate(s);
    if (!preview) syncEmergencyCoalition(s, { sharePieces });
    afterCleanup?.(sharePieces);
  };
  // Cleanup can edit sieges, alliances and logs without changing troops. Share
  // their indexes through that interval only when no faction can be eliminated.
  // The next decision may read these same troops after all cleanup finishes.
  // Its own non-troop indexes are fresh, and execution starts outside the scope.
  if (survivingFactionsHaveTowns(s)) {
    if (retained && preservesTroopRecords(c))
      withRetainedPieceRead(s, retained, () => finish(true));
    else withPieceListPlanningFrame(s, movedPieces, () => finish(true));
  } else finish(false);
}
export function execute(s: Game, c: Command, preview = false) {
  executeOrder(s, c, preview);
}
/** Full transactions perform final siege cleanup in advanceCommand, where its
 * occupation index also serves coalition checks. Standalone execution keeps
 * military cleanup immediate; intermediate battle/thaw cleanup is unchanged. */
function executeOrder(
  s: Game,
  c: Command,
  preview = false,
  deferFinalSiegeCleanup = false,
  afterPeacefulMove?: (units: readonly Piece[]) => void,
  movementUnits?: readonly Piece[],
  movementRead?: RetainedPieceRead,
) {
  const p = s.players[s.active],
    actor = c.actor ?? s.active;
  rule(
    s.phase !== "finished",
    "This game has ended. Start a new expedition to play again.",
  );
  if (s.battle) {
    rule(c.type === "resolve-battle", "Resolve the battle before continuing.");
    resolveBattle(s, c);
    continueThawRetreats(s);
    return;
  }
  if (s.allianceOffer) {
    rule(
      c.type === "respond-alliance",
      "Respond to the alliance invitation first.",
    );
    const offer = s.allianceOffer;
    rule(
      actor === allianceResponder(offer),
      "Only the faction currently asked to approve may respond.",
    );
    if (c.mode === "accept") {
      if (offer.approvals && offer.approvals.length > 1) {
        offer.approvals.shift();
        return;
      }
      acceptAlliance(s, offer);
    } else rule(c.mode === "decline", "Choose accept or decline.");
    delete s.allianceOffer;
    return;
  }
  if (s.trade) {
    rule(c.type === "respond-trade", "Respond to the trade offer first.");
    const offer = s.trade;
    rule(actor === offer.to, "Only the recipient may respond to this offer.");
    if (c.mode === "accept") {
      spend(s, offer.give, offer.from);
      spend(s, offer.take, offer.to);
      gain(s, offer.take, offer.from);
      gain(s, offer.give, offer.to);
      log(
        s,
        `${s.players[offer.from].name} and ${s.players[offer.to].name} traded.`,
        "info",
      );
    } else rule(c.mode === "decline", "Choose accept or decline.");
    delete s.trade;
    return;
  }
  rule(actor === s.active, "Wait for your turn.");
  if (s.researchChoice) {
    rule(c.type === "choose-research", "Choose which research card to keep.");
    rule(
      c.index !== undefined && s.researchChoice[c.index],
      "Choose a card from this draw.",
    );
    const card = s.researchChoice[c.index];
    p.hand.push(card);
    delete s.researchChoice;
    delete s.legacyResearchChoice;
    log(s, `${p.name} acquired research.`, "research", s.active);
    return;
  }
  if (c.type === "setup-town") {
    rule(s.phase === "setup-town", "Finish the current setup step.");
    rule(
      c.vertex && settlementSites(s, s.active, true).includes(c.vertex),
      "Choose a legal land intersection at least two edges from every town.",
    );
    const town = createTown(s, c.vertex, true);
    rule(
      canCompleteSetup(s, s.players.length * 2 - 1 - s.setupIndex),
      "This placement would prevent the remaining starting settlements.",
    );
    s.setupVertex = c.vertex;
    s.phase = "setup-route";
    if (s.setupIndex >= s.players.length)
      for (const id of productiveAtVertex(s, c.vertex))
        addStock(town.stock, tileYield(s.tiles[id], s.active));
    return;
  }
  if (c.type === "setup-route") {
    rule(
      s.phase === "setup-route" && s.setupVertex,
      "Place your starting settlement first.",
    );
    rule(
      c.edge && s.vertices[s.setupVertex].edges.includes(c.edge),
      "Choose a route touching your new settlement.",
    );
    rule(
      c.kind === "road" || c.kind === "route",
      "Choose road or shipping route.",
    );
    buildRoute(s, c.edge, c.kind, true);
    s.setupIndex++;
    delete s.setupVertex;
    if (s.setupIndex === s.players.length * 2) {
      s.active = 0;
      beginTurn(s);
    } else {
      s.active = setupOrder(s.players.length)[s.setupIndex];
      s.phase = "setup-town";
    }
    return;
  }
  rule(!s.phase.startsWith("setup"), "Complete initial placement first.");
  if (c.type === "surrender") {
    for (const t of ownTowns(s)) delete s.towns[t.id];
    eliminate(s);
    if (s.winner === null) nextTurn(s);
    return;
  }
  if (c.type === "roll") {
    rule(s.phase === "roll", "The dice have already been rolled.");
    s.dice = [1 + Math.floor(random(s) * 6), 1 + Math.floor(random(s) * 6)];
    production(s, s.dice[0] + s.dice[1]);
    s.phase = "economy";
    standingGuildOrders(s);
    if (p.control !== "human" && !p.diplomacyDone) manageAlliance(s);
    return;
  }
  if (c.type === "play-research") {
    rule(
      ["roll", "economy", "military"].includes(s.phase),
      "Research is not playable during this phase.",
    );
    playResearch(s, c);
    return;
  }
  if (c.type === "military") {
    rule(s.phase === "economy", "Roll for production first.");
    // Compatibility with older clients; all post-roll actions now share a phase.
    return;
  }
  if (c.type === "end-turn") {
    rule(
      s.phase === "military" || s.phase === "economy",
      "Complete the current phase first.",
    );
    nextTurn(s);
    return;
  }
  rule(
    s.phase === "economy",
    "Roll first, then build, trade or command your forces.",
  );
  if (c.type === "woods-choice") {
    rule(
      c.tile && canChooseWoods(s, c.tile),
      "Choose Woods harvested by your faction.",
    );
    rule(c.kind === "lumber" || c.kind === "hides", "Choose Wood or Hides.");
    (s.tiles[c.tile].woodsChoices ??= {})[s.active] = c.kind;
    (s.tiles[c.tile].woodsChosenOn ??= {})[s.active] = p.turns;
    return;
  }
  if (diplomacyCommand(s, c)) return;
  if (
    militaryCommand(s, c, {
      deferFinalSiegeCleanup,
      afterPeacefulMove,
      movementUnits,
      movementRead,
    })
  )
    return;
  if (guildCommand(s, c)) return;
  if (c.type === "road" || c.type === "route") {
    rule(c.edge, "Select an edge.");
    buildRoute(s, c.edge, c.type);
    log(
      s,
      `${p.name} built a ${c.type === "road" ? "road" : "shipping route"}.`,
      "build",
      s.active,
    );
    return;
  }
  if (c.type === "move-route") {
    rule(
      c.from && movableRoutes(s).includes(c.from),
      "Only one existing open-ended route ship may be moved per turn.",
    );
    rule(c.edge && c.edge !== c.from, "Choose another edge.");
    const old = s.routes[c.from];
    delete s.routes[c.from];
    rule(canRoute(s, c.edge, "route"), "The new route must connect legally.");
    s.routes[c.edge] = { ...old, edge: c.edge };
    p.routeMoved = true;
    return;
  }
  if (c.type === "colonize") {
    rule(c.ids?.length === 1, "Select one settler to found a settlement.");
    const unit = s.pieces[c.ids[0]];
    rule(
      c.vertex && colonizationSites(s, unit).includes(c.vertex),
      "Choose a clear, legally spaced settlement site beside a ready settler.",
    );
    const town = createTown(s, c.vertex);
    delete s.pieces[unit.id];
    log(s, `${p.name} founded ${town.name}.`, "build", s.active, unit.tile);
    return;
  }
  if (c.type === "settlement") {
    rule(
      c.vertex && settlementSites(s).includes(c.vertex),
      "A settlement needs a connected route, land, and two-edge spacing.",
    );
    pay(s, COSTS.Settlement);
    const town = createTown(s, c.vertex);
    log(
      s,
      `${p.name} founded ${town.name}.`,
      "build",
      s.active,
      landAtVertex(s, c.vertex)[0],
    );
    return;
  }
  if (c.type === "city") {
    const t = townOwned(s, c.town);
    rule(t.level < 4, "This city is already level 4.");
    pay(s, COSTS[CITY_RECIPES[t.level + 1]], "civic");
    t.level++;
    log(s, `${t.name} advanced to level ${t.level}.`, "build", s.active);
    return;
  }
  if (c.type === "tower") {
    rule(
      c.vertex && towerSites(s).includes(c.vertex),
      "Choose a friendly road intersection with an available watchtower tier.",
    );
    const previous = s.towers[c.vertex];
    const tier = (previous?.tier ?? 0) + 1;
    rule(
      c.mode === undefined || c.mode === "lumber" || c.mode === "stone",
      "Choose Wood or Stone for the watchtower base.",
    );
    const material =
      c.mode ?? ((inventory(s).lumber ?? 0) >= 2 ? "lumber" : "stone");
    pay(s, tier === 1 ? { [material]: 2 } : TOWER_COSTS[tier]);
    s.towers[c.vertex] = {
      id: previous?.id ?? nextId(s, "w"),
      vertex: c.vertex,
      owner: s.active,
      tier,
    };
    log(
      s,
      `${p.name} built a tier ${tier} watchtower.`,
      "build",
      s.active,
      s.vertices[c.vertex].tiles[0],
    );
    return;
  }
  if (c.type === "coverage") {
    const u = s.pieces[c.target ?? ""];
    rule(
      u && u.owner === s.active && u.kind === "merchant",
      "Choose your land merchant.",
    );
    rule(
      c.ids &&
        c.ids.length <= u.tier &&
        new Set(c.ids).size === c.ids.length &&
        c.ids.every(
          (id) =>
            neighbors(u.tile).includes(id) &&
            s.tiles[id] &&
            tileGood(s.tiles[id]),
        ),
      "Choose up to the merchant tier in adjacent producing tiles.",
    );
    if (c.mode === "auto") delete u.coverage;
    else u.coverage = [...c.ids];
    return;
  }
  if (c.type === "wall") {
    const t = townOwned(s, c.town);
    rule(t.wall < t.level, "Upgrade the town to unlock a higher wall.");
    const next = t.wall + 1;
    pay(s, COSTS[WALL_NAMES[next]], next === 1 ? "palisade" : "civic");
    t.wall++;
    log(s, `${t.name} built ${WALL_NAMES[next]}.`, "build", s.active);
    return;
  }
  if (c.type === "extension") {
    const t = townOwned(s, c.town);
    rule(
      c.tile && productiveAtVertex(s, t.vertex).includes(c.tile),
      "Choose an adjacent producing land tile or marine resource.",
    );
    const next = (t.extensions[c.tile] ?? 0) + 1;
    rule(
      next <= t.level - 1,
      "Upgrade the city to unlock this extension tier.",
    );
    const raw =
      t.extensionGoods?.[c.tile] ?? tileGood(s.tiles[c.tile], s.active)!;
    pay(s, extensionCost(raw, next), "industry");
    t.extensions[c.tile] = next;
    (t.extensionGoods ??= {})[c.tile] = raw;
    log(
      s,
      `${t.name} built ${extensionName(raw)} ${next}.`,
      "build",
      s.active,
      c.tile,
    );
    return;
  }
  if (c.type === "camp") {
    const r = s.routes[c.edge ?? ""];
    rule(r && r.owner === s.active, "Choose an owned road or shipping route.");
    rule(
      c.tile &&
        s.edges[r.edge].tiles.includes(c.tile) &&
        ((r.camps[c.tile] && marineResource(s.tiles[c.tile])) ||
          (r.kind === "road"
            ? s.tiles[c.tile].resource !== "water"
            : marineResource(s.tiles[c.tile]))),
      "Choose a land side of a road or Fish or Whales beside a shipping route.",
    );
    rule(
      !hostileAt(s, c.tile, s.active, canOccupy(s.tiles[c.tile], true)),
      "Clear enemy occupation before building a camp.",
    );
    const tier = (r.camps[c.tile] ?? 0) + 1;
    rule(tier <= 2, "This camp is already at tier II.");
    rule(
      tileGood(s.tiles[c.tile], s.active),
      "This terrain produces no resources.",
    );
    pay(s, campCost(tileGood(s.tiles[c.tile], s.active)!, tier));
    r.camps[c.tile] = tier;
    log(
      s,
      `${p.name} ${tier === 1 ? "built" : "upgraded"} a camp to tier ${tier}.`,
      "build",
      s.active,
      c.tile,
    );
    return;
  }
  if (c.type === "recruit" && c.count !== undefined) {
    rule(
      Number.isInteger(c.count) && c.count >= 1 && c.count <= 100,
      "Choose a recruitment quantity from 1 to 100.",
    );
  }
  if (c.type === "recruit" || c.type === "ship") {
    const t = townOwned(s, c.town),
      naval = c.type === "ship",
      quantity = c.count ?? 1;
    rule(
      Number.isSafeInteger(quantity) && quantity >= 1,
      "Choose a positive whole-number ship quantity.",
    );
    let freeShips: number[] = [];
    rule(
      c.tile &&
        s.vertices[t.vertex].tiles.includes(c.tile) &&
        canOccupy(s.tiles[c.tile], naval),
      "Choose a suitable hex adjacent to the recruiting town.",
    );
    rule(
      !hostileAt(s, c.tile, s.active, naval),
      "An enemy occupies the deployment hex.",
    );
    let cost: Stock,
      kind = c.kind!,
      tier = c.tier ?? 1,
      free = -1;
    rule(
      !["settler", "settlership"].includes(kind) || tier === 1,
      "Settlers have only one tier.",
    );
    if (naval) {
      rule(Object.hasOwn(SHIP_INFO, kind), "Choose a ship class.");
      rule(
        Number.isInteger(tier) && tier >= 1 && tier <= 4,
        "Choose ship tier I–IV.",
      );
      const info = shipStats(kind as ShipClass, tier);
      rule(
        t.turnLevel >= info.level,
        "This town did not start the turn at the required shipbuilding level.",
      );
      const recipe = shipCost(kind as ShipClass, tier);
      freeShips = p.bonuses.ships
        .flatMap((v, i) =>
          v.includes(kind as ShipClass) &&
          tier === (p.bonuses.shipTiers?.[i] ?? p.bonuses.shipTier ?? 1)
            ? [i]
            : [],
        )
        .slice(0, quantity);
      cost = Object.fromEntries(
        Object.entries(recipe).map(([good, amount]) => [
          good,
          amount! * (quantity - freeShips.length),
        ]),
      );
      t.launched += quantity;
    } else {
      rule(
        Object.hasOwn(UNIT_INFO, kind) &&
          Number.isInteger(tier) &&
          tier >= 1 &&
          tier <= 4,
        "Choose a valid class and tier.",
      );
      rule(
        t.turnLevel >= tier,
        "This town did not start the turn at the required recruitment level.",
      );
      cost = unitCost(kind as UnitClass, tier);
      t.recruited += quantity;
    }
    if (naval) pay(s, cost);
    if (naval) {
      for (const index of freeShips.reverse()) {
        p.bonuses.ships.splice(index, 1);
        p.bonuses.shipTiers?.splice(index, 1);
      }
    }
    for (let built = 0; built < quantity; built++) {
      if (!naval) {
        // Preserve per-recruit payments, including proportional warehouse
        // rounding and vouchers, without repeating deployment/world scans.
        free = p.bonuses.recruits.findIndex(
          (v) => v.tier === tier && v.classes.includes(kind as UnitClass),
        );
        pay(s, free >= 0 ? {} : cost);
        if (free >= 0) p.bonuses.recruits.splice(free, 1);
      }
      if (preview) continue;
      const id = nextId(s, "u");
      s.pieces[id] = {
        id,
        owner: s.active,
        kind: kind as Piece["kind"],
        naval,
        tier,
        tile: c.tile,
        born: p.turns,
        moved: 0,
        acted: true,
        bonus: 0,
      };
    }
    log(
      s,
      `${t.name} recruited ${quantity > 1 ? `${quantity} × ` : ""}${naval ? shipStats(kind as ShipClass, tier).name : UNIT_INFO[kind as UnitClass].names[tier - 1]}.`,
      "build",
      s.active,
      c.tile,
    );
    return;
  }
  if (c.type === "bank") {
    rule(
      c.give &&
        c.take &&
        Object.keys(c.give).filter((g) => c.give![g as keyof Stock]).length ===
          1 &&
        Object.keys(c.take).filter((g) => c.take![g as keyof Stock]).length ===
          1,
      "Bank trades exchange one type of good for another.",
    );
    const give = GOODS.find((g) => c.give![g])!,
      take = GOODS.find((g) => c.take![g])!;
    rule(give !== take, "Choose different goods.");
    const rate = bankRate(s, give, take);
    rule(
      c.give[give] === rate * c.take[take]!,
      "The trade does not match the current bank rate.",
    );
    spend(s, c.give);
    gain(s, c.take);
    log(
      s,
      `${p.name} traded ${c.give[give]} ${give} for ${c.take[take]} ${take}.`,
      "info",
      s.active,
    );
    return;
  }
  if (c.type === "offer-trade") {
    rule(
      c.partner !== undefined &&
        c.partner !== s.active &&
        s.players[c.partner]?.alive,
      "Choose another surviving player.",
    );
    rule(
      c.give && c.take && sumStock(c.give) > 0 && sumStock(c.take) > 0,
      "Both players must contribute goods.",
    );
    rule(
      GOODS.every((g) => !(c.give![g] && c.take![g])),
      "A good cannot appear on both sides of a trade.",
    );
    rule(
      affordable(s, c.give) && affordable(s, c.take, c.partner),
      "One player does not have the offered goods.",
    );
    s.trade = { from: s.active, to: c.partner, give: c.give, take: c.take };
    p.tradeOffered = true;
    return;
  }
  if (c.type === "expedition") {
    rule(aiExpeditionAllowed(s), AI_EXPEDITION_RESTRICTION);
    rule(
      c.kind === "land" || c.kind === "sea",
      "Choose land or sea exploration.",
    );
    rule(
      c.tier && Number.isInteger(c.tier) && c.tier >= 1 && c.tier <= 3,
      "Choose expedition tier I, II, or III.",
    );
    rule(!p.expeditionUsed, "Only one expedition is allowed per turn.");
    rule(
      c.vertex && expeditionSites(s, c.kind).includes(c.vertex),
      "Choose an unblocked frontier town, route endpoint, army or fleet.",
    );
    const footprint = expeditionFootprint(
      s,
      c.vertex,
      c.tier,
      c.direction ?? 0,
    );
    rule(
      footprint.length === [0, 10, 20, 40][c.tier],
      "This enclosed frontier cannot reveal enough tiles for this tier.",
    );
    pay(s, expeditionCost(c.kind, c.tier), `expedition${c.tier}`);
    addHexes(s, s.seed, footprint);
    syncSeasonSurfaces(s);
    restoreCoastalRoads(s);
    p.expeditionUsed = true;
    log(
      s,
      `${p.name} revealed ${footprint.length} new hexes on a ${c.kind} expedition.`,
      "build",
      s.active,
      footprint[0],
    );
    tryFrontierReturns(s, footprint);
    return;
  }
  if (c.type === "buy-research") {
    rule(
      c.tier && Number.isInteger(c.tier) && c.tier >= 1 && c.tier <= 4,
      "Choose a research tier.",
    );
    rule(
      c.tier === 1 ||
        ownTowns(s).some((t) => t.level >= c.tier! && !besieged(s, t.id)),
      "Upgrade a city to unlock this research tier.",
    );
    pay(s, COSTS[`Research ${RESEARCH_NAMES[c.tier]}`]);
    p.researchPurchases = (p.researchPurchases ?? 0) + 1;
    drawResearch(s, c.tier);
    return;
  }
  throw new Error("Unknown action.");
}
