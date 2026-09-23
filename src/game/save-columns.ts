import { SAVE_TABLES } from "./save-tables";
import { packIntegerSequence, unpackIntegerSequence } from "./save-integers";

// Packing 9 shares repeated column values on disk. Reconstructed objects remain
// independent: editing a town's stock or guild must never edit another town.
const LIMIT = 128_000_000;
const invalid = () => new Error("This compact save is damaged.");
const tooLarge = () =>
  new Error("This save exceeds the 128 MB expanded limit.");

function columns(
  input: unknown,
  transform: (value: unknown) => unknown,
): unknown {
  if (
    !Array.isArray(input) ||
    input.length !== 2 ||
    !input[1] ||
    typeof input[1] !== "object" ||
    Array.isArray(input[1])
  )
    throw invalid();
  const game = { ...input[1] };
  const table = (value: any) => {
    if (!value || !Array.isArray(value.layouts)) throw invalid();
    return {
      ...value,
      layouts: value.layouts.map((layout: any) => {
        if (!layout || !Array.isArray(layout.columns)) throw invalid();
        return { ...layout, columns: layout.columns.map(transform) };
      }),
    };
  };
  for (const field of SAVE_TABLES)
    if (game[field] !== undefined) game[field] = table(game[field]);
  if (game.pieces?.templates && !Array.isArray(game.pieces.templates))
    game.pieces = { ...game.pieces, templates: table(game.pieces.templates) };
  return [input[0], game];
}

export function packColumns(input: unknown): unknown {
  return columns(input, (column) => {
    if (!Array.isArray(column) || column.length < 4) return column;
    const values: unknown[] = [],
      indices: number[] = [],
      lookup = new Map<string, number>();
    let originalBytes = 1;
    for (const value of column) {
      const text = JSON.stringify(value ?? null);
      originalBytes += text.length + 1;
      let index = lookup.get(text);
      if (index === undefined) {
        index = values.length;
        lookup.set(text, index);
        values.push(value ?? null);
      }
      indices.push(index);
    }
    if (values.length === column.length) return column;
    const encoded =
      values.length === 1
        ? { repeated: values, count: column.length }
        : { repeated: values, indices: packIntegerSequence(indices) };
    return JSON.stringify(encoded).length < originalBytes ? encoded : column;
  });
}

export function unpackColumns(input: unknown, maxBytes = LIMIT): unknown {
  const budget = { remaining: Math.min(maxBytes, LIMIT) };
  return columns(input, (column: any) => {
    if (!column || Array.isArray(column) || !Object.hasOwn(column, "repeated"))
      return column;
    if (!Array.isArray(column.repeated) || !column.repeated.length)
      throw invalid();
    const literals = column.repeated.map((value: unknown) =>
      JSON.stringify(value),
    );
    const sizes = literals.map((text: string) =>
      /[^\x00-\x7f]/.test(text)
        ? new TextEncoder().encode(text).length
        : text.length,
    );
    const constant = Object.hasOwn(column, "count");
    if (
      constant &&
      (column.repeated.length !== 1 || Object.hasOwn(column, "indices"))
    )
      throw invalid();
    const indices = constant
      ? undefined
      : unpackIntegerSequence(column.indices, budget);
    if (!constant && !Array.isArray(indices)) throw invalid();
    const count = constant ? column.count : (indices as unknown[]).length;
    if (!Number.isSafeInteger(count) || count < 0) throw invalid();
    // Account for the complete expanded column before allocating any copies.
    if (count * 2 + 2 > budget.remaining) throw tooLarge();
    let bytes = 2 + Math.max(0, count - 1);
    if (constant) bytes += count * sizes[0];
    else
      for (const index of indices as number[]) {
        if (!Number.isSafeInteger(index) || index < 0 || index >= sizes.length)
          throw invalid();
        bytes += sizes[index];
        if (bytes > budget.remaining) throw tooLarge();
      }
    budget.remaining -= bytes;
    if (budget.remaining < 0) throw tooLarge();
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
      const index = constant ? 0 : (indices as number[])[i],
        value = column.repeated[index];
      result[i] =
        value && typeof value === "object"
          ? JSON.parse(literals[index])
          : value;
    }
    return result;
  });
}
