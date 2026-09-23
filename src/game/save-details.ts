import { packTable, unpackTable } from "./save-tables";
import { packIntegerSequence, unpackIntegerSequence } from "./save-integers";
import { packSpatial, unpackSpatial } from "./save-spatial";

// Packing version 8: climate-plan coordinates and troop-template columns.
// These are saved values, never guesses from current generation or unit rules.
const LIMIT = 128_000_000;
const invalid = () => new Error("This compact save is damaged.");
const tooLarge = () =>
  new Error("This save exceeds the 128 MB expanded limit.");
function pair(input: unknown): [unknown, Record<string, any>] {
  if (
    !Array.isArray(input) ||
    input.length !== 2 ||
    !input[1] ||
    typeof input[1] !== "object" ||
    Array.isArray(input[1])
  )
    throw invalid();
  return [input[0], { ...input[1] }];
}
function bytes(value: unknown): number {
  const text = JSON.stringify(value);
  return /[^\x00-\x7f]/.test(text)
    ? new TextEncoder().encode(text).length
    : text.length;
}
function smaller(encoded: unknown, original: unknown): unknown {
  return JSON.stringify(encoded).length < JSON.stringify(original).length
    ? encoded
    : original;
}

export function packDetails(input: unknown): unknown {
  const [refs, game] = pair(input);
  const plan = game.climatePlan;
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    const keys = Object.keys(plan),
      values = Object.values(plan);
    if (keys.length && values.every((value) => typeof value === "string")) {
      const types = [...new Set(values)];
      const lookup = new Map(types.map((value, i) => [value, i]));
      const [coordinates] = packSpatial([keys, {}]) as [unknown, unknown];
      game.climatePlan = smaller(
        [
          coordinates,
          types,
          packIntegerSequence(values.map((value) => lookup.get(value)!)),
        ],
        plan,
      );
    }
  }
  const templates = game.pieces?.templates;
  if (Array.isArray(templates) && templates.length) {
    const table = packTable(
      Object.fromEntries(templates.map((value, i) => [String(i), value])),
    );
    game.pieces = {
      ...game.pieces,
      templates: smaller(
        {
          layouts: table.layouts.map((layout) => ({
            ...layout,
            columns: layout.columns.map(packIntegerSequence),
          })),
          order: packIntegerSequence(table.order),
        },
        templates,
      ),
    };
  }
  return [refs, game];
}

export function unpackDetails(input: unknown, maxBytes = LIMIT): unknown {
  const [refs, game] = pair(input);
  const budget = { remaining: Math.min(maxBytes, LIMIT) };
  const plan = game.climatePlan;
  if (Array.isArray(plan)) {
    if (plan.length !== 3 || !Array.isArray(plan[1])) throw invalid();
    const [keys] = unpackSpatial([plan[0], {}]) as [string[], unknown];
    const types = plan[1];
    if (types.some((value) => typeof value !== "string")) throw invalid();
    const sizes = types.map(bytes);
    const values = unpackIntegerSequence(plan[2], budget);
    if (!Array.isArray(values) || keys.length !== values.length)
      throw invalid();
    const result: Record<string, string> = {};
    // Validate each key and repeated value before reconstructing the plan.
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i],
        index = values[i];
      if (
        typeof key !== "string" ||
        !key ||
        key.length >= 160 ||
        ["__proto__", "constructor", "prototype"].includes(key) ||
        !Number.isSafeInteger(index) ||
        index < 0 ||
        index >= types.length ||
        Object.hasOwn(result, key)
      )
        throw invalid();
      budget.remaining -= bytes(key) + sizes[index] + 2;
      if (budget.remaining < 0) throw tooLarge();
      result[key] = types[index];
    }
    game.climatePlan = result;
  }
  const templates = game.pieces?.templates;
  if (templates && !Array.isArray(templates)) {
    if (typeof templates !== "object" || !Array.isArray(templates.layouts))
      throw invalid();
    const order = unpackIntegerSequence(templates.order, budget);
    if (!Array.isArray(order) || order.length > LIMIT / 64) throw invalid();
    const layouts = templates.layouts.map((layout: any) => {
      if (!layout || !Array.isArray(layout.columns)) throw invalid();
      return {
        ...layout,
        columns: layout.columns.map((column: unknown) =>
          column === null ? null : unpackIntegerSequence(column, budget),
        ),
      };
    });
    const records = unpackTable(
      {
        keys: Array.from({ length: order.length }, (_, i) => String(i)),
        order,
        layouts,
      },
      budget,
    );
    game.pieces = { ...game.pieces, templates: Object.values(records) };
  }
  return [refs, game];
}
