import { beforeAll, describe, expect, it } from "vite-plus/test";
import { BODY_OUTLINES } from "@/mascot/outlines";
import { DEFAULT_RECIPES } from "@/motion/model/program";
import { createBotEngine } from "./botEngine";
import { createBotTransport } from "./botTransport";
import { createBotBridge } from "./botBridge";
import { inkFor } from "@/mascot/palettes";
import type { MotionSnapshot } from "@/motion/model/types";

class FakeAttr {
  name: string;
  value: string;
  constructor(name: string, value: string) {
    this.name = name;
    this.value = String(value);
  }
}
class FakeElement {
  attributes: FakeAttr[] = [];
  children: FakeElement[] = [];
  className = "";
  style: Record<string, string> = {};
  parentNode: FakeElement | null = null;
  ownerDocument: FakeDocument;
  tag: string;
  constructor(doc: FakeDocument, tag: string) {
    this.ownerDocument = doc;
    this.tag = tag;
  }
  setAttribute(name: string, value: unknown) {
    this.attributes.push(new FakeAttr(name, String(value)));
  }
  getAttribute(name: string) {
    return this.attributes.find((attr) => attr.name === name)?.value;
  }
  append(...nodes: FakeElement[]) {
    for (const node of nodes) this.appendChild(node);
  }
  appendChild<T extends FakeElement>(node: T): T {
    this.children.push(node);
    node.parentNode = this;
    return node;
  }
  replaceChildren(...nodes: FakeElement[]) {
    this.children = [...nodes];
    for (const node of nodes) node.parentNode = this;
  }
  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }
  querySelectorAll(_selector: string): FakeElement[] {
    const out: FakeElement[] = [];
    const walk = (el: FakeElement) => {
      for (const child of el.children) {
        out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
  get firstChild() {
    return this.children[0] ?? null;
  }
}
class FakeDocument {
  createElement(tag: string) {
    return new FakeElement(this, tag);
  }
  createElementNS(_ns: string, tag: string) {
    return new FakeElement(this, tag);
  }
}

const asFake = (el: unknown) => el as unknown as FakeElement;
const svgRoot = (engine: ReturnType<typeof createBotEngine>) => {
  const host = asFake(engine.host);
  const canvas = host.children[0];
  return canvas?.children[0];
};
const serializeFake = (el: FakeElement): unknown => ({
  tag: el.tag,
  attrs: Object.fromEntries(el.attributes.map((attr) => [attr.name, attr.value])),
  children: el.children.map(serializeFake),
});
const serializeEngine = (engine: ReturnType<typeof createBotEngine>) => {
  const svg = svgRoot(engine);
  return svg ? JSON.stringify(serializeFake(svg)) : "";
};
const fakeContainer = () => {
  const doc = new FakeDocument();
  return asFake(new FakeElement(doc, "div")) as unknown as HTMLElement;
};

const SPOT = inkFor("#49aaa0"); // eyes, matching the studio's eye-ink logic

beforeAll(() => {
  // The bundle installs its own rAF loop at attach time; stub it so no frames
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
});

describe("bot-engine 3D bodies (fake DOM)", () => {
  it("renders a finite SVG tree for all 28 stock silhouettes", () => {
    const idle = DEFAULT_RECIPES.clips.find((clip) => clip.name === "Idle_A")!;
    for (const shapeId of Object.keys(BODY_OUTLINES)) {
      const engine = createBotEngine(fakeContainer(), {
        shapeId,
        fill: "#49aaa0",
        seed: 3,
        isPlaying: false,
      });
      engine.handle.update({ clip: idle });
      engine.handle.seek(0.35);
      const serialized = serializeEngine(engine);
      expect(serialized.length, shapeId).toBeGreaterThan(500);
      expect(serialized, shapeId).not.toMatch(/NaN|Infinity/);
      engine.destroy();
    }
  });

  it("rotates the silhouette through a 360° turntable in depth", () => {
    const engine = createBotEngine(fakeContainer(), {
      shapeId: "star",
      fill: "#49aaa0",
      seed: 7,
      isPlaying: false,
    });
    const rotation = DEFAULT_RECIPES.clips.find((clip) => clip.name === "Rotation_B")!;
    engine.handle.update({ clip: rotation });

    const frames: string[] = [];
    const bodyLengths: number[] = [];
    const eyeWidths: number[] = [];
    for (let t = 0; t <= 10; t += 0.5) {
      engine.handle.seek(t);
      const serialized = serializeEngine(engine);
      frames.push(serialized);
      const match = serialized.match(/"tag":"path","attrs":\{"d":"[^"]*"/);
      expect(match, `body path at t=${t}`).not.toBeNull();
      bodyLengths.push(match![0].length);
      const widthOf = (d: string) => {
        const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
        const xs = nums.filter((_, i) => i % 2 === 0);
        return Math.max(...xs) - Math.min(...xs);
      };
      const eyeDs = [
        ...serialized.matchAll(
          new RegExp(`\\{(?=[^{}]*"fill":"${SPOT}")[^{}]*"d":"([^"]+)"[^{}]*\\}`, "g"),
        ),
      ].map((m) => m[1]!);
      if (eyeDs.length > 0) eyeWidths.push(Math.min(...eyeDs.map(widthOf)));
    }
    expect(frames.every((frame) => !/NaN|Infinity/.test(frame))).toBe(true);
    expect(Math.max(...bodyLengths) - Math.min(...bodyLengths)).toBeGreaterThan(300);
    expect(Math.max(...eyeWidths) / Math.min(...eyeWidths)).toBeGreaterThan(1.5);
    expect(new Set(frames).size).toBeGreaterThan(8);
    engine.destroy();
  });

  it("handles morph apply/clear and edited clips through the bridge", () => {
    const engine = createBotEngine(fakeContainer(), {
      shapeId: "chat",
      fill: "#49aaa0",
      seed: 11,
      isPlaying: false,
    });
    const bridge = createBotBridge(createBotTransport(engine));
    const snap = (over: Partial<MotionSnapshot> & { state: string }): MotionSnapshot => ({
      clip: null,
      face: "neutral",
      time: 0,
      duration: 2,
      loops: 0,
      morph: null,
      ...over,
    });
    expect(() =>
      bridge.sync(
        snap({
          state: "thinking",
          clip: "Idle_B",
          time: 0.5,
          morph: { kind: "thinking", amount: 0.6, spin: 0, isSettled: false },
        }),
        DEFAULT_RECIPES,
      ),
    ).not.toThrow();
    expect(() =>
      bridge.sync(snap({ state: "idle", clip: "Idle_A", time: 1.5 }), DEFAULT_RECIPES),
    ).not.toThrow();

    const edited = {
      ...DEFAULT_RECIPES.clips.find((clip) => clip.name === "Idle_A")!,
      duration: 9,
    };
    expect(() =>
      bridge.loadEditedClip(edited, snap({ state: "idle", clip: "Idle_A", time: 2 })),
    ).not.toThrow();
    expect(() => engine.handle.blink()).not.toThrow();
    expect(() => engine.handle.poke("bounce")).not.toThrow();
    expect(serializeEngine(engine)).not.toMatch(/NaN|Infinity/);
    engine.destroy();
    expect(asFake(engine.host).parentNode).toBeNull();
  });
});
