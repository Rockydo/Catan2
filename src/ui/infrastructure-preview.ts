import { specialistRecovery } from "../game/infrastructure";
import type { Hex, Raw, Stock } from "../game/types";
import { SEASONS, seasonalProfile, type Season } from "../game/seasons";
import {
  weatherAdjustedYield,
  weatherYieldFactor,
} from "../game/weather-yields";
import {
  isSpecialist,
  SPECIALIST_PROJECTS,
} from "../game/infrastructure-specialists";
import type { Project } from "../game/geography";

export type WeatherRisk = "dry" | "wet" | "cold";
export type HarvestProfile = Record<Season, Stock>;
/** Compare completed works against the same tile without this branch only. */
export function withoutInvestment(tile: Hex, id: Project): Hex {
  const branch = isSpecialist(id)
    ? SPECIALIST_PROJECTS[id].branch.id
    : undefined;
  return {
    ...tile,
    geography: {
      ...tile.geography!,
      projects: Object.fromEntries(
        Object.entries(tile.geography?.projects ?? {}).filter(([key]) =>
          branch
            ? !isSpecialist(key) ||
              SPECIALIST_PROJECTS[key].branch.id !== branch
            : key !== id,
        ),
      ),
    },
  };
}
export function weatherComparison(
  before: Hex,
  after: Hex,
  owner: number,
  weather: WeatherRisk,
  current: HarvestProfile = seasonalProfile(before, owner),
  future: HarvestProfile = seasonalProfile(after, owner),
) {
  const beforeWeather = {
    ...before,
    geography: { ...before.geography!, weather, weatherSeason: undefined },
  };
  const afterWeather = {
    ...after,
    geography: { ...after.geography!, weather, weatherSeason: undefined },
  };
  const loss = new Map<Raw, { raw: Raw; before: number; after: number }>();
  let improved = false;
  const seasons = SEASONS.map((season) => {
    const from = weatherAdjustedYield(
      beforeWeather,
      current[season],
      season,
      owner,
    );
    const to = weatherAdjustedYield(
      afterWeather,
      future[season],
      season,
      owner,
    );
    for (const raw of Object.keys({
      ...current[season],
      ...future[season],
    }) as Raw[]) {
      if ((to[raw] ?? 0) > (from[raw] ?? 0)) improved = true;
      const oldFactor = weatherYieldFactor(before, raw, season, weather, owner);
      const newFactor = weatherYieldFactor(after, raw, season, weather, owner);
      if (oldFactor < 1 && newFactor > oldFactor && !loss.has(raw))
        loss.set(raw, {
          raw,
          before: (1 - oldFactor) * 100,
          after: (1 - newFactor) * 100,
        });
    }
    return { season, from, to };
  });
  return {
    weather,
    seasons,
    loss: [...loss.values()],
    improved,
    recoveryBefore: specialistRecovery(before, weather, owner).budget,
    recoveryAfter: specialistRecovery(after, weather, owner).budget,
  };
}
