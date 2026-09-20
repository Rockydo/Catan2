import { Snowflake, Waves } from "lucide-react";
import { terrainName } from "../game/maritime";
import { localize as tx, useLocale } from "../i18n";
import { friendly } from "../game/relations";
import type { Game, Piece, UnitClass, ShipClass } from "../game/types";
import {
  COLORS,
  ROMAN,
  SHIP_INFO,
  UNIT_INFO,
  TERRAIN,
  shipStats,
} from "../game/content";
import { points, power, ready, speed, unitName } from "../game/selectors";
import { towerPower } from "../game/maritime";
import { UnitPortrait } from "./components";

const classOrder = [
  "heavy",
  "light",
  "cavalry",
  "artillery",
  "merchant",
  "settler",
  "galley",
  "carrack",
  "transport",
  "convoy",
  "fishing",
  "merchantship",
  "settlership",
];
function grouped(units: Piece[]) {
  const groups = new Map<string, Piece[]>();
  for (const u of units) {
    const key = `${u.kind}:${u.tier}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  }
  return [...groups.values()].sort(
    (a, b) =>
      classOrder.indexOf(a[0].kind) - classOrder.indexOf(b[0].kind) ||
      b[0].tier - a[0].tier,
  );
}
const canAct = (s: Game, u: Piece) =>
  ready(s, u) && speed(u) + u.bonus - u.moved > 0;
/** Automatic selection must not trap mobile troops beside exhausted units. */
export const selectReadyForce = (s: Game, units: Piece[]): string[] => {
  const eligible = units.filter((u) => canAct(s, u));
  const naval = eligible[0]?.naval;
  return eligible.filter((u) => u.naval === naval).map((u) => u.id);
};
/** Split by class and tier first, then balance odd remainders by base power. */
export function selectHalfForce(s: Game, units: Piece[]): string[] {
  const readyIds = new Set(selectReadyForce(s, units));
  const eligible = units.filter((u) => readyIds.has(u.id));
  const wanted = Math.ceil(eligible.length / 2);
  const chosen: Piece[] = [],
    remainders: Piece[] = [];
  for (const group of grouped(eligible)) {
    const half = Math.floor(group.length / 2);
    chosen.push(...group.slice(0, half));
    if (group.length % 2) remainders.push(group[half]);
  }
  const target =
    (eligible.reduce((n, u) => n + points(u), 0) * wanted) /
    Math.max(1, eligible.length);
  while (chosen.length < wanted) {
    const remaining = wanted - chosen.length;
    const ideal =
      (target - chosen.reduce((n, u) => n + points(u), 0)) / remaining;
    remainders.sort(
      (a, b) =>
        Math.abs(points(a) - ideal) - Math.abs(points(b) - ideal) ||
        a.id.localeCompare(b.id),
    );
    chosen.push(remainders.shift()!);
  }
  return chosen.map((u) => u.id);
}
/** Only public pieces are shown. Embarked troops are counted separately from fleet combat power. */
export function ArmyComposition({
  game: s,
  units,
  viewer,
  selectedIds,
  onSelect,
}: {
  game: Game;
  units: Piece[];
  viewer: number;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}) {
  useLocale();

  const selected = new Set(selectedIds);
  const formations = [...new Set(units.map((u) => `${u.owner}:${u.naval}`))]
    .map((key) => {
      const [owner, naval] = key.split(":");
      return { owner: Number(owner), naval: naval === "true", key };
    })
    .sort(
      (a, b) =>
        Number(b.owner === viewer) - Number(a.owner === viewer) ||
        a.owner - b.owner ||
        Number(a.naval) - Number(b.naval),
    );
  const carriers = new Set(units.map((u) => u.id));
  const passengers = Object.values(s.pieces).filter(
    (u) => !!u.carrier && carriers.has(u.carrier),
  );
  return (
    <section
      className="formation-overview"
      aria-label={tx("Army composition")}
      data-testid="army-overview"
    >
      {tx(
        formations.map(({ owner, naval, key }) => {
          const force = units.filter(
              (u) => u.owner === owner && u.naval === naval,
            ),
            first = force[0];
          const cargo = passengers.filter((u) => u.owner === owner);
          const base = force.reduce((n, u) => n + points(u), 0),
            actual = power(s, force, first.tile);
          const support = force.some((u) => u.naval || points(u) > 0)
            ? towerPower(s, owner, first.tile)
            : 0;
          const capacity = naval
            ? force.reduce(
                (n, u) => n + shipStats(u.kind as ShipClass, u.tier).capacity,
                0,
              )
            : 0;
          const readyCount = force.filter((u) => canAct(s, u)).length;
          return (
            <div
              className="formation-faction"
              key={key}
              data-testid={`formation-owner-${owner}`}
            >
              <div className="formation-heading">
                <span
                  className="formation-color"
                  style={{ background: COLORS[owner] }}
                  aria-hidden="true"
                />
                <b>{s.players[owner].name}</b>
                <small>
                  {tx(
                    owner === viewer
                      ? "Your"
                      : friendly(s, owner, viewer)
                        ? "Allied"
                        : "Enemy",
                  )}
                  {tx(" ")}
                  {tx(naval ? "fleet" : "army")}
                </small>
              </div>
              <div className="formation-stats">
                <span>
                  <b>{tx(force.length)}</b> {tx(naval ? "ships" : "units")}
                </span>
                <span
                  title={tx(
                    force.some((u) => u.seasonStatus === "icebound")
                      ? "Icebound ships: one-quarter power per ship, rounded up. Watchtower support is added normally."
                      : `${base} base power + ${actual - base - support} terrain bonus + ${support} watchtower support`,
                  )}
                >
                  <b>{tx(actual)}</b>
                  {tx(" power here")}
                </span>
                <span>
                  <b>{tx(readyCount)}</b>
                  {tx(" ready to move")}
                </span>
                {tx(
                  capacity > 0 && (
                    <span>
                      <b>
                        {tx(cargo.length)}/{tx(capacity)}
                      </b>
                      {tx(" ")}
                      {tx("passengers")}
                    </span>
                  ),
                )}
              </div>
              <p className="formation-context">
                {tx(base)}
                {tx(" base · ")}
                {tx(terrainName(s.tiles[first.tile]))}
                {tx(support > 0 ? ` · +${support} tower support` : "")}
                {tx(
                  force.some((u) => u.guildSiege)
                    ? ` · +${Math.max(...force.map((u) => u.guildSiege ?? 0))} Engineer siege power this turn`
                    : "",
                )}
              </p>
              {force.some((u) => u.seasonStatus === "icebound") && (
                <p className="season-force-warning">
                  <Snowflake size={16} />
                  <span>
                    <b>{tx("Icebound")}</b>
                    {tx(
                      " · Icebound ships fight at one-quarter power (rounded up) and cannot move or retreat. Friendly land armies on this hex defend them at full strength. Passengers remain aboard.",
                    )}
                  </span>
                </p>
              )}
              {force.some((u) => u.seasonStatus === "adrift") && (
                <p className="season-force-warning">
                  <Waves size={16} />
                  <span>
                    <b>{tx("On a drifting ice floe")}</b>
                    {tx(
                      " · Move onto adjacent land or ice, or board a friendly transport. Units are not lost to the thaw.",
                    )}
                  </span>
                </p>
              )}
              <div className="formation-groups">
                {tx(
                  grouped(force).map((group) => {
                    const u = group[0],
                      ids = group.map((x) => x.id),
                      eligible = group
                        .filter((x) => canAct(s, x))
                        .map((x) => x.id);
                    const count = ids.filter((id) => selected.has(id)).length;
                    const economic = [
                      "merchant",
                      "settler",
                      "merchantship",
                      "settlership",
                      "fishing",
                    ].includes(u.kind);
                    const deselect =
                      count > 0 &&
                      (eligible.length === 0 ||
                        eligible.every((id) => selected.has(id)));
                    const content = (
                      <>
                        <UnitPortrait unit={u} />
                        <span className="formation-unit-name">
                          <b>{tx(unitName(u))}</b>
                          <small>
                            {tx(
                              u.naval
                                ? SHIP_INFO[u.kind as ShipClass].name
                                : UNIT_INFO[u.kind as UnitClass].name,
                            )}
                            {tx(" ")}
                            {tx("· Tier ")}
                            {tx(ROMAN[u.tier])}
                            {tx(economic ? " · Economy" : "")}
                          </small>
                          {tx(
                            owner === viewer && (
                              <small>
                                {tx(count)}
                                {tx(" selected · ")}
                                {tx(eligible.length)}
                                {tx(" ready")}
                              </small>
                            ),
                          )}
                        </span>
                        <strong
                          className="formation-count"
                          aria-label={tx(`${group.length} pieces`)}
                        >
                          ×{tx(group.length)}
                        </strong>
                      </>
                    );
                    return owner === viewer ? (
                      <button
                        key={`${u.kind}:${u.tier}`}
                        className={`formation-group ${count ? "has-selection" : ""}`}
                        aria-label={tx(
                          `${deselect ? "Deselect" : "Select ready"} ${unitName(u)} group, tier ${ROMAN[u.tier]}, ${group.length} units`,
                        )}
                        aria-pressed={
                          count === 0
                            ? false
                            : count === group.length
                              ? true
                              : "mixed"
                        }
                        disabled={!eligible.length && count === 0}
                        title={tx(
                          "Select units with movement left, or deselect this entire group including exhausted units. Individual selection is below.",
                        )}
                        onClick={() =>
                          onSelect(
                            deselect
                              ? selectedIds.filter((id) => !ids.includes(id))
                              : [
                                  ...selectedIds.filter(
                                    (id) =>
                                      !ids.includes(id) &&
                                      s.pieces[id]?.naval === naval,
                                  ),
                                  ...eligible,
                                ],
                          )
                        }
                      >
                        {tx(content)}
                      </button>
                    ) : (
                      <div
                        key={`${u.kind}:${u.tier}`}
                        className="formation-group"
                        data-testid="enemy-unit-group"
                      >
                        {tx(content)}
                      </div>
                    );
                  }),
                )}
              </div>
              {tx(
                cargo.length > 0 && (
                  <div
                    className="formation-cargo"
                    aria-label={tx("Embarked troops")}
                  >
                    <b>
                      {tx("Embarked troops · ")}
                      {tx(cargo.length)}
                    </b>
                    <small>
                      {tx("Transported separately; excluded from fleet power.")}
                    </small>
                    {tx(
                      grouped(cargo).map((group) => (
                        <div
                          className="formation-cargo-row"
                          key={`${group[0].kind}:${group[0].tier}`}
                        >
                          <UnitPortrait unit={group[0]} />
                          <span>
                            {tx(unitName(group[0]))}
                            <small>
                              {tx("Tier ")}
                              {tx(ROMAN[group[0].tier])}
                            </small>
                          </span>
                          <b>×{tx(group.length)}</b>
                        </div>
                      )),
                    )}
                  </div>
                ),
              )}
            </div>
          );
        }),
      )}
      {tx(
        units.some((u) => u.owner === viewer) && (
          <p className="formation-hint">
            {tx("Click a unit group to change your selection.")}
          </p>
        ),
      )}
    </section>
  );
}
