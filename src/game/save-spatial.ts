import { packIntegerSequence, unpackIntegerSequence } from "./save-integers";

// Encode canonical spatial IDs, never regenerate map geometry. Keep dictionary
// order, endpoint order and arbitrary IDs verbatim, including future formats.
const LIMIT = 128_000_000;
const invalid = () => new Error("This compact save is damaged.");
const tooLarge = () =>
  new Error("This save exceeds the 128 MB expanded limit.");
const STREAMS = ["kinds", "q", "r", "x", "y", "a", "b"] as const;
type Streams = Record<(typeof STREAMS)[number], number[]>;
function coordinates(id: string, separator: string): number[] | undefined {
  const parts = id.split(separator);
  if (parts.length !== 2) return;
  const values = parts.map(Number);
  if (
    values.every((v) => Number.isInteger(v) && Math.abs(v) < 2 ** 30) &&
    values.join(separator) === id
  )
    return values;
}
function pair(input: unknown): [unknown, Record<string, unknown>] {
  if (
    !Array.isArray(input) ||
    input.length !== 2 ||
    !input[1] ||
    typeof input[1] !== "object" ||
    Array.isArray(input[1])
  )
    throw invalid();
  return input as [unknown, Record<string, unknown>];
}
export function packSpatial(input: unknown): unknown {
  const [references, game] = pair(input);
  if (
    !Array.isArray(references) ||
    references.some((id) => typeof id !== "string")
  )
    throw invalid();
  const streams: Streams = {
    kinds: [],
    q: [],
    r: [],
    x: [],
    y: [],
    a: [],
    b: [],
  };
  const literals: string[] = [];
  const vertices = new Map<string, number>();
  references.forEach((id, index) => {
    if (coordinates(id, ":")) vertices.set(id, index);
  });
  for (const id of references) {
    const tile = coordinates(id, ","),
      vertex = coordinates(id, ":");
    const ends: string[] = id.split("|");
    if (tile) {
      streams.kinds.push(0);
      streams.q.push(tile[0]);
      streams.r.push(tile[1]);
    } else if (vertex) {
      streams.kinds.push(1);
      streams.x.push(vertex[0]);
      streams.y.push(vertex[1]);
    } else if (ends.length === 2 && ends.every((end) => vertices.has(end))) {
      streams.kinds.push(2);
      streams.a.push(vertices.get(ends[0])!);
      streams.b.push(vertices.get(ends[1])!);
    } else {
      streams.kinds.push(3);
      literals.push(id);
    }
  }
  const encoded = {
    ...Object.fromEntries(
      STREAMS.map((key) => [key, packIntegerSequence(streams[key])]),
    ),
    literals,
  };
  return JSON.stringify(encoded).length < JSON.stringify(references).length
    ? [encoded, game]
    : input;
}
export function unpackSpatial(input: unknown): unknown {
  const [dictionary, game] = pair(input);
  if (Array.isArray(dictionary)) return input;
  if (!dictionary || typeof dictionary !== "object") throw invalid();
  const data = dictionary as Record<string, unknown>;
  const budget = { remaining: LIMIT };
  const streams = Object.fromEntries(
    STREAMS.map((key) => {
      const values = unpackIntegerSequence(data[key], budget);
      if (
        !Array.isArray(values) ||
        !values.every((v) => Number.isInteger(v) && Math.abs(v) < 2 ** 30)
      )
        throw invalid();
      return [key, values];
    }),
  ) as Streams;
  const counts = [0, 0, 0, 0];
  for (const kind of streams.kinds) {
    if (kind < 0 || kind > 3) throw invalid();
    counts[kind]++;
  }
  const { literals } = data;
  if (
    streams.q.length !== counts[0] ||
    streams.r.length !== counts[0] ||
    streams.x.length !== counts[1] ||
    streams.y.length !== counts[1] ||
    streams.a.length !== counts[2] ||
    streams.b.length !== counts[2] ||
    !Array.isArray(literals) ||
    literals.length !== counts[3]
  )
    throw invalid();
  if (streams.kinds.length * 3 + 2 > LIMIT) throw tooLarge();
  let remaining = LIMIT;
  const references: string[] = new Array(streams.kinds.length);
  const put = (index: number, value: unknown) => {
    if (typeof value !== "string" || !value || value.length >= 160)
      throw invalid();
    const json = JSON.stringify(value);
    remaining -=
      (/[^\x00-\x7f]/.test(json)
        ? new TextEncoder().encode(json).length
        : json.length) + 1;
    if (remaining < 0) throw tooLarge();
    references[index] = value;
  };
  let tile = 0,
    vertex = 0,
    literal = 0;
  // Coordinates first, so edges can refer to vertices anywhere in the original
  // dictionary. Edge-to-edge references and cycles are never permitted.
  streams.kinds.forEach((kind, index) => {
    if (kind === 0) put(index, `${streams.q[tile]},${streams.r[tile++]}`);
    else if (kind === 1)
      put(index, `${streams.x[vertex]}:${streams.y[vertex++]}`);
    else if (kind === 3) put(index, literals[literal++]);
  });
  let edge = 0;
  streams.kinds.forEach((kind, index) => {
    if (kind !== 2) return;
    const a = streams.a[edge],
      b = streams.b[edge++];
    if (a < 0 || b < 0 || streams.kinds[a] !== 1 || streams.kinds[b] !== 1)
      throw invalid();
    put(index, `${references[a]}|${references[b]}`);
  });
  return [references, game];
}
