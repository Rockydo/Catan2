import { expect, it, vi } from "vitest";
import { copyRecords } from "../src/game/record-copy";

it("copies own string records with the original ordering and value identities", () => {
  const source = Object.create({ inherited: { value: 9 } }) as Record<
    string,
    unknown
  >;
  source.u10 = { nested: [1, 2] };
  source.u2 = undefined;
  source[12] = { value: 12 };
  source[3] = { value: 3 };
  Object.defineProperty(source, "hidden", { value: 7 });
  Object.freeze(source);
  const expected = { ...source };
  const result = copyRecords(source);
  expect(result).toStrictEqual(expected);
  expect(Object.keys(result)).toEqual(Object.keys(expected));
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  for (const key of Object.keys(source)) expect(result[key]).toBe(source[key]);
  delete result.u10;
  result.new = 8;
  expect(Object.hasOwn(source, "u10")).toBe(true);
  expect(Object.hasOwn(source, "new")).toBe(false);
});

it("merges changed records exactly, including undefined and extra numeric keys", () => {
  const source = Object.freeze({ u3: { value: 3 }, u1: 1, u2: 2 });
  const values = Object.freeze({ u1: undefined, u4: { value: 4 }, 5: 5 });
  const result = copyRecords<unknown>(source, { values });
  expect(result).toStrictEqual({ ...source, ...values });
  expect(Object.keys(result)).toEqual(Object.keys({ ...source, ...values }));
  expect(result.u3).toBe(source.u3);
  expect(result.u4).toBe(values.u4);
  expect(Object.hasOwn(result, "u1")).toBe(true);
});

it("reconstructs explicit order, deletions, insertions and an empty dictionary", () => {
  const source = Object.freeze({
    u1: { id: "u1" },
    u2: { id: "u2" },
    u3: undefined,
  });
  const values = Object.freeze({ u4: { id: "u4" }, u2: undefined, ignored: 4 });
  const keys = Object.freeze(["u3", "u2", "u4", "u1"]);
  const result = copyRecords<unknown>(source, { values, keys });
  expect(result).toStrictEqual(
    Object.fromEntries(
      keys.map((key) => [
        key,
        Object.hasOwn(values, key)
          ? values[key as keyof typeof values]
          : source[key as keyof typeof source],
      ]),
    ),
  );
  expect(Object.keys(result)).toEqual(keys);
  expect(Object.hasOwn(result, "ignored")).toBe(false);
  expect(result.u1).toBe(source.u1);
  expect(copyRecords(source, { values: {}, keys: [] })).toEqual({});
});

it("keeps prototype-like names as ordinary own data without invoking setters", () => {
  const source = JSON.parse(
    '{"__proto__":{"polluted":true},"constructor":1,"prototype":2}',
  );
  for (const result of [
    copyRecords(source),
    copyRecords({}, { values: source }),
    copyRecords({}, { values: source, keys: Object.keys(source) }),
  ]) {
    expect(result).toStrictEqual({ ...source });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect(Object.getOwnPropertyDescriptor(result, "__proto__")).toEqual({
      value: source.__proto__,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
});

it("uses known immutable source order without enumerating the dictionary again", () => {
  const source: Record<string, unknown> = Object.freeze(
    JSON.parse('{"u8":{"id":"u8"},"2":2,"__proto__":{"x":1},"u4":4}'),
  );
  const keys = Object.freeze(Object.keys(source));
  for (const patch of [
    undefined,
    { values: { u4: undefined, u9: 9, 1: 1 } },
    { values: { u9: 9, u4: undefined }, keys: ["u9", "u4", "u8"] },
    { values: {}, keys: [] },
  ]) {
    const expected = copyRecords<unknown>(source, patch);
    const spy = vi.spyOn(Object, "keys");
    let actual;
    try {
      actual = copyRecords<unknown>(source, patch, keys);
      expect(spy.mock.calls.some(([value]) => value === source)).toBe(false);
    } finally {
      spy.mockRestore();
    }
    expect(actual).toStrictEqual(expected);
    expect(Object.keys(actual!)).toEqual(Object.keys(expected));
    expect(Object.getPrototypeOf(actual)).toBe(Object.prototype);
  }
});
