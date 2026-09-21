import { SEASON_LABELS } from "./SeasonCalendar";
import { localize as tx, useLocale } from "../i18n";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Pin, X, ChevronsRight, Sparkles } from "lucide-react";
import type { Game } from "../game/types";
import { GOODS } from "../game/types";
import { GOOD_INFO } from "../game/content";
import { ResourceIcon } from "./ResourceIcon";
import { DiceFace } from "./MapPieces";
import { rollReport, type RollReport } from "./roll-report";

const reportDuration = (automatic: boolean) => (automatic ? 1800 : 3000);

interface Presentation {
  report: RollReport;
  phase: "rolling" | "revealed";
  pinned: boolean;
}
export function useRollPresentation(initial: Game | null) {
  const [last, setLast] = useState(() =>
    initial ? rollReport(initial) : null,
  );
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const locked = useRef(false);
  const close = useCallback(() => {
    locked.current = false;
    setPresentation(null);
  }, []);
  const reveal = useCallback(() => {
    locked.current = false;
    setPresentation((p) => (p ? { ...p, phase: "revealed" } : null));
  }, []);
  const begin = useCallback((game: Game) => {
    const report = rollReport(game, true);
    if (!report) return;
    // Announce every turn and its harvest immediately, without a dice delay.
    locked.current = false;
    setLast(report);
    setPresentation({
      report,
      phase: "revealed",
      pinned: false,
    });
  }, []);
  const reset = useCallback((game: Game) => {
    locked.current = false;
    setPresentation(null);
    setLast(rollReport(game));
  }, []);
  const keep = useCallback(
    () => setPresentation((p) => (p ? { ...p, pinned: true } : null)),
    [],
  );
  const replay = useCallback(() => {
    if (last) {
      locked.current = false;
      setPresentation({ report: last, phase: "revealed", pinned: true });
    }
  }, [last]);
  useEffect(() => {
    if (!presentation || presentation.pinned) return;
    const timer = setTimeout(
      presentation.phase === "rolling" ? reveal : close,
      presentation.phase === "rolling"
        ? 1100
        : reportDuration(presentation.report.automatic),
    );
    return () => clearTimeout(timer);
  }, [presentation, close, reveal]);
  return {
    presentation,
    last,
    locked,
    begin,
    reset,
    close,
    reveal,
    keep,
    replay,
    rolling: presentation?.phase === "rolling",
  };
}

const ORIENTATIONS = [
  "",
  "rotateY(0deg)",
  "rotateY(-90deg)",
  "rotateX(-90deg)",
  "rotateX(90deg)",
  "rotateY(90deg)",
  "rotateY(180deg)",
];
function Die({ value, second }: { value: number; second?: boolean }) {
  useLocale();

  return (
    <div
      className={`roll-die ${second ? "second" : ""}`}
      aria-hidden="true"
      style={{ "--landing": ORIENTATIONS[value] } as CSSProperties}
    >
      <div className="die-rotor">
        {tx(
          [1, 2, 3, 4, 5, 6].map((face) => (
            <div className={`die-plane face-${face}`} key={face}>
              <DiceFace value={face} />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
export function RollExperience({
  presentation: p,
  onClose,
  onReveal,
  onKeep,
}: {
  presentation: Presentation;
  onClose: () => void;
  onReveal: () => void;
  onKeep: () => void;
}) {
  useLocale();

  const rolling = p.phase === "rolling",
    r = p.report,
    actor = r.players.find((v) => v.id === r.actor)!,
    total = r.dice[0] + r.dice[1];
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (rolling) onReveal();
        else onClose();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [rolling, onClose, onReveal]);
  const announcement = rolling
    ? `${actor.name} is rolling.`
    : `${actor.name} rolled ${total}. ${r.players
        .map(
          (player) =>
            `${player.name}: ${
              player.total
                ? GOODS.filter((g) => player.goods[g])
                    .map((g) => `${player.goods[g]} ${GOOD_INFO[g].name}`)
                    .join(", ")
                : "no production"
            }.`,
        )
        .join(" ")}`;
  return (
    <section
      className={`roll-experience ${rolling ? "is-rolling" : "is-revealed"}`}
      aria-label={tx("Dice roll and production")}
      data-roll-id={r.id}
    >
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {tx(announcement)}
      </div>
      <div className="roll-heading">
        <span
          className="roll-owner"
          style={{ background: actor.color }}
          aria-hidden="true"
        >
          {tx(actor.name[0])}
        </span>
        <div>
          <span className="eyebrow">
            {tx("ROUND ")}
            {tx(r.round)} ·{" "}
            {r.season && <>{tx(r.seasonLabel ?? SEASON_LABELS[r.season])} · </>}
            {tx(rolling ? "CASTING THE DICE" : "HARVEST REPORT")}
          </span>
          <h2>
            {actor.name}
            {tx(" ")}
            {tx(
              rolling ? (
                "rolls…"
              ) : (
                <>
                  {tx("rolled ")}
                  <strong>{tx(total)}</strong>
                </>
              ),
            )}
          </h2>
        </div>
        {tx(
          !rolling && (
            <button
              className="roll-close"
              aria-label={tx("Close roll report")}
              title={tx("Close roll report")}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          ),
        )}
      </div>
      <div className="dice-theatre" aria-hidden="true">
        <div className="dice-rings" />
        <div className="dice-pair">
          <Die value={r.dice[0]} />
          <Die value={r.dice[1]} second />
        </div>
        <div className="roll-result">
          <b>{tx(rolling ? "" : total)}</b>
          <span>{tx(rolling ? "" : `${r.dice[0]} + ${r.dice[1]}`)}</span>
        </div>
      </div>
      {tx(
        rolling ? (
          <div className="roll-anticipation">
            <span>{tx("Fortune visits every realm")}</span>
            <button onClick={onReveal}>
              {tx("Skip animation ")}
              <ChevronsRight size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="harvest-heading">
              <span>
                <Sparkles size={15} />
                {tx(r.total ? `${r.total} goods delivered` : "A quiet harvest")}
              </span>
              <small className="harvest-source-count">
                {tx(
                  r.tiles
                    ? `${r.tiles.length} producing ${r.tiles.length === 1 ? "hex" : "hexes"}`
                    : "Saved roll",
                )}
              </small>
              <small
                className={`harvest-scroll-hint ${r.players.length > 4 ? "many-realms" : ""}`}
              >
                {tx("Scroll for all ")}
                {tx(r.players.length)}
                {tx(" realms ↓")}
              </small>
            </div>
            <div
              className="harvest-players"
              role="group"
              aria-label={tx(
                `Resource receipts for all ${r.players.length} realms`,
              )}
              tabIndex={0}
              onWheel={onKeep}
              onTouchStart={onKeep}
              onFocus={onKeep}
            >
              {tx(
                r.players.map((player, i) => (
                  <div
                    key={player.id}
                    className={`harvest-player ${player.total ? "received" : "no-yield"}`}
                    data-testid={`roll-player-${player.id}`}
                    style={
                      {
                        "--realm": player.color,
                        "--entry-delay": `${i * 70}ms`,
                      } as CSSProperties
                    }
                  >
                    <div className="harvest-player-heading">
                      <i aria-hidden="true">{tx(player.name[0])}</i>
                      <b>{player.name}</b>
                      <span>{tx(player.total ? `+${player.total}` : "·")}</span>
                    </div>
                    <div className="harvest-goods">
                      {tx(
                        GOODS.filter((g) => player.goods[g]).map((g) => (
                          <span
                            className="harvest-good"
                            key={g}
                            data-good={g}
                            aria-label={tx(
                              `${GOOD_INFO[g].name}: +${player.goods[g]}`,
                            )}
                          >
                            <ResourceIcon good={g} size={21} />
                            <span>{tx(GOOD_INFO[g].name)}</span>
                            <b>+{tx(player.goods[g])}</b>
                          </span>
                        )),
                      )}
                      {tx(
                        !player.total && (
                          <span className="harvest-empty">
                            {tx(
                              player.alive
                                ? "No production this roll"
                                : "Realm eliminated",
                            )}
                          </span>
                        ),
                      )}
                    </div>
                    {player.supportGold > 0 && (
                      <small className="harvest-support">
                        {tx(
                          `Includes ${player.supportGold} Gold of AI support`,
                        )}
                      </small>
                    )}
                  </div>
                )),
              )}
            </div>
            <div className="harvest-footer">
              <span>
                {tx(p.pinned ? "Report held open" : "Continues automatically")}
                {tx(" · goods stored in towns")}
              </span>
              {tx(
                !p.pinned && (
                  <button onClick={onKeep}>
                    <Pin size={13} />
                    {tx("Keep open")}
                  </button>
                ),
              )}
            </div>
            {tx(
              !p.pinned && (
                <div
                  className="harvest-countdown"
                  style={
                    {
                      "--duration": `${reportDuration(r.automatic)}ms`,
                    } as CSSProperties
                  }
                />
              ),
            )}
          </>
        ),
      )}
    </section>
  );
}
