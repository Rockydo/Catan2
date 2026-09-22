import { describe, expect, it } from "vitest";
import { wheelZoomFactor } from "../src/ui/map-camera-math";

describe("wheel input distance", () => {
  it("preserves coalesced notches rather than slowing down fast scrolling", () => {
    const notch = wheelZoomFactor(-100, 0, 900);
    expect(notch).toBeCloseTo(1.12);
    expect(wheelZoomFactor(-300, 0, 900)).toBeCloseTo(notch ** 3);
    expect(wheelZoomFactor(-25, 0, 900) ** 4).toBeCloseTo(notch);
    expect(wheelZoomFactor(300, 0, 900) * notch ** 3).toBeCloseTo(1);
  });
  it("normalizes line and page devices and ignores invalid input", () => {
    expect(wheelZoomFactor(-3, 1, 900)).toBe(wheelZoomFactor(-120, 0, 900));
    expect(wheelZoomFactor(-0.5, 2, 800)).toBe(wheelZoomFactor(-400, 0, 800));
    expect(wheelZoomFactor(0, 0, 900)).toBe(1);
    expect(wheelZoomFactor(NaN, 0, 900)).toBe(1);
    expect(wheelZoomFactor(Infinity, 0, 900)).toBe(1);
    expect(wheelZoomFactor(-1e300, 0, 900)).toBeCloseTo(1.12 ** 6);
  });
});
