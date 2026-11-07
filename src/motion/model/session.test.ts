import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_RECIPES } from "./program";
import { BODY_OUTLINES, GROK_OUTLINE, outlineFor, seatForOutline } from "@/mascot/outlines";
import type { BodyShape } from "@/mascot/shapes";
import { BODY_SHAPES } from "@/mascot/shapes";
import { createGrokSession } from "./session";
import type { XY } from "./types";

const session = (initialState = "idle", seed = 1, outline?: readonly XY[]) =>
  createGrokSession({
    recipes: DEFAULT_RECIPES,
    fill: "#49aaa0",
    initialState,
    seed,
    outline,
    seat: seatForOutline(outline),
  });
const shapeSession = (shape: BodyShape, initialState = "idle", seed = 1) =>
  createGrokSession({
    recipes: DEFAULT_RECIPES,
    fill: "#49aaa0",
    initialState,
    seed,
    outline: outlineFor(shape),
    seat: seatForOutline(outlineFor(shape)),
  });
const morphSession = (initialState = "idle", seed = 1) => session(initialState, seed, GROK_OUTLINE);
const morphModel = <T extends ReturnType<typeof session>>(player: T) => {
  const model = player.model();
  if (model.mode !== "morph") throw new Error("expected the Grok morph model");
  return model;
};
const eyesFinite = (model: ReturnType<typeof morphModel>, label: string) => {
  for (const eye of model.eyesPts as [number, number][][]) {
    expect(eye.length, label).toBeGreaterThan(0);
    for (const [x, y] of eye) {
      expect(Number.isFinite(x) && Number.isFinite(y), `${label} (${x}, ${y})`).toBe(true);
    }
  }
};
const pointInPolygon = (point: [number, number], vs: [number, number][]) => {
  const x = point[0],
    y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i]![0],
      yi = vs[i]![1];
    const xj = vs[j]![0],
      yj = vs[j]![1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};
const expectEyesInside = (model: ReturnType<typeof morphModel>, label: string) => {
  const body = model.bodyPts as [number, number][];
  expect(body.length, label).toBeGreaterThan(20);
  for (const eye of model.eyesPts as [number, number][][]) {
    for (const pt of eye) {
      expect(pointInPolygon(pt, body), `${label} (${pt[0].toFixed(1)}, ${pt[1].toFixed(1)})`).toBe(
        true,
      );
    }
  }
};
const advance = (player: ReturnType<typeof session>, seconds: number) => {
  for (let t = 0; t < seconds - 1e-8; t += 1 / 60) player.advance(Math.min(1 / 60, seconds - t));
};

describe("Grok reference playback", () => {
  it("holds persistent listening instead of walking an invented graph", () => {
    const player = session("listening");
    advance(player, 25);
    expect(player.snapshot().state).toBe("listening");
    expect(player.snapshot().clip).toBe("Idle_D");
  });
  it("wakes into idle at 1.6 seconds without timer jitter", () => {
    const player = session("waking");
    advance(player, 1.59);
    expect(player.snapshot().state).toBe("waking");
    player.advance(0.02);
    expect(player.snapshot().state).toBe("idle");
  });
  it("blocks for 120 seconds before becoming drowsy", () => {
    const player = session("blocked");
    advance(player, 119.99);
    expect(player.snapshot().state).toBe("blocked");
    player.advance(0.02);
    expect(player.snapshot().state).toBe("drowsy");
  });
  it("finishes the ordered Done_B and Done_A sequence before returning to idle", () => {
    const player = session("finished");
    expect(player.snapshot().clip).toBe("Done_B");
    const seen = new Set<string | null>();
    for (let i = 0; i < 1800 && player.snapshot().state === "finished"; i++) {
      seen.add(player.snapshot().clip);
      player.advance(1 / 60);
    }
    expect([...seen]).toEqual(["Done_B", "Done_A"]);
    expect(player.snapshot().state).toBe("idle");
  });
  it("replays the same seeded motion and leaves the state unchanged on poke", () => {
    const left = session("idle", 31),
      right = session("idle", 31);
    for (let i = 0; i < 900; i++) {
      left.advance(1 / 60);
      right.advance(1 / 60);
      expect(left.snapshot()).toEqual(right.snapshot());
    }
    left.poke();
    advance(left, 0.2);
    expect(left.snapshot().state).toBe("idle");
    expect(left.frame().offset).not.toEqual(right.frame().offset);
  });
  it("defaults to the Grok sphere body: a true circle with finite paths for every plain state", () => {
    const plain = Object.entries(DEFAULT_RECIPES.states)
      .filter(([, state]) => !state.morph)
      .map(([id]) => id);
    expect(plain.length).toBeGreaterThan(0);
    for (const id of plain) {
      const player = session(id);
      for (const seconds of [0, 0.3, 1, 2]) {
        advance(player, seconds);
        const model = player.model();
        expect(model.mode, id).toBe("sphere");
        if (model.mode !== "sphere") continue;
        expect(model.bodyD.length, id).toBeGreaterThan(0);
        expect(model.bodyD, id).not.toContain("NaN");
        expect(model.eyesD, id).not.toContain("NaN");
      }
    }
  });
  it("keeps finite geometry for morph-decorated states on the sphere default", () => {
    const decorated = Object.entries(DEFAULT_RECIPES.states)
      .filter(([, state]) => state.morph)
      .map(([id]) => id);
    expect(decorated.length).toBeGreaterThan(0);
    for (const id of decorated) {
      const player = session(id);
      for (const seconds of [0.3, 1, 2]) {
        advance(player, seconds);
        const model = player.model();
        if (model.mode === "sphere") {
          expect(model.bodyD, id).not.toContain("NaN");
          expect(model.eyesD, id).not.toContain("NaN");
          continue;
        }
        expect(
          [...model.bodyPts, ...model.eyesPts.flat()].every(
            ([x, y]) => Number.isFinite(x) && Number.isFinite(y),
          ),
          id,
        ).toBe(true);
      }
    }
  });
  it("keeps eye contours finite on Grok across states", () => {
    for (const id of Object.keys(DEFAULT_RECIPES.states)) {
      const player = morphSession(id);
      for (const seconds of [0.1, 0.5, 1.0, 1.8]) {
        advance(player, seconds);
        const model = morphModel(player);
        if (model.eyesPts.length === 0) continue;
        eyesFinite(model, `${id} eye at ${seconds}s`);
      }
    }
  });
  it("changes original eye contours across expressions", () => {
    const player = morphSession("listening");
    advance(player, 0.5);
    const calm = morphModel(player).eyesPts;
    player.setState("surprised");
    advance(player, 0.6);
    expect(player.snapshot().face).toBe("surprised");
    expect(morphModel(player).eyesPts).not.toEqual(calm);
  });
  it("seats eyes on every non-sphere silhouette", () => {
    const shapes = Object.keys(BODY_OUTLINES) as BodyShape[];
    expect(shapes).toEqual(BODY_SHAPES.filter((shape) => shape !== "sphere"));
    for (const shape of shapes) {
      const player = shapeSession(shape);
      for (const [state, seconds] of [
        ["idle", 0.4],
        ["surprised", 0.6],
        ["curious", 0.8],
      ] as const) {
        player.setState(state);
        advance(player, seconds);
        eyesFinite(morphModel(player), `${shape}/${state}`);
      }
    }
  });
  it("keeps eyes fully inside the silhouette through a 360-degree spin", () => {
    for (const shape of Object.keys(BODY_OUTLINES) as BodyShape[]) {
      const player = shapeSession(shape, "turntable");
      for (let t = 0; t < 10; t += 1 / 6) {
        advance(player, 1 / 6);
        const model = morphModel(player);
        if (model.eyesPts.length === 0) continue;
        expectEyesInside(model, `${shape} @${t.toFixed(1)}s`);
      }
    }
  });
  it("compresses the far eye with the turn on every custom silhouette", () => {
    const shapes = Object.keys(BODY_OUTLINES) as BodyShape[];
    for (const shape of shapes) {
      const player = shapeSession(shape);
      player.setFollow(true);
      player.setGaze([1, 1]);
      advance(player, 1.2);
      const frame = player.frame();
      expect(Math.abs(frame.yaw), shape).toBeGreaterThan(1);
      expect(Math.abs(frame.pitch), shape).toBeGreaterThan(1);
      const model = morphModel(player);
      expect(model.eyesPts.length, `${shape} eye rings`).toBeGreaterThanOrEqual(2);
      const rings = model.eyesPts as [number, number][][];
      const centroids = rings.map((ring) => ({
        x: ring.reduce((s, [x]) => s + x, 0) / ring.length,
        w: Math.max(...ring.map(([x]) => x)) - Math.min(...ring.map(([x]) => x)),
      }));
      centroids.sort((a, b) => a.x - b.x);
      const ratio = centroids[1]!.w / centroids[0]!.w;
      if (seatForOutline(outlineFor(shape)) === "front") {
        expect(Math.abs(1 - ratio), `${shape} flat-face eyes foreshorten equally`).toBeLessThan(
          0.02,
        );
      } else {
        expect(ratio, `${shape} far eye should narrow with the turn`).toBeLessThan(0.97);
      }
    }
  });
  it("settles selected reduced-motion states without advancing their next-state timers", () => {
    const player = createGrokSession({
      recipes: DEFAULT_RECIPES,
      fill: "#49aaa0",
      initialState: "waking",
      reducedMotion: true,
      outline: GROK_OUTLINE,
      seat: seatForOutline(GROK_OUTLINE),
    });
    player.advance(120);
    expect(player.snapshot().state).toBe("waking");
    player.setState("sleeping");
    expect(player.snapshot().state).toBe("sleeping");
    expect(player.snapshot().face).toBe("sleepy");
    const model = player.model();
    if (model.mode !== "morph") throw new Error("expected the Grok morph model");
    expect(model.bodyPts.length).toBeGreaterThan(20);
  });
});
