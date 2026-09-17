import { localize as tx, useLocale } from "../i18n";
import type { Game, Town } from "../game/types";
import { siegeRequirement, siegePower, protects } from "../game/selectors";
import { towerDefense } from "../game/maritime";
import { townSiegeStatuses } from "../game/siege-status";
export function TownDefense({
  game: s,
  town,
  ids = [],
}: {
  game: Game;
  town: Town;
  ids?: string[];
}) {
  useLocale();

  const base = siegeRequirement(s, town, []),
    towers = towerDefense(s, town.owner, town.vertex);
  const units = ids
    .map((id) => s.pieces[id])
    .filter(
      (u) =>
        u &&
        !u.naval &&
        !u.carrier &&
        u.owner !== town.owner &&
        u.kind !== "merchant",
    );
  const formation =
    units.length > 0 &&
    units.every((u) => u.tile === units[0].tile && u.owner === units[0].owner);
  const adjusted = formation ? siegeRequirement(s, town, units) : base;
  const status = townSiegeStatuses(s, town)[0];
  return (
    <div className="town-defense" data-testid="town-siege-resistance">
      <strong>
        {tx("Siege resistance: ")}
        {tx(base)} {tx(base === 1 ? "turn" : "turns")}
      </strong>
      <small>
        {tx("City ")}
        {tx(town.level - 1)}
        {tx(" + walls ")}
        {tx(town.wall)}
        {tx(" + watchtowers ")}
        {tx(towers)}
      </small>
      <span>
        {tx(
          base
            ? `Without siege equipment: raid on operation ${base + 1}; destruction from the following attacker turn.`
            : "No siege delay: can be raided immediately, then destroyed from the next attacker turn.",
        )}
      </span>
      {tx(
        formation && (
          <span>
            {tx("Selected army: −")}
            {tx(siegePower(units))}
            {tx(" siege turns.")}
            {tx(" ")}
            {tx(
              adjusted
                ? `${adjusted} siege turns before raiding.`
                : "Can raid immediately once defenders are cleared.",
            )}
          </span>
        ),
      )}
      {tx(
        status && (
          <b>
            {tx(
              status.breached
                ? status.label
                : `${status.remaining} siege steps remaining · ${status.completed}/${status.required} completed`,
            )}
          </b>
        ),
      )}
      {tx(
        protects(s, town) && (
          <small>
            {tx("Defending armies must be defeated before a siege can begin.")}
          </small>
        ),
      )}
    </div>
  );
}
