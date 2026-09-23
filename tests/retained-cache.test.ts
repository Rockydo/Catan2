import { describe, expect, it, vi } from "vitest";
import { retainedCache } from "../src/ui/retained-cache";

describe("displayed sprite cache", () => {
  it("retains every displayed asset even when a scene exceeds the idle limit", () => {
    const cache = retainedCache<object>(2);
    const create = vi.fn(() => ({}));
    const leases = Array.from({ length: 1000 }, (_, i) =>
      cache.retain(String(i), create)!,
    );
    const first = cache.retain("0", create)!;
    expect(first.value).toBe(leases[0].value);
    expect(create).toHaveBeenCalledTimes(1000);
    leases[0].release();
    // A second consumer still displays it.
    for (const lease of leases.slice(1)) lease.release();
    expect(cache.retain("0", create)!.value).toBe(first.value);
    expect(create).toHaveBeenCalledTimes(1000);
  });

  it("evicts least recently released assets and reuses those retained again", () => {
    const cache = retainedCache<object>(2),
      create = vi.fn(() => ({}));
    const a = cache.retain("a", create)!,
      b = cache.retain("b", create)!;
    a.release();
    b.release();
    const aAgain = cache.retain("a", create)!;
    expect(aAgain.value).toBe(a.value);
    aAgain.release();
    cache.retain("c", create)!.release();
    expect(cache.retain("a", create)!.value).toBe(a.value);
    expect(cache.retain("b", create)!.value).not.toBe(b.value);
  });

  it("releases a lease once and retries missing definitions without caching them", () => {
    const cache = retainedCache<object>(0);
    expect(cache.retain("missing", () => undefined)).toBeUndefined();
    const a = cache.retain("missing", () => ({}))!;
    const b = cache.retain("missing", () => {
      throw Error("already prepared");
    })!;
    a.release();
    a.release();
    expect(cache.retain("missing", () => undefined)!.value).toBe(b.value);
    const c = cache.retain("other", () => ({}))!;
    c.release();
    c.release();
    expect(cache.retain("other", () => ({}))!.value).not.toBe(c.value);
  });
});
