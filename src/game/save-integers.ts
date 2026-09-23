import { SAVE_TABLES } from "./save-tables";

// Integer columns contain coordinates and dictionary indices. Store signed
// differences as variable-length bytes before gzip; retain every value/order.
// Only known sequence slots use this codec. Future user data stays untouched.
const LIMIT = 128_000_000;
const invalid = () => new Error("This compact save is damaged.");
const tooLarge = () =>
  new Error("This save exceeds the 128 MB expanded limit.");

export function packIntegerSequence(values: unknown): unknown {
  if (
    !Array.isArray(values) ||
    values.length < 32 ||
    !values.every((v) => Number.isInteger(v) && Math.abs(v) < 2 ** 30)
  )
    return values;
  let previous = 0;
  const bytes: number[] = [];
  for (const value of values) {
    const delta = value - previous;
    previous = value;
    let n = delta < 0 ? -delta * 2 - 1 : delta * 2;
    while (n >= 128) {
      bytes.push((n % 128) + 128);
      n = Math.floor(n / 128);
    }
    bytes.push(n);
  }
  // Bounded strings avoid spreading long arrays into the JavaScript stack.
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += 16384) {
    let text = "";
    for (let i = start; i < Math.min(start + 16384, bytes.length); i++)
      text += String.fromCharCode(bytes[i]);
    chunks.push(text);
  }
  const encoded = { length: values.length, ints: btoa(chunks.join("")) };
  return JSON.stringify(encoded).length < JSON.stringify(values).length
    ? encoded
    : values;
}

export function unpackIntegerSequence(
  value: unknown,
  budget: { remaining: number },
): unknown {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") throw invalid();
  const { length, ints } = value as { length: number; ints: string };
  if (
    !Number.isSafeInteger(length) ||
    length < 0 ||
    typeof ints !== "string" ||
    ints.length % 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(ints)
  )
    throw invalid();
  if (length * 2 + 2 > budget.remaining) throw tooLarge();
  const bytes = atob(ints);
  if (
    btoa(bytes) !== ints ||
    bytes.length < length ||
    bytes.length > length * 5
  )
    throw invalid();
  const values: number[] = new Array(length);
  let offset = 0,
    previous = 0;
  budget.remaining -= length + 2;
  for (let i = 0; i < length; i++) {
    let n = 0,
      factor = 1,
      byte: number;
    do {
      if (offset >= bytes.length || factor > 2 ** 28) throw invalid();
      byte = bytes.charCodeAt(offset++);
      n += (byte & 127) * factor;
      factor *= 128;
    } while (byte >= 128);
    // Reject overflow and redundant encodings before accumulating the delta.
    if (n > 0xffffffff || (factor > 128 && byte === 0)) throw invalid();
    previous += n % 2 ? -(n + 1) / 2 : n / 2;
    if (!Number.isInteger(previous) || Math.abs(previous) >= 2 ** 30)
      throw invalid();
    budget.remaining -= String(previous).length;
    if (budget.remaining < 0) throw tooLarge();
    values[i] = previous;
  }
  if (offset !== bytes.length) throw invalid();
  return values;
}

function mapSequences(
  input: unknown,
  transform: (sequence: unknown) => unknown,
): unknown {
  if (
    !Array.isArray(input) ||
    input.length !== 2 ||
    !Array.isArray(input[0]) ||
    !input[1] ||
    typeof input[1] !== "object" ||
    Array.isArray(input[1])
  )
    throw invalid();
  const game = { ...input[1] };
  for (const field of SAVE_TABLES) {
    const table = game[field];
    if (table === undefined) continue;
    if (!table || !Array.isArray(table.layouts)) throw invalid();
    game[field] = {
      ...table,
      keys: transform(table.keys),
      order: transform(table.order),
      layouts: table.layouts.map((layout: any) => {
        if (!layout || !Array.isArray(layout.columns)) throw invalid();
        return {
          ...layout,
          columns: layout.columns.map((column: any) => {
            if (column === null) return null;
            if (!column || typeof column !== "object") throw invalid();
            if (Array.isArray(column) || Object.hasOwn(column, "ints"))
              return transform(column);
            return {
              ...column,
              refs: transform(column.refs),
              ...(column.sizes === undefined
                ? {}
                : { sizes: transform(column.sizes) }),
            };
          }),
        };
      }),
    };
  }
  const units = game.pieces;
  if (!units || typeof units !== "object") throw invalid();
  const sequence = (value: any) =>
    value && Object.hasOwn(value, "runs")
      ? { ...value, runs: transform(value.runs) }
      : transform(value);
  game.pieces = {
    ...units,
    rows: sequence(units.rows),
    keys: Array.isArray(units.keys)
      ? units.keys
      : { ...units.keys, deltas: sequence(units.keys?.deltas) },
  };
  return [input[0], game];
}

export const packIntegers = (input: unknown): unknown =>
  mapSequences(input, packIntegerSequence);

export function unpackIntegers(input: unknown): unknown {
  const budget = { remaining: LIMIT };
  return mapSequences(input, (value) => unpackIntegerSequence(value, budget));
}
