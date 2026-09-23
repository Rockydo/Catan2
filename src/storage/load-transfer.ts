import type { Game } from "../game/types";

export interface LoadedCampaign {
  game: Game | null;
  recovered: boolean;
  error?: string;
  needsSave?: boolean;
}
type LoadTransfer = Omit<LoadedCampaign, "game"> &
  ({ game: Game | null } | { gameText: string });

/** Only for the trusted save worker's already validated result. Large object
 * graphs are expensive to structured-clone across threads. Native JSON transport
 * is faster for large armies; small campaigns retain their direct object path.
 * This changes the message, never the on-disk snapshot or validation rules. */
export function encodeLoadedCampaign(result: LoadedCampaign): LoadTransfer {
  if (!result.game || Object.keys(result.game.pieces).length < 20_000)
    return result;
  const { game, ...status } = result;
  return { ...status, gameText: JSON.stringify(game) };
}

export function decodeLoadedCampaign(result: LoadTransfer): LoadedCampaign {
  if ("game" in result) return result;
  const { gameText, ...status } = result;
  return { ...status, game: JSON.parse(gameText) as Game };
}
