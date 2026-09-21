import { maxValue } from "../game/aggregate";
import { localize as tx, useLocale } from "../i18n";
import { AllianceSummary } from "./Alliances";
import { allianceOf } from "../game/relations";
import type { Command } from "../game/types";
import { memo, useMemo } from "react";
import { ChevronDown, ScrollText } from "lucide-react";
import type { Game } from "../game/types";
import { factionStrengthDetails } from "../game/ai-strategy";
import { dominanceSupport } from "../game/ai-support";
import {
  ownTowns,
  ownPieces,
  researchCount,
  withPlanningFrame,
} from "../game/selectors";

/** Mounted only when the drawer is open; camera changes never recalculate strength. */
export const FactionStandings = memo(function FactionStandings({
  game,
  viewer,
  onAction,
  interactive,
}: {
  game: Game;
  viewer: number;
  onAction: (c: Command) => void;
  interactive: boolean;
}) {
  useLocale();

  const standings = useMemo(
    () =>
      withPlanningFrame(game, () => {
        const scores = factionStrengthDetails(game);
        return game.players
          .map((player) => ({
            player,
            score: scores[player.id],
            towns: ownTowns(game, player.id).length,
            cities: ownTowns(game, player.id).filter((town) => town.level >= 2)
              .length,
            forces: ownPieces(game, player.id).length,
            cards: researchCount(game, player.id),
          }))
          .sort(
            (a, b) =>
              b.score.total - a.score.total || a.player.id - b.player.id,
          );
      }),
    [game],
  );
  const globalPower = standings.reduce((sum, row) => sum + row.score.total, 0);
  const maximum = maxValue([1, ...standings.map((s) => s.score.total)]);
  const support = dominanceSupport(
    game,
    game.players.map(
      (p) => standings.find((row) => row.player.id === p.id)!.score.total,
    ),
  );
  return (
    <section
      className="faction-standings"
      aria-label={tx("Faction power standings")}
      tabIndex={0}
    >
      <div className="power-heading">
        <b>{tx("Faction power")}</b>
        <span>{tx("Strongest first")}</span>
      </div>
      <p className="power-explainer">
        {tx(
          "The AI’s overall strength estimate. Open a faction for its breakdown; battle power depends on terrain and defenses.",
        )}
      </p>
      {support && (
        <p className="power-explainer" data-testid="dominance-support">
          {tx(
            `Support against ${game.players[support.leader].name}: ${support.perTown} Gold per settlement or city on every dice roll.`,
          )}
          {support.perCity > 0 && (
            <>
              {" "}
              {tx(
                `Plus ${support.perCity} Gold bars per city on every dice roll.`,
              )}
            </>
          )}
        </p>
      )}
      <AllianceSummary
        game={game}
        viewer={viewer}
        onAction={onAction}
        interactive={interactive}
      />
      <div
        className="players"
        tabIndex={0}
        aria-label={tx("All faction power scores")}
      >
        {tx(
          standings.map(
            ({ player: p, score, towns, cities, forces, cards }) => (
              <details
                className={`player-card power-card ${game.active === p.id ? "current" : ""} ${!p.alive ? "eliminated" : ""}`}
                key={p.id}
                data-testid={`faction-power-${p.id}`}
              >
                <summary
                  aria-label={tx(
                    `${p.name}${p.id === viewer ? ", you" : ""}: ${score.total.toFixed(1)} faction power. Show breakdown`,
                  )}
                >
                  <span
                    className="player-sigil"
                    style={{ background: p.color }}
                  >
                    {tx(p.name[0])}
                  </span>
                  <span className="power-identity">
                    <b>
                      {p.name}
                      {tx(p.id === viewer ? " · You" : "")}
                      {tx(
                        game.active === p.id && (
                          <span
                            className="turn-dot"
                            title={tx("Current turn")}
                          />
                        ),
                      )}
                    </b>
                    <small>
                      {tx(
                        !p.alive
                          ? "Eliminated"
                          : `${towns} towns · ${forces} forces`,
                      )}
                    </small>
                    {tx(
                      allianceOf(game, p.id) && (
                        <small>
                          {tx("Allied with")}
                          {tx(" ")}
                          {tx(
                            allianceOf(game, p.id)!
                              .members.filter((id) => id !== p.id)
                              .map((id) => game.players[id].name)
                              .join(", "),
                          )}
                        </small>
                      ),
                    )}
                    <small>
                      {tx(
                        `${(globalPower ? (score.total / globalPower) * 100 : 0).toFixed(1)}% of global power`,
                      )}
                    </small>
                    <small
                      className="faction-research"
                      title={tx("Cards held; identities are private")}
                    >
                      <ScrollText size={11} /> {tx(cards)}
                      {tx(" research cards")}
                    </small>
                    {support && p.alive && p.id !== support.leader && (
                      <small>
                        {tx(
                          `Support: +${support.perTown * towns} Gold per roll`,
                        )}
                        {support.perCity > 0 && cities > 0 && (
                          <>
                            {" "}
                            ·{" "}
                            {tx(
                              `+${support.perCity * cities} Gold bars per roll`,
                            )}
                          </>
                        )}
                      </small>
                    )}
                  </span>
                  <span className="power-value">
                    <strong data-testid={`faction-score-${p.id}`}>
                      {tx(score.total.toFixed(1))}
                    </strong>
                    <ChevronDown size={13} aria-hidden="true" />
                  </span>
                  <span className="power-track" aria-hidden="true">
                    <span
                      style={{
                        width: `${(score.total / maximum) * 100}%`,
                        background: p.color,
                      }}
                    />
                  </span>
                </summary>
                <dl className="power-breakdown">
                  <div>
                    <dt>{tx("Towns & upgrades")}</dt>
                    <dd>{tx(score.towns.toFixed(1))}</dd>
                  </div>
                  <div>
                    <dt>{tx("Forces & merchants")}</dt>
                    <dd>{tx(score.forces.toFixed(1))}</dd>
                  </div>
                  <div>
                    <dt>{tx("Expected production")}</dt>
                    <dd>{tx(score.production.toFixed(1))}</dd>
                  </div>
                </dl>
                <p className="power-formula">
                  {tx(
                    "Towns: 12 per settlement, +4 per city level, +1 per wall tier, +2 per extension tier and 6 per guild tier. Forces: 2 × base power, plus 3 × tier for merchants and fishing ships. Production: 5 × expected goods per roll. Stockpiles and research hands add no points.",
                  )}
                </p>
              </details>
            ),
          ),
        )}
      </div>
    </section>
  );
});
