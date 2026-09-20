import type { Season } from "../game/seasons";
import { terrainPatternKey, terrainArtFile } from "../ui/terrain-art";
import {
  GOOD_INFO,
  TERRAIN,
  extensionName,
  processedFor,
  type TerrainKey,
} from "../game/content";
import {
  BIOMES,
  BIOME_INFO,
  CLIMATES,
  CLIMATE_INFO,
  climateTransitionWeight,
  waterProbabilities,
  type Biome,
  type Climate,
} from "../game/climate-content";
import type { Good, Raw, Stock } from "../game/types";
import { localize as tx, useLocale } from "../i18n";
import { ResourceIcon } from "../ui/ResourceIcon";
import { useState } from "react";
const atlas = [
  "lumber",
  "brick",
  "wool",
  "grain",
  "ore",
  "stone",
  "unused",
  "hides",
  "salt",
  "coal",
];
export function TerrainImage({
  tile,
  climate,
  season,
}: {
  tile: TerrainKey;
  climate?: Climate;
  season?: Season;
}) {
  const pattern = terrainPatternKey(tile, climate, season);
  const art = BIOME_INFO[pattern as Biome]?.art ?? pattern;
  const index = atlas.indexOf(art),
    dedicated = index < 0;
  const file = terrainArtFile(art);
  return (
    <span
      className={`terrain-picture ${tile === "water" ? "empty-water" : ""}`}
      role="img"
      aria-label={tx(TERRAIN[tile].name)}
      style={
        tile === "water" && pattern === "water"
          ? undefined
          : {
              backgroundImage: `url(./assets/${dedicated ? file : "terrain-atlas-v2.png"})`,
              backgroundSize: dedicated ? "cover" : "500% 200%",
              backgroundPosition: dedicated
                ? "center"
                : `${(index % 5) * 25}% ${Math.floor(index / 5) * 100}%`,
            }
      }
    />
  );
}
function Outputs({
  goods,
  choice = false,
}: {
  goods: Stock;
  choice?: boolean;
}) {
  const locale = useLocale();
  return (
    <span className="terrain-outputs">
      {Object.entries(goods).map(([g, n], i) => (
        <span key={g}>
          {i > 0 && <b>{choice ? (locale === "fr" ? "ou" : "or") : "+"}</b>}
          <ResourceIcon good={g as Good} size={26} />
          {n} {tx(GOOD_INFO[g as Good].name)}
        </span>
      ))}
    </span>
  );
}
function yields(tile: Biome): Stock {
  return tile === "woods" ? { lumber: 1, hides: 1 } : BIOME_INFO[tile].yield;
}
function workshopGoods(tile: Biome): Raw[] {
  return tile === "woods"
    ? ["lumber", "hides"]
    : (Object.keys(BIOME_INFO[tile].yield).slice(0, 1) as Raw[]);
}
export function GoodSources({ good }: { good: Good }) {
  const locale = useLocale();
  return (
    <div
      className="good-sources"
      aria-label={
        locale === "fr" ? "Terrains de production" : "Production terrain"
      }
    >
      {BIOMES.filter(
        (t) =>
          good in yields(t) ||
          workshopGoods(t).some((g) => processedFor(g) === good),
      ).map((tile) => (
        <TerrainImage key={tile} tile={tile} />
      ))}
    </div>
  );
}
export function TerrainReference({ seaOnly = false }: { seaOnly?: boolean }) {
  const locale = useLocale(),
    l = (en: string, fr: string) => (locale === "fr" ? fr : en);
  return (
    <section
      className="terrain-reference"
      aria-label={l("Terrain and production", "Terrains et production")}
    >
      <h2>{l("Terrain and production", "Terrains et production")}</h2>
      <p className="reference-intro">
        {l(
          "Output below is for one settlement. Multiply raw output by town level, camp tier or collector tier. Towns, land merchants and merchant ships at levels III/IV also add 1×/2× the base tile yield as processed goods. Workshops add their tier × the base yield of their linked resource separately; none of these bonuses consume raw goods.",
          "Les quantités ci-dessous correspondent à une colonie. Multipliez chaque production brute par le niveau de l’agglomération, du camp ou du collecteur. Les agglomérations, marchands terrestres et navires marchands de niveau III/IV ajoutent aussi 1×/2× la production de base de la tuile en produits transformés. Les ateliers ajoutent séparément leur palier × la production de base de leur ressource liée ; ces bonus ne consomment aucune matière première.",
        )}
      </p>
      <div className="terrain-reference-grid">
        {BIOMES.filter(
          (t) =>
            !seaOnly || ["water", "fish", "cod", "whale", "ice"].includes(t),
        ).map((tile) => {
          const raw = yields(tile),
            workshops = workshopGoods(tile);
          return (
            <article className="terrain-row" key={tile} data-terrain={tile}>
              <div className="terrain-caption">
                <TerrainImage tile={tile} />
                <h3>{tx(BIOME_INFO[tile].name)}</h3>
                <small>{tx(BIOME_INFO[tile].family)}</small>
              </div>
              <div className="terrain-yields">
                <span className="output-label">
                  {l(
                    "Annual average per matching roll",
                    "Moyenne annuelle par jet correspondant",
                  )}
                </span>
                {Object.keys(raw).length ? (
                  <Outputs goods={raw} choice={tile === "woods"} />
                ) : (
                  <p>{l("No production.", "Aucune production.")}</p>
                )}
                {workshops.map((g) => (
                  <div key={g}>
                    <span className="output-label">{tx(extensionName(g))}</span>
                    <Outputs goods={{ [processedFor(g)]: raw[g] }} />
                  </div>
                ))}
                {tile === "woods" && (
                  <p>
                    {l(
                      "Each faction chooses its own harvest. Choose Wood or Hides during your action phase. A workshop keeps the product chosen when built.",
                      "Chaque faction choisit sa production : Bois ou Peaux, pendant sa phase d’actions. Un atelier conserve le produit choisi à sa construction.",
                    )}
                  </p>
                )}
                {tile === "ice" && (
                  <p>
                    {l(
                      "Frozen in Spring, Autumn and Winter; open in Summer. Armies cross while frozen, ships while open. Ice never counts as solid ground for construction.",
                      "Gelée au printemps, en automne et en hiver ; libre en été. Les armées passent sur la glace, les navires sur l’eau libre. La banquise ne constitue jamais une terre ferme pour construire.",
                    )}
                  </p>
                )}
                {tile === "bare-peaks" && (
                  <p>
                    {l(
                      "Impassable to every unit, including recruits and retreating units. Roads may follow the edges. Towns and watchtowers need adjacent walkable solid land.",
                      "Infranchissable pour toutes les unités, y compris les recrues et les unités en repli. Les routes peuvent suivre les arêtes. Les agglomérations et les tours de guet exigent une terre ferme praticable adjacente.",
                    )}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="reference-note">
        {l(
          "Town multipliers: Settlement ×1, City I ×2, City II ×3, City III ×4. Camps ×1 / ×2. Workshops +1 / +2 / +3. Fish and Meat replace Grain; Oil replaces Coal. Multipliers apply to the current seasonal yield. For tiles yielding two goods, the workshop uses the first listed good. Woods offer a choice when building.",
          "Multiplicateurs : Colonie ×1, Ville I ×2, Ville II ×3, Ville III ×4. Camps ×1 / ×2. Ateliers +1 / +2 / +3. Le Poisson et la Viande remplacent le Blé ; l’Huile remplace le Charbon. Les multiplicateurs s’appliquent au rendement de la saison en cours. Sur une tuile à deux productions, l’atelier utilise la première ressource indiquée. Les Bois permettent un choix à la construction.",
        )}
      </p>
    </section>
  );
}
export function ClimateReference({
  initial = "temperate",
  readOnly = false,
}: { initial?: Climate; readOnly?: boolean } = {}) {
  const locale = useLocale(),
    l = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [climate, setClimate] = useState<Climate>(initial),
    info = CLIMATE_INFO[climate];
  const pct = (v: number) =>
    `${Number((v * 100).toFixed(3)).toLocaleString(locale)}%`;
  return (
    <section
      className="climate-reference"
      aria-label={l("Climate probabilities", "Probabilités des climats")}
    >
      <h2>{l("Climates", "Climats")}</h2>
      {!readOnly && (
        <div
          className="climate-tabs"
          role="group"
          aria-label={l("Choose climate", "Choisir le climat")}
        >
          {CLIMATES.map((c) => (
            <button
              key={c}
              aria-pressed={c === climate}
              onClick={() => setClimate(c)}
            >
              <i style={{ background: CLIMATE_INFO[c].color }} />
              {tx(CLIMATE_INFO[c].name)}
            </button>
          ))}
        </div>
      )}
      <h3>
        {tx(info.name)} · {pct(info.land)} {l("land", "terre")} /{" "}
        {pct(1 - info.land)} {l("water", "eau")}
      </h3>
      <p>
        {l("Compatible neighbors: ", "Voisins compatibles : ")}
        {info.compatible.map((c) => tx(CLIMATE_INFO[c].name)).join(", ")}
      </p>
      <p>
        {l("Transition weights: ", "Poids des transitions : ")}
        {info.compatible
          .map(
            (c) =>
              `${tx(CLIMATE_INFO[c].name)} ×${climateTransitionWeight(climate, c).toLocaleString(locale)}`,
          )
          .join(" · ")}
        {l(
          ". Applied only when changing climate, among destinations compatible with all immediate neighbors. Continuity remains 85%.",
          ". Appliqués seulement lors d’un changement de climat, parmi les destinations compatibles avec tous les voisins immédiats. La continuité reste de 85 %.",
        )}
      </p>
      <div className="climate-columns">
        <div>
          <h4>{l("If land is rolled", "Si le tirage donne une terre")}</h4>
          {info.terrain.map(([t, n]) => (
            <div className="climate-terrain" key={t}>
              <TerrainImage tile={t} climate={climate} />
              <span>
                {tx(BIOME_INFO[t].name)}
                <small>
                  {Object.keys(yields(t)).length ? (
                    <Outputs goods={yields(t)} choice={t === "woods"} />
                  ) : t === "bare-peaks" ? (
                    l(
                      "No production. Impassable.",
                      "Aucune production. Infranchissable.",
                    )
                  ) : (
                    l("No production.", "Aucune production.")
                  )}
                </small>
              </span>
              <strong>{n}%</strong>
            </div>
          ))}
        </div>
        <div>
          <h4>{l("If water is rolled", "Si le tirage donne de l’eau")}</h4>
          <p>
            {l(
              "Coastal probabilities below. Checks run in this order on the remaining water only. The first success ends the sequence.",
              "Probabilités côtières ci-dessous. Les tirages suivants ne concernent que l’eau restante. Le premier résultat positif arrête la séquence.",
            )}
          </p>
          <p>
            {l(
              "Open water (no adjacent land): Whale check ",
              "Haute mer (sans terre adjacente) : tirage Baleines ",
            )}
            {pct(Math.min(1, info.water.find(([b]) => b === "whale")![1] * 2))}
            {l("; effective share ", " ; part effective ")}
            {pct(
              waterProbabilities(climate, true).find(
                ([b]) => b === "whale",
              )![1],
            )}
            .
          </p>
          {waterProbabilities(climate).map(([t, n]) => (
            <div className="climate-terrain" key={t}>
              <TerrainImage tile={t} />
              <span>
                {tx(BIOME_INFO[t].name)}
                <small>
                  {t === "water"
                    ? l("Remaining water", "Eau restante")
                    : `${pct(info.water.find(([b]) => b === t)![1])} ${l("check", "au tirage")}`}
                </small>
              </span>
              <strong
                title={l(
                  "Effective share of water rolls",
                  "Part effective des tirages d’eau",
                )}
              >
                {pct(n)}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
