import type { Game, Hex, Command } from "../game/types";
import {
  INFRASTRUCTURE,
  tierOf,
  infrastructureSuitable,
  type InfrastructureKind,
} from "../game/infrastructure";
import {
  projectCost,
  projectSite,
  freshwaterSite,
} from "../game/geography-actions";
import { SEASONS, seasonalProfile, seasonYear } from "../game/seasons";
import { affordable } from "../game/selectors";
import { Cost, GoodsList } from "./components";
import { localize as tx, useLocale } from "../i18n";

export function InfrastructurePanel({
  game: s,
  tile,
  viewer,
  interactive,
  onAction,
}: {
  game: Game;
  tile: Hex;
  viewer: number;
  interactive: boolean;
  onAction: (c: Command) => void;
}) {
  const locale = useLocale(),
    fr = locale === "fr";
  const kinds = (Object.keys(INFRASTRUCTURE) as InfrastructureKind[]).filter(
    (kind) =>
      tile.geography?.projects?.[kind] || infrastructureSuitable(tile, kind),
  );
  if (!kinds.length) return null;
  const current = seasonalProfile(tile, viewer);
  const annual = (profile: ReturnType<typeof seasonalProfile>) =>
    Object.fromEntries(
      [
        ...new Set(SEASONS.flatMap((season) => Object.keys(profile[season]))),
      ].map((good) => [
        good,
        SEASONS.reduce(
          (n, season) =>
            n + (profile[season][good as keyof typeof profile.spring] ?? 0),
          0,
        ),
      ]),
    );
  const total = annual(current);
  return (
    <details className="infrastructure-panel">
      <summary>
        {fr ? "Infrastructure de production" : "Production infrastructure"}
      </summary>
      <p>
        {fr
          ? "Un bâtiment adjacent du même niveau est requis. Le charbon se paie uniquement à la construction. Aucun entretien. Une armée ennemie détruit les améliorations après le combat."
          : "Requires an adjacent settlement/city of the same tier. Coal is paid only at construction. No upkeep. Enemy armies destroy improvements after combat."}
      </p>
      {kinds.map((kind) => {
        const tier = tierOf(tile, kind),
          next = tier + 1,
          installed = tile.geography?.projects?.[kind];
        const allowed = projectSite(s, tile, kind, viewer),
          cost = projectCost(tile, kind);
        const foreign = installed && installed.owner !== viewer;
        const preview: Hex = {
          ...tile,
          geography: {
            ...tile.geography!,
            projects: {
              ...tile.geography?.projects,
              [kind]: {
                owner: viewer,
                born: s.round,
                tier: next,
              },
            },
          },
        };
        const future =
          next <= 4 ? annual(seasonalProfile(preview, viewer)) : total;
        const delta = Object.fromEntries(
          Object.entries(future)
            .filter(([g, n]) => n > (total[g as keyof typeof total] ?? 0))
            .map(([g, n]) => [g, n - (total[g as keyof typeof total] ?? 0)]),
        );
        return (
          <div
            className="geography-project"
            key={kind}
            data-infrastructure={kind}
          >
            <b>
              {tx(INFRASTRUCTURE[kind].name)}
              {tier > 0 ? ` · ${["", "I", "II", "III", "IV"][tier]}` : ""}
            </b>
            <p>{tx(INFRASTRUCTURE[kind].description)}</p>
            {installed && <small>{s.players[installed.owner].name}</small>}
            {!foreign && next <= 4 && (
              <>
                <strong>
                  {tx(INFRASTRUCTURE[kind].stages[next - 1])} · {next}
                </strong>
                <small>
                  {fr
                    ? "Gain annuel théorique, par producteur et par cycle des quatre saisons, avant météo et inondations :"
                    : "Added harvest across four seasons, per producer, before weather and flooding:"}
                </small>
                <GoodsList stock={delta} />
                <Cost cost={cost} />
                {!allowed && (
                  <small>
                    {kind === "irrigation" && !freshwaterSite(s, tile)
                      ? fr
                        ? "Nécessite une rivière, un lac ou une source adjacente, ou une oasis."
                        : "Needs an adjacent river, lake or spring, or an oasis."
                      : fr
                        ? `Nécessite votre ville adjacente de niveau ${next}, non assiégée, et un site sans ennemi.`
                        : `Needs your adjacent tier ${next} settlement/city, not besieged, and a site free of enemies.`}
                  </small>
                )}
                <button
                  className="primary"
                  disabled={
                    !interactive || !allowed || !affordable(s, cost, viewer)
                  }
                  onClick={() =>
                    onAction({ type: "project", tile: tile.id, kind })
                  }
                >
                  {tier ? (fr ? "Améliorer" : "Upgrade") : tx("Build")} ·{" "}
                  {tx(INFRASTRUCTURE[kind].name)}
                </button>
              </>
            )}
          </div>
        );
      })}
    </details>
  );
}

export function IrrigationCalendar({
  game: s,
  tile,
  viewer,
}: {
  game: Game;
  tile: Hex;
  viewer: number;
}) {
  const fr = useLocale() === "fr",
    g = tile.geography!;
  const active = g.harvestMode ?? "concentrated";
  const queued = g.nextHarvestMode;
  const profiles = (["concentrated", "spread"] as const).map((mode) => ({
    mode,
    profile: seasonalProfile(
      { ...tile, geography: { ...g, harvestMode: mode } },
      viewer,
    ),
  }));
  return (
    <div className="irrigation-calendars">
      <p>
        {fr
          ? "Même total annuel pour les deux calendriers. Les récoltes échelonnées restent limitées aux saisons adaptées à la culture et au climat."
          : "Both calendars have the same annual total. Staggered harvests stay within this crop’s suitable climate and temperature window."}
      </p>
      {profiles.map(({ mode, profile }) => (
        <div key={mode}>
          <b>
            {tx(mode === "spread" ? "Spread harvest" : "Concentrated harvest")}
            {mode === active ? (fr ? " · actif" : " · active") : ""}
            {mode === queued
              ? ` · ${fr ? "année" : "year"} ${seasonYear(s) + 1}`
              : ""}
          </b>
          <div className="geography-calendar">
            {SEASONS.map((season) => (
              <div key={season}>
                <small>{tx(season[0].toUpperCase() + season.slice(1))}</small>
                <GoodsList
                  stock={{
                    grain: profile[season].grain ?? 0,
                    oil: profile[season].oil ?? 0,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <small>
        {fr
          ? "Prévision par producteur, avant météo et inondations ; le numéro du dé reste requis. Aucun changement rétroactif."
          : "Per producer, before weather and flooding; the matching dice roll is still required. Changes are not retroactive."}
      </small>
    </div>
  );
}
