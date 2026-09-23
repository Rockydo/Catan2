import { applyPublishedDelta } from "./game/published-delta";
import type { AIReply, AIRequest } from "./game/ai-session";
import { uploadAIRequest } from "./ui/ai-upload";
import { sharePublishedSnapshot } from "./ui/publish-snapshot";
import { routineAIOrder } from "./game/ai-protocol";
import { terrainName } from "./game/maritime";
import { LanguageSwitch } from "./ui/LanguageSwitch";
import { localize as tx, useLocale, rulesUrl } from "./i18n";
import { AllianceResponse } from "./ui/Alliances";
import { allianceResponder, friendly } from "./game/relations";
import { selectReadyForce } from "./ui/ArmyComposition";
import { SiegeDetails, TowerSiegeDetails } from "./ui/SiegeDetails";
import { FactionStandings } from "./ui/FactionStandings";
import { RebellionAlert, TownAlerts, useTownAlerts } from "./ui/TownAlerts";
import { RollExperience, useRollPresentation } from "./ui/RollExperience";
import { MilitaryPortrait } from "./ui/MilitaryArt";
import { UNIT_INFO, ROMAN } from "./game/content";
import { DiceFace } from "./ui/MapPieces";
import { GoodGuide } from "./ui/GoodGuide";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Compass,
  ArrowRight,
  Play,
  Pause,
  Settings,
  BookOpen,
  Download,
  Upload,
  Flag,
  Shield,
  Factory,
  ScrollText,
  ArrowLeftRight,
  Navigation,
  Check,
  Volume2,
  VolumeX,
  X,
  Menu,
  ChevronDown,
  RotateCcw,
  Info,
  Users,
  Crown,
} from "lucide-react";
import {
  GOODS,
  RAW,
  PROCESSED,
  type Game,
  type Command,
  type PlayerConfig,
  type Stock,
  type Good,
} from "./game/types";
import {
  COLORS,
  NAMES,
  REALM_NAMES,
  GOOD_INFO,
  CARDS,
  TERRAIN,
} from "./game/content";
import { newGame, applyCommand } from "./game/engine";
import {
  inventory,
  prepareGameView,
  preparePatchedGameView,
  retainPieceRead,
  ownTowns,
  ownPieces,
  income,
  piecesAt,
  ready,
  power,
  bombardmentPower,
  fleetDefenders,
  points,
  sumStock,
  moveTargets,
} from "./game/selectors";
import {
  saveCampaign,
  observeSaving,
  hasUnsavedChanges,
  exportCampaign,
  importCampaign,
  type LoadedCampaign,
} from "./storage/client";
import { Board, type Selection, type BoardMode } from "./ui/Board";
import { SeasonCalendar } from "./ui/SeasonCalendar";
import type { Season } from "./game/seasons";
import {
  Panels,
  DetailHeader,
  type PanelTab,
  type DialogSpec,
} from "./ui/Panels";
import { Modal, GoodIcon, GoodsPicker, GoodsList, Cost } from "./ui/components";
import {
  BattleDialog,
  DrawDialog,
  TradeResponse,
  RaidDialog,
  ResearchPlayDialog,
  TransportDialog,
} from "./ui/dialogs";

const TABS: { id: PanelTab; label: string; icon: typeof Factory }[] = [
  { id: "build", label: "Build", icon: Factory },
  { id: "forces", label: "Forces", icon: Shield },
  { id: "trade", label: "Trade", icon: ArrowLeftRight },
  { id: "research", label: "Research", icon: ScrollText },
  { id: "explore", label: "Explore", icon: Compass },
];
const PHASE_NAMES: Record<Game["phase"], string> = {
  "setup-town": "Settlement placement",
  "setup-route": "Starting route",
  roll: "Production",
  economy: "Build, trade & command",
  military: "Build, trade & command",
  finished: "Campaign complete",
};
async function downloadGame(game: Game) {
  const url = URL.createObjectURL(
    new Blob([await exportCampaign(game)], { type: "application/gzip" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `catane-${game.seed.replace(/[^a-zA-Z0-9_-]/g, "-")}-round-${game.round}.catane`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App({
  initialCampaign,
}: {
  initialCampaign: LoadedCampaign;
}) {
  useLocale();

  const initial = useRef(initialCampaign);
  const [game, setGame] = useState<Game | null>(initial.current.game),
    [menu, setMenu] = useState(true),
    [newSetup, setNewSetup] = useState(false),
    [dialog, setDialog] = useState<DialogSpec>(null),
    [selection, setSelection] = useState<Selection>(null),
    [mode, setMode] = useState<BoardMode>("inspect"),
    [tab, setTab] = useState<PanelTab>("build"),
    [unitIds, setUnitIds] = useState<string[]>([]),
    [paused, setPaused] = useState(false),
    [autoplay, setAutoplay] = useState(false),
    [aiSpeed, setAiSpeed] = useState(() => {
      try {
        const saved = Number(localStorage.getItem("catane-ai-pacing"));
        return [20, 80, 250, 800].includes(saved) ? saved : 250;
      } catch {
        return 250;
      }
    }),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(
      initial.current.recovered
        ? "Recovered your previous save from the backup."
        : (initial.current.error ?? ""),
    ),
    [saveError, setSaveError] = useState(""),
    [saving, setSaving] = useState(false),
    [preview, setPreview] = useState<string[]>([]),
    [acknowledged, setAcknowledged] = useState(-1),
    [help, setHelp] = useState(false),
    [mobilePanel, setMobilePanel] = useState(false),
    [realmsOpen, setRealmsOpen] = useState(false),
    [sound, setSound] = useState(false);
  const [seasonPreview, setSeasonPreview] = useState<Season>();
  const roll = useRollPresentation(initial.current.game);
  const townAlerts = useTownAlerts();
  const [alertFocus, setAlertFocus] = useState<{
    vertex: string;
    request: number;
  } | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  if (game) prepareGameView(game);
  const aiWorker = useRef<Worker | null>(null);
  const aiRequest = useRef(0);
  const aiBase = useRef<{ worker: Worker; game: Game; request: number } | null>(
    null,
  );
  useEffect(
    () => () => {
      aiWorker.current?.terminate();
      aiWorker.current = null;
    },
    [],
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const commit = useCallback(
    (command: Command, plannedState?: Game, shared = false) => {
      const current = gameRef.current;
      if (!current || roll.locked.current) return false;
      // Worker plans have already run through the same engine. The reply is
      // accepted only for the exact current snapshot and request below.
      const result = plannedState
        ? { ok: true, state: plannedState, error: undefined }
        : applyCommand(current, command);
      if (!result.ok) {
        setToast(result.error ?? "That action is unavailable.");
        return false;
      }
      if (!shared) result.state = sharePublishedSnapshot(current, result.state);
      setSeasonPreview(undefined);
      townAlerts.capture(current, result.state);
      if (command.type === "roll") roll.begin(result.state);
      else roll.close();
      gameRef.current = result.state;
      setGame(result.state);
      setToast("");
      if (
        [
          "play-research",
          "siege",
          "load",
          "unload",
          "offer-trade",
          "destroy-town",
          "destroy-route",
          "move",
          "bombard",
          "guild-dismantle",
          "surrender",
        ].includes(command.type)
      )
        setDialog(null);
      if (["military", "end-turn"].includes(command.type)) {
        setMode("inspect");
        setUnitIds([]);
        setMobilePanel(false);
      }
      if (["setup-town", "setup-route"].includes(command.type))
        setMode("inspect");
      return true;
    },
    [roll.begin, roll.close, townAlerts.capture],
  );
  useEffect(
    () =>
      observeSaving((error, pending) => {
        setSaveError(error);
        setSaving(pending);
      }),
    [],
  );
  useEffect(() => {
    if (
      game &&
      !(game === initial.current.game && initial.current.needsSave === false)
    )
      saveCampaign(game);
  }, [game]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 8000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  const responsible =
      game?.battle?.loser ??
      (game?.allianceOffer
        ? allianceResponder(game.allianceOffer)
        : undefined) ??
      game?.trade?.to ??
      game?.active ??
      0,
    humanCount = game?.players.filter((p) => p.control === "human").length ?? 1,
    responsibleHuman = game?.players[responsible]?.control === "human";
  const viewer = game
    ? humanCount === 1
      ? game.players.find((p) => p.control === "human")!.id
      : responsibleHuman
        ? responsible
        : (game.players.find((p) => p.control === "human")?.id ?? game.active)
    : 0;
  const handoff =
    !!game &&
    !menu &&
    !autoplay &&
    humanCount > 1 &&
    responsibleHuman &&
    acknowledged !== responsible;
  const interactive =
    !!game &&
    !menu &&
    !handoff &&
    game.active === viewer &&
    game.players[game.active].control === "human" &&
    !autoplay &&
    !game.battle &&
    !game.trade &&
    !game.allianceOffer &&
    !game.researchChoice &&
    !roll.rolling &&
    game.phase !== "finished";
  useEffect(() => {
    if (
      !game ||
      menu ||
      dialog ||
      help ||
      paused ||
      handoff ||
      roll.presentation ||
      game.phase === "finished" ||
      (responsibleHuman && !autoplay)
    )
      return;
    let cancelled = false;
    let pending = false;
    const snapshot = game;
    // Keep the module and its optimized code warm between decisions. A cancelled
    // in-flight request still gets terminated; stale results must never advance play.
    const worker = (aiWorker.current ??= new Worker(
      new URL("./game/ai.worker.ts", import.meta.url),
      { type: "module" },
    ));
    const request = ++aiRequest.current;
    const stopWorker = () => {
      worker.terminate();
      if (aiWorker.current === worker) aiWorker.current = null;
      if (aiBase.current?.worker === worker) aiBase.current = null;
    };
    setBusy(true);
    const started = performance.now();
    let presentationTimer: ReturnType<typeof setTimeout> | undefined;
    // Think while the previous action is visible. Routine economic orders do
    // not wait out the animation pacing setting before starting more work.
    pending = true;
    const base = aiBase.current;
    aiBase.current = null;
    // Retain a token only after publication, never merely after receipt. A pause
    // during the presentation delay therefore resends the visible snapshot.
    let resynced = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setPaused(true);
        setBusy(false);
        setToast("The AI took too long. Your game is saved. Resume to retry.");
        stopWorker();
      }
    }, 20000);
    let upload = 0;
    const send = (message: AIRequest) => {
      const token = ++upload;
      const active = () =>
        !cancelled &&
        token === upload &&
        gameRef.current === snapshot &&
        aiWorker.current === worker;
      void uploadAIRequest(worker, message, active).catch((error: unknown) => {
        if (!active()) return;
        pending = false;
        clearTimeout(timeout);
        stopWorker();
        setBusy(false);
        setPaused(true);
        console.error("AI snapshot transfer failed", error);
        setToast(
          `AI paused: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    };
    worker.onmessage = (event: MessageEvent<AIReply>) => {
      if (
        cancelled ||
        gameRef.current !== snapshot ||
        event.data.request !== request
      )
        return;
      if (event.data.resync && !resynced) {
        resynced = true;
        send({
          state: snapshot,
          request,
          delta: true,
          batchMoves: aiSpeed <= 20,
        });
        return;
      }
      pending = false;
      clearTimeout(timeout);
      if (event.data.error || event.data.resync) {
        setBusy(false);
        console.error(
          "AI calculation failed",
          event.data.stack ?? event.data.error,
        );
        stopWorker();
        setPaused(true);
        setToast(
          `AI paused: ${event.data.error ?? "Unable to synchronize the campaign."}`,
        );
        return;
      }
      const commands: Command[] =
        event.data.commands ?? (event.data.command ? [event.data.command] : []);
      const publish = () => {
        if (
          cancelled ||
          gameRef.current !== snapshot ||
          event.data.request !== request
        )
          return;
        setBusy(false);
        const next = event.data.delta
          ? applyPublishedDelta(
              snapshot,
              event.data.delta,
              retainPieceRead(snapshot)?.recordKeys,
            )
          : event.data.state;
        if (next && event.data.delta)
          preparePatchedGameView(snapshot, next, event.data.delta);
        const ok =
          commands.length > 0 &&
          (next
            ? commit(commands[commands.length - 1], next, !!event.data.delta)
            : commands.every((command) => commit(command)));
        if (ok && next)
          aiBase.current = { worker, game: gameRef.current!, request };
        if (!ok) {
          setPaused(true);
          setToast(
            "The AI attempted an invalid action and has been paused. Your game remains saved.",
          );
        }
      };
      const wait = commands.every(routineAIOrder)
        ? 0
        : Math.max(0, aiSpeed - (performance.now() - started));
      if (wait > 0) presentationTimer = setTimeout(publish, wait);
      else publish();
    };
    worker.onerror = () => {
      if (!cancelled) {
        stopWorker();
        clearTimeout(timeout);
        setBusy(false);
        setPaused(true);
        setToast(
          "The AI worker could not run. Reload the page and resume your saved game.",
        );
      }
    };
    send({
      ...(base?.worker === worker && base.game === snapshot
        ? { baseRequest: base.request }
        : { state: snapshot }),
      request,
      delta: true,
      batchMoves: aiSpeed <= 20,
    });
    return () => {
      cancelled = true;
      clearTimeout(presentationTimer);
      clearTimeout(timeout);
      if (pending) stopWorker();
      worker.onmessage = null;
      worker.onerror = null;
      setBusy(false);
    };
  }, [
    game,
    menu,
    dialog,
    help,
    paused,
    handoff,
    responsibleHuman,
    autoplay,
    aiSpeed,
    roll.presentation,
    commit,
  ]);
  useEffect(() => {
    if (!game) return;
    setUnitIds((ids) => ids.filter((id) => game.pieces[id]?.owner === viewer));
    if (selection?.type === "vertex" && !game.vertices[selection.id])
      setSelection(null);
  }, [game, viewer]);
  useEffect(() => {
    if (!sound || !roll.presentation) return;
    const rolling = roll.presentation.phase === "rolling";
    try {
      audioRef.current ??= new AudioContext();
      const ctx = audioRef.current;
      void ctx.resume();
      const nodes: OscillatorNode[] = [];
      for (let i = 0; i < (rolling ? 6 : 2); i++) {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain(),
          at = ctx.currentTime + i * (rolling ? 0.13 : 0.09);
        osc.type = rolling ? "triangle" : "sine";
        osc.frequency.setValueAtTime(
          rolling ? 180 + (i % 3) * 60 : 523 + i * 136,
          at,
        );
        osc.frequency.exponentialRampToValueAtTime(
          rolling ? 75 : 659,
          at + 0.07,
        );
        gain.gain.setValueAtTime(rolling ? 0.025 : 0.035, at);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          at + (rolling ? 0.065 : 0.24),
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + (rolling ? 0.08 : 0.26));
        nodes.push(osc);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      }
      return () => {
        for (const osc of nodes) {
          try {
            osc.stop();
          } catch {
            /* Already ended. */
          }
        }
      };
    } catch {
      /* Audio is optional. */
    }
  }, [sound, roll.presentation?.report.id, roll.presentation?.phase]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        menu ||
        dialog ||
        help ||
        handoff ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target as HTMLElement)?.closest(
          "input,select,textarea,[contenteditable=true]",
        )
      )
        return;
      if (event.key === "Escape") {
        setMobilePanel(false);
        setRealmsOpen(false);
        setMode("inspect");
        setPreview([]);
        return;
      }
      const shortcuts: Record<string, PanelTab> = {
        b: "build",
        f: "forces",
        t: "trade",
        r: "research",
        e: "explore",
      };
      const target = shortcuts[event.key.toLowerCase()];
      if (target) {
        event.preventDefault();
        setTab(target);
        setMobilePanel(true);
        setRealmsOpen(false);
        setMode("inspect");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [menu, dialog, help, handoff]);
  function select(next: Selection) {
    setSelection(next);
    setMode("inspect");
    setPreview([]);
    if (next?.type === "tile" && game) {
      const units = piecesAt(game, next.id).filter((u) => u.owner === viewer);
      setUnitIds(selectReadyForce(game, units));
      if (piecesAt(game, next.id).length) setTab("forces");
    } else if (next?.type === "vertex") {
      if (tab !== "forces" || selection?.type === "tile") setTab("build");
      setUnitIds([]);
    }
    setMobilePanel(Boolean(next));
  }
  function build(type: string, id: string) {
    if (!game || !interactive) return;
    if (type === "tower") {
      setSelection({ type: "vertex", id });
      setTab("build");
      setMode("inspect");
      setMobilePanel(true);
      return;
    }
    if (type === "camp") {
      setSelection({ type: "edge", id });
      setTab("build");
      setMobilePanel(true);
      return;
    }
    if (type === "move-route") {
      if (selection?.type === "edge")
        commit({ type: "move-route", from: selection.id, edge: id });
      setMode("inspect");
      return;
    }
    if (type === "colonize") {
      if (commit({ type, vertex: id, ids: unitIds })) {
        setSelection({ type: "vertex", id });
        setUnitIds([]);
        setMode("inspect");
        setTab("build");
      }
      return;
    }
    const c: Command =
      type === "setup-route"
        ? {
            type,
            edge: id,
            kind: mode === "route" ? "route" : "road",
          }
        : type === "setup-town" || type === "settlement" || type === "tower"
          ? { type, vertex: id }
          : { type, edge: id };
    if (commit(c) && type === "settlement")
      setSelection({ type: "vertex", id });
  }
  function move(to: string) {
    if (!game || !interactive || !unitIds.length) return;
    const units = unitIds.map((id) => game.pieces[id]),
      defenders = piecesAt(game, to).filter(
        (u) => !friendly(game, u.owner, viewer),
      );
    if (defenders.length) {
      setDialog({ type: "attack", ids: unitIds, to });
    } else commit({ type: "move", ids: unitIds, to });
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 128_000_000)
        throw new Error("Save files must be under 128 MB.");
      const loaded = await importCampaign(file);
      roll.reset(loaded);
      townAlerts.reset();
      setAlertFocus(null);
      setGame(loaded);
      gameRef.current = loaded;
      setMenu(false);
      setNewSetup(false);
      setDialog(null);
      setPaused(true);
      setAutoplay(false);
      setSelection(null);
      setUnitIds([]);
      setAcknowledged(-1);
      setToast("Game imported. AI is paused until you resume.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Invalid save file.");
    }
    event.target.value = "";
  }
  function start(seed: string, config: PlayerConfig[]) {
    try {
      const next = newGame(seed, config);
      roll.reset(next);
      townAlerts.reset();
      setAlertFocus(null);
      setGame(next);
      gameRef.current = next;
      setMenu(false);
      setNewSetup(false);
      setSelection(null);
      setMode("inspect");
      setUnitIds([]);
      setPaused(false);
      setAutoplay(false);
      setAcknowledged(config.findIndex((p) => p.control === "human"));
      setToast("");
      setHelp(true);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not create this world.");
    }
  }
  const stock = game ? inventory(game, viewer) : {},
    production = roll.rolling ? {} : (game?.production[viewer] ?? {}),
    rollGains =
      roll.presentation?.phase === "revealed"
        ? (roll.presentation.report.players.find((p) => p.id === viewer)
            ?.goods ?? {})
        : {},
    player = game?.players[game.active];
  if (roll.rolling)
    for (const g of GOODS)
      stock[g] =
        (stock[g] ?? 0) -
        (roll.presentation?.report.players.find((p) => p.id === viewer)?.goods[
          g
        ] ?? 0);
  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".catane,.json,.gz,application/json,application/gzip"
        className="sr-only"
        aria-label={tx("Import saved game file")}
        onChange={importFile}
      />
      {tx(
        menu ? (
          <main className="main-menu">
            <div className="menu-art" aria-hidden="true">
              <div className="menu-compass">✥</div>
              <div className="menu-landscape">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="menu-content">
              <LanguageSwitch />
              <div className="brand-mark">
                <Compass size={32} />
                <span>{tx("A WORLD WORTH BUILDING")}</span>
              </div>
              <h1>
                {tx("CATANE")}
                <span>{tx("FRONTIERS")}</span>
              </h1>
              <p className="menu-description">
                {tx("From your first settlement to your final siege.")}
                <br />
                {tx("Build, trade, explore and command the frontier.")}
              </p>
              <div className="menu-facts">
                <span>{tx("5 or 10 realms")}</span>
                <i>·</i>
                <span>
                  {tx(GOODS.length)}
                  {tx(" goods")}
                </span>
                <i>·</i>
                <span>{tx("An unbounded world")}</span>
              </div>
              {tx(
                newSetup ? (
                  <NewGameForm
                    onStart={start}
                    onCancel={() => setNewSetup(false)}
                    existing={!!game}
                  />
                ) : (
                  <div className="menu-actions">
                    {tx(
                      game && (
                        <button
                          className="primary"
                          onClick={() => {
                            setMenu(false);
                            setPaused(false);
                          }}
                        >
                          {tx("Continue campaign ")}
                          <span>
                            {tx("Round ")}
                            {tx(game.round)}
                          </span>
                          <ArrowRight size={19} />
                        </button>
                      ),
                    )}
                    <button
                      className={game ? "secondary" : "primary"}
                      onClick={() => setNewSetup(true)}
                    >
                      {tx("New campaign ")}
                      <ArrowRight size={19} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload size={17} />
                      {tx("Import a saved game")}
                    </button>
                    <a
                      className="text-button light"
                      href={rulesUrl()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <BookOpen size={17} />
                      {tx("Learn to play")}
                    </a>
                  </div>
                ),
              )}
              <div className="menu-footer">
                {tx(
                  "A complete local strategy game. No account. No subscription. Your campaign stays in your browser.",
                )}
              </div>
            </div>
          </main>
        ) : (
          game && (
            <div className="game-shell">
              <header className="topbar">
                <button
                  className="brand"
                  aria-label={tx("Open campaign menu")}
                  onClick={() => setDialog({ type: "settings" })}
                >
                  <Compass size={27} />
                  <span>{tx("FRONTIERS")}</span>
                </button>
                <div className="campaign-label">
                  <b>
                    {tx("Round ")}
                    {tx(game.round)}
                  </b>
                  <span className="seed-label" title={tx(game.seed)}>
                    {tx(game.seed)}
                  </span>
                </div>
                <SeasonCalendar
                  game={game}
                  preview={seasonPreview}
                  onPreview={setSeasonPreview}
                />
                <div className="turn-banner">
                  <div className="turn-identity">
                    <span
                      className="turn-flag"
                      style={{ background: player?.color }}
                    >
                      <Flag size={18} />
                    </span>
                    <div>
                      <b>
                        {tx(
                          game.phase === "finished"
                            ? "The frontier is united"
                            : `${player?.name}’s turn`,
                        )}
                      </b>
                      <span>
                        {tx(
                          roll.rolling
                            ? "Rolling the dice…"
                            : PHASE_NAMES[game.phase],
                        )}
                        {tx(busy ? " · planning…" : "")}
                        {tx(paused ? " · AI paused" : "")}
                      </span>
                    </div>
                  </div>
                  <button
                    className={`dice ${roll.rolling ? "is-rolling" : ""}`}
                    aria-label={tx("View last roll")}
                    title={tx(
                      roll.rolling
                        ? "Rolling the dice"
                        : roll.last
                          ? "View the last roll and every realm’s production"
                          : "Roll dice to produce resources",
                    )}
                    onClick={roll.replay}
                    disabled={!roll.last || roll.rolling}
                  >
                    <DiceFace
                      value={
                        roll.rolling
                          ? 5
                          : (game.dice?.[0] ?? roll.last?.dice[0] ?? 5)
                      }
                      dormant={roll.rolling || (!game.dice && !roll.last)}
                    />
                    <DiceFace
                      value={
                        roll.rolling
                          ? 3
                          : (game.dice?.[1] ?? roll.last?.dice[1] ?? 3)
                      }
                      dormant={roll.rolling || (!game.dice && !roll.last)}
                    />
                    <span className="dice-total">
                      <small>
                        {tx(!game.dice && roll.last ? "LAST" : "ROLL")}
                      </small>
                      <b>
                        {tx(
                          roll.rolling
                            ? "…"
                            : game.dice
                              ? game.dice[0] + game.dice[1]
                              : roll.last
                                ? roll.last.dice[0] + roll.last.dice[1]
                                : "·",
                        )}
                      </b>
                    </span>
                    {tx(
                      roll.last && (
                        <RotateCcw className="dice-replay" size={12} />
                      ),
                    )}
                  </button>
                </div>
                <div className="topbar-actions">
                  {tx(" ")}
                  <button
                    className="mobile-actions-button icon-button"
                    aria-label={tx("Actions & realm")}
                    aria-expanded={mobilePanel}
                    title={tx("Toggle inspector")}
                    onClick={() => setMobilePanel((v) => !v)}
                  >
                    <Factory size={18} />
                    <span className="sr-only">{tx("Actions & realm")}</span>
                  </button>
                  <button
                    className="icon-button"
                    aria-label={tx("Realms & chronicle")}
                    aria-expanded={realmsOpen}
                    onClick={() => setRealmsOpen((v) => !v)}
                    title={tx("Realms and recent events")}
                  >
                    <Users size={18} />
                  </button>
                  <span
                    className={`save-status ${saveError ? "bad" : ""}`}
                    title={tx(
                      saveError ||
                        (saving
                          ? "Saving…"
                          : "Every action is saved automatically"),
                    )}
                  >
                    <Check size={13} />
                    {tx(
                      saveError
                        ? "Save issue"
                        : saving
                          ? "Saving…"
                          : "Saved locally",
                    )}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={tx("How to play")}
                    onClick={() => setHelp(true)}
                  >
                    <BookOpen size={19} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={tx(
                      sound ? "Mute game sounds" : "Enable game sounds",
                    )}
                    onClick={() => setSound((v) => !v)}
                  >
                    {tx(sound ? <Volume2 size={19} /> : <VolumeX size={19} />)}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={tx("Game settings and saves")}
                    onClick={() => setDialog({ type: "settings" })}
                  >
                    <Settings size={19} />
                  </button>
                </div>
                <div className="turn-buttons">
                  <button
                    className="icon-button"
                    aria-label={tx(paused ? "Resume AI" : "Pause AI")}
                    onClick={() => setPaused((v) => !v)}
                  >
                    {tx(paused ? <Play size={17} /> : <Pause size={17} />)}
                  </button>
                  {tx(
                    interactive && game.phase === "roll" && (
                      <button
                        className="primary"
                        onClick={() => commit({ type: "roll" })}
                      >
                        {tx("Roll dice ")}
                        <ArrowRight size={17} />
                      </button>
                    ),
                  )}
                  {tx(
                    interactive && game.phase === "economy" && (
                      <button
                        className="primary"
                        onClick={() => commit({ type: "end-turn" })}
                      >
                        {tx("End turn ")}
                        <ArrowRight size={17} />
                      </button>
                    ),
                  )}
                </div>
              </header>
              <section
                className="resource-bar"
                aria-label={tx(`${game.players[viewer].name} pooled resources`)}
              >
                <div className="resource-bar-label">
                  <PackageIcon />
                  <span>
                    {tx("YOUR STORES")}
                    <small>{game.players[viewer].name}</small>
                  </span>
                </div>
                <div className="resource-rows">
                  {tx(
                    [
                      RAW.filter((good) => good !== "oil"),
                      [...PROCESSED, "oil" as const],
                    ].map((goods, i) => (
                      <div className="resource-row-shell" key={i}>
                        <span className="resource-kind">
                          {tx(i === 0 ? "RAW" : "GOODS")}
                        </span>
                        <div className="resource-row">
                          {tx(
                            goods.map((g) => (
                              <button
                                key={g}
                                className={`resource-chip ${(production[g] ?? 0) > 0 ? "produced" : ""} ${(stock[g] ?? 0) === 0 ? "empty-resource" : ""}`}
                                title={tx(
                                  `${GOOD_INFO[g].name}: ${stock[g] ?? 0}. ${RAW.includes(g as (typeof RAW)[number]) ? "Raw resource" : "Processed good"}. Click for production, stores and recipes.`,
                                )}
                                aria-label={tx(
                                  `${GOOD_INFO[g].name}: ${stock[g] ?? 0}`,
                                )}
                                onClick={() => {
                                  setDialog({ type: "good", good: g });
                                }}
                              >
                                <GoodIcon good={g} size={26} />
                                <span>{tx(GOOD_INFO[g].name)}</span>
                                <b>
                                  {tx(
                                    (stock[g] ?? 0) >= 10000
                                      ? new Intl.NumberFormat("en", {
                                          notation: "compact",
                                          maximumFractionDigits: 1,
                                        }).format(stock[g]!)
                                      : (stock[g] ?? 0),
                                  )}
                                </b>
                                {tx(
                                  !!rollGains[g] && (
                                    <em
                                      className="resource-gain"
                                      aria-hidden="true"
                                    >
                                      +{tx(rollGains[g])}
                                    </em>
                                  ),
                                )}
                              </button>
                            )),
                          )}
                        </div>
                      </div>
                    )),
                  )}
                </div>
              </section>
              <div
                className={`play-layout ${mobilePanel ? "inspector-open" : ""}`}
              >
                <aside
                  className={`left-panel ${realmsOpen ? "realm-open" : ""}`}
                  aria-label={tx("Realms and chronicle")}
                  inert={!realmsOpen}
                >
                  <button
                    className="icon-button realm-close"
                    aria-label={tx("Close realms and chronicle")}
                    onClick={() => setRealmsOpen(false)}
                  >
                    <X size={18} />
                  </button>
                  <span className="eyebrow">
                    {tx("THE")}
                    {tx(" ")}
                    {tx(
                      (
                        {
                          4: "FOUR",
                          5: "FIVE",
                          8: "EIGHT",
                          10: "TEN",
                        } as Record<number, string>
                      )[game.players.length],
                    )}
                    {tx(" ")}
                    {tx("REALMS")}
                  </span>
                  {tx(
                    realmsOpen && (
                      <FactionStandings
                        game={game}
                        viewer={viewer}
                        interactive={interactive}
                        onAction={commit}
                      />
                    ),
                  )}
                  <div className="chronicle">
                    <div className="section-title">
                      <h3>{tx("Chronicle")}</h3>
                      <span className="count">{tx(game.events.length)}</span>
                    </div>
                    <div
                      className="event-list"
                      tabIndex={0}
                      aria-label={tx("Recent game events")}
                    >
                      {tx(
                        [...game.events]
                          .filter(
                            (e) =>
                              !roll.rolling || e.id !== game.events.at(-1)?.id,
                          )
                          .reverse()
                          .slice(0, 30)
                          .map((e, i) => (
                            <div
                              className={`event event-${e.kind}`}
                              key={`${e.id}-${i}`}
                            >
                              <span className="event-dot" />
                              <div>
                                <small>
                                  {tx("ROUND ")}
                                  {tx(e.turn)}
                                </small>
                                <p>{tx(e.text)}</p>
                              </div>
                            </div>
                          )),
                      )}
                    </div>
                  </div>
                </aside>
                <main className="map-area">
                  {tx(
                    game.phase.startsWith("setup") && (
                      <div className="setup-instruction">
                        <span className="eyebrow">
                          {tx("FOUNDING THE REALM ·")}
                          {tx(" ")}
                          {tx(
                            Math.min(
                              game.players.length * 2,
                              game.setupIndex + 1,
                            ),
                          )}{" "}
                          /{tx(" ")}
                          {tx(game.players.length * 2)}
                        </span>
                        <b>
                          {tx(
                            game.phase === "setup-town"
                              ? "Choose a highlighted intersection for your settlement."
                              : "Choose a highlighted edge for your starting road or ship route.",
                          )}
                        </b>
                        <small>
                          {tx(
                            game.phase === "setup-town"
                              ? "Good numbers and a variety of resources make a strong beginning."
                              : "Your second settlement starts with one resource from each adjacent land tile.",
                          )}
                        </small>
                        {tx(
                          game.phase === "setup-route" && interactive && (
                            <div className="segmented setup-kind">
                              <button
                                className={mode !== "route" ? "active" : ""}
                                onClick={() => setMode("road")}
                              >
                                {tx("Road")}
                              </button>
                              <button
                                className={mode === "route" ? "active" : ""}
                                onClick={() => setMode("route")}
                              >
                                {tx("Ship route")}
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    ),
                  )}
                  {tx(
                    roll.presentation && !dialog && !help && !handoff && (
                      <RollExperience
                        presentation={roll.presentation}
                        onClose={roll.close}
                        onReveal={roll.reveal}
                        onKeep={roll.keep}
                      />
                    ),
                  )}
                  <Board
                    viewer={viewer}
                    game={game}
                    seasonPreview={seasonPreview}
                    onSeasonPreviewChange={setSeasonPreview}
                    focus={alertFocus}
                    rolling={roll.rolling}
                    productionTiles={
                      roll.presentation?.phase === "revealed"
                        ? (roll.presentation.report.tiles ?? [])
                        : []
                    }
                    selection={selection}
                    onSelect={select}
                    onInspectSiege={(town) =>
                      setDialog({ type: "siege-info", town })
                    }
                    onInspectTowerSiege={(vertex) =>
                      setDialog({ type: "tower-siege-info", vertex })
                    }
                    mode={mode}
                    unitIds={unitIds}
                    onBuild={build}
                    onMove={move}
                    interactive={interactive}
                    expeditionPreview={preview}
                  />
                </main>
                <nav
                  className="panel-tabs command-rail"
                  aria-label={tx("Game actions")}
                >
                  {tx(
                    TABS.map((t) => (
                      <button
                        key={t.id}
                        title={tx(
                          `${t.label} (${({ build: "B", forces: "F", trade: "T", research: "R", explore: "E" } as Record<string, string>)[t.id] ?? ""})`,
                        )}
                        className={tab === t.id ? "active" : ""}
                        onClick={() => {
                          setMobilePanel(true);
                          setRealmsOpen(false);
                          setTab(t.id);
                          setMode("inspect");
                          setPreview([]);
                        }}
                        aria-pressed={tab === t.id}
                      >
                        <t.icon size={17} />
                        <span>{tx(t.label)}</span>
                      </button>
                    )),
                  )}
                </nav>
                <aside
                  className={`right-panel ${mobilePanel ? "mobile-open" : ""}`}
                  aria-label={tx("Action inspector")}
                  inert={!mobilePanel}
                >
                  <button
                    className="mobile-panel-close icon-button"
                    aria-label={tx("Close action panel")}
                    onClick={() => setMobilePanel(false)}
                  >
                    <X size={20} />
                  </button>
                  <DetailHeader
                    viewer={viewer}
                    game={game}
                    selection={selection}
                    unitIds={unitIds}
                  />
                  <Panels
                    game={game}
                    viewer={viewer}
                    privateHandVisible={
                      humanCount <= 1 ||
                      (responsibleHuman &&
                        acknowledged === responsible &&
                        !handoff)
                    }
                    interactive={interactive}
                    tab={tab}
                    selection={selection}
                    onSelect={select}
                    mode={mode}
                    setMode={(m) => {
                      setMode(m);
                      if (
                        m === "road" ||
                        m === "route" ||
                        m === "settlement" ||
                        m === "camp" ||
                        m === "move-route" ||
                        m === "move"
                      )
                        setMobilePanel(false);
                    }}
                    unitIds={unitIds}
                    setUnitIds={setUnitIds}
                    onAction={commit}
                    openDialog={setDialog}
                    onPreview={setPreview}
                  />
                </aside>
              </div>
              {tx(
                saveError && (
                  <div className="save-warning" role="alert">
                    {tx(saveError)}
                    <button
                      onClick={() => {
                        void downloadGame(game).catch(() =>
                          setToast(
                            "The game could not be exported. Please try again.",
                          ),
                        );
                      }}
                    >
                      {tx("Export now")}
                    </button>
                  </div>
                ),
              )}
            </div>
          )
        ),
      )}
      {tx(
        game && !menu && !handoff && !help && !dialog && (
          <TownAlerts
            game={game}
            viewer={viewer}
            notices={townAlerts.notices}
            onDismiss={townAlerts.dismiss}
            onShow={(vertex, request) => {
              roll.close();
              select({ type: "vertex", id: vertex });
              setAlertFocus({ vertex, request });
              setMobilePanel(false);
              setTab("build");
              townAlerts.dismiss(request);
            }}
          />
        ),
      )}
      {tx(
        game && !menu && !handoff && !help && !dialog && (
          <RebellionAlert
            game={game}
            notices={townAlerts.notices}
            onDismiss={townAlerts.dismiss}
            onShow={(vertex, request) => {
              roll.close();
              select({ type: "vertex", id: vertex });
              setAlertFocus({ vertex, request });
              setMobilePanel(false);
              setTab("build");
              townAlerts.dismiss(request);
            }}
          />
        ),
      )}
      {tx(
        toast && (
          <div className="toast" role="alert">
            <Info size={18} />
            <span>{tx(toast)}</span>
            <button
              aria-label={tx("Dismiss notification")}
              onClick={() => setToast("")}
            >
              <X size={16} />
            </button>
          </div>
        ),
      )}
      {tx(help && <HelpDialog onClose={() => setHelp(false)} />)}
      {tx(
        game && !menu && !help && handoff && (
          <Modal title={tx(`Pass to ${game.players[responsible].name}`)}>
            <div className="handoff">
              <Users size={48} />
              <p>
                {tx(
                  "Keep research hands private. Pass the screen to the indicated player before continuing.",
                )}
              </p>
              <button
                className="primary full"
                onClick={() => setAcknowledged(responsible)}
              >
                {tx("I am ")}
                {game.players[responsible].name}
              </button>
            </div>
          </Modal>
        ),
      )}
      {tx(
        game &&
          !menu &&
          !help &&
          !handoff &&
          !dialog &&
          !autoplay &&
          responsibleHuman &&
          (game.battle ? (
            <BattleDialog
              key={`battle-${game.actions}`}
              game={game}
              onAction={commit}
            />
          ) : game.allianceOffer ? (
            <AllianceResponse game={game} onAction={commit} />
          ) : game.trade ? (
            <TradeResponse game={game} onAction={commit} />
          ) : game.researchChoice ? (
            <DrawDialog game={game} onAction={commit} />
          ) : null),
      )}
      {tx(
        game && !menu && !help && !handoff && dialog && (
          <>
            {tx(
              dialog.type === "good" ? (
                <GoodGuide
                  game={game}
                  good={dialog.good as Good}
                  viewer={viewer}
                  onClose={() => setDialog(null)}
                  onTrade={() => {
                    setDialog(null);
                    setTab("trade");
                    setMobilePanel(true);
                  }}
                />
              ) : dialog.type === "tower-siege-info" ? (
                <TowerSiegeDetails
                  game={game}
                  vertex={dialog.vertex as string}
                  onClose={() => setDialog(null)}
                />
              ) : dialog.type === "siege-info" ? (
                <SiegeDetails
                  game={game}
                  townId={dialog.town as string}
                  onClose={() => setDialog(null)}
                />
              ) : dialog.type === "raid" ? (
                <RaidDialog
                  game={game}
                  ids={dialog.ids as string[]}
                  town={dialog.town as string}
                  onAction={commit}
                  onClose={() => setDialog(null)}
                />
              ) : dialog.type === "research" ? (
                <ResearchPlayDialog
                  game={game}
                  cardId={dialog.cardId as string}
                  onAction={commit}
                  onClose={() => setDialog(null)}
                />
              ) : dialog.type === "transport" ? (
                <TransportDialog
                  game={game}
                  land={dialog.land as string}
                  water={dialog.water as string}
                  unload={dialog.unload as boolean}
                  onAction={commit}
                  onClose={() => setDialog(null)}
                />
              ) : dialog.type === "trade-compose" ? (
                <TradeComposer
                  game={game}
                  onAction={commit}
                  onClose={() => setDialog(null)}
                />
              ) : dialog.type === "attack" ? (
                <AttackPreview
                  game={game}
                  ids={dialog.ids as string[]}
                  to={dialog.to as string}
                  bombardment={dialog.bombardment === true}
                  onAction={commit}
                  onClose={() => setDialog(null)}
                />
              ) : dialog.type === "confirm" ? (
                <Modal
                  title={tx(dialog.title as string)}
                  onClose={() => setDialog(null)}
                >
                  <p>{tx(dialog.text as string)}</p>
                  <div className="button-row">
                    <button
                      className="secondary"
                      onClick={() => setDialog(null)}
                    >
                      {tx("Cancel")}
                    </button>
                    <button
                      className="danger"
                      onClick={() => commit(dialog.command as Command)}
                    >
                      {tx("Confirm destruction")}
                    </button>
                  </div>
                </Modal>
              ) : dialog.type === "settings" ? (
                <Modal
                  title={tx("Campaign & settings")}
                  onClose={() => setDialog(null)}
                >
                  <LanguageSwitch />
                  <div className="settings-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        void downloadGame(game).catch(() =>
                          setToast(
                            "The game could not be exported. Please try again.",
                          ),
                        );
                      }}
                    >
                      <Download size={18} />
                      {tx("Export saved game")}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload size={18} />
                      {tx("Import saved game")}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setMenu(true);
                        setDialog(null);
                      }}
                    >
                      <Compass size={18} />
                      {tx("Return to campaign menu")}
                    </button>
                    <a
                      className="secondary"
                      href={rulesUrl()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <BookOpen size={18} />
                      {tx("Complete rulebook")}
                    </a>
                    <button
                      className="secondary"
                      onClick={() => setDialog({ type: "roster" })}
                    >
                      <Shield size={18} />
                      {tx("Unit roster & artwork")}
                    </button>
                  </div>
                  <label className="field">
                    {tx("AI pacing")}
                    <select
                      value={aiSpeed}
                      onChange={(e) => {
                        const speed = Number(e.target.value);
                        setAiSpeed(speed);
                        try {
                          localStorage.setItem(
                            "catane-ai-pacing",
                            String(speed),
                          );
                        } catch {
                          /* Pacing still works when storage is unavailable. */
                        }
                      }}
                    >
                      <option value={20}>
                        {tx("ULTRA FAST · 20 ms between actions")}
                      </option>
                      <option value={80}>
                        {tx("Fast · 80 ms between actions")}
                      </option>
                      <option value={250}>{tx("Normal · 250 ms")}</option>
                      <option value={800}>{tx("Relaxed · 800 ms")}</option>
                    </select>
                  </label>
                  <p className="muted">
                    {tx(
                      "Pacing changes the pause between actions. All speeds use the same full AI planning; calculation time is additional. Ultra Fast groups peaceful moves; battles and player decisions stay separate.",
                    )}
                  </p>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={autoplay}
                      onChange={(e) => setAutoplay(e.target.checked)}
                    />
                    {tx("Autoplay human seats (spectate the campaign)")}
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={paused}
                      onChange={(e) => setPaused(e.target.checked)}
                    />
                    {tx("Pause AI turns")}
                  </label>
                  <p className="muted small">
                    {tx(
                      "Everything runs locally. Autosave keeps a backup of the preceding action. Export saves to move a campaign between browsers.",
                    )}
                  </p>
                  {tx(
                    interactive && !game.phase.startsWith("setup") && (
                      <button
                        className="text-button danger-text"
                        onClick={() => setDialog({ type: "surrender" })}
                      >
                        {tx("Surrender this realm")}
                      </button>
                    ),
                  )}
                </Modal>
              ) : dialog.type === "surrender" ? (
                <Modal
                  title={tx("Surrender your realm?")}
                  onClose={() => setDialog(null)}
                >
                  <p>
                    {tx(
                      "This eliminates your towns and forces immediately. Your rivals will continue the campaign.",
                    )}
                  </p>
                  <div className="button-row">
                    <button
                      className="secondary"
                      onClick={() => setDialog(null)}
                    >
                      {tx("Keep fighting")}
                    </button>
                    <button
                      className="danger"
                      onClick={() => commit({ type: "surrender" })}
                    >
                      {tx("Surrender")}
                    </button>
                  </div>
                </Modal>
              ) : dialog.type === "roster" ? (
                <Modal
                  title={tx("The armies of Catane")}
                  onClose={() => setDialog(null)}
                  wide
                >
                  <div className="troop-roster">
                    {tx(
                      Object.entries(UNIT_INFO).map(([kind, info]) => (
                        <section key={kind}>
                          <h3>{tx(info.name)}</h3>
                          {tx(
                            info.names.map((name, i) => (
                              <div className="recruit-heading" key={name}>
                                <MilitaryPortrait
                                  unit={{
                                    kind: kind as keyof typeof UNIT_INFO,
                                    tier: i + 1,
                                    naval: false,
                                  }}
                                />
                                <div>
                                  <span className="unit-category">
                                    {tx("Tier ")}
                                    {tx(ROMAN[i + 1])} · {tx(i + 1)}
                                    {tx(" power")}
                                  </span>
                                  <b>{tx(name)}</b>
                                </div>
                              </div>
                            )),
                          )}
                        </section>
                      )),
                    )}
                  </div>
                  <p className="muted">
                    {tx(
                      "Tier I / II / III / IV has 1 / 2 / 3 / 4 power. Terrain bonuses double that power. Units are built directly at their tier; whole units are removed as casualties.",
                    )}
                  </p>
                </Modal>
              ) : null,
            )}
          </>
        ),
      )}
      {tx(
        game && !menu && !help && !dialog && game.phase === "finished" && (
          <Modal
            title={tx(`${game.players[game.winner!].name} wins the campaign`)}
          >
            <div className="victory">
              <Crown size={64} />
              <h2>
                {tx(
                  game.winner === viewer
                    ? "The frontier is yours."
                    : "The frontier is united.",
                )}
              </h2>
              <p>
                {tx("Every rival town has fallen. Victory after ")}
                {tx(game.round)}
                {tx(" rounds across ")}
                {tx(Object.keys(game.tiles).length)}
                {tx(" discovered hexes.")}
              </p>
              <button
                className="primary full"
                onClick={() => {
                  setMenu(true);
                  setNewSetup(true);
                }}
              >
                {tx("Begin a new campaign")}
              </button>
              <button
                className="secondary full"
                onClick={() => {
                  void downloadGame(game).catch(() =>
                    setToast(
                      "The game could not be exported. Please try again.",
                    ),
                  );
                }}
              >
                {tx("Export this victory")}
              </button>
            </div>
          </Modal>
        ),
      )}
    </>
  );
}
function PackageIcon() {
  useLocale();

  return <Factory size={23} />;
}
function NewGameForm({
  onStart,
  onCancel,
  existing,
}: {
  onStart: (seed: string, config: PlayerConfig[]) => void;
  onCancel: () => void;
  existing: boolean;
}) {
  useLocale();

  const [seed, setSeed] = useState(
      () =>
        `frontier-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
    ),
    [config, setConfig] = useState<PlayerConfig[]>(
      REALM_NAMES.slice(0, 5).map((name, i) => ({
        name,
        control: i === 0 ? "human" : "standard",
      })),
    );
  return (
    <form
      className="new-game-form"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(seed.trim(), config);
      }}
    >
      <label className="field">
        {tx("World seed")}
        <div className="seed-input">
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            maxLength={120}
            required
            aria-label={tx("World seed")}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={tx("Generate a new random seed")}
            onClick={() =>
              setSeed(
                `frontier-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
              )
            }
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </label>
      <label className="field">
        {tx("Campaign size")}
        <select
          aria-label={tx("Campaign size")}
          value={config.length}
          onChange={(e) => {
            const count = Number(e.target.value);
            setConfig((current) =>
              REALM_NAMES.slice(0, count).map(
                (name, i) => current[i] ?? { name, control: "standard" },
              ),
            );
          }}
        >
          <option value={5}>{tx("Classic · 5 factions · 125 tiles")}</option>
          <option value={10}>
            {tx("Grand campaign · 10 factions · 250 tiles")}
          </option>
        </select>
      </label>
      <div className="player-setup">
        {tx(
          config.map((p, i) => (
            <div key={i}>
              <span className="color-pip" style={{ background: COLORS[i] }} />
              <input
                aria-label={tx(`Realm ${i + 1} name`)}
                value={p.name}
                maxLength={30}
                onChange={(e) =>
                  setConfig((v) =>
                    v.map((p, j) =>
                      i === j ? { ...p, name: e.target.value } : p,
                    ),
                  )
                }
              />
              <select
                aria-label={tx(`Realm ${i + 1} controller`)}
                value={p.control}
                onChange={(e) =>
                  setConfig((v) =>
                    v.map((p, j) =>
                      i === j
                        ? {
                            ...p,
                            control: e.target.value as PlayerConfig["control"],
                          }
                        : p,
                    ),
                  )
                }
              >
                <option value="human">{tx("Human")}</option>
                <option value="easy">{tx("AI · Easy")}</option>
                <option value="standard">{tx("AI · Standard")}</option>
                <option value="hard">{tx("AI · Hard")}</option>
              </select>
            </div>
          )),
        )}
      </div>
      {tx(
        existing && (
          <p className="muted small">
            {tx(
              "Starting replaces the browser’s current campaign. Export it first if you want to keep it.",
            )}
          </p>
        ),
      )}
      <div className="button-row">
        <button type="button" className="secondary" onClick={onCancel}>
          {tx("Back")}
        </button>
        <button className="primary" type="submit">
          {tx("Found your realm ")}
          <ArrowRight size={17} />
        </button>
      </div>
    </form>
  );
}
function HelpDialog({ onClose }: { onClose: () => void }) {
  useLocale();

  return (
    <Modal title={tx("Welcome to the frontier")} onClose={onClose} wide>
      <div className="help-grid">
        <article>
          <Flag />
          <h3>{tx("1. Choose your home")}</h3>
          <p>
            {tx(
              "Place two settlements with a road or ship route each. Towns must stay at least two edges apart. Favor good dice numbers and useful resource variety.",
            )}
          </p>
        </article>
        <article>
          <Factory />
          <h3>{tx("2. Build an economy")}</h3>
          <p>
            {tx(
              "Each roll produces for every faction from active seasonal tiles, including seven. A season lasts two full rounds, early and late. Check each tile's four-season forecast, then build, trade and command in any order. Cities, camps and workshops multiply the current harvest.",
            )}
          </p>
        </article>
        <article>
          <Shield />
          <h3>{tx("3. Command your forces")}</h3>
          <p>
            {tx(
              "Recruit at towns, then wait until next turn to move. Select a stack and open Composition to split it. In Forces, choose Army or Navy, a town, tier, deployment tile and quantity to recruit in one order. Matching terrain doubles a unit’s power. The loser removes whole units based on the power difference.",
            )}
          </p>
        </article>
        <article>
          <Compass />
          <h3>{tx("4. Explore and conquer")}</h3>
          <p>
            {tx(
              "Fund expeditions from a frontier route or town. Clear every adjacent defender before besieging a town. Raid first, then destroy on a later turn. Eliminate all rival towns to win.",
            )}
          </p>
        </article>
      </div>
      <div className="notice">
        <b>{tx("Important:")}</b>
        {tx(
          " Your goods are pooled for spending but stored in individual towns. Armies block enemy production on their hex. Raids send all seized goods to your nearest town. One ship berth carries one unit; loading and unloading each spend a turn.",
        )}
      </div>
      <p>
        {tx(
          "Use the action tabs for construction, armies, bank and player trade, research, and expeditions. Hover a disabled action to see its rule restriction. Drag the map to pan and use the zoom controls. The top bar keeps your dice and turn actions within reach. Realms & chronicle opens standings and history. Press B, F, T, R or E to open Build, Forces, Trade, Research or Explore; Escape closes the inspector.",
        )}
      </p>
      <div className="button-row">
        <a
          className="secondary"
          href={rulesUrl()}
          target="_blank"
          rel="noreferrer"
        >
          {tx("Read the complete rules")}
        </a>
        <button className="primary" onClick={onClose}>
          {tx("Let’s begin ")}
          <ArrowRight size={17} />
        </button>
      </div>
    </Modal>
  );
}
function TradeComposer({
  game: s,
  onAction,
  onClose,
}: {
  game: Game;
  onAction: (c: Command) => void;
  onClose: () => void;
}) {
  useLocale();

  const [partner, setPartner] = useState(
      s.players.find((p) => p.alive && p.id !== s.active)!.id,
    ),
    [give, setGive] = useState<Stock>({}),
    [take, setTake] = useState<Stock>({});
  return (
    <Modal title={tx("Make a trade offer")} onClose={onClose} wide>
      <label className="field">
        {tx("Trading partner")}
        <select
          value={partner}
          onChange={(e) => {
            setPartner(Number(e.target.value));
            setTake({});
          }}
        >
          {tx(
            s.players
              .filter((p) => p.alive && p.id !== s.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              )),
          )}
        </select>
      </label>
      <div className="trade-columns">
        <div>
          <h3>{tx("You give")}</h3>
          <GoodsPicker
            value={give}
            onChange={setGive}
            available={inventory(s)}
          />
        </div>
        <div>
          <h3>{tx("You request")}</h3>
          <GoodsPicker
            value={take}
            onChange={setTake}
            available={inventory(s, partner)}
          />
        </div>
      </div>
      <button
        className="primary full"
        disabled={!sumStock(give) || !sumStock(take)}
        onClick={() => onAction({ type: "offer-trade", partner, give, take })}
      >
        {tx("Send offer")}
      </button>
    </Modal>
  );
}
function AttackPreview({
  game: s,
  bombardment = false,
  ids,
  to,
  onAction,
  onClose,
}: {
  game: Game;
  ids: string[];
  to: string;
  bombardment?: boolean;
  onAction: (c: Command) => void;
  onClose: () => void;
}) {
  useLocale();

  const units = ids.map((id) => s.pieces[id]),
    defenders = bombardment
      ? fleetDefenders(s, to)
      : piecesAt(s, to).filter((u) => !friendly(s, u.owner, s.active)),
    a = bombardment ? bombardmentPower(s, units) : power(s, units, to),
    d = power(s, defenders, to),
    diff = Math.abs(a - d);
  return (
    <Modal
      title={tx(
        bombardment ? "Review shore bombardment" : "Review your attack",
      )}
      onClose={onClose}
    >
      <p>
        {tx(
          bombardment ? (
            "Artillery fires from shore at ×2 power. Ships retaliate at normal power. Watchtower support is included. Costs 1 movement point; artillery stays on land and can act again with remaining points."
          ) : (
            <>
              {tx("Battle on ")}
              <b>{tx(terrainName(s.tiles[to]))}</b>
              {tx(
                ". Terrain bonuses are included. Walls do not affect field battles. Each approach tile costs 1 point, including the battle tile. Survivors may act again with remaining points.",
              )}
            </>
          ),
        )}
      </p>
      <div className="battle-powers">
        <div>
          <small>{tx("Your attack")}</small>
          <strong>{tx(a)}</strong>
          <span>
            {tx(units.length)}
            {tx(" pieces")}
          </span>
        </div>
        <span className="crossed-swords">⚔</span>
        <div>
          <small>{tx("Enemy defense")}</small>
          <strong>{tx(d)}</strong>
          <span>
            {tx(defenders.length)}
            {tx(" pieces")}
          </span>
        </div>
      </div>
      <p className={a > d ? "notice" : "warning-inline"}>
        {tx(
          a === d
            ? "A tie: no casualties; both forces hold their positions."
            : `${a > d ? "You win" : "You lose"}. The losing army removes at least ${diff} unit points, rounding up to whole units. The winner takes no casualties.`,
        )}
      </p>
      <div className="button-row">
        <button className="secondary" onClick={onClose}>
          {tx("Cancel")}
        </button>
        <button
          className="danger"
          onClick={() =>
            onAction({ type: bombardment ? "bombard" : "move", ids, to })
          }
        >
          {tx(bombardment ? "Bombard fleet" : "Attack")}
        </button>
      </div>
    </Modal>
  );
}
