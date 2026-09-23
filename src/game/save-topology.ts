// Packing version 7 removes matching inverse links from vertices and edges.
// Rebuild them from the saved tile rings in their saved insertion order, never
// from terrain generation. Nonmatching links and future fields stay literal.
const LIMIT = 128_000_000;
const FIELDS = {
  vertices: ["tiles", "edges"],
  edges: ["tiles", "vertices"],
} as const;
type Kind = keyof typeof FIELDS;
interface Layout {
  fields: string[];
  columns: (unknown[] | null)[];
  topology?: [number, string][];
}
interface Table {
  keys: string[];
  layouts: Layout[];
  order: number[];
}
type Links = Record<string, string[]>;
const invalid = () => new Error("This compact save is damaged.");
const tooLarge = () =>
  new Error("This save exceeds the 128 MB expanded limit.");
function textBytes(value: string): number {
  return /[^\x00-\x7f]/.test(value)
    ? new TextEncoder().encode(value).length
    : value.length;
}
function* rows(table: Table) {
  if (
    !table ||
    !Array.isArray(table.keys) ||
    !Array.isArray(table.order) ||
    !Array.isArray(table.layouts) ||
    table.keys.length !== table.order.length
  )
    throw invalid();
  if (table.keys.length > LIMIT / 64) throw tooLarge();
  const offsets = table.layouts.map((layout) => {
    if (
      !layout ||
      !Array.isArray(layout.fields) ||
      !Array.isArray(layout.columns) ||
      layout.fields.length !== layout.columns.length
    )
      throw invalid();
    return 0;
  });
  for (let i = 0; i < table.keys.length; i++) {
    const index = table.order[i],
      key = table.keys[i];
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= offsets.length ||
      typeof key !== "string" ||
      !key ||
      key.length >= 160
    )
      throw invalid();
    yield { key, layout: table.layouts[index], row: offsets[index]++ };
  }
}

function links(tiles: Table, maxBytes: number) {
  const vertices = new Map<string, Links>(),
    edges = new Map<string, Links>();
  let remaining = Math.min(maxBytes, LIMIT);
  const charge = (value: string) => {
    remaining -= textBytes(JSON.stringify(value)) + 4;
    if (remaining < 0) throw tooLarge();
  };
  for (const { key, layout, row } of rows(tiles)) {
    const corners = layout.columns[layout.fields.indexOf("vertices")]?.[row];
    const sides = layout.columns[layout.fields.indexOf("edges")]?.[row];
    if (
      !Array.isArray(corners) ||
      corners.length !== 6 ||
      !Array.isArray(sides) ||
      sides.length !== 6 ||
      [...corners, ...sides].some(
        (id) => typeof id !== "string" || !id || id.length >= 160,
      )
    )
      throw invalid();
    // The tile ID occurs once per corner and once per side. Charge its
    // encoded length once instead of stringifying it twelve times.
    remaining -= (textBytes(JSON.stringify(key)) + 4) * 12;
    if (remaining < 0) throw tooLarge();
    for (const vertex of corners) {
      if (!vertices.has(vertex)) vertices.set(vertex, { tiles: [], edges: [] });
      vertices.get(vertex)!.tiles.push(key);
    }
    sides.forEach((edge, i) => {
      if (!edges.has(edge)) {
        const ends = [corners[i], corners[(i + 1) % 6]];
        edges.set(edge, { tiles: [], vertices: ends });
        for (const vertex of ends) {
          charge(vertex);
          charge(edge);
          vertices.get(vertex)!.edges.push(edge);
        }
      }
      edges.get(edge)!.tiles.push(key);
    });
  }
  return { vertices, edges };
}

export function packTopology(input: unknown): unknown {
  const game = { ...(input as Record<string, unknown>) };
  let expected: ReturnType<typeof links>;
  try {
    expected = links(game.tiles as Table, LIMIT);
  } catch {
    // Nonstandard/future map shapes must remain lossless too.
    return input;
  }
  for (const kind of Object.keys(FIELDS) as Kind[]) {
    const table = game[kind] as Table | undefined;
    if (!table) continue;
    const keys: string[][] = table.layouts.map(() => []);
    table.order.forEach((index, row) => keys[index].push(table.keys[row]));
    game[kind] = {
      ...table,
      layouts: table.layouts.map((layout, index) => {
        const fields: string[] = [],
          columns: Layout["columns"] = [],
          topology: [number, string][] = [];
        layout.fields.forEach((field, i) => {
          const column = layout.columns[i];
          if (
            keys[index].length &&
            (FIELDS[kind] as readonly string[]).includes(field) &&
            column?.length === keys[index].length &&
            column.every((value, row) => {
              const wanted = expected[kind].get(keys[index][row])?.[field];
              return (
                Array.isArray(value) &&
                wanted &&
                value.length === wanted.length &&
                value.every((id, i) => id === wanted[i])
              );
            })
          )
            topology.push([i, field]);
          else {
            fields.push(field);
            columns.push(column);
          }
        });
        return topology.length
          ? { ...layout, fields, columns, topology }
          : layout;
      }),
    };
  }
  return game;
}

export function unpackTopology(input: unknown, maxBytes = LIMIT): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw invalid();
  const game = { ...input } as Record<string, unknown>;
  let expected: ReturnType<typeof links> | undefined;
  let remaining = Math.min(maxBytes, LIMIT);
  for (const kind of Object.keys(FIELDS) as Kind[]) {
    const table = game[kind] as Table | undefined;
    if (table === undefined) continue;
    const keys = new Map<Layout, string[]>();
    // Validate the index before using layouts or allocating output columns.
    for (const { key, layout } of rows(table)) {
      if (!keys.has(layout)) keys.set(layout, []);
      keys.get(layout)!.push(key);
    }
    game[kind] = {
      ...table,
      layouts: table.layouts.map((layout) => {
        if (layout.topology === undefined) return layout;
        const { topology, ...rest } = layout;
        if (
          !Array.isArray(topology) ||
          !topology.length ||
          topology.length > FIELDS[kind].length
        )
          throw invalid();
        const seen = new Set(layout.fields);
        let previous = -1;
        for (const item of topology) {
          if (!Array.isArray(item) || item.length !== 2) throw invalid();
          const [at, field] = item;
          if (
            !Number.isSafeInteger(at) ||
            at <= previous ||
            at >= layout.fields.length + topology.length ||
            !(FIELDS[kind] as readonly string[]).includes(field) ||
            seen.has(field)
          )
            throw invalid();
          previous = at;
          seen.add(field);
        }
        expected ??= links(game.tiles as Table, maxBytes);
        const fields = [...layout.fields],
          columns = [...layout.columns];
        for (const [at, field] of topology) {
          const values: string[][] = [];
          for (const key of keys.get(layout) ?? []) {
            const value = expected[kind].get(key)?.[field];
            if (!value) throw invalid();
            remaining -= textBytes(JSON.stringify(value)) + 1;
            if (remaining < 0) throw tooLarge();
            // These arrays were created just for this decode. Each field and
            // record uses one distinct array; the table decoder rejects reused
            // record keys. Avoid copying the entire adjacency graph again.
            values.push(value);
          }
          fields.splice(at, 0, field);
          columns.splice(at, 0, values);
        }
        return { ...rest, fields, columns };
      }),
    };
  }
  return game;
}
