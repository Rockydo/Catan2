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
  biomeYield,
  climateInitialWeight,
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
function yields(tile: Biome, climate?: Climate): Stock {
  return tile === "woods" ? { lumber: 1, hides: 1 } : biomeYield(tile, climate);
}
function yieldVariants(tile: Biome) {
  const groups = new Map<string, { climates: Climate[]; raw: Stock }>();
  for (const climate of CLIMATES) {
    const info = CLIMATE_INFO[climate];
    if (![...info.terrain, ...info.water].some(([biome]) => biome === tile))
      continue;
    const raw = yields(tile, climate),
      key = JSON.stringify(raw),
      group = groups.get(key);
    if (group) group.climates.push(climate);
    else groups.set(key, { climates: [climate], raw });
  }
  return groups.size
    ? [...groups.values()]
    : [{ climates: [], raw: yields(tile) }];
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
          (Object.keys(yields(t)) as Raw[]).some(
            (g) => processedFor(g) === good,
          ),
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
          "Output below is the current climate-adjusted annual baseline for one settlement. Crops with different regional yields list each case. Multiply raw output by town level, camp tier or collector tier. Towns, land merchants and merchant ships at levels III/IV also add 1×/2× the base tile yield as processed goods. Workshops add their tier × the linked resource's yield separately; none of these bonuses consume raw goods.",
          "Les quantités ci-dessous sont les bases annuelles actuelles d’une colonie, ajustées au climat. Chaque rendement régional des cultures est indiqué. Multipliez la production brute par le niveau de l’agglomération, du camp ou du collecteur. Les agglomérations, marchands terrestres et navires marchands de niveau III/IV ajoutent aussi 1×/2× la base en produits transformés. Les ateliers ajoutent séparément leur palier × le rendement de la ressource liée ; ces bonus ne consomment aucune matière première.",
        )}
      </p>
      <div className="terrain-reference-grid">
        {BIOMES.filter(
          (t) =>
            !seaOnly || ["water", "fish", "cod", "whale", "ice"].includes(t),
        ).map((tile) => {
          const variants = yieldVariants(tile),
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
                {variants.map(({ climates, raw }, index) => (
                  <div key={index} data-yield-climates={climates.join(" ")}>
                    {variants.length > 1 && (
                      <strong className="output-label">
                        {climates
                          .map((c) => tx(CLIMATE_INFO[c].name))
                          .join(" / ")}
                      </strong>
                    )}
                    {Object.keys(raw).length ? (
                      <Outputs goods={raw} choice={tile === "woods"} />
                    ) : (
                      <p>{l("No production.", "Aucune production.")}</p>
                    )}
                    {workshops.map((g) => (
                      <div key={g}>
                        <span className="output-label">
                          {tx(extensionName(g))}
                        </span>
                        <Outputs goods={{ [processedFor(g)]: raw[g] }} />
                      </div>
                    ))}
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
                      "Glacial Frozen sea stays frozen all year. Arctic Frozen sea opens only in Summer. Armies cross while frozen, ships while open. Ice never counts as solid ground for construction.",
                      "La Banquise du climat Glacial reste gelée toute l’année. La Banquise arctique s’ouvre seulement en Été. Les armées passent sur la glace, les navires sur l’eau libre. La banquise ne constitue jamais une terre ferme pour construire.",
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
    info = CLIMATE_INFO[climate],
    whaleChance = info.water.find(([b]) => b === "whale")?.[1];
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
        {l("Initial climate weight: ", "Poids du climat initial : ")}
        {climateInitialWeight(climate).toLocaleString(locale)}
        {l(
          ". The fourteen non-extreme climates have weight 1 each; Glacial, Hyperarid and Monsoon have weight 0.35 each. Weights are normalized for the starting draw.",
          ". Les quatorze climats non extrêmes ont chacun un poids de 1 ; Glacial, Hyperaride et Mousson ont chacun 0,35. Les poids sont normalisés pour le tirage initial.",
        )}
      </p>
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
                  {Object.keys(yields(t, climate)).length ? (
                    <Outputs
                      goods={yields(t, climate)}
                      choice={t === "woods"}
                    />
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
            {whaleChance ? (
              <>
                {l(
                  "Open water (no adjacent land): Whale check ",
                  "Haute mer (sans terre adjacente) : tirage Baleines ",
                )}
                {pct(Math.min(1, whaleChance * 2))}
                {l("; effective share ", " ; part effective ")}
                {pct(
                  waterProbabilities(climate, true).find(
                    ([b]) => b === "whale",
                  )?.[1] ?? 0,
                )}
                .
              </>
            ) : (
              l("No whales in this climate.", "Aucune baleine dans ce climat.")
            )}
          </p>
          {waterProbabilities(climate).map(([t, n]) => (
            <div className="climate-terrain" key={t}>
              <TerrainImage tile={t} climate={climate} />
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
