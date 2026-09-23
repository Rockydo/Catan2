import { describe, expect, it } from "vitest";
import { planMapTextures } from "../src/ui/map-gpu";

const limits = { size: 4096, layers: 256, banks: 16 };
describe("map texture budget", () => {
  it("fits a dense terrain scene without terrain-sized slots for badges", () => {
    const images = [
      ...Array.from({ length: 166 }, () => ({ width: 411, height: 411 })),
      ...Array.from({ length: 245 }, () => ({ width: 312, height: 282 })),
      ...Array.from({ length: 181 }, () => ({ width: 360, height: 282 })),
    ];
    const plan = planMapTextures(images, limits);
    expect(plan.banks.length).toBe(3);
    expect(plan.bytes).toBeLessThan(400 * 1024 * 1024);
    expect(
      new Set(plan.placements.map((p) => `${p.bank}/${p.layer}`)).size,
    ).toBe(images.length);
    for (const [i, image] of images.entries()) {
      const bank = plan.banks[plan.placements[i].bank];
      expect(bank.width).toBeGreaterThanOrEqual(image.width);
      expect(bank.height).toBeGreaterThanOrEqual(image.height);
    }
  });
  it("counts all mip levels, including rectangular levels down to one pixel", () => {
    const plan = planMapTextures([{ width: 63, height: 32 }], limits);
    // 64x32, 32x16, 16x8, 8x4, 4x2, 2x1, 1x1, RGBA8.
    expect(plan.bytes).toBe((2048 + 512 + 128 + 32 + 8 + 2 + 1) * 4);
    expect(() =>
      planMapTextures([{ width: 63, height: 32 }], {
        ...limits,
        bytes: plan.bytes - 1,
      }),
    ).toThrow(/budget/);
    expect(
      planMapTextures([{ width: 63, height: 32 }], {
        ...limits,
        bytes: plan.bytes,
      }).bytes,
    ).toBe(plan.bytes);
  });
  it("splits a size group at the hardware layer limit", () => {
    const plan = planMapTextures(
      Array.from({ length: 5 }, () => ({ width: 40, height: 40 })),
      { ...limits, layers: 2 },
    );
    expect(plan.banks.map((b) => b.images.length)).toEqual([2, 2, 1]);
    expect(plan.placements[4]).toEqual({ bank: 2, layer: 0 });
  });
  it("rejects an over-budget or unsupported scene before allocating textures", () => {
    expect(() =>
      planMapTextures([{ width: 4000, height: 4000 }], {
        ...limits,
        bytes: 16 * 1024 * 1024,
      }),
    ).toThrow(/budget/);
    expect(() =>
      planMapTextures([{ width: 4097, height: 10 }], limits),
    ).toThrow(/large/);
    expect(() =>
      planMapTextures(
        [
          { width: 40, height: 40 },
          { width: 400, height: 400 },
        ],
        { ...limits, banks: 1 },
      ),
    ).toThrow(/banks/);
    for (const width of [0, -1, NaN, Infinity, 1.5])
      expect(() => planMapTextures([{ width, height: 10 }], limits)).toThrow(
        /dimensions/,
      );
  });
});
