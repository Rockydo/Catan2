import type { Good } from "../game/types";
import { GoodIcon } from "./components";
import { GOOD_INFO } from "../game/content";
import { localize as tx, useLocale } from "../i18n";
import type { HarvestProfile } from "./infrastructure-preview";
import { weatherComparison } from "./infrastructure-preview";
import { SEASONS } from "../game/seasons";
const pct = (n: number) => `${Math.round(n * 100) / 100}%`;
export function WeatherBenefits({
  comparisons,
}: {
  comparisons: ReturnType<typeof weatherComparison>[];
}) {
  const fr = useLocale() === "fr";
  return (
    <div className="infrastructure-protection">
      {comparisons.map((c) => (
        <div key={c.weather} data-weather-benefit={c.weather}>
          <strong>{weatherName(c.weather, fr)}</strong>
          {c.loss.map((l) => (
            <small key={l.raw}>
              {tx(GOOD_INFO[l.raw].name)} · {fr ? "perte" : "loss"}{" "}
              {pct(l.before)} → {pct(l.after)}
              {fr ? " avant arrondi" : " before rounding"}
            </small>
          ))}
          {c.recoveryAfter > 0 && (
            <small>
              {fr ? "Récupération des pertes : " : "Lost-resource recovery: "}
              {c.recoveryBefore} → {c.recoveryAfter}
              {fr
                ? " maximum par récolte, partagé entre les ressources éligibles."
                : " maximum per harvest, shared across eligible resources."}
            </small>
          )}
          {!c.loss.length && c.recoveryAfter === c.recoveryBefore && (
            <small>
              {fr
                ? "Aucune protection supplémentaire ici avec les ouvrages actuels."
                : "No additional protection here with the current works."}
            </small>
          )}
          {!c.improved && (
            <small className="infrastructure-no-change">
              {fr
                ? "Récolte identique après arrondi sur ce terrain, aux quatre saisons."
                : "The rounded harvest stays the same on this tile in all four seasons."}
            </small>
          )}
          {c.improved && <WeatherExample comparison={c} />}
        </div>
      ))}
    </div>
  );
}
function WeatherExample({
  comparison,
}: {
  comparison: ReturnType<typeof weatherComparison>;
}) {
  const fr = useLocale() === "fr";
  const row = comparison.seasons.find((s) =>
    Object.entries(s.to).some(([g, n]) => n! > (s.from[g as Good] ?? 0)),
  );
  if (!row) return null;
  return (
    <div className="infrastructure-weather-example">
      <small>
        {fr ? "Exemple : " : "Example: "}
        {tx(row.season[0].toUpperCase() + row.season.slice(1))}
      </small>
      {(Object.keys(row.to) as Good[])
        .filter((g) => row.to[g]! > (row.from[g] ?? 0))
        .map((good) => (
          <span key={good} title={tx(GOOD_INFO[good].name)}>
            <GoodIcon good={good} size={18} />
            {row.from[good] ?? 0} → <b>{row.to[good]}</b>
          </span>
        ))}
    </div>
  );
}
export function weatherName(weather: string, fr: boolean) {
  return (
    fr
      ? { dry: "Sécheresse", wet: "Période pluvieuse", cold: "Vague de froid" }
      : { dry: "Dry spell", wet: "Wet spell", cold: "Cold spell" }
  )[weather as "dry" | "wet" | "cold"];
}
export function HarvestComparison({
  current,
  future,
}: {
  current: HarvestProfile;
  future: HarvestProfile;
}) {
  const fr = useLocale() === "fr";
  return (
    <div className="geography-calendar infrastructure-comparison">
      {SEASONS.map((season) => (
        <div key={season}>
          <small>{tx(season[0].toUpperCase() + season.slice(1))}</small>
          {Object.keys({ ...current[season], ...future[season] }).some(
            (g) =>
              (current[season][g as keyof typeof current.spring] ?? 0) ||
              (future[season][g as keyof typeof future.spring] ?? 0),
          ) ? (
            <div className="infrastructure-harvest-pairs">
              {(
                Object.keys({ ...current[season], ...future[season] }) as Good[]
              )
                .filter((good) => current[season][good] || future[season][good])
                .map((good) => (
                  <span
                    key={good}
                    title={tx(GOOD_INFO[good].name)}
                    aria-label={`${tx(GOOD_INFO[good].name)}: ${current[season][good] ?? 0} → ${future[season][good] ?? 0}`}
                  >
                    <GoodIcon good={good} size={16} />
                    <span>
                      {current[season][good] ?? 0} →{" "}
                      <b>{future[season][good] ?? 0}</b>
                    </span>
                  </span>
                ))}
            </div>
          ) : (
            <small>{fr ? "Pas de récolte" : "No harvest"}</small>
          )}
        </div>
      ))}
    </div>
  );
}
