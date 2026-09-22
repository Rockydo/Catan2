import { localize as tx, useLocale } from "../i18n";
import type { Game } from "../game/types";
import { COLORS, ROMAN } from "../game/content";
import { landAtVertex } from "../game/world";
import {
  piecesAt,
  protects,
  ready,
  speed,
  unitName,
  siegeRequirement,
  towerSiegeRequirement,
  siegePower,
} from "../game/selectors";
import { towerDefense, towerName } from "../game/maritime";
import {
  siegeParticipants,
  townSiegeStatuses,
  townSiegeGroups,
  towerSiegeStatuses,
} from "../game/siege-status";
import { Modal, GoodsList, UnitPortrait } from "./components";
import { SiegeProgress } from "./TownAlerts";

export function SiegeDetails({
  game: s,
  townId,
  onClose,
}: {
  game: Game;
  townId: string;
  onClose: () => void;
}) {
  useLocale();

  const town = s.towns[townId];
  if (!town)
    return (
      <Modal title={tx("Siege ended")} onClose={onClose}>
        <p>{tx("This town has been destroyed.")}</p>
      </Modal>
    );
  const statuses = townSiegeStatuses(s, town);
  const towers = towerDefense(s, town.owner, town.vertex);
  return (
    <Modal title={tx(`Siege of ${town.name}`)} onClose={onClose}>
      <div className="siege-details">
        <p>
          <b>{s.players[town.owner].name}</b> ·{tx(" ")}
          {tx(
            town.level === 1 ? "Settlement" : `City ${ROMAN[town.level - 1]}`,
          )}
        </p>
        {tx(
          !statuses.length ? (
            <p>{tx("This town is no longer under siege.")}</p>
          ) : (
            <>
              <div
                className="siege-defense-grid"
                aria-label={tx("Siege defense breakdown")}
              >
                <span>
                  <b>{tx(town.level - 1)}</b>
                  {tx(" city defense")}
                </span>
                <span>
                  <b>{tx(town.wall)}</b>
                  {tx(" wall defense")}
                </span>
                <span>
                  <b>{tx(towers)}</b>
                  {tx(" tower support")}
                </span>
                <span>
                  <b>{tx(town.level - 1 + town.wall + towers)}</b>
                  {tx(" total siege turns")}
                </span>
              </div>
              <SiegeProgress game={s} town={town} />
              {tx(
                statuses.map(({ siege, required, remaining, breached }) => {
                  const turn = s.players[siege.owner].turns;
                  const operated = siege.last === turn;
                  const participants = new Set(
                    siegeParticipants(s, town, siege.owner).map((u) => u.id),
                  );
                  const groups = townSiegeGroups(s, town, siege.owner);
                  return (
                    <section
                      key={siege.owner}
                      className="siege-besieger"
                      aria-label={tx(
                        `${s.players[siege.owner].name} siege details`,
                      )}
                    >
                      <h3
                        style={{
                          borderLeft: `4px solid ${COLORS[siege.owner]}`,
                          paddingLeft: 8,
                        }}
                      >
                        {s.players[siege.owner].name}
                        {tx(" · besieging forces")}
                      </h3>
                      <p>
                        {tx(siege.progress)}
                        {tx(" completed siege steps · ")}
                        {tx(required)}
                        {tx(" ")}
                        {tx("currently required · ")}
                        {tx(remaining)}
                        {tx(" remaining.")}
                      </p>
                      <p className="notice">
                        {tx(
                          operated
                            ? "This faction has already operated against this town this turn. Its next opportunity is next owner turn."
                            : "This faction has not operated against this town this turn.",
                        )}
                        {tx(" ")}
                        {tx(
                          breached
                            ? `Warehouse breached. Destruction ${siege.raided! < turn && !operated ? "is unlocked" : "unlocks next attacker turn"}; it still requires a fresh adjacent army or siege fleet. New goods can be raided on a later owner turn.`
                            : remaining
                              ? `Complete ${remaining} more siege ${remaining === 1 ? "step" : "steps"}, then raid on a separate owner turn.`
                              : "No siege-only steps remain. The next permitted operation can raid.",
                        )}
                      </p>
                      {tx(
                        groups.map(({ tile, units, naval }) => {
                          const artillery = siegePower(units);
                          const counts = new Map<string, typeof units>();
                          for (const u of units) {
                            const key = `${u.kind}:${u.tier}`;
                            counts.set(key, [...(counts.get(key) ?? []), u]);
                          }
                          return (
                            <div
                              className="formation-faction"
                              key={`${tile}/${naval}`}
                            >
                              <b>
                                {tx(naval ? "Fleet at " : "Army at ")}
                                {tx(tile)} · {tx(units.length)}
                                {tx(naval ? " ships" : " units")}
                              </b>
                              <p className="muted small">
                                {tx("Siege power reduction: ")}
                                {tx(artillery)}
                                {tx(" turns · Required with this force: ")}
                                {tx(siegeRequirement(s, town, units))}
                                {tx(" ")}
                                {tx("turns.")}
                                <br />
                                {tx(
                                  units.filter((u) => participants.has(u.id))
                                    .length,
                                )}
                                {tx(" ")}
                                {tx("linked siege participants ·")}
                                {tx(" ")}
                                {tx(
                                  units.filter(
                                    (u) =>
                                      ready(s, u) &&
                                      speed(u) + u.bonus - u.moved >= 1,
                                  ).length,
                                )}
                                {tx(" ")}
                                {tx("with an operation point.")}
                              </p>
                              <div className="formation-groups">
                                {tx(
                                  [...counts.values()].map((group) => (
                                    <div
                                      className="formation-group"
                                      key={`${group[0].kind}:${group[0].tier}`}
                                    >
                                      <UnitPortrait unit={group[0]} />
                                      <span className="formation-unit-name">
                                        <b>{tx(unitName(group[0]))}</b>
                                        <small>
                                          {tx("Tier ")}
                                          {tx(ROMAN[group[0].tier])}
                                        </small>
                                      </span>
                                      <strong className="formation-count">
                                        ×{tx(group.length)}
                                      </strong>
                                    </div>
                                  )),
                                )}
                              </div>
                            </div>
                          );
                        }),
                      )}
                    </section>
                  );
                }),
              )}
              {tx(
                protects(s, town) && (
                  <p className="notice">
                    {tx(
                      "A defending army is present. It must be defeated before any siege operation.",
                    )}
                  </p>
                ),
              )}
              <h3>{tx("Warehouse at risk")}</h3>
              <GoodsList stock={town.stock} />
              <p className="muted small">
                {tx(
                  "Raids transfer the entire warehouse to the attacker's nearest surviving town. Each siege step or raid costs 1 movement point per participating unit; only one operation per town per attacker turn. Land and naval formations, and forces on different hexes, never combine siege power. Reinforcements, casualties and withdrawal can change these estimates. Destruction requires a later turn than the first raid.",
                )}
              </p>
            </>
          ),
        )}
      </div>
    </Modal>
  );
}

export function TowerSiegeDetails({
  game: s,
  vertex,
  onClose,
}: {
  game: Game;
  vertex: string;
  onClose: () => void;
}) {
  useLocale();

  const tower = s.towers[vertex];
  if (!tower)
    return (
      <Modal title={tx("Watchtower destroyed")} onClose={onClose}>
        <p>
          {tx(
            "This tower has been removed. Its defense bonuses no longer apply.",
          )}
        </p>
      </Modal>
    );
  const statuses = towerSiegeStatuses(s, tower);
  return (
    <Modal title={tx(`Siege of ${towerName(tower)}`)} onClose={onClose}>
      <p>
        <b>{s.players[tower.owner].name}</b>
        {tx(" · Tier ")}
        {tx(ROMAN[tower.tier])} ·{tx(" ")}
        {tx(vertex)}
      </p>
      <div className="siege-defense-grid">
        <span>
          <b>{tx(tower.tier)}</b>
          {tx(" support to nearby cities")}
        </span>
        <span>
          <b>{tx(Math.floor(tower.tier / 2))}</b>
          {tx(" standalone siege turns")}
        </span>
      </div>
      {tx(!statuses.length && <p>{tx("No siege underway.")}</p>)}
      {tx(
        statuses.map(({ siege, groups, required, remaining, operated }) => (
          <section className="siege-besieger" key={siege.owner}>
            <h3>
              {s.players[siege.owner].name}
              {tx(" · besieging forces")}
            </h3>
            <p>
              {tx(siege.progress)}
              {tx(" completed siege steps · ")}
              {tx(required)}
              {tx(" currently required · ")}
              {tx(remaining)}
              {tx(" remaining.")}
            </p>
            <p className="notice">
              {tx(
                operated
                  ? "Already operated this turn. Continue next attacker turn."
                  : "Operation available on this faction’s turn with an eligible army.",
              )}
              {tx(" ")}
              {tx(
                remaining
                  ? `${remaining} more siege steps, then a separate operation to destroy.`
                  : "Defenses overcome. Destroy on the next permitted operation.",
              )}
            </p>
            {tx(
              groups.map(({ tile, units }) => (
                <div className="formation-faction" key={tile}>
                  <b>
                    {tx("Army at ")}
                    {tx(tile)} · {tx(units.length)}
                    {tx(" units")}
                  </b>
                  <p>
                    {tx("Artillery reduction: ")}
                    {tx(siegePower(units))}
                    {tx(" turns · Required with this army: ")}
                    {tx(towerSiegeRequirement(tower, units))}
                    {tx(" turns.")}
                  </p>
                  <div className="formation-groups">
                    {tx(
                      [...new Set(units.map((u) => `${u.kind}:${u.tier}`))].map(
                        (key) => {
                          const group = units.filter(
                            (u) => `${u.kind}:${u.tier}` === key,
                          );
                          return (
                            <div className="formation-group" key={key}>
                              <UnitPortrait unit={group[0]} />
                              <span className="formation-unit-name">
                                <b>{tx(unitName(group[0]))}</b>
                                <small>
                                  {tx("Tier ")}
                                  {tx(ROMAN[group[0].tier])}
                                </small>
                              </span>
                              <strong className="formation-count">
                                ×{tx(group.length)}
                              </strong>
                            </div>
                          );
                        },
                      ),
                    )}
                  </div>
                </div>
              )),
            )}
          </section>
        )),
      )}
      <p className="muted small">
        {tx(
          "Each operation costs 1 movement point. Only one operation per tower per attacker turn. All defending armies on adjoining land tiles must be cleared. Defenses equal half the tower’s city bonus, rounded down, minus the participating army’s artillery tiers. Tier I is immediately destructible. Towers store no goods and require no post-raid waiting turn. Support continues until destruction; withdrawing or skipping a turn breaks the siege.",
        )}
      </p>
    </Modal>
  );
}
