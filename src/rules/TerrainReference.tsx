import {
  GOOD_INFO,
  TERRAIN,
  extensionName,
  processedFor,
} from "../game/content";
import type { Good, Raw } from "../game/types";
import { localize as tx, useLocale } from "../i18n";
import { ResourceIcon } from "../ui/ResourceIcon";

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
type TileKind = Exclude<Raw, "oil"> | "whale" | "water";
const tiles: TileKind[] = [
  "lumber",
  "brick",
  "wool",
  "grain",
  "ore",
  "stone",
  "hides",
  "salt",
  "coal",
  "gold",
  "fish",
  "whale",
  "water",
];

export function TerrainImage({ tile }: { tile: TileKind }) {
  const index = atlas.indexOf(tile);
  const dedicated = tile === "gold" || tile === "fish" || tile === "whale";
  return (
    <span
      className={`terrain-picture ${tile === "water" ? "empty-water" : ""}`}
      role="img"
      aria-label={tx(TERRAIN[tile].name)}
      style={
        tile === "water"
          ? undefined
          : {
              backgroundImage: `url(./assets/${dedicated ? `terrain-${tile}-${tile === "fish" ? "v2" : "v1"}.png` : "terrain-atlas-v2.png"})`,
              backgroundSize: dedicated ? "cover" : "500% 200%",
              backgroundPosition: dedicated
                ? "center"
                : `${(index % 5) * 25}% ${Math.floor(index / 5) * 100}%`,
            }
      }
    />
  );
}

function Outputs({ goods }: { goods: Good[] }) {
  return (
    <span className="terrain-outputs">
      {goods.map((g, i) => (
        <span key={g}>
          {i > 0 && <b>+</b>}
          <ResourceIcon good={g} size={26} />
          {tx(GOOD_INFO[g].name)}
        </span>
      ))}
    </span>
  );
}

export function GoodSources({ good }: { good: Good }) {
  const locale = useLocale();
  const sources = tiles.filter(
    (t) =>
      t !== "water" &&
      (t === "whale"
        ? ["hides", "oil", "leather"].includes(good)
        : t === good || processedFor(t as Raw) === good),
  );
  // Oil has no deposit or extension. Fuel from Oil is an Artisan contract.
  return (
    <div
      className="good-sources"
      aria-label={
        locale === "fr" ? "Terrains de production" : "Production terrain"
      }
    >
      {sources.map((tile) => (
        <TerrainImage key={tile} tile={tile} />
      ))}
    </div>
  );
}

export function TerrainReference({ seaOnly = false }: { seaOnly?: boolean }) {
  const locale = useLocale();
  const l = (en: string, fr: string) => (locale === "fr" ? fr : en);
  return (
    <section
      className="terrain-reference"
      aria-label={l("Terrain and production", "Terrains et production")}
    >
      <h2>{l("Terrain and production", "Terrains et production")}</h2>
      <p className="reference-intro">
        {l(
          "When an unblocked tile's number is rolled, each adjacent town receives its level in the raw goods shown. A linked workshop adds its tier in processed goods. It does not consume the raw output.",
          "Lorsque le numéro d’une tuile non bloquée sort, chaque agglomération adjacente reçoit son niveau en ressources brutes indiquées. Un atelier lié ajoute son palier en produits transformés, sans consommer la production brute.",
        )}
      </p>
      <div className="terrain-reference-grid">
        {tiles
          .filter((t) => !seaOnly || ["fish", "whale", "water"].includes(t))
          .map((tile) => {
            const raw: Good[] =
              tile === "water"
                ? []
                : tile === "whale"
                  ? ["hides", "oil"]
                  : [tile];
            const linked = tile === "whale" ? "hides" : tile;
            return (
              <article className="terrain-row" key={tile} data-terrain={tile}>
                <div className="terrain-caption">
                  <TerrainImage tile={tile} />
                  <h3>{tx(TERRAIN[tile].name)}</h3>
                  <small>{tx(TERRAIN[tile].family)}</small>
                </div>
                <div className="terrain-yields">
                  <span className="output-label">
                    {l("Raw output", "Production brute")}
                  </span>
                  {raw.length ? (
                    <Outputs goods={raw} />
                  ) : (
                    <p>
                      {l("None. No dice number.", "Aucune. Pas de numéro.")}
                    </p>
                  )}
                  {linked !== "water" && (
                    <>
                      <span className="output-label">
                        {tx(extensionName(linked))}
                      </span>
                      <Outputs goods={[processedFor(linked)]} />
                    </>
                  )}
                  {tile === "fish" && (
                    <p>
                      {l(
                        "Fish replaces Grain 1:1 in recipes.",
                        "Les Poissons remplacent le Blé à 1:1 dans les recettes.",
                      )}
                    </p>
                  )}
                  {tile === "whale" && (
                    <p>
                      {l(
                        "Both goods are produced on the same roll. Oil replaces Coal 1:1. The workshop produces Leather only.",
                        "Les deux ressources sont produites au même lancer. L’Huile remplace le Charbon à 1:1. L’atelier produit uniquement du Cuir.",
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
          "Settlement: 1 raw per tile · City I: 2 · City II: 3 · City III: 4. Workshops I / II / III add 1 / 2 / 3 processed goods. Oil has no separate terrain or workshop; Artisans can convert it to Fuel.",
          "Colonie : 1 ressource brute par tuile · Ville I : 2 · Ville II : 3 · Ville III : 4. Les ateliers I / II / III ajoutent 1 / 2 / 3 produits transformés. L’Huile n’a ni terrain ni atelier propre ; les Artisans peuvent la transformer en Combustible.",
        )}
      </p>
    </section>
  );
}
