// Packing version 6 stores canonical geometry once, in the record keys. These
// formulas belong to the archive format, not the evolving world generator.
// Only exactly matching columns are omitted. Unusual layouts stay verbatim.
const LIMIT = 128_000_000;
const KINDS = ["tiles", "vertices", "edges"] as const;
type Kind = (typeof KINDS)[number];
interface Layout {
  fields: string[];
  columns: (unknown[] | null)[];
  derived?: [number, string][];
}
interface Table {
  keys: string[];
  order: number[];
  layouts: Layout[];
}
const invalid = () => new Error("This compact save is damaged.");
const tooLarge = () =>
  new Error("This save exceeds the 128 MB expanded limit.");
const FIELDS: Record<Kind, readonly string[]> = {
  tiles: ["q", "r", "vertices", "edges"],
  vertices: ["x", "y"],
  edges: ["vertices"],
};
function coordinates(key: string, separator: string): number[] | undefined {
  if (typeof key !== "string") return;
  const parts = key.split(separator),
    values = parts.map(Number);
  if (
    parts.length !== 2 ||
    values.join(separator) !== key ||
    !values.every((v) => Number.isSafeInteger(v) && Math.abs(v) <= 30_000_000)
  )
    return;
  return values;
}
function geometry(
  kind: Kind,
  key: string,
): Record<string, unknown> | undefined {
  if (kind === "edges") {
    if (typeof key !== "string") return;
    const vertices = key.split("|");
    if (vertices.length !== 2 || !vertices.every((v) => coordinates(v, ":")))
      return;
    return { vertices };
  }
  const coord = coordinates(key, kind === "tiles" ? "," : ":");
  if (!coord) return;
  const [a, b] = coord;
  if (kind === "vertices") return { x: a, y: b };
  const corners = [
    [0, -2],
    [1, -1],
    [1, 1],
    [0, 2],
    [-1, 1],
    [-1, -1],
  ];
  const vertices = corners.map(([x, y]) => `${2 * a + b + x}:${3 * b + y}`);
  const edges = vertices.map((v, i) =>
    [v, vertices[(i + 1) % 6]].sort().join("|"),
  );
  return { q: a, r: b, vertices, edges };
}
function equal(a: unknown, b: unknown): boolean {
  return Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((v, i) => v === b[i])
    : a === b;
}

export function packGeometry(input: unknown): unknown {
  const game = { ...(input as Record<string, unknown>) };
  for (const kind of KINDS) {
    const table = game[kind] as Table | undefined;
    if (!table) continue;
    const keys: string[][] = table.layouts.map(() => []);
    table.order.forEach((layout, row) => keys[layout].push(table.keys[row]));
    game[kind] = {
      ...table,
      layouts: table.layouts.map((layout, index) => {
        const expected = keys[index].map((key) => geometry(kind, key));
        if (!expected.length || expected.some((v) => !v)) return layout;
        const derived: [number, string][] = [],
          fields: string[] = [],
          columns: Layout["columns"] = [];
        layout.fields.forEach((field, i) => {
          const column = layout.columns[i];
          if (
            FIELDS[kind].includes(field) &&
            column &&
            column.length === expected.length &&
            column.every((value, row) => equal(value, expected[row]![field]))
          )
            derived.push([i, field]);
          else {
            fields.push(field);
            columns.push(column);
          }
        });
        return derived.length
          ? { ...layout, fields, columns, derived }
          : layout;
      }),
    };
  }
  return game;
}

export function unpackGeometry(input: unknown, maxBytes = LIMIT): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw invalid();
  const game = { ...input } as Record<string, unknown>;
  let remaining = Math.min(maxBytes, LIMIT);
  for (const kind of KINDS) {
    const table = game[kind] as Table | undefined;
    if (table === undefined) continue;
    if (
      !table ||
      !Array.isArray(table.keys) ||
      !Array.isArray(table.order) ||
      !Array.isArray(table.layouts) ||
      table.order.length !== table.keys.length
    )
      throw invalid();
    if (table.keys.length > LIMIT / 4) throw tooLarge();
    const keys: string[][] = table.layouts.map(() => []);
    table.order.forEach((layout, row) => {
      if (!Number.isSafeInteger(layout) || layout < 0 || !keys[layout])
        throw invalid();
      keys[layout].push(table.keys[row]);
    });
    game[kind] = {
      ...table,
      layouts: table.layouts.map((layout, index) => {
        if (
          !layout ||
          !Array.isArray(layout.fields) ||
          !Array.isArray(layout.columns) ||
          layout.fields.length !== layout.columns.length
        )
          throw invalid();
        if (layout.derived === undefined) return layout;
        const { derived, ...rest } = layout;
        if (
          !Array.isArray(derived) ||
          !derived.length ||
          derived.length > FIELDS[kind].length
        )
          throw invalid();
        const length = layout.fields.length + derived.length;
        const seen = new Set(layout.fields);
        let previous = -1;
        for (const item of derived) {
          if (!Array.isArray(item) || item.length !== 2) throw invalid();
          const [at, field] = item;
          if (
            !Number.isSafeInteger(at) ||
            at <= previous ||
            at >= length ||
            !FIELDS[kind].includes(field) ||
            seen.has(field)
          )
            throw invalid();
          seen.add(field);
          previous = at;
        }
        // Bound reconstruction before allocating columns, then charge the exact
        // ASCII JSON size as rows are made. The table decoder also checks the full
        // reconstructed game, including all unencoded columns and field names.
        const minimum =
          keys[index].length *
          derived.reduce(
            (n, [, field]) =>
              n +
              (field === "vertices" || field === "edges"
                ? kind === "edges"
                  ? 14
                  : 40
                : 2),
            0,
          );
        if (minimum > remaining) throw tooLarge();
        const generated = derived.map(() => [] as unknown[]);
        for (const key of keys[index]) {
          const row = geometry(kind, key);
          if (!row) throw invalid();
          derived.forEach(([, field], i) => {
            const value = row[field];
            remaining -= JSON.stringify(value).length + 1;
            if (remaining < 0) throw tooLarge();
            generated[i].push(value);
          });
        }
        const fields = [...layout.fields],
          columns = [...layout.columns];
        derived.forEach(([at, field], i) => {
          fields.splice(at, 0, field);
          columns.splice(at, 0, generated[i]);
        });
        return { ...rest, fields, columns };
      }),
    };
  }
  return game;
}
