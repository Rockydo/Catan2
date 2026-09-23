import type { Game, Piece } from "./types";

// Units dominate growing campaigns. Identical records share a template on disk,
// but are restored as independent objects, in their original enumeration order.
interface PackedUnits {
  keys: string[] | { prefix: string; deltas: number[] };
  templates: Record<string, unknown>[];
  rows: number[];
}
export type PackedGame = Omit<Game, "pieces"> & { pieces: PackedUnits };
const LIMIT = 128_000_000;
const invalid = () => new Error("This compact save is damaged.");
function jsonBytes(value: unknown): number {
  return textBytes(JSON.stringify(value));
}
function textBytes(text: string): number {
  return /[^\x00-\x7f]/.test(text)
    ? new TextEncoder().encode(text).byteLength
    : text.length;
}

function packKeys(keys: string[]): PackedUnits["keys"] {
  const prefix = keys[0]?.match(/^([a-zA-Z]+)(0|[1-9]\d*)$/)?.[1];
  if (!prefix) return keys;
  const deltas: number[] = [];
  let previous = 0;
  for (const key of keys) {
    const number = Number(key.slice(prefix.length));
    if (!Number.isSafeInteger(number) || number < 0 || key !== prefix + number)
      return keys;
    deltas.push(number - previous);
    previous = number;
  }
  return { prefix, deltas };
}

export function packGame(game: Game): PackedGame {
  const keys = Object.keys(game.pieces),
    templates: PackedUnits["templates"] = [],
    rows: number[] = [],
    lookup = new Map<string, number>();
  let expanded = jsonBytes({ ...game, pieces: {} });
  for (const key of keys) {
    const piece = game.pieces[key];
    if (piece.id !== key) throw invalid();
    // Replacing an existing key retains its position. Unknown future fields and
    // differences in property order remain part of the template identity.
    const template = { ...piece, id: null },
      signature = JSON.stringify(template);
    expanded += textBytes(signature) + jsonBytes(key) * 2;
    if (expanded > LIMIT)
      throw new Error("This save exceeds the 128 MB expanded limit.");
    let index = lookup.get(signature);
    if (index === undefined) {
      index = templates.length;
      lookup.set(signature, index);
      templates.push(template);
    }
    rows.push(index);
  }
  return { ...game, pieces: { keys: packKeys(keys), templates, rows } };
}

function copyValue(value: unknown, depth = 0): unknown {
  if (depth > 64) throw invalid();
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value))
    return value.map((item) => copyValue(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const item = copyValue((value as Record<string, unknown>)[key], depth + 1);
    if (key === "__proto__")
      Object.defineProperty(result, key, {
        value: item,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    else result[key] = item;
  }
  return result;
}

export function unpackGame(game: PackedGame): Game {
  const packed = game?.pieces;
  if (
    !packed ||
    !Array.isArray(packed.templates) ||
    !Array.isArray(packed.rows)
  )
    throw invalid();
  const rawKeys = packed.keys;
  if (
    packed.rows.length > Math.floor(LIMIT / 64) ||
    (Array.isArray(rawKeys) ? rawKeys.length : rawKeys?.deltas?.length) !==
      packed.rows.length
  )
    throw invalid();
  let keys: string[];
  if (Array.isArray(rawKeys)) keys = rawKeys;
  else {
    if (
      !rawKeys ||
      typeof rawKeys.prefix !== "string" ||
      !/^[a-zA-Z]+$/.test(rawKeys.prefix) ||
      rawKeys.prefix.length > 150 ||
      !Array.isArray(rawKeys.deltas)
    )
      throw invalid();
    let previous = 0;
    keys = rawKeys.deltas.map((delta) => {
      if (!Number.isSafeInteger(delta)) throw invalid();
      previous += delta;
      if (!Number.isSafeInteger(previous) || previous < 0) throw invalid();
      return rawKeys.prefix + previous;
    });
  }
  const templates = packed.templates.map((template) => {
    if (
      !template ||
      Array.isArray(template) ||
      typeof template !== "object" ||
      !Object.hasOwn(template, "id") ||
      template.id !== null
    )
      throw invalid();
    const nested = Object.keys(template).filter(
      (key) => template[key] && typeof template[key] === "object",
    );
    // Validate nesting once, before duplicating any shared mutable values.
    for (const key of nested) copyValue(template[key]);
    return { template, nested, size: jsonBytes(template) };
  });
  // Bound the reconstructed data as well as the compressed stream. A template
  // containing a large object must not be amplified into gigabytes of units.
  let expanded = jsonBytes({ ...game, pieces: {} });
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i],
      index = packed.rows[i];
    if (
      typeof key !== "string" ||
      key.length === 0 ||
      key.length >= 160 ||
      ["__proto__", "constructor", "prototype"].includes(key) ||
      !Number.isSafeInteger(index) ||
      !templates[index]
    )
      throw invalid();
    expanded += templates[index].size + jsonBytes(key) * 2;
    if (expanded > LIMIT)
      throw new Error("This save exceeds the 128 MB expanded limit.");
  }
  const pieces: Game["pieces"] = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i],
      { template, nested } = templates[packed.rows[i]];
    if (Object.hasOwn(pieces, key)) throw invalid();
    const piece: Record<string, unknown> = { ...template, id: key };
    for (const field of nested)
      // Spread created own data properties, including any __proto__ field.
      piece[field] = copyValue(template[field]);
    pieces[key] = piece as unknown as Piece;
  }
  return { ...game, pieces };
}
