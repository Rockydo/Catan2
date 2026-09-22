import { seasonAt, seasonLabel, type Season } from "../game/seasons";
import type { Game, Stock } from "../game/types";
import {
  productionSources,
  sumStock,
  withPlanningFrame,
} from "../game/selectors";

export interface RollReport {
  id: string;
  round: number;
  season?: Season;
  seasonLabel?: string;
  actor: number;
  dice: [number, number];
  players: {
    id: number;
    name: string;
    color: string;
    alive: boolean;
    goods: Stock;
    total: number;
    supportGold: number;
    supportBars: number;
  }[];
  tiles: string[] | null;
  total: number;
  automatic: boolean;
}

/** Receipts come from the engine's actual deliveries, never inventory differences. */
export function rollReport(s: Game, live = false): RollReport | null {
  if (!s.dice) return null;
  const total = s.dice[0] + s.dice[1];
  const tiles = new Set<string>();
  // Reloaded receipts use recorded deliveries; only a live roll needs map
  // highlights. A single read index bounds live scans of large collector fleets.
  if (live)
    withPlanningFrame(s, () => {
      for (const source of productionSources(s))
        if (s.tiles[source.tile].number === total) tiles.add(source.tile);
    });
  const players = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    alive: p.alive,
    goods: { ...s.production[p.id] },
    total: sumStock(s.production[p.id] ?? {}),
    supportGold: s.productionSupport?.gold[p.id] ?? 0,
    supportBars: s.productionSupport?.goldbars?.[p.id] ?? 0,
  }));
  return {
    id: `${s.seed}:${s.actions}`,
    round: s.round,
    season: seasonAt(s),
    seasonLabel: seasonAt(s) ? seasonLabel(s) : undefined,
    actor: s.active,
    dice: [...s.dice],
    players,
    tiles: live ? [...tiles] : null,
    total: players.reduce((n, p) => n + p.total, 0),
    automatic: s.players[s.active].control !== "human",
  };
}
