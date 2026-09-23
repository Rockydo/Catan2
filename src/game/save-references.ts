import { SAVE_TABLES } from "./save-tables";

// Spatial IDs occur in keys, neighboring hexes, intersections and route ends.
// Store each string once without rounding coordinates or rebuilding geometry.
const LIMIT = 128_000_000;
const invalid = () => new Error("This compact save is damaged.");
interface References {
  refs: number[];
  sizes?: number[];
}
interface Table {
  keys: string[] | number[];
  layouts: { fields: string[]; columns: (unknown[] | References | null)[] }[];
  order: number[];
}

export function packReferences(input: unknown): unknown {
  const game = { ...(input as Record<string, unknown>) };
  const references: string[] = [],
    lookup = new Map<string, number>();
  for (const field of SAVE_TABLES)
    for (const key of (game[field] as Table | undefined)?.keys ?? []) {
      if (typeof key !== "string") throw invalid();
      if (!lookup.has(key)) {
        lookup.set(key, references.length);
        references.push(key);
      }
    }
  const known = (value: unknown): value is string =>
    typeof value === "string" && lookup.has(value);
  const column = (values: unknown[] | References | null) => {
    if (!Array.isArray(values) || !values.length) return values;
    if (values.every(known))
      return { refs: values.map((value) => lookup.get(value)!) };
    if (values.every((value) => Array.isArray(value) && value.every(known)))
      return {
        refs: values.flat().map((value) => lookup.get(value)!),
        sizes: values.map((value) => (value as string[]).length),
      };
    return values;
  };
  for (const field of SAVE_TABLES) {
    const table = game[field] as Table | undefined;
    if (!table) continue;
    game[field] = {
      ...table,
      keys: (table.keys as string[]).map((key) => lookup.get(key)!),
      layouts: table.layouts.map((layout) => ({
        ...layout,
        columns: layout.columns.map(column),
      })),
    };
  }
  return [references, game];
}

export function unpackReferences(input: unknown): unknown {
  if (
    !Array.isArray(input) ||
    input.length !== 2 ||
    !Array.isArray(input[0]) ||
    !input[1] ||
    typeof input[1] !== "object" ||
    Array.isArray(input[1])
  )
    throw invalid();
  const references = input[0] as string[],
    game = { ...input[1] };
  const sizes = references.map((value) => {
    if (typeof value !== "string" || !value || value.length >= 160)
      throw invalid();
    const text = JSON.stringify(value);
    return /[^\x00-\x7f]/.test(text)
      ? new TextEncoder().encode(text).length
      : text.length;
  });
  let remaining = LIMIT;
  const resolve = (index: number) => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= references.length)
      throw invalid();
    remaining -= sizes[index] + 1;
    if (remaining < 0)
      throw new Error("This save exceeds the 128 MB expanded limit.");
  };
  const column = (value: unknown): unknown[] | null => {
    if (value === null || Array.isArray(value)) return value;
    if (!value || typeof value !== "object") throw invalid();
    const { refs, sizes } = value as References;
    if (!Array.isArray(refs)) throw invalid();
    if (sizes === undefined) {
      for (const index of refs) resolve(index);
      return refs.map((index) => references[index]);
    }
    if (!Array.isArray(sizes)) throw invalid();
    let total = 0;
    for (const size of sizes) {
      if (!Number.isSafeInteger(size) || size < 0) throw invalid();
      total += size;
      if (total > refs.length) throw invalid();
    }
    if (total !== refs.length) throw invalid();
    // Count empty rows as well as referenced strings before allocating arrays.
    remaining -= sizes.length * 3;
    if (remaining < 0)
      throw new Error("This save exceeds the 128 MB expanded limit.");
    for (const index of refs) resolve(index);
    let offset = 0;
    return sizes.map((size) => {
      const row: string[] = new Array(size);
      for (let i = 0; i < size; i++) row[i] = references[refs[offset++]];
      return row;
    });
  };
  for (const field of SAVE_TABLES) {
    const table = game[field] as Table | undefined;
    if (table === undefined) continue;
    if (!table || !Array.isArray(table.keys) || !Array.isArray(table.layouts))
      throw invalid();
    for (const index of table.keys as number[]) resolve(index);
    game[field] = {
      ...table,
      keys: (table.keys as number[]).map((index) => references[index]),
      layouts: table.layouts.map((layout) => {
        if (!layout || !Array.isArray(layout.columns)) throw invalid();
        return { ...layout, columns: layout.columns.map(column) };
      }),
    };
  }
  // The existing table and unit decoders enforce the final reconstructed budget.
  return game;
}
