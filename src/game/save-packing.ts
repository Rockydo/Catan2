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

/** Save-worker snapshots only. Retain one immutable army, not previous games.
 * The rest of the campaign still counts against the expanded limit each time. */
export function createSnapshotUnitPacker(): (game: Game) => PackedGame {
  let previous: Game["pieces"] | undefined;
  let packed: PackedUnits | undefined;
  let unitBytes = 0;
  return (game) => {
    if (previous === game.pieces && packed) {
      if (jsonBytes({ ...game, pieces: {} }) + unitBytes > LIMIT)
        throw new Error("This save exceeds the 128 MB expanded limit.");
      return { ...game, pieces: packed };
    }
    const measured = { bytes: 0 };
    const result = packRecords(game, Object.keys(game.pieces), true, measured);
    previous = game.pieces;
    packed = result.pieces;
    unitBytes = measured.bytes;
    return result;
  };
}

/** Internal save-worker transfer only, after deserialize's complete validation.
 * Reuse the current keys and avoid measuring the same expanded snapshot again.
 * Disk/file encoders must use packGame, which enforces its expansion budget. */
export function packValidatedGame(game: Game, keys: string[]): PackedGame {
  return packRecords(game, keys, false);
}

function packRecords(
  game: Game,
  keys: string[],
  measure: boolean,
  measuredUnits?: { bytes: number },
): PackedGame {
  const packedKeys = packKeys(keys),
    templates: PackedUnits["templates"] = [],
    sizes: number[] = [],
    rows: number[] = [],
    lookup = new Map<string, number>();
  const baseBytes = measure ? jsonBytes({ ...game, pieces: {} }) : 0;
  let expanded = baseBytes;
  if (expanded > LIMIT)
    throw new Error("This save exceeds the 128 MB expanded limit.");
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
  if (measuredUnits) measuredUnits.bytes = expanded - baseBytes;
  return { ...game, pieces: { keys: packedKeys, templates, rows } };
}

// Prepare each template's nested-copy shape once. Most orders contain only
// primitive values, so each soldier needs a shallow copy, not another recursive
// walk that enumerates the same keys. Every restored mutable object is separate.
function valueCopier(value: unknown, depth = 0): () => unknown {
  if (depth > 64) throw invalid();
  if (!value || typeof value !== "object") return () => value;
  if (depth === 64 && Object.keys(value).length) throw invalid();
  if (Array.isArray(value)) {
    const nested = value.flatMap((item, i) =>
      item && typeof item === "object"
        ? [[i, valueCopier(item, depth + 1)] as const]
        : [],
    );
    return () => {
      const copy = value.slice();
      for (const [i, clone] of nested) copy[i] = clone();
      return copy;
    };
  }
  const record = value as Record<string, unknown>;
  const nested = Object.keys(record).flatMap((key) =>
    record[key] && typeof record[key] === "object"
      ? [[key, valueCopier(record[key], depth + 1)] as const]
      : [],
  );
  return () => {
    // Spread creates own data properties even for prototype-named future fields.
    const copy = { ...record };
    for (const [key, clone] of nested) copy[key] = clone();
    return copy;
  };
}

// baseBytes may only come from unpackTables' exact, validated byte accounting.
export function unpackGame(game: PackedGame, baseBytes?: number): Game {
  return unpackGameSnapshot(game, baseBytes).game;
}

/** Prefix/delta IDs cannot be integer property names, so the fresh dictionary
 * has exactly these checked keys in this order. A load can reuse them for its
 * immediate rule validation. Literal IDs may need JS's integer-key ordering;
 * those retain normal enumeration. Never reuse keys after a snapshot edit. */
export function unpackGameSnapshot(game: PackedGame, baseBytes?: number) {
  return restoreGame(game, true, baseBytes);
}

/** Internal worker boundary only: the save worker has already checked the
 * archive, migrated it and validated every game rule. Avoid repeating size,
 * ID and template validation on the UI thread; still create independent units.
 * Never use this entry point on a file or database record. */
export function restoreValidatedGame(game: PackedGame): Game {
  return restoreGame(game, false).game;
}

function restoreGame(game: PackedGame, validate: boolean, baseBytes?: number) {
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
    const nested = fields.flatMap((key) =>
      template[key] && typeof template[key] === "object"
        ? [[key, valueCopier(template[key])] as const]
        : [],
    );
    const standard = UNIT_FIELDS.every((field, i) => fields[i] === field);
    return {
      template,
      nested,
      size: validate ? jsonBytes(template) : 0,
      // The usual fields retain their fast literal layout even when orders or
      // guild effects append optional fields. Restore every suffix field in its
      // saved order; other layouts keep the generic copy path.
      standard,
      extra: standard ? fields.slice(UNIT_FIELDS.length) : [],
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
      { template, nested, standard, extra } = templates[packed.rows[i]];
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
    for (const field of extra)
      if (field === "__proto__")
        Object.defineProperty(piece, field, {
          value: template[field],
          enumerable: true,
          configurable: true,
          writable: true,
        });
      else piece[field] = template[field];
    for (const [field, clone] of nested)
      // Both copy paths create own data properties, including __proto__.
      piece[field] = clone();
    pieces[key] = piece as unknown as Piece;
  }
  return {
    game: { ...game, pieces },
    keys: Array.isArray(rawKeys) ? undefined : keys,
  };
}
