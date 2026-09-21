import type { Command } from "./types";

const ECONOMIC_ORDERS = new Set([
  "bank",
  "recruit",
  "ship",
  "road",
  "route",
  "settlement",
  "camp",
  "city",
  "extension",
  "wall",
  "tower",
  "guild",
  "guild-order",
]);

/** Routine orders need no presentation delay; battles and prompts remain visible. */
export const routineAIOrder = (command: Command) =>
  ECONOMIC_ORDERS.has(command.type);
