import { describe, expect, it } from "vite-plus/test";
import {
  BODY_OUTLINES,
  GROK_OUTLINE,
  outlineFor,
  seatForOutline,
  stockShapeIdFor,
} from "./outlines";
import { BODY_SHAPES } from "./shapes";

describe("stock shape lookup", () => {
  it("resolves every stock outline back to its shape id", () => {
    for (const [shape, outline] of Object.entries(BODY_OUTLINES)) {
      expect(stockShapeIdFor(outline), shape).toBe(shape);
    }
  });

  it("returns undefined for sphere, GROK and arbitrary custom outlines (2D fallback)", () => {
    expect(stockShapeIdFor(undefined)).toBeUndefined();
    expect(outlineFor("sphere")).toBeUndefined();
    expect(stockShapeIdFor(GROK_OUTLINE)).toBeUndefined();
    expect(
      stockShapeIdFor([
        [0, 0],
        [1, 1],
        [-1, 1],
      ] as const),
    ).toBeUndefined();
  });

  it("keeps the sphere on the 2D sphere seat", () => {
    expect(seatForOutline(undefined)).toBe("sphere");
    for (const shape of BODY_SHAPES) {
      if (shape === "sphere") continue;
      expect(seatForOutline(outlineFor(shape)), shape).not.toBeUndefined();
    }
  });
});
