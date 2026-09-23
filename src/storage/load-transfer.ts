import type { Game } from "../game/types";
import {
  packValidatedGame,
  restoreValidatedGame,
  type PackedGame,
} from "../game/save-packing";
import { packUnitSequences, unpackUnitSequences } from "../game/save-tables";

export interface LoadedCampaign {
  game: Game | null;
  recovered: boolean;
  error?: string;
  needsSave?: boolean;
  // A clean primary can remain the worker's base for the first autosave/export
  // after refresh. This token is internal and is never written into the game.
  snapshotToken?: number;
}
type LoadTransfer = Omit<LoadedCampaign, "game"> &
  (
    | { game: Game | null }
    | { gameText: string; unitTemplates?: true; unitSequences?: true }
  );

/** Only for the trusted save worker's already validated result. Large object
 * graphs are expensive to structured-clone across threads. Transfer repeated
 * troops as templates instead of a full JSON object for every soldier.
 * This changes the message, never the on-disk snapshot or validation rules. */
export function encodeLoadedCampaign(
  result: LoadedCampaign,
  // Only the current archive just validated by deserializeSnapshot. Consume
  // synchronously, before any mutation of the freshly loaded game.
  validatedUnits?: PackedGame["pieces"],
): LoadTransfer {
  if (!result.game) return result;
  if (
    validatedUnits &&
    validatedUnits.rows.length >= 2_000 &&
    validatedUnits.templates.length * 2 <= validatedUnits.rows.length
  ) {
    const { game, ...status } = result;
    return {
      ...status,
      gameText: JSON.stringify({
        ...game,
        pieces: packUnitSequences(validatedUnits),
      }),
      unitTemplates: true,
      unitSequences: true,
    };
  }
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
  const packed = packValidatedGame(game, keys);
  return {
    ...status,
    gameText: JSON.stringify({
      ...packed,
      pieces: packUnitSequences(packed.pieces),
    }),
    unitTemplates: true,
    unitSequences: true,
  };
}

export function decodeLoadedCampaign(result: LoadTransfer): LoadedCampaign {
  if ("game" in result) return result;
  const { gameText, unitTemplates, unitSequences, ...status } = result;
  const game = JSON.parse(gameText);
  if (unitSequences) game.pieces = unpackUnitSequences(game.pieces);
  return {
    ...status,
    game: unitTemplates ? restoreValidatedGame(game) : (game as Game),
  };
}
