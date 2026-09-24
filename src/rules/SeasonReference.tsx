import { IceReference } from "./IceReference";
import { useState } from "react";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOME_INFO,
  type Climate,
  type Biome,
} from "../game/climate-content";
import {
  SEASONS,
  seasonalProfile,
  seasonWeather,
  type Season,
} from "../game/seasons";
import { GOOD_INFO } from "../game/content";
import type { Hex, Good, Stock } from "../game/types";
import { localize as tx, useLocale } from "../i18n";
import { ResourceIcon } from "../ui/ResourceIcon";
import { TerrainImage } from "./TerrainReference";
const names: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};
function Output({ goods }: { goods: Stock }) {
  const entries = Object.entries(goods) as [Good, number][];
  return entries.length ? (
    <span className="season-reference-output">
      {entries.map(([good, amount]) => (
        <span key={good} title={tx(GOOD_INFO[good].name)}>
          <ResourceIcon good={good} size={23} />
          <b>{amount}</b>
          <span className="sr-only"> {tx(GOOD_INFO[good].name)}</span>
        </span>
      ))}
    </span>
  ) : (
    <span className="season-zero">0</span>
  );
}
export function SeasonReference({
  initial = "temperate",
  readOnly = false,
}: {
  initial?: Climate;
  readOnly?: boolean;
}) {
  const locale = useLocale();
  const l = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [climate, setClimate] = useState<Climate>(initial);
  const [legacy, setLegacy] = useState(false);
  const [season, setSeason] = useState<Season>("summer");
  const biomes = [
    ...new Set<Biome>([
      ...CLIMATE_INFO[climate].terrain.map(([biome]) => biome),
      ...CLIMATE_INFO[climate].water.map(([biome]) => biome),
      "water",
    ]),
  ];
  return (
    <section
      className="season-reference"
      aria-label={l(
        "Seasonal harvest tables",
        "Tables des récoltes saisonnières",
      )}
    >
      <h2>
        {l("Harvest calendar by climate", "Calendrier des récoltes par climat")}
      </h2>
      <p>
        {l(
          "Each cell is one settlement’s output on a matching dice roll. Zero means no production in that season. The four seasons sum to four times the current climate-adjusted baseline. Multiply raw yields by town, camp or collector tier; apply advanced processing to the same seasonal quantities.",
          "Chaque case indique la production d’une colonie sur un jet correspondant. Zéro signifie aucune production pendant cette saison. Les quatre saisons totalisent quatre fois la base actuelle ajustée au climat. Multipliez ces quantités par le niveau de l’agglomération, du camp ou du collecteur ; la transformation avancée utilise ces mêmes quantités saisonnières.",
        )}
      </p>
      <label>
        <input
          type="checkbox"
          checked={legacy}
          onChange={(e) => setLegacy(e.target.checked)}
        />{" "}
        {l(
          "Show legacy campaign yields",
          "Afficher les rendements des anciennes campagnes",
        )}
      </label>
      {!legacy && (
        <p>
          {l(
            "Geography campaigns: these are permanent terrain yields. Add the animals currently present, shown in the Living geography chapter. Floods, ice and disruption can prevent production. River crops and regional weather are detailed in that chapter.",
            "Campagnes géographiques : ces rendements correspondent au terrain permanent. Ajoutez les animaux présents, décrits au chapitre Géographie vivante. Crues, glace et sabotages peuvent empêcher la production. Les cultures riveraines et la météo régionale sont détaillées dans ce chapitre.",
          )}
        </p>
      )}
      {!readOnly && (
        <div
          className="climate-tabs"
          role="group"
          aria-label={l("Choose climate", "Choisir le climat")}
        >
          {CLIMATES.map((c) => (
            <button
              key={c}
              aria-pressed={climate === c}
              onClick={() => setClimate(c)}
            >
              <i style={{ background: CLIMATE_INFO[c].color }} />
              {tx(CLIMATE_INFO[c].name)}
            </button>
          ))}
        </div>
      )}
      <div className="season-reference-heading">
        <h3>{tx(CLIMATE_INFO[climate].name)}</h3>
        <label>
          {l("Landscape preview", "Aperçu du paysage")}
          <select
            aria-label={l("Landscape preview", "Aperçu du paysage")}
            value={season}
            onChange={(e) => setSeason(e.target.value as Season)}
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {tx(names[s])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="season-note">
        {l(
          "Early and late halves use the same harvest values and landscape art. Existing local marine harvest calendars are unchanged. Actual ice can block a scheduled harvest; new weather does not bank missed rolls or add catch-up production.",
          "Le début et la fin de saison utilisent les mêmes récoltes et paysages. Les calendriers marins locaux restent inchangés. La glace peut bloquer une récolte prévue ; la météo ne conserve aucun jet manqué et n’ajoute aucun rattrapage.",
        )}
      </p>
      <IceReference climate={climate} />
      <div className="season-reference-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{l("Terrain", "Terrain")}</th>
              {SEASONS.map((s) => (
                <th
                  className={season === s ? "preview-season" : ""}
                  key={s}
                  scope="col"
                >
                  {tx(names[s])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {biomes.flatMap((biome) =>
              (legacy && biome === "woods"
                ? (["lumber", "hides"] as const)
                : [undefined]
              ).map((choice) => {
                const tile: Hex = {
                  id: "0,0",
                  q: 0,
                  r: 0,
                  number: 7,
                  climate,
                  biome,
                  resource: BIOME_INFO[biome].resource,
                  vertices: [],
                  edges: [],
                  ...(!legacy
                    ? { geography: { elevation: 0.5, region: "reference" } }
                    : {}),
                  ...(choice ? { woodsChoices: { 0: choice } } : {}),
                };
                const profile = seasonalProfile(tile, 0);
                return (
                  <tr key={`${biome}/${choice}`} data-biome={biome}>
                    <th scope="row">
                      <TerrainImage
                        tile={biome}
                        climate={climate}
                        season={season}
                      />
                      <span>
                        {tx(BIOME_INFO[biome].name)}
                        {choice && <> · {tx(GOOD_INFO[choice].name)}</>}
                        <small>{tx(seasonWeather(tile, season))}</small>
                      </span>
                    </th>
                    {SEASONS.map((s) => (
                      <td
                        className={season === s ? "preview-season" : ""}
                        key={s}
                      >
                        <Output goods={profile[s]} />
                      </td>
                    ))}
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
