import { localize as tx, useLocale } from "../i18n";
import type { Command, Game } from "../game/types";
import { allianceCandidates, allianceOfferError } from "../game/diplomacy";
import { allianceLock, allianceOf, allianceResponder } from "../game/relations";
import { factionStrengths } from "../game/ai-strategy";
import { Modal } from "./components";

export function AllianceResponse({
  game: s,
  onAction,
}: {
  game: Game;
  onAction: (c: Command) => void;
}) {
  useLocale();

  const offer = s.allianceOffer!,
    members = allianceCandidates(s, offer.from, offer.to),
    scores = factionStrengths(s);
  const first = allianceOf(s, offer.from),
    second = allianceOf(s, offer.to);
  const existing = first ?? second,
    merging = !!first && !!second;
  const commitment = existing
    ? Math.max(
        0,
        Math.max(first?.lockedUntil ?? 0, second?.lockedUntil ?? 0) - s.round,
      )
    : 5;
  const error = allianceOfferError(s, offer.from, offer.to);
  const respond = (mode: string) =>
    onAction({
      type: "respond-alliance",
      actor: allianceResponder(offer),
      mode,
    });
  return (
    <Modal
      title={tx(
        `${s.players[offer.from].name} proposes ${merging ? "merging alliances" : "an alliance"}`,
      )}
      onClose={() => respond("decline")}
    >
      <p>
        {tx(
          merging
            ? "Combine both alliances against "
            : "Stand together against ",
        )}
        <b>{s.players[offer.threat].name}</b>
        {tx(". You still pursue your own victory.")}
        {tx(
          merging && " Every member of both alliances joins the merged pact.",
        )}
      </p>
      <div className="alliance-members">
        {tx(
          members.map((id) => (
            <span key={id}>
              <i style={{ background: s.players[id].color }} />
              {s.players[id].name}
            </span>
          )),
        )}
      </div>
      <div className="battle-powers">
        <div>
          <small>{tx("Combined faction power")}</small>
          <strong>
            {tx(members.reduce((n, id) => n + scores[id], 0).toFixed(0))}
          </strong>
        </div>
        <div>
          <small>{s.players[offer.threat].name}</small>
          <strong>{tx(scores[offer.threat].toFixed(0))}</strong>
        </div>
      </div>
      <p className="notice">
        {tx(
          merging
            ? `Merged commitment: ${commitment} rounds remain, using the later existing deadline. No new five-round lock.`
            : existing
              ? commitment
                ? `Existing pact: ${commitment} rounds of protection remain.`
                : "Existing pact: members are free to leave on their turns."
              : "Five-round commitment.",
        )}
        {tx(" ")}
        {tx(
          "No attacks, raids, destruction or blockades between members. Free passage and shared army/fleet tiles; co-located defenders fight together. Each faction commands its own forces.",
        )}
      </p>
      <p className="muted">
        {tx(
          "Maximum four members. Joining does not restart an existing pact’s timer. Any human member can decline the proposal without changing either existing alliance. After the commitment, AI partners leave when the shared threat fades or the pact becomes too powerful. Leave through Faction power → Alliances. Declining has no penalty.",
        )}
      </p>
      {tx(error && <p role="alert">{tx(error)}</p>)}
      <div className="button-row">
        <button className="secondary" onClick={() => respond("decline")}>
          {tx(merging ? "Decline merger" : "Decline alliance")}
        </button>
        <button
          className="primary"
          disabled={!!error}
          onClick={() => respond("accept")}
        >
          {tx(merging ? "Accept merger" : "Accept alliance")}
        </button>
      </div>
    </Modal>
  );
}
export function AllianceSummary({
  game: s,
  viewer,
  onAction,
  interactive,
}: {
  game: Game;
  viewer: number;
  onAction: (c: Command) => void;
  interactive: boolean;
}) {
  useLocale();

  const ours = allianceOf(s, viewer),
    lock = allianceLock(s, viewer),
    scores = factionStrengths(s);
  return (
    <section className="alliance-summary" aria-label={tx("Alliances")}>
      <b>{tx("Alliances")}</b>
      {tx(
        !s.alliances?.length && (
          <p className="muted">
            {tx(
              "No active alliances. Nearby threatened AI factions can invite you; the strongest faction cannot join.",
            )}
          </p>
        ),
      )}
      {tx(
        [...(s.alliances ?? [])]
          .sort(
            (a, b) =>
              b.members.reduce((n, id) => n + scores[id], 0) -
              a.members.reduce((n, id) => n + scores[id], 0),
          )
          .map((a) => (
            <div
              className="alliance-pact"
              key={a.id}
              data-testid={`alliance-${a.id}`}
            >
              <div className="alliance-pact-heading">
                <b>
                  {tx(
                    a.members.includes(viewer) ? "Your alliance" : "Alliance",
                  )}{" "}
                  ·{tx(" ")}
                  {tx(a.members.length)}
                  {tx(" factions")}
                </b>
                <span className="alliance-power">
                  <strong data-testid={`alliance-power-${a.id}`}>
                    {tx(
                      a.members.reduce((n, id) => n + scores[id], 0).toFixed(1),
                    )}
                  </strong>
                  <small>{tx("combined power")}</small>
                </span>
              </div>
              <div className="alliance-members">
                {tx(
                  a.members.map((id) => (
                    <span key={id}>
                      <i style={{ background: s.players[id].color }} />
                      {s.players[id].name}
                      {tx(id === viewer ? " (you)" : "")}
                    </span>
                  )),
                )}
              </div>
              <small>
                {tx("Common threat: ")}
                {s.players[a.threat].name}
              </small>
              <small>
                {tx(
                  a.emergency === "locked"
                    ? `Emergency coalition · locked until ${s.players[a.threat].name} falls to 20% of global power`
                    : a.lockedUntil > s.round
                      ? `Locked for ${a.lockedUntil - s.round} more rounds`
                      : "Members may leave",
                )}
              </small>
            </div>
          )),
      )}
      {tx(
        ours && (
          <button
            className="secondary full"
            disabled={!interactive || s.phase !== "economy" || lock > 0}
            onClick={() => onAction({ type: "leave-alliance" })}
            title={tx(
              ours.emergency === "locked"
                ? "The emergency coalition cannot be left until its target falls to 20% of global power."
                : lock
                  ? `Commitment ends at round ${ours.lockedUntil}`
                  : "End your protection with these factions. Others remain allied.",
            )}
          >
            {tx("Leave alliance")}
          </button>
        ),
      )}
    </section>
  );
}
