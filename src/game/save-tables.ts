import type { PackedGame } from "./save-packing";

// Keep geometry and every saved value verbatim. Column tables compress repeated
// field names and nearby coordinates without regenerating any part of the map.
export const SAVE_TABLES = [
  "tiles",
  "vertices",
  "edges",
  "towns",
  "routes",
  "towers",
] as const;
const LIMIT = 128_000_000;
const MAX_UNITS = Math.floor(LIMIT / 64);
const invalid = () => new Error("This compact save is damaged.");
const tooLarge = () =>
  new Error("This save exceeds the 128 MB expanded limit.");
type Sequence = number[] | { length: number; runs: number[] };
interface Layout {
  fields: string[];
  // null means this field is the record's own ID, taken from keys.
  columns: (unknown[] | null)[];
}
interface Table {
  keys: string[];
  layouts: Layout[];
  order: number[];
}
function bytes(value: unknown): number {
  const text = JSON.stringify(value);
  if (text === undefined) throw invalid();
  return /[^\x00-\x7f]/.test(text)
    ? new TextEncoder().encode(text).byteLength
    : text.length;
}
function packSequence(values: number[]): Sequence {
  if (values.length < 64) return values;
  const runs: number[] = [];
  for (const value of values)
    if (runs.length && runs[runs.length - 2] === value) runs[runs.length - 1]++;
    else runs.push(value, 1);
  return runs.length + 4 < values.length / 2
    ? { length: values.length, runs }
    : values;
}
function unpackSequence(value: Sequence): number[] {
  if (Array.isArray(value)) return value;
  if (
    !value ||
    !Number.isSafeInteger(value.length) ||
    value.length < 0 ||
    value.length > MAX_UNITS ||
    !Array.isArray(value.runs) ||
    value.runs.length % 2
  )
    throw invalid();
  let count = 0;
  for (let i = 0; i < value.runs.length; i += 2) {
    const n = value.runs[i + 1];
    if (
      !Number.isSafeInteger(value.runs[i]) ||
      !Number.isSafeInteger(n) ||
      n <= 0
    )
      throw invalid();
    count += n;
    if (count > value.length) throw invalid();
  }
  if (count !== value.length) throw invalid();
  const values: number[] = new Array(count);
  let start = 0;
  for (let i = 0; i < value.runs.length; i += 2) {
    values.fill(value.runs[i], start, start + value.runs[i + 1]);
    start += value.runs[i + 1];
  }
  return values;
}
export function packTable(records: Record<string, unknown>): Table {
  const keys = Object.keys(records),
    layouts: Layout[] = [],
    order: number[] = [];
  const lookup = new Map<string, number>();
  for (const key of keys) {
    const record = records[key] as Record<string, unknown>;
    // Match JSON's omission of undefined optional fields.
    const fields = Object.keys(record).filter(
      (field) => record[field] !== undefined,
    );
    const ownId = record.id === key;
    const signature = JSON.stringify([fields, ownId]);
    let index = lookup.get(signature);
    if (index === undefined) {
      index = layouts.length;
      lookup.set(signature, index);
      layouts.push({
        fields,
        columns: fields.map((field) => (field === "id" && ownId ? null : [])),
      });
    }
    const layout = layouts[index];
    for (let i = 0; i < fields.length; i++)
      layout.columns[i]?.push(record[fields[i]]);
    order.push(index);
  }
  return { keys, layouts, order };
}
export function unpackTable(
  table: Table,
  budget: { remaining: number },
  measured?: { bytes: number },
): Record<string, unknown> {
  if (
    !table ||
    !Array.isArray(table.keys) ||
    !Array.isArray(table.layouts) ||
    !Array.isArray(table.order) ||
    table.keys.length !== table.order.length ||
    table.keys.length > MAX_UNITS
  )
    throw invalid();
  const counts = new Array<number>(table.layouts.length).fill(0);
  let size = 2;
  for (const index of table.order) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= counts.length)
      throw invalid();
    counts[index]++;
  }
  // Check expanded field names and values before allocating records. A long
  // shared field name must not amplify a small archive into gigabytes of JSON.
  for (let i = 0; i < table.layouts.length; i++) {
    const layout = table.layouts[i];
    if (
      !layout ||
      !Array.isArray(layout.fields) ||
      !Array.isArray(layout.columns) ||
      layout.fields.length !== layout.columns.length ||
      layout.fields.some((field) => typeof field !== "string") ||
      new Set(layout.fields).size !== layout.fields.length
    )
      throw invalid();
    const fieldBytes = layout.fields.reduce((n, field) => n + bytes(field), 0);
    budget.remaining -= counts[i] * (2 + fieldBytes + layout.fields.length * 2);
    // Exact JSON size, including punctuation. Reuse measurements made for the
    // expansion guard instead of serializing the reconstructed map again.
    size +=
      counts[i] *
      (2 +
        fieldBytes +
        layout.fields.length +
        Math.max(0, layout.fields.length - 1));
    if (budget.remaining < 0) throw tooLarge();
    for (let j = 0; j < layout.columns.length; j++) {
      const column = layout.columns[j];
      if (column === null) {
        if (layout.fields[j] !== "id") throw invalid();
      } else {
        if (!Array.isArray(column) || column.length !== counts[i])
          throw invalid();
        for (const value of column) {
          const amount = bytes(value);
          budget.remaining -= amount;
          size += amount;
          if (budget.remaining < 0) throw tooLarge();
        }
      }
    }
  }
  const seen = new Set<string>();
  for (let i = 0; i < table.keys.length; i++) {
    const key = table.keys[i];
    if (
      typeof key !== "string" ||
      !key ||
      key.length >= 160 ||
      ["__proto__", "prototype", "constructor"].includes(key) ||
      seen.has(key)
    )
      throw invalid();
    seen.add(key);
    const ownId = table.layouts[table.order[i]].columns.includes(null);
    const keyBytes = bytes(key) * (ownId ? 2 : 1);
    budget.remaining -= keyBytes + 2;
    size += keyBytes + 1 + (i ? 1 : 0);
    if (budget.remaining < 0) throw tooLarge();
  }
  counts.fill(0);
  const records: Record<string, unknown> = {};
  for (let i = 0; i < table.keys.length; i++) {
    const index = table.order[i],
      layout = table.layouts[index],
      row = counts[index]++;
    const record: Record<string, unknown> = {};
    for (let j = 0; j < layout.fields.length; j++) {
      const field = layout.fields[j],
        value = layout.columns[j]?.[row] ?? null;
      const actual = layout.columns[j] === null ? table.keys[i] : value;
      if (field === "__proto__")
        Object.defineProperty(record, field, {
          value: actual,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      else record[field] = actual;
    }
    records[table.keys[i]] = record;
  }
  if (measured) measured.bytes = size;
  return records;
}

export function packTables(game: PackedGame): unknown {
  const out: Record<string, unknown> = { ...game };
  for (const field of SAVE_TABLES)
    if (game[field]) out[field] = packTable(game[field]);
  out.pieces = packUnitSequences(game.pieces);
  return out;
}

export function packUnitSequences(units: PackedGame["pieces"]): unknown {
  return {
    ...units,
    rows: packSequence(units.rows),
    keys: Array.isArray(units.keys)
      ? units.keys
      : {
          ...units.keys,
          deltas: packSequence(units.keys.deltas),
        },
  };
}

export function unpackTables(
  input: unknown,
  measured?: { baseBytes: number },
): PackedGame {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw invalid();
  const out = { ...input } as Record<string, unknown>;
  const budget = { remaining: LIMIT };
  if (measured) {
    const rest = { ...out, pieces: {} } as Record<string, unknown>;
    for (const field of SAVE_TABLES)
      if (out[field] !== undefined) rest[field] = {};
    measured.baseBytes = bytes(rest);
  }
  for (const field of SAVE_TABLES)
    if (out[field] !== undefined) {
      const tableSize = measured ? { bytes: 0 } : undefined;
      out[field] = unpackTable(out[field] as Table, budget, tableSize);
      if (measured) measured.baseBytes += tableSize!.bytes - 2;
    }
  out.pieces = unpackUnitSequences(out.pieces);
  return out as unknown as PackedGame;
}

export function unpackUnitSequences(input: unknown): PackedGame["pieces"] {
  const units = input as PackedGame["pieces"];
  if (!units || typeof units !== "object") throw invalid();
  return {
    ...units,
    rows: unpackSequence(units.rows),
    keys: Array.isArray(units.keys)
      ? units.keys
      : {
          ...units.keys,
          deltas: unpackSequence(units.keys?.deltas),
        },
  };
}
