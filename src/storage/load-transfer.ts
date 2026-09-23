import type { Game } from "../game/types";
import { packGame, restoreValidatedGame } from "../game/save-packing";

export interface LoadedCampaign {
  game: Game | null;
  recovered: boolean;
  error?: string;
  needsSave?: boolean;
}
type LoadTransfer = Omit<LoadedCampaign, "game"> &
  ({ game: Game | null } | { gameText: string; unitTemplates?: true });

/** Only for the trusted save worker's already validated result. Large object
 * graphs are expensive to structured-clone across threads. Transfer repeated
 * troops as templates instead of a full JSON object for every soldier.
 * This changes the message, never the on-disk snapshot or validation rules. */
export function encodeLoadedCampaign(result: LoadedCampaign): LoadTransfer {
  if (!result.game) return result;
  const keys = Object.keys(result.game.pieces);
  if (keys.length < 2_000) return result;
  const { game, ...status } = result;
  // A diverse army may not benefit from templates. A small, evenly spaced
  // sample of neighboring records avoids an expensive failed packing attempt.
  let repeated = 0;
  for (let i = 0; i < 64; i++) {
    const at = Math.floor((i * (keys.length - 1)) / 64);
    if (
      JSON.stringify({ ...game.pieces[keys[at]], id: null }) ===
      JSON.stringify({ ...game.pieces[keys[at + 1]], id: null })
    )
      repeated++;
  }
  if (repeated < 32) return { ...status, gameText: JSON.stringify(game) };
  return {
    ...status,
    gameText: JSON.stringify(packGame(game)),
    unitTemplates: true,
  };
}

export function decodeLoadedCampaign(result: LoadTransfer): LoadedCampaign {
  if ("game" in result) return result;
  const { gameText, unitTemplates, ...status } = result;
  const game = JSON.parse(gameText);
  return {
    ...status,
    game: unitTemplates ? restoreValidatedGame(game) : (game as Game),
  };
}
