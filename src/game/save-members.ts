import { packIntegerSequence, unpackIntegerSequence } from "./save-integers";

// Packing 10: large battles, sieges and thaw retreats repeat troop IDs outside
// the roster. Preserve those ordered lists, including gaps and stale siege IDs.
// Only named membership fields use this encoding; future data remains literal.
const LIMIT = 128_000_000;
const invalid = () => new Error("This compact save is damaged.");
const tooLarge = () =>
  new Error("This save exceeds the 128 MB expanded limit.");

function packIds(input: unknown): unknown {
  if (!Array.isArray(input) || input.length < 32) return input;
  const prefix =
    typeof input[0] === "string"
      ? input[0].match(/^([a-zA-Z]+)(0|[1-9]\d*)$/)?.[1]
      : undefined;
  if (!prefix || prefix.length > 150) return input;
  const deltas: number[] = [],
    runs: number[] = [];
  let previous = 0,
    literalSize = 1;
  for (const id of input) {
    if (typeof id !== "string" || id.length >= 160) return input;
    const value = Number(id.slice(prefix.length));
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value >= 2 ** 30 ||
      id !== prefix + value
    )
      return input;
    const delta = value - previous;
    deltas.push(delta);
    if (runs.length && runs[runs.length - 2] === delta) runs[runs.length - 1]++;
    else runs.push(delta, 1);
    literalSize += id.length + 3;
    previous = value;
  }
  const repeated = {
    prefix,
    length: input.length,
    runs: packIntegerSequence(runs),
  };
  const repeatedText = JSON.stringify(repeated);
  // Large recruited formations usually have one ID run. Avoid encoding a
  // second, full-length alternative when its minimum byte count is larger.
  if (repeatedText.length < deltas.length && repeatedText.length < literalSize)
    return repeated;
  const plain = { prefix, deltas: packIntegerSequence(deltas) };
  const plainText = JSON.stringify(plain);
  const best = plainText.length <= repeatedText.length ? plain : repeated;
  return Math.min(plainText.length, repeatedText.length) < literalSize
    ? best
    : input;
}

function unpackIds(input: any, budget: { remaining: number }): unknown {
  if (Array.isArray(input)) return input;
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.prefix !== "string" ||
    !/^[a-zA-Z]{1,150}$/.test(input.prefix)
  )
    throw invalid();
  const repeated = Object.hasOwn(input, "runs");
  if (repeated && Object.hasOwn(input, "deltas")) throw invalid();
  // Numeric decoding has its own bound. The shared budget below counts the
  // actual restored strings across every list before any ID arrays are built.
  const numbers = unpackIntegerSequence(repeated ? input.runs : input.deltas, {
    remaining: budget.remaining,
  });
  if (!Array.isArray(numbers)) throw invalid();
  const count = repeated ? input.length : numbers.length;
  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    (repeated && numbers.length % 2)
  )
    throw invalid();
  if (count * (input.prefix.length + 4) + 2 > budget.remaining)
    throw tooLarge();
  let number = 0,
    total = 0,
    bytes = 2;
  // Validate each run's complete range, counts and exact expanded string sizes
  // first. There is no array allocation proportional to an unchecked run.
  for (let i = 0; i < numbers.length; i += repeated ? 2 : 1) {
    const delta = numbers[i],
      n = repeated ? numbers[i + 1] : 1;
    if (
      !Number.isInteger(delta) ||
      Math.abs(delta) >= 2 ** 30 ||
      !Number.isSafeInteger(n) ||
      n <= 0 ||
      total + n > count
    )
      throw invalid();
    const last = number + delta * n;
    if (
      !Number.isSafeInteger(last) ||
      last < 0 ||
      last >= 2 ** 30 ||
      number + delta < 0 ||
      number + delta >= 2 ** 30
    )
      throw invalid();
    const first = number + delta,
      low = Math.min(first, last),
      high = Math.max(first, last);
    if (input.prefix.length + String(high).length >= 160) throw invalid();
    // Count decimal digits by the at most nine powers of ten crossed by a
    // run. A million sequential IDs need no million-string sizing pass.
    bytes += n * (input.prefix.length + 4);
    for (let threshold = 10; threshold <= high; threshold *= 10)
      bytes +=
        low >= threshold
          ? n
          : Math.floor((high - threshold) / Math.abs(delta)) + 1;
    if (bytes > budget.remaining) throw tooLarge();
    number = last;
    total += n;
  }
  if (total !== count) throw invalid();
  budget.remaining -= bytes;
  const ids = new Array<string>(count);
  number = 0;
  let offset = 0;
  for (let i = 0; i < numbers.length; i += repeated ? 2 : 1)
    for (let j = 0, n = repeated ? numbers[i + 1] : 1; j < n; j++) {
      number += numbers[i];
      ids[offset++] = input.prefix + number;
    }
  return ids;
}

function members(
  input: unknown,
  transform: (ids: unknown) => unknown,
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
  const record = (value: any, fields: string[]) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw invalid();
    const copy = { ...value };
    for (const field of fields)
      if (Object.hasOwn(copy, field) && copy[field] !== undefined)
        copy[field] = transform(copy[field]);
    return copy;
  };
  for (const key of ["sieges", "towerSieges"])
    if (game[key] !== undefined) {
      const source = record(game[key], []);
      game[key] = Object.fromEntries(
        Object.entries(source).map(([key, value]) => [
          key,
          record(value, ["units"]),
        ]),
      );
    }
  if (game.battle !== undefined)
    game.battle = record(game.battle, ["attackers", "defenders"]);
  if (game.thawRetreats !== undefined) {
    const retreat = record(game.thawRetreats, []);
    if (!Array.isArray(retreat.pending)) throw invalid();
    retreat.pending = retreat.pending.map((value: unknown) =>
      record(value, ["ids"]),
    );
    game.thawRetreats = retreat;
  }
  return [input[0], game];
}

export const packMembers = (input: unknown): unknown => members(input, packIds);
export function unpackMembers(input: unknown, maxBytes = LIMIT): unknown {
  const budget = { remaining: Math.min(maxBytes, LIMIT) };
  return members(input, (ids) => unpackIds(ids, budget));
}
