import type { Hex, Raw } from "../game/types";
import type { Season } from "../game/seasons";
import { seasonalProfile, seasonalYield } from "../game/seasons";
import { WEATHER_NAMES } from "../game/environment";
import {
  weatherAdjustedYield,
  weatherYieldFactor,
} from "../game/weather-yields";
import { GOOD_INFO } from "../game/content";
import { ResourceIcon } from "./ResourceIcon";
import { localize as tx } from "../i18n";

export function WeatherImpact({
  tile,
  season,
  owner,
}: {
  tile: Hex;
  season: Season;
  owner?: number;
}) {
  const g = tile.geography;
  if (!g) return null;
  const weather = g.weather ?? "normal";
  const base = seasonalProfile(tile, owner)[season];
  const adjusted = weatherAdjustedYield(tile, base, season, owner);
  const actual = seasonalYield(tile, owner, season);
  const affected = Object.keys(base).filter(
    (raw) =>
      weatherYieldFactor(tile, raw as Raw, season, weather, owner) !== 1 &&
      (base[raw as Raw] ?? 0) > (g.fauna?.[raw as Raw] ?? 0),
  ) as Raw[];
  const blocked =
    Object.values(adjusted).some((n) => n && n > 0) &&
    !Object.values(actual).some((n) => n && n > 0);
  return (
    <div className="weather-impact">
      <b>{tx(WEATHER_NAMES[weather])}</b>
      {affected.map((raw) => (
        <div className="weather-impact-row" key={raw}>
          <ResourceIcon good={raw} size={18} />
          <span>{tx(GOOD_INFO[raw].name)}</span>
          <strong>
            {base[raw]} → {adjusted[raw]}
          </strong>
          <small>
            {Math.round(
              (weatherYieldFactor(tile, raw, season, weather, owner) - 1) * 100,
            )}
            %
          </small>
        </div>
      ))}
      <small>
        {tx(
          blocked
            ? "Access or disruption currently prevents this harvest."
            : affected.length
              ? "Per producer before city and camp multipliers. Rounded to whole resources; timber keeps a minimum of 1. Wildlife yields do not change."
              : "No weather adjustment to this tile’s current harvest.",
        )}
      </small>
      {!!g.projects?.irrigation &&
        (owner === undefined || g.projects.irrigation.owner === owner) &&
        weather === "dry" && (
          <small>
            {tx(
              "Irrigation reduces drought losses according to its operating tier.",
            )}
          </small>
        )}
    </div>
  );
}
