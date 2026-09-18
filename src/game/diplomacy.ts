import type { AllianceOffer, Command, Game } from "./types";
import { allianceLock, allianceOf, friendly } from "./relations";
import { factionStrengths } from "./ai-strategy";
import { distance, landAtVertex } from "./world";
import { ownTowns } from "./selectors";
import { log, rule } from "./economy";

export const ALLIANCE_LIMIT = 4;
export const ALLIANCE_TERM = 5;
// A survival pact may beat its target, but should not become a permanent superpower.
export const ALLIANCE_POWER_MARGIN = 1.5;
const ALLIANCE_RECRUITMENT_MARGIN = 1.2;
export function strongestFaction(s: Game): number {
  const strengths = factionStrengths(s);
  return (
    s.players
      .filter((p) => p.alive)
      .sort((a, b) => strengths[b.id] - strengths[a.id] || a.id - b.id)[0]
      ?.id ?? -1
  );
}
const proximityCache = new WeakMap<Game, Map<string, number>>();
/** Distance between actual towns, not a roaming scout across the world. */
export function realmDistance(s: Game, a: number, b: number): number {
  let cache = proximityCache.get(s);
  if (!cache) proximityCache.set(s, (cache = new Map()));
  const key = [a, b].sort((x, y) => x - y).join("/");
  if (cache.has(key)) return cache.get(key)!;
  const first = [
    ...new Set(ownTowns(s, a).flatMap((t) => landAtVertex(s, t.vertex))),
  ];
  const second = [
    ...new Set(ownTowns(s, b).flatMap((t) => landAtVertex(s, t.vertex))),
  ];
  let result = Infinity;
  for (const x of first)
    for (const y of second) result = Math.min(result, distance(x, y));
  cache.set(key, result);
  return result;
}
export function allianceCandidates(
  s: Game,
  from: number,
  to: number,
): number[] {
  return [
    ...new Set([
      ...(allianceOf(s, from)?.members ?? [from]),
      ...(allianceOf(s, to)?.members ?? [to]),
    ]),
  ];
}
export function allianceOfferError(
  s: Game,
  from: number,
  to: number,
): string | undefined {
  if (s.alliances?.some((a) => a.emergency === "locked"))
    return "Diplomacy is locked until the coalition target falls to 20% of global power.";
  if (from === to || !s.players[from]?.alive || !s.players[to]?.alive)
    return "Choose a surviving other faction.";
  if (friendly(s, from, to)) return "These factions are already allied.";
  const members = allianceCandidates(s, from, to);
  if (members.length > ALLIANCE_LIMIT)
    return "An alliance can contain at most four factions.";
  if (members.includes(strongestFaction(s)))
    return "No alliance can admit the strongest faction.";
  // Every member is geographically connected through a nearby partner.
  const reached = new Set([members[0]]);
  for (let n = 0; n < members.length; n++)
    for (const a of members)
      for (const b of members)
        if (reached.has(a) && realmDistance(s, a, b) <= 6) reached.add(b);
  if (reached.size !== members.length)
    return "Alliance partners must be nearby (within six hexes of another member's towns).";
  return undefined;
}
/** A common nearby enemy must materially outmatch each prospective partner. */
function commonThreat(
  s: Game,
  members: number[],
  ratio: number,
  cushion: number,
): number | undefined {
  const scores = factionStrengths(s);
  return s.players
    .filter(
      (p) =>
        p.alive &&
        !members.includes(p.id) &&
        members.every(
          (id) =>
            !friendly(s, id, p.id) &&
            scores[p.id] >= scores[id] * ratio + cushion &&
            realmDistance(s, id, p.id) <= 9,
        ),
    )
    .sort((a, b) => scores[b.id] - scores[a.id] || a.id - b.id)[0]?.id;
}
export function sharedThreat(s: Game, members: number[]): number | undefined {
  return commonThreat(s, members, 1.2, 6);
}
export function acceptsAlliance(s: Game, offer: AllianceOffer): boolean {
  if (allianceOfferError(s, offer.from, offer.to)) return false;
  const members = allianceCandidates(s, offer.from, offer.to);
  // Departures record both directions. A third partner must not reunite the
  // same former allies immediately and restart their five-round commitment.
  for (const a of members)
    for (const b of members)
      if (
        a < b &&
        !friendly(s, a, b) &&
        s.players[a].turns - (s.players[a].allianceContacts?.[b] ?? -100) < 5 &&
        s.players[b].turns - (s.players[b].allianceContacts?.[a] ?? -100) < 5
      )
        return false;
  const threat = sharedThreat(s, members);
  if (threat === undefined) return false;
  const scores = factionStrengths(s);
  const combined = (ids: number[]) => ids.reduce((n, id) => n + scores[id], 0);
  if (combined(members) > scores[threat] * ALLIANCE_POWER_MARGIN) return false;
  // Both pacts must need help: merging cannot be a way around the recruitment limit.
  return [allianceOf(s, offer.from), allianceOf(s, offer.to)].every(
    (existing) =>
      !existing ||
      combined(existing.members) < scores[threat] * ALLIANCE_RECRUITMENT_MARGIN,
  );
}
export function acceptAlliance(s: Game, offer: AllianceOffer) {
  const error = allianceOfferError({ ...s }, offer.from, offer.to);
  rule(!error, error ?? "Invalid alliance.");
  const members = allianceCandidates(s, offer.from, offer.to);
  const first = allianceOf(s, offer.from),
    second = allianceOf(s, offer.to);
  const existing = first ?? second;
  const merging = !!first && !!second;
  s.alliances ??= [];
  if (existing) {
    existing.members = members;
    existing.threat = offer.threat;
    if (merging) {
      existing.lockedUntil = Math.max(first.lockedUntil, second.lockedUntil);
      s.alliances = s.alliances.filter((a) => a.id !== second.id);
    }
  } else
    s.alliances.push({
      id: `a${s.nextId++}`,
      members,
      threat: offer.threat,
      lockedUntil: s.round + ALLIANCE_TERM,
    });
  log(
    s,
    `${members.map((id) => s.players[id].name).join(", ")} ${merging ? "merged their alliances" : "formed an alliance"} against ${s.players[offer.threat].name}. ${existing ? `Pact commitment ends in ${Math.max(0, existing.lockedUntil - s.round)} rounds.` : "Protected for five rounds."}`,
    "info",
    offer.to,
  );
}
export function leaveAlliance(s: Game, owner: number, reason?: string) {
  const alliance = allianceOf(s, owner);
  rule(alliance, "This faction has no alliance.");
  rule(
    alliance.emergency !== "locked",
    "The emergency coalition cannot be left until its target falls to 20% of global power.",
  );
  rule(
    allianceLock(s, owner) === 0,
    "The alliance must last at least five rounds before anyone can leave.",
  );
  s.withdrawals ??= [];
  const units = Object.values(s.pieces).filter((u) => !u.carrier);
  for (const tile of new Set(
    units.filter((u) => u.owner === owner).map((u) => u.tile),
  ))
    for (const other of new Set(
      units
        .filter(
          (u) =>
            u.tile === tile &&
            u.owner !== owner &&
            alliance.members.includes(u.owner),
        )
        .map((u) => u.owner),
    ))
      s.withdrawals.push({ tile, owners: [owner, other] });
  alliance.members = alliance.members.filter((id) => id !== owner);
  s.alliances = s.alliances!.filter((a) => a.members.length >= 2);
  log(
    s,
    `${s.players[owner].name} left the alliance. ${reason ? `${reason} ` : ""}Former partners are no longer protected; shared forces may withdraw or fight.`,
    "warning",
    owner,
  );
  // Avoid leaving and immediately inviting the same partners back.
  const p = s.players[owner];
  p.allianceContacts ??= {};
  for (const id of alliance.members) {
    p.allianceContacts[id] = p.turns;
    const formerPartner = s.players[id];
    formerPartner.allianceContacts ??= {};
    formerPartner.allianceContacts[owner] = formerPartner.turns;
  }
}
export function pruneAlliances(s: Game) {
  if (s.withdrawals)
    s.withdrawals = s.withdrawals.filter(
      (w) =>
        !friendly(s, w.owners[0], w.owners[1]) &&
        w.owners.every((owner) =>
          Object.values(s.pieces).some(
            (u) => u.owner === owner && !u.carrier && u.tile === w.tile,
          ),
        ),
    );
  for (const a of s.alliances ?? [])
    a.members = a.members.filter((id) => s.players[id].alive);
  if (s.alliances)
    s.alliances = s.alliances.filter(
      (a) => a.members.length >= (a.emergency === "locked" ? 1 : 2),
    );
}
/** Once per AI turn, so diplomacy adds no repeated search to military planning. */
export function manageAlliance(s: Game) {
  const view = { ...s };
  const p = s.players[s.active];
  rule(p.control !== "human", "Only AI factions can initiate alliances.");
  rule(!p.diplomacyDone, "Diplomacy was already considered this turn.");
  p.diplomacyDone = true;
  if (s.alliances?.some((a) => a.emergency === "locked")) return;
  const alliance = allianceOf(s, p.id);
  if (alliance && allianceLock(s, p.id) === 0) {
    const scores = factionStrengths(view);
    const distant = !alliance.members.some(
      (id) => id !== p.id && realmDistance(view, p.id, id) <= 6,
    );
    // A slightly lower exit threshold avoids churn over small power changes.
    // Protection must still serve a shared threat, not unrelated private wars.
    const newThreat = commonThreat(view, alliance.members, 1.15, 4);
    const combined = alliance.members.reduce((n, id) => n + scores[id], 0);
    const reason = distant
      ? "Its partners are too distant to provide useful protection."
      : alliance.members.includes(strongestFaction(view))
        ? "The strongest faction is now inside the pact."
        : newThreat === undefined
          ? "There is no longer a stronger nearby enemy threatening every member."
          : combined > scores[newThreat] * ALLIANCE_POWER_MARGIN
            ? "The alliance now has more than 150% of its strongest shared threat's power; its members are pursuing individual victory."
            : undefined;
    if (reason) {
      leaveAlliance(s, p.id, reason);
      return;
    }
    alliance.threat = newThreat!;
  }
  if (alliance && alliance.members.length >= ALLIANCE_LIMIT) return;
  const offers = s.players
    .filter(
      (other) =>
        other.alive &&
        other.id !== p.id &&
        p.turns - (p.allianceContacts?.[other.id] ?? -100) >= 5 &&
        !allianceOfferError(view, p.id, other.id),
    )
    .map((other) => ({
      from: p.id,
      to: other.id,
      threat: sharedThreat(view, allianceCandidates(s, p.id, other.id)),
    }))
    .filter(
      (o): o is AllianceOffer =>
        o.threat !== undefined && acceptsAlliance(view, o as AllianceOffer),
    )
    .sort(
      (a, b) =>
        Number(!!alliance && !!allianceOf(s, b.to)) -
          Number(!!alliance && !!allianceOf(s, a.to)) ||
        realmDistance(view, p.id, a.to) - realmDistance(view, p.id, b.to) ||
        factionStrengths(view)[b.to] - factionStrengths(view)[a.to],
    );
  const offer = offers[0];
  if (!offer) return;
  p.allianceContacts ??= {};
  const members = allianceCandidates(s, offer.from, offer.to);
  for (const id of members) if (id !== p.id) p.allianceContacts[id] = p.turns;
  const approvals = members
    .filter((id) => s.players[id].control === "human")
    .sort((a, b) => a - b);
  if (approvals.length) s.allianceOffer = { ...offer, approvals };
  else acceptAlliance(s, offer);
}
export function diplomacyCommand(s: Game, c: Command): boolean {
  if (c.type === "manage-alliance") {
    manageAlliance(s);
    return true;
  }
  if (c.type === "leave-alliance") {
    leaveAlliance(s, s.active);
    return true;
  }
  return false;
}
