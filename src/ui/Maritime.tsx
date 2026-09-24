import { seasonAt, seasonalYield } from "../game/seasons";
import { localize as tx, useLocale } from "../i18n";
import { towerSiegeStatuses } from "../game/siege-status";
import type { Game, Piece, Good } from "../game/types";
import { GOOD_INFO, ROMAN, TOWER_COSTS } from "../game/content";
import {
  harvestTiles,
  defaultCoverage,
  tileGood,
  tileGoods,
  harvestYield,
  tileYield,
  towerName,
  towerSites,
  collector,
} from "../game/maritime";
import { neighbors } from "../game/world";
import { nearestTown, probability, unitName } from "../game/selectors";
import { ActionButton } from "./components";
import type { Command } from "../game/types";

type Actions = {
  game: Game;
  viewer: number;
  interactive: boolean;
  onAction: (c: Command) => void;
};
export function TowerPanel({
  game: s,
  viewer,
  interactive,
  onAction,
  vertex,
  onInspectSiege,
}: Actions & { vertex: string; onInspectSiege: () => void }) {
  useLocale();

  const tower = s.towers[vertex],
    tier = tower?.tier ?? 0;
  if (!tower && !towerSites(s, viewer).includes(vertex)) return null;
  return (
    <section className="tower-card" aria-label={tx("Watchtower")}>
      <b>
        {tx(
          tower
            ? `${s.players[tower.owner].name} · ${towerName(tower)} ${ROMAN[tier]}`
            : "Road watchtower",
        )}
      </b>
      <p>
        +{tx(tier || 1)}
        {tx(" army/fleet power on adjoining hexes. +")}
        {tx(tier || 1)}
        {tx(
          " siege turns for your town here or one road edge away. Bonuses from nearby towers add together.",
        )}
      </p>
      {tx(
        tower && (
          <p className="muted small">
            {tx("Standalone defense: ")}
            {tx(Math.floor(tier / 2))}
            {tx(
              " siege turns before artillery reductions. No warehouse; destroyed as soon as defenses are overcome.",
            )}
          </p>
        ),
      )}
      {tx(
        tower && towerSiegeStatuses(s, tower).length > 0 && (
          <button className="text-button" onClick={onInspectSiege}>
            {tx("View tower siege details")}
          </button>
        ),
      )}
      {tx(
        !tower && (
          <>
            <p>{tx("Choose the base material: two Wood or two Stone.")}</p>
            {tx(
              (["lumber", "stone"] as const).map((material) => (
                <ActionButton
                  key={material}
                  game={s}
                  command={{ type: "tower", vertex, mode: material }}
                  onAction={onAction}
                  disabled={!interactive}
                  cost={{ [material]: 2 }}
                >
                  {tx("Build watchtower with ")}
                  {tx(material === "lumber" ? "Wood" : "Stone")}
                </ActionButton>
              )),
            )}
          </>
        ),
      )}
      {tx(
        tower && tower.owner === viewer && (
          <ActionButton
            game={s}
            command={{ type: "tower", vertex }}
            onAction={onAction}
            disabled={!interactive || tier === 4}
            cost={tier < 4 ? TOWER_COSTS[tier + 1] : undefined}
          >
            {tx(
              tier === 4
                ? "Maximum watchtower tier"
                : tier
                  ? `Upgrade watchtower to ${ROMAN[tier + 1]}`
                  : "Build watchtower",
            )}
          </ActionButton>
        ),
      )}
    </section>
  );
}
export function HarvestPanel({
  game: s,
  viewer,
  interactive,
  onAction,
  units,
}: Actions & { units: Piece[] }) {
  useLocale();

  return (
    <>
      {tx(
        units.filter(collector).map((u) => {
          const covered = harvestTiles(s, u),
            chosen = u.coverage ?? defaultCoverage(s, u);
          return (
            <section
              key={u.id}
              className="harvest-card"
              data-testid={`harvest-${u.id}`}
            >
              <b>
                {tx(unitName(u))} · {s.players[u.owner].name}
              </b>
              <p>
                {tx(
                  "Harvests the listed seasonal goods on each matching roll. Stored in",
                )}
                {tx(" ")}
                {tx(
                  nearestTown(s, u.tile, u.owner)?.name ?? "the nearest town",
                )}
                .
              </p>
              {u.kind === "fishing" && (
                <p>
                  {tx(
                    `Fishing range: ${u.tier} water tiles. Land and ice block coverage.`,
                  )}
                </p>
              )}
              {!["fishing", "hunter"].includes(u.kind) && u.tier >= 3 && (
                <p>
                  {tx(
                    `Adds ${u.tier - 2} times the harvested base yield as processed goods.`,
                  )}
                </p>
              )}
              <small>
                {tx(
                  u.kind === "hunter"
                    ? "Hunting radius equals tier. Collects animal goods only; enemy armies block hunting."
                    : u.kind === "fishing"
                      ? "Fish and Whales (Hides + Oil) · enemy fleets block harvest."
                      : "Collects despite enemy occupation.",
                )}
                {tx(" ")}
                {tx(
                  u.kind === "hunter"
                    ? "Hunter power: tier minus one. Tier I is lost when its force enters battle."
                    : u.kind === "merchant"
                      ? "Zero power · destroyed when its army enters battle."
                      : "Economic ship · vulnerable without an escort.",
                )}
              </small>
              <div
                className="harvest-tiles"
                aria-label={tx("Harvest coverage")}
              >
                {tx(
                  covered.map((id) => (
                    <span key={id}>
                      {tx(
                        Object.entries(
                          harvestYield(
                            s.tiles[id],
                            u.owner,
                            u.tier,
                            !["fishing", "hunter"].includes(u.kind),
                            u.kind === "hunter"
                              ? Object.fromEntries(
                                  Object.entries(
                                    seasonalYield(
                                      s.tiles[id],
                                      u.owner,
                                      seasonAt(s),
                                    ),
                                  )
                                    .filter(
                                      ([raw]) =>
                                        s.tiles[id].geography?.fauna?.[
                                          raw as Good
                                        ],
                                    )
                                    .map(([raw, n]) => [
                                      raw,
                                      Math.min(
                                        n ?? 0,
                                        s.tiles[id].geography?.fauna?.[
                                          raw as Good
                                        ] ?? 0,
                                      ),
                                    ]),
                                )
                              : seasonalYield(
                                  s.tiles[id],
                                  u.owner,
                                  seasonAt(s),
                                ),
                          ),
                        )
                          .map(
                            ([good, amount]) =>
                              `${amount} ${GOOD_INFO[good as Good].name}`,
                          )
                          .join(" + ") || "No harvest this season",
                      )}
                      {tx(" ")}· {tx(id)}
                      {tx(" · roll ")}
                      {tx(s.tiles[id].number)}
                    </span>
                  )),
                )}
              </div>
              {tx(
                u.kind === "merchant" && (
                  <details open={units.length === 1}>
                    <summary>
                      {tx("Coverage · current tile + ")}
                      {tx(chosen.length)}/{tx(u.tier)}
                      {tx(" neighbours")}
                    </summary>
                    {tx(
                      neighbors(u.tile)
                        .filter((id) => s.tiles[id] && tileGood(s.tiles[id]))
                        .map((id) => (
                          <label key={id} className="coverage-choice">
                            <input
                              type="checkbox"
                              aria-label={tx(`Harvest ${id}`)}
                              checked={chosen.includes(id)}
                              disabled={
                                !interactive ||
                                u.owner !== viewer ||
                                (!chosen.includes(id) &&
                                  chosen.length >= u.tier)
                              }
                              onChange={(e) =>
                                onAction({
                                  type: "coverage",
                                  target: u.id,
                                  ids: e.target.checked
                                    ? [...chosen, id]
                                    : chosen.filter((t) => t !== id),
                                })
                              }
                            />
                            {tx(
                              tileGoods(s.tiles[id], u.owner)
                                .map(
                                  (good) =>
                                    `${(seasonalYield(s.tiles[id], u.owner, seasonAt(s))[good] ?? 0) * u.tier} ${GOOD_INFO[good].name}`,
                                )
                                .join(" + "),
                            )}
                            {tx(" ")}· {tx(id)}
                            {tx(" · roll ")}
                            {tx(s.tiles[id].number)} (
                            {tx(
                              Math.round(probability(s.tiles[id].number) * 100),
                            )}
                            %)
                          </label>
                        )),
                    )}
                    {tx(
                      u.owner === viewer && (
                        <button
                          className="secondary full"
                          disabled={!interactive}
                          onClick={() =>
                            onAction({
                              type: "coverage",
                              target: u.id,
                              mode: "auto",
                              ids: [],
                            })
                          }
                        >
                          {tx("Use automatic coverage")}
                        </button>
                      ),
                    )}
                  </details>
                ),
              )}
            </section>
          );
        }),
      )}
    </>
  );
}
