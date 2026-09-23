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
const UNIT_FIELDS = [
  "id",
  "owner",
  "kind",
  "naval",
  "tier",
  "tile",
  "born",
  "moved",
  "acted",
  "bonus",
];
const invalid = () => new Error("This compact save is damaged.");
function standardFields(value: object): boolean {
  const fields = Object.keys(value);
  return (
    fields.length === UNIT_FIELDS.length &&
    fields.every((field, i) => field === UNIT_FIELDS[i])
  );
}

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
  return packRecords(game, Object.keys(game.pieces), true);
}

/** Internal save-worker transfer only, after deserialize's complete validation.
 * Reuse the current keys and avoid measuring the same expanded snapshot again.
 * Disk/file encoders must use packGame, which enforces its expansion budget. */
export function packValidatedGame(game: Game, keys: string[]): PackedGame {
  return packRecords(game, keys, false);
}

function packRecords(game: Game, keys: string[], measure: boolean): PackedGame {
  const packedKeys = packKeys(keys),
    templates: PackedUnits["templates"] = [],
    sizes: number[] = [],
    rows: number[] = [],
    lookup = new Map<string, number>();
  let expanded = measure ? jsonBytes({ ...game, pieces: {} }) : 0;
  let previous: Record<string, unknown> | undefined,
    previousIndex = -1;
  for (const key of keys) {
    const piece = game.pieces[key];
    if (piece.id !== key) throw invalid();
    // Recruited formations usually contain consecutive identical soldiers.
    // Compare the exact primitive layout before allocating/stringifying another
    // description. Nested, extra or reordered fields retain the generic path.
    let index =
      previous &&
      piece.owner === previous.owner &&
      piece.kind === previous.kind &&
      piece.naval === previous.naval &&
      piece.tier === previous.tier &&
      piece.tile === previous.tile &&
      piece.born === previous.born &&
      piece.moved === previous.moved &&
      piece.acted === previous.acted &&
      piece.bonus === previous.bonus &&
      standardFields(piece)
        ? previousIndex
        : undefined;
    if (index === undefined) {
      const template = { ...piece, id: null },
        signature = JSON.stringify(template);
      index = lookup.get(signature);
      if (index === undefined) {
        index = templates.length;
        lookup.set(signature, index);
        templates.push(template);
        if (measure) sizes.push(textBytes(signature));
      }
      const fields = Object.keys(template);
      previous =
        fields.length === UNIT_FIELDS.length &&
        fields.every(
          (field, i) =>
            field === UNIT_FIELDS[i] &&
            (template[field as keyof Piece] === null ||
              !["object", "function"].includes(
                typeof template[field as keyof Piece],
              )),
        )
          ? template
          : undefined;
      previousIndex = index;
    }
    // Delta IDs contain only an ASCII prefix and decimal digits. Their JSON
    // byte size is exact without serializing each ID again for every soldier.
    if (measure) {
      expanded +=
        sizes[index] +
        (Array.isArray(packedKeys) ? jsonBytes(key) : key.length + 2) * 2;
      if (expanded > LIMIT)
        throw new Error("This save exceeds the 128 MB expanded limit.");
    }
    rows.push(index);
  }
  return { ...game, pieces: { keys: packedKeys, templates, rows } };
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

// baseBytes may only come from unpackTables' exact, validated byte accounting.
export function unpackGame(game: PackedGame, baseBytes?: number): Game {
  return restoreGame(game, true, baseBytes);
}

/** Internal worker boundary only: the save worker has already checked the
 * archive, migrated it and validated every game rule. Avoid repeating size,
 * ID and template validation on the UI thread; still create independent units.
 * Never use this entry point on a file or database record. */
export function restoreValidatedGame(game: PackedGame): Game {
  return restoreGame(game, false);
}

function restoreGame(
  game: PackedGame,
  validate: boolean,
  baseBytes?: number,
): Game {
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
      if (validate && !Number.isSafeInteger(delta)) throw invalid();
      previous += delta;
      if (validate && (!Number.isSafeInteger(previous) || previous < 0))
        throw invalid();
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
    const fields = Object.keys(template);
    const nested = fields.filter(
      (key) => template[key] && typeof template[key] === "object",
    );
    // Validate nesting once, before duplicating any shared mutable values.
    if (validate) for (const key of nested) copyValue(template[key]);
    return {
      template,
      nested,
      size: validate ? jsonBytes(template) : 0,
      // A literal restores the normal troop layout without a generic object
      // spread for every soldier. Any extra/reordered field takes the exact
      // generic path, so old and future save data is never dropped or reordered.
      standard:
        fields.length === UNIT_FIELDS.length &&
        fields.every((field, i) => field === UNIT_FIELDS[i]),
    };
  });
  // Bound the reconstructed data as well as the compressed stream. A template
  // containing a large object must not be amplified into gigabytes of units.
  let expanded = validate
    ? (baseBytes ?? jsonBytes({ ...game, pieces: {} }))
    : 0;
  if (validate)
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
      expanded +=
        templates[index].size +
        (Array.isArray(rawKeys) ? jsonBytes(key) : key.length + 2) * 2;
      if (expanded > LIMIT)
        throw new Error("This save exceeds the 128 MB expanded limit.");
    }
  const pieces: Game["pieces"] = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i],
      { template, nested, standard } = templates[packed.rows[i]];
    if (validate && Object.hasOwn(pieces, key)) throw invalid();
    const piece: Record<string, unknown> = standard
      ? {
          id: key,
          owner: template.owner,
          kind: template.kind,
          naval: template.naval,
          tier: template.tier,
          tile: template.tile,
          born: template.born,
          moved: template.moved,
          acted: template.acted,
          bonus: template.bonus,
        }
      : { ...template, id: key };
    for (const field of nested)
      // Spread created own data properties, including any __proto__ field.
      piece[field] = copyValue(template[field]);
    pieces[key] = piece as unknown as Piece;
  }
  return { ...game, pieces };
}
