import type { AllianceOffer, Game } from "./types";

/** Same-faction or formal ally. Kept independent of selectors and AI caches. */
export function friendly(s: Game, a: number, b: number): boolean {
  return (
    a === b ||
    !!s.alliances?.some((x) => x.members.includes(a) && x.members.includes(b))
  );
}
export const allianceOf = (s: Game, owner: number) =>
  s.alliances?.find((x) => x.members.includes(owner));
export function allianceLock(s: Game, owner: number): number {
  const alliance = allianceOf(s, owner);
  if (alliance?.emergency === "locked") return Infinity;
  return alliance ? Math.max(0, alliance.lockedUntil - s.round) : 0;
}

/** Offers keep their two negotiating endpoints while every affected human gets a vote. */
export const allianceResponder = (offer: AllianceOffer) =>
  offer.approvals?.[0] ?? offer.to;

/** Sole enemy during the mandatory global coalition. */
export const emergencyTarget = (
  s: Game,
  owner = s.active,
): number | undefined => {
  const pact = allianceOf(s, owner);
  return pact?.emergency === "locked" ? pact.threat : undefined;
};
