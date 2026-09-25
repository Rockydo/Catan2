import { FloodComparison } from "./FloodArt";
import type { Game, Hex, Good } from "../game/types";
import {
  riverLevel,
  floodThreshold,
  waterCalendar,
  waterLevelModifier,
  WEATHER_NAMES,
} from "../game/environment";
import {
  seasonAt,
  seasonalProfile,
  seasonalYield,
  SEASONS,
} from "../game/seasons";
import { weatherAdjustedYield } from "../game/weather-yields";
import { ResourceIcon } from "./ResourceIcon";
import { useLocale, localize as tx } from "../i18n";

export function FloodplainStatus({
  tile,
  game,
  viewer,
}: {
  tile: Hex;
  game: Game;
  viewer: number;
}) {
  const locale = useLocale(),
    l = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const g = tile.geography!,
    season = seasonAt(game) ?? "spring",
    level = riverLevel(tile, season),
    threshold = floodThreshold(tile);
  const flooded = g.access === "flooded" && !g.projects?.levee,
    protectedTile = !!g.projects?.levee;
  const base = waterCalendar(tile.climate ?? "temperate")[
    SEASONS.indexOf(season)
  ];
  const modifier = waterLevelModifier(tile, season, g.weather ?? "normal");
  const harvest = weatherAdjustedYield(
    tile,
    seasonalProfile(tile, viewer)[season],
    season,
    viewer,
  );
  const actual = seasonalYield(tile, viewer, season);
  return (
    <div className={`floodplain-status ${flooded ? "is-flooded" : ""}`}>
      <strong>
        {l(
          flooded
            ? "Flooded now"
            : protectedTile
              ? "Protected by levee"
              : "Dry floodplain",
          flooded
            ? "Inondée actuellement"
            : protectedTile
              ? "Protégée par une digue"
              : "Plaine inondable sèche",
        )}
      </strong>
      <p>
        {l("Water level", "Niveau d’eau")} <b>{level}/4</b> ·{" "}
        {l("Season", "Saison")} {base} {modifier < 0 ? "−" : "+"}{" "}
        {Math.abs(modifier)} ({tx(WEATHER_NAMES[g.weather ?? "normal"])})
      </p>
      <div className="flood-level" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`${n <= level ? "filled" : ""} ${n >= threshold ? "danger" : ""}`}
          >
            {n}
          </span>
        ))}
      </div>
      <p>
        {l(
          `This ${threshold === 3 ? "low basin" : "higher riverbank"} floods at level ${threshold}. Lower water levels leave it dry. A levee prevents flooding. Conditions last both halves of the season.`,
          `Cette ${threshold === 3 ? "cuvette basse" : "berge haute"} est inondée au niveau ${threshold}. Elle reste sèche en dessous. Une digue empêche la crue. Ces conditions durent les deux moitiés de la saison.`,
        )}
      </p>
      {["arctic", "glacial", "tundra"].includes(tile.climate ?? "") && (
        <p>
          {l(
            "Polar thaw floodplain: snowmelt can flood low ground while river ice remains. Cold spells suppress thaw; mild conditions increase it. Glacial high water peaks in summer.",
            "Plaine de dégel polaire : la fonte peut inonder les terrains bas même si le fleuve reste englacé. Le froid freine le dégel ; la douceur l’accentue. En climat glaciaire, les hautes eaux culminent en été.",
          )}
        </p>
      )}
      <FloodComparison tile={tile} season={season} />
      <div className="flood-harvest">
        <b>
          {l(
            "This roll, before producer multipliers",
            "Ce jet, avant multiplicateurs",
          )}
        </b>
        {Object.entries(harvest)
          .filter(([, n]) => n! > 0)
          .map(([good, n]) => (
            <span key={good}>
              <ResourceIcon good={good as Good} size={19} />
              {n} → <strong>{actual[good as Good] ?? 0}</strong>
            </span>
          ))}
        {!Object.values(harvest).some((n) => n! > 0) && (
          <span>
            {l(
              "No scheduled harvest this season.",
              "Aucune récolte prévue cette saison.",
            )}
          </span>
        )}
      </div>
      <details>
        <summary>{l("Effects and protection", "Effets et protection")}</summary>
        <p>
          {l(
            "Flooding stops normal production. Raised rows, field outfalls and swamp timber walks can rescue up to 1 resource at tiers I–II, or 2 at III–IV, before town and unit multipliers, from a harvest that is in season. Equivalent works share this allowance. Other adjacent tiles still produce normally.",
            "La crue arrête la production normale. Les planches surélevées, exutoires et passerelles forestières peuvent sauver jusqu’à 1 ressource aux niveaux I–II, ou 2 aux III–IV, avant les multiplicateurs des villes et unités, si une récolte est de saison. Les ouvrages équivalents partagent cette capacité. Les autres tuiles voisines produisent normalement.",
          )}
        </p>
        <p>
          {l(
            "Flooded ground admits shallow-draft ships, not land armies. Buildings, routes and stored goods survive. Production resumes when the water recedes or a levee is built, if a harvest is in season. Irrigation and bridges do not prevent flooding.",
            "Le terrain inondé accueille les navires à faible tirant d’eau, pas les armées. Constructions, routes et stocks sont conservés. La production reprend à la décrue ou après construction d’une digue, si la saison permet une récolte. Irrigation et ponts n’empêchent pas la crue.",
          )}
        </p>
      </details>
    </div>
  );
}
