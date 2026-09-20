import { iceOdds, SEASONS, ICE_TRANSITIONS } from "../game/seasons";
import type { Climate } from "../game/climate-content";
import type { Hex } from "../game/types";
import { localize as tx, useLocale } from "../i18n";

export function IceReference({ climate }: { climate: Climate }) {
  const locale = useLocale(),
    l = (en: string, fr: string) => (locale === "fr" ? fr : en);
  if (!(climate in ICE_TRANSITIONS))
    return (
      <p className="season-note">
        {l(
          "Water in this climate stays open year-round.",
          "L’eau de ce climat reste libre toute l’année.",
        )}
      </p>
    );
  const table = (pack = false) => (
    <div className="season-reference-scroll">
      <table className="ice-transition-table">
        <thead>
          <tr>
            <th>{l("Half-season entered", "Demi-saison atteinte")}</th>
            <th>{l("Open water: freezes", "Eau libre : gel")}</th>
            <th>{l("Frozen water: thaws", "Eau gelée : dégel")}</th>
          </tr>
        </thead>
        <tbody>
          {SEASONS.flatMap((season) =>
            (["early", "late"] as const).map((half) => {
              const [freeze, melt] = iceOdds(
                { resource: pack ? "ice" : "water", climate } as Hex,
                season,
                half,
              );
              const name = `${half === "early" ? "Early" : "Late"} ${season[0].toUpperCase() + season.slice(1)}`;
              return (
                <tr key={name}>
                  <th>{tx(name)}</th>
                  <td>{Math.round(freeze * 100)}%</td>
                  <td>{Math.round(melt * 100)}%</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
  return (
    <details className="ice-rules">
      <summary>
        {l("Freeze and thaw probabilities", "Probabilités de gel et de dégel")}
      </summary>
      <p>
        {l(
          "Each sea tile checks once when a half-season begins. Use the freeze column if it is open, or the thaw column if it is frozen. A failed check leaves its surface unchanged. Results persist through saves; different years can have different ice.",
          "Chaque tuile marine effectue un tirage au début de chaque demi-saison. Utilisez la colonne gel si elle est libre, ou dégel si elle est gelée. Un échec conserve son état. Les résultats sont sauvegardés ; le gel peut varier d’une année à l’autre.",
        )}
      </p>
      {table()}
      {climate === "arctic" && (
        <>
          <p>
            {l(
              "Arctic Frozen sea terrain uses these heavier-ice probabilities:",
              "Le terrain Banquise arctique utilise ces probabilités de glace plus persistante :",
            )}
          </p>
          {table(true)}
        </>
      )}
      {climate === "glacial" && (
        <p>
          {l(
            "Glacial Frozen sea terrain is permanent pack ice: it never thaws. Ordinary Glacial water opens by Late Summer.",
            "Le terrain Banquise du climat Glacial reste gelé toute l’année. L’eau ordinaire du climat Glacial est libre en fin d’été.",
          )}
        </p>
      )}
    </details>
  );
}
