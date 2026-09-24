import { FloodComparison } from "../ui/FloodArt";
import { useState } from "react";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOME_INFO,
  type Climate,
} from "../game/climate-content";
import {
  waterCalendar,
  weatherChoices,
  WEATHER_NAMES,
} from "../game/environment";
import { WILDLIFE_GOODS, WILDLIFE_NAMES, PROJECTS } from "../game/geography";
import { SEASONS, type Season } from "../game/seasons";
import { GOOD_INFO } from "../game/content";
import { LANDMARKS } from "../ui/Geography";
import { ResourceIcon } from "../ui/ResourceIcon";
import type { Stock, Good, Hex } from "../game/types";
import { localize as tx, useLocale } from "../i18n";
function Goods({ stock }: { stock: Stock }) {
  return (
    <span className="cost-list">
      {Object.entries(stock).map(([g, n]) => (
        <span className="cost-good" key={g}>
          <ResourceIcon good={g as Good} />
          <b>{n}</b> {tx(GOOD_INFO[g as Good].name)}
        </span>
      ))}
    </span>
  );
}
export function GeographyReference() {
  const locale = useLocale(),
    l = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [climate, setClimate] = useState<Climate>("temperate"),
    [season, setSeason] = useState<Season>("summer");
  return (
    <section className="geography-reference">
      <div className="geography-reference-hero">
        {(["river", "delta-gardens", "mountain-pass", "reef"] as const).map(
          (kind) => (
            <figure key={kind}>
              <img
                src={`./assets/geography/${kind}-${season}.webp`}
                alt={tx(BIOME_INFO[kind].name)}
              />
              <figcaption>{tx(BIOME_INFO[kind].name)}</figcaption>
            </figure>
          ),
        )}
      </div>
      <div
        className="climate-tabs"
        role="group"
        aria-label={l(
          "Preview geography season",
          "Aperçu saisonnier de la géographie",
        )}
      >
        {SEASONS.map((s) => (
          <button
            key={s}
            aria-pressed={s === season}
            onClick={() => setSeason(s)}
          >
            {tx(s[0].toUpperCase() + s.slice(1))}
          </button>
        ))}
      </div>
      <h2>
        {l(
          "Read the region before moving",
          "Lire la région avant de se déplacer",
        )}
      </h2>
      <label>
        {l("Climate", "Climat")}{" "}
        <select
          value={climate}
          onChange={(e) => setClimate(e.target.value as Climate)}
        >
          {CLIMATES.map((c) => (
            <option key={c} value={c}>
              {tx(CLIMATE_INFO[c].name)}
            </option>
          ))}
        </select>
      </label>
      <div className="geography-water-calendar">
        {SEASONS.map((s, i) => (
          <article key={s}>
            <b>{tx(s[0].toUpperCase() + s.slice(1))}</b>
            <strong>{waterCalendar(climate)[i]}</strong>
            <small>{l("Base water level", "Niveau d’eau de base")}</small>
            <p>
              {weatherChoices(climate, s)
                .map(
                  ([w, p]) => `${tx(WEATHER_NAMES[w])} ${Math.round(p * 100)}%`,
                )
                .join(" · ")}
            </p>
          </article>
        ))}
      </div>
      <p>
        {l(
          "Level 0–1: natural fords open. Low basins flood at 3, higher banks at 4. Wet weather adds 1, or 2 in Temperate, Semi-arid, Tropical, Tropical Maritime, Subtropical and Mesoamerican regions, or 3 in deserts. Dry weather subtracts 1.",
          "Niveaux 0–1 : gués ouverts. Cuvettes basses inondées à 3, berges hautes à 4. Une période humide ajoute 1, ou 2 en Tempéré, Semi-aride, Tropical, Tropical maritime, Subtropical et Mésoaméricain, ou 3 dans les déserts. Une période sèche retranche 1.",
        )}
      </p>
      <h2>{l("Dry ground and flooding", "Terrain sec et crue")}</h2>
      <p>
        {l(
          "Only marked floodplains flood. Rugged terrain never floods. Each tile shows its threshold: 3 for low basins, 4 for higher banks. Reaching it stops raw and processed production unless a levee protects the tile. Buildings and stocks survive. Irrigation and bridges do not prevent flooding.",
          "Seules les plaines signalées sont inondables. Les terrains accidentés ne sont jamais inondés. Chaque tuile affiche son seuil : 3 pour une cuvette basse, 4 pour une berge haute. À ce seuil, toute production cesse sans digue. Bâtiments et stocks survivent. Ponts et irrigation ne protègent pas contre les crues.",
        )}
      </p>
      <FloodComparison
        tile={
          {
            id: "0,0",
            q: 0,
            r: 0,
            number: 6,
            resource: ["arctic", "glacial", "tundra"].includes(climate)
              ? "barren"
              : "grain",
            biome: ["arctic", "glacial", "tundra"].includes(climate)
              ? "snow-plain"
              : "flood-wheat",
            climate,
            geography: { elevation: 0.4, region: "guide", floodplain: true },
          } as Hex
        }
        season={season}
      />
      <p>
        {l(
          "Polar snowmelt can flood low ground even while river ice remains. Cold spells lower spring/summer water levels by 1 in Arctic, Glacial and Tundra regions; mild conditions add 1. Glacial flood peaks occur in summer.",
          "Le dégel polaire peut inonder les terrains bas même si le fleuve porte encore de la glace. Au printemps et en été, le froid retire 1 niveau d’eau en Arctique, Glaciaire et Toundra ; la douceur en ajoute 1. Les crues glaciaires culminent en été.",
        )}
      </p>
      <h2>{l("Mobile populations", "Populations migratrices")}</h2>
      <p>
        {l(
          "Yield per population on its tile’s dice number, before producer multipliers. These goods require animals to be present. Farming livestock does not migrate.",
          "Rendement par population sur le numéro de sa tuile, avant multiplicateurs. Ces produits nécessitent la présence des animaux. Les élevages ne migrent pas.",
        )}
      </p>
      <div className="geography-wildlife-grid">
        {Object.entries(WILDLIFE_GOODS).map(([k, stock]) => (
          <article key={k}>
            <b>{tx(WILDLIFE_NAMES[k as keyof typeof WILDLIFE_NAMES])}</b>
            <Goods stock={stock} />
          </article>
        ))}
      </div>
      <div className="geography-unit-strip">
        {(["hunter", "riverboat"] as const).map((kind) => (
          <div key={kind}>
            <h3>{tx(kind === "hunter" ? "Hunter" : "Riverboat")}</h3>
            <div>
              {[1, 2, 3, 4].map((tier) => (
                <img
                  key={tier}
                  src={`./assets/portrait-${kind}-${tier}-v1.webp`}
                  alt={`${tx(kind === "hunter" ? "Hunter" : "Riverboat")} ${tier}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <h2>{l("Build for the site", "Construire selon le terrain")}</h2>
      <div className="geography-wildlife-grid">
        {Object.entries(PROJECTS).map(([k, p]) => (
          <article key={k}>
            <h3>{tx(p.name)}</h3>
            <Goods stock={p.cost} />
            <p>{tx(p.description)}</p>
          </article>
        ))}
      </div>
      <h2>{l("Rare landmarks", "Sites remarquables")}</h2>
      <div className="geography-landmarks">
        {Object.entries(LANDMARKS).map(([k, v]) => (
          <article key={k}>
            <img src={`./assets/geography/${k}.webp`} alt="" />
            <h3>{tx(v.name)}</h3>
            <p>{tx(v.effect)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
