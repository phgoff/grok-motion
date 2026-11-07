import { describe, expect, it } from "vite-plus/test";
import { GROK_SPHERE_DESIGN } from "@/mascot/defaults";
import { readStageTheme, stageDesignFor } from "./stageTheme";

describe("stage theme design swap", () => {
  it("keeps the black Grok sphere black on a light stage", () => {
    const design = stageDesignFor(GROK_SPHERE_DESIGN, "light");
    expect(design.fill).toBe("#000000");
    expect(design.edge).toBe("#000000");
  });
  it("turns the black Grok sphere white on a dark stage", () => {
    const design = stageDesignFor(GROK_SPHERE_DESIGN, "dark");
    expect(design.fill).toBe("#fffefa");
    expect(design.edge).toBe("#fffefa");
  });
  it("turns a near-white body black on a light stage so it never disappears", () => {
    const white = { ...GROK_SPHERE_DESIGN, fill: "#fffefa", edge: "#fffefa" };
    const design = stageDesignFor(white, "light");
    expect(design.fill).toBe("#000000");
    expect(design.edge).toBe("#000000");
  });
  it("leaves picked hues alone on both stages", () => {
    const teal = { ...GROK_SPHERE_DESIGN, fill: "#48b9b1", edge: "#247d79" };
    expect(stageDesignFor(teal, "light")).toEqual(teal);
    expect(stageDesignFor(teal, "dark")).toEqual(teal);
  });
  it("defaults to the dark stage when storage is unavailable or empty", () => {
    expect(readStageTheme()).toBe("dark");
  });
});
