import { RIPARIAN_TERRAIN, WILDLIFE_GOODS } from "../game/geography";
import { baseGeographicYield, wildHabitat } from "../game/geography";
import type { Hex } from "../game/types";
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
function sample(tile: Biome, climate?: Climate): Hex {
  return {
    id: "0,0",
    q: 0,
    r: 0,
    number: 7,
    resource: BIOME_INFO[tile].resource,
    biome: tile,
    climate,
    vertices: [],
    edges: [],
    geography: { elevation: 0.5, region: "reference" },
  };
}
function yields(tile: Biome, climate?: Climate): Stock {
  return baseGeographicYield(sample(tile, climate));
}
function potential(tile: Biome): Stock {
  if (tile === "river" || tile === "lake") return { fish: 1 };
  return {
    ...yields(tile),
    ...(wildHabitat(sample(tile)) ? { hides: 1, meat: 1, wool: 1 } : {}),
    ...(["water", "shoal", "reef", "fish", "cod", "whale"].includes(tile)
      ? { fish: 1, hides: 1, oil: 1 }
      : {}),
  };
}
function yieldVariants(tile: Biome) {
  if (tile === "fish" || tile === "cod" || tile === "whale")
    return [{ climates: [], raw: WILDLIFE_GOODS[tile] }];
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
  if (tile === "fish" || tile === "cod" || tile === "whale")
    return Object.keys(WILDLIFE_GOODS[tile]) as Raw[];
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
          good in potential(t) ||
          (Object.keys(potential(t)) as Raw[]).some(
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
      <p>
        {l(
          "Permanent terrain yields, except the Fish, Cod and Whale entries which show one present population. Wild grasslands and water produce nothing without migrating animals; forests retain timber. Animal yields are added while populations are present. See Living geography for their outputs and river crops.",
          "Rendements du terrain permanent, sauf les entrées Poissons, Morues et Baleines qui indiquent une population présente. Les plaines sauvages et l’eau ne produisent rien sans animaux migrateurs ; les forêts conservent leur bois. Les populations présentes ajoutent leurs rendements. Consultez Géographie vivante pour ces productions et les cultures riveraines.",
        )}
      </p>
      <div className="terrain-reference-grid">
        {BIOMES.filter(
          (t) =>
            !seaOnly ||
            [
              "water",
              "fish",
              "cod",
              "whale",
              "ice",
              "river",
              "lake",
              "shoal",
              "reef",
            ].includes(t),
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
                  {["fish", "cod", "whale"].includes(tile)
                    ? l(
                        "Per matching roll while one population is present",
                        "Par jet correspondant avec une population présente",
                      )
                    : l(
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
                      <Outputs goods={raw} choice={false} />
                    ) : (
                      <p>{l("No production.", "Aucune production.")}</p>
                    )}
                    {workshops
                      .filter((g) => !!raw[g])
                      .map((g) => (
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
                      "Woods always produce Wood in geography campaigns. Migrating animals add their own yields while present. The Wood/Hides choice applies only to legacy campaigns.",
                      "Dans les campagnes géographiques, les Bois produisent toujours du Bois. Les animaux migrateurs ajoutent leurs rendements lorsqu’ils sont présents. Le choix Bois/Peaux concerne uniquement les anciennes campagnes.",
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
      <h2>
        {l("Climate resource weights", "Poids des ressources par climat")}
      </h2>
      <p>
        {l(
          "New geography is built from relief, moisture, temperature and drainage before choosing climate and terrain. These are conditional resource weights, not map percentages. A single terrain draw accounts for ridges, riverbanks and coast. Historical land/water ratios and marine rolls apply only to legacy maps.",
          "La nouvelle géographie part du relief, de l’humidité, de la température et du drainage avant de choisir climat et terrain. Ces poids conditionnels ne sont pas des pourcentages de carte. Un seul tirage tient compte des crêtes, berges et côtes. Les ratios terre/eau et tirages marins historiques concernent uniquement les anciennes cartes.",
        )}
      </p>
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
        {tx(info.name)} · {l("Legacy ratio: ", "Ancien ratio : ")}
        {pct(info.land)} {l("land", "terre")} / {pct(1 - info.land)}{" "}
        {l("water", "eau")}
      </h3>
      <p>
        {l("Initial climate weight: ", "Poids du climat initial : ")}
        {climateInitialWeight(climate).toLocaleString(locale)}
        {l(
          ". Non-extreme climates have weight 1 each; Glacial, Hyperarid and Monsoon have weight 0.35 each. Weights are normalized for the starting draw.",
          ". Les climats non extrêmes ont chacun un poids de 1 ; Glacial, Hyperaride et Mousson ont chacun 0,35. Les poids sont normalisés pour le tirage initial.",
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
          ". Applied only when changing climate, among destinations compatible with all immediate neighbors. Continuity remains 88%.",
          ". Appliqués seulement lors d’un changement de climat, parmi les destinations compatibles avec tous les voisins immédiats. La continuité reste de 88 %.",
        )}
      </p>
      <p>
        {l(
          "Climate weights also depend on local temperature, moisture, altitude and distance from the sea. The compatibility rules remain mandatory.",
          "Les poids des climats dépendent aussi de la température locale, de l’humidité, de l’altitude et de la proximité de la mer. Les compatibilités restent obligatoires.",
        )}
      </p>
      <h4>{l("Riverbank additions", "Apports des berges")}</h4>
      <p>
        {l(
          "On low, gently sloping riverbanks, ordinary weights are quartered and these options are added. Warm rice deltas also add Delta gardens at weight 25. Polar banks receive no warm crops or tropical clay banks.",
          "Sur les berges basses à pente douce, les poids ordinaires sont divisés par quatre et les options suivantes sont ajoutées. Les deltas rizicoles chauds ajoutent les Jardins du delta avec un poids de 25. Les berges polaires ne reçoivent ni cultures chaudes ni argilières tropicales.",
        )}
      </p>
      <div className="climate-columns">
        {RIPARIAN_TERRAIN[climate].map(([biome, weight]) => (
          <div className="climate-terrain" key={biome}>
            <TerrainImage tile={biome} climate={climate} />
            <span>{tx(BIOME_INFO[biome].name)}</span>
            <strong>{weight}</strong>
          </div>
        ))}
      </div>
      <div className="climate-columns">
        <div>
          <h4>{l("Ordinary land weights", "Poids des terres ordinaires")}</h4>
          {info.terrain.map(([t, n]) => (
            <div className="climate-terrain" key={t}>
              <TerrainImage tile={t} climate={climate} />
              <span>
                {tx(BIOME_INFO[t].name)}
                <small>
                  {Object.keys(yields(t, climate)).length ? (
                    <Outputs goods={yields(t, climate)} choice={false} />
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
              <strong>{n}</strong>
            </div>
          ))}
        </div>
        <div>
          <h4>{l("Legacy water rolls", "Anciens tirages marins")}</h4>
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
