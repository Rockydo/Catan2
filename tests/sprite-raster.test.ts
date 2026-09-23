import { afterEach, describe, expect, it, vi } from "vitest";
import { rasterizeSprite, spriteRasterScale } from "../src/ui/sprite-raster";

afterEach(() => vi.unstubAllGlobals());

describe("map sprite preparation", () => {
  it("covers maximum zoom and display density on wide, tall and growing maps", () => {
    for (const bounds of [
      { w: 1200, h: 900 },
      { w: 5000, h: 2200 },
    ])
      for (const viewport of [
        { width: 1920, height: 1080, dpr: 1 },
        { width: 3840, height: 2160, dpr: 2 },
        { width: 412, height: 915, dpr: 3 },
      ]) {
        const zoom = 18;
        const scale = spriteRasterScale(bounds, zoom, viewport);
        expect(Number.isInteger(scale)).toBe(true);
        // The actual board can only be smaller than its containing window.
        for (const drawer of [0, 300]) {
          const pixels =
            Math.min(
              Math.max(1, viewport.width - drawer) / bounds.w,
              viewport.height / bounds.h,
            ) *
            zoom *
            viewport.dpr;
          expect(scale).toBeGreaterThanOrEqual(pixels);
        }
        expect(scale).toBeLessThan(
          Math.max(
            1,
            Math.min(viewport.width / bounds.w, viewport.height / bounds.h) *
              zoom *
              viewport.dpr,
          ) + 1,
        );
      }
  });

  function fixture(
    options: { noContext?: boolean; noBlob?: boolean; failPng?: boolean } = {},
  ) {
    const decode = vi.fn(async function (this: { src: string }) {
      if (options.failPng && this.src.startsWith("blob:"))
        throw Error("PNG failed");
    });
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        decode = decode;
      },
    );
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => (options.noContext ? null : { drawImage })),
      toBlob: vi.fn((done: (blob: Blob | null) => void) =>
        queueMicrotask(() =>
          done(
            options.noBlob ? null : new Blob(["image"], { type: "image/png" }),
          ),
        ),
      ),
    };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    const createObjectURL = vi.fn(() => "blob:sprite"),
      revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    return { canvas, decode, drawImage, createObjectURL, revokeObjectURL };
  }

  it("prepares full-resolution lossless pixels and decodes them before publication", async () => {
    const f = fixture();
    expect(
      await rasterizeSprite(
        "data:image/svg+xml,art",
        { width: 56.5, height: 47.25 },
        4,
      ),
    ).toBe("blob:sprite");
    expect([f.canvas.width, f.canvas.height]).toEqual([226, 189]);
    expect(f.canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/png",
    );
    expect(f.decode).toHaveBeenCalledTimes(2);
    expect(f.revokeObjectURL).not.toHaveBeenCalled();
  });

  it.each([{ noContext: true }, { noBlob: true }])(
    "keeps the source when raster preparation is unavailable: %o",
    async (options) => {
      const f = fixture(options);
      const source = "data:image/svg+xml,art";
      expect(await rasterizeSprite(source, { width: 56, height: 47 }, 4)).toBe(
        source,
      );
      expect(f.createObjectURL).not.toHaveBeenCalled();
    },
  );

  it("releases a failed prepared image so the caller can keep its original vectors", async () => {
    const f = fixture({ failPng: true });
    await expect(
      rasterizeSprite("data:image/svg+xml,art", { width: 56, height: 47 }, 4),
    ).rejects.toThrow("PNG failed");
    expect(f.revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:sprite");
  });
});
