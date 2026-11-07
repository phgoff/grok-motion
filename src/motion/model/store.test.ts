import { beforeEach, describe, expect, it } from "vite-plus/test";
import { DEFAULT_RECIPES } from "./program";
import {
  RECIPES_KEY,
  clearStoredMotion,
  parseMotionDoc,
  readStoredMotion,
  writeStoredMotion,
} from "./store";

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    },
  });
});
describe("native motion documents", () => {
  it("round trips vector tracks, expression events, weighted pools, and exits", () => {
    expect(writeStoredMotion(DEFAULT_RECIPES)).toBe(true);
    const restored = readStoredMotion();
    expect(restored?.recipes.clips).toEqual(DEFAULT_RECIPES.clips);
    expect(restored?.recipes.states).toEqual(DEFAULT_RECIPES.states);
    expect(restored?.version).toBe(2);
  });
  it("does not load or erase an older scalar draft", () => {
    memory.set("grok-motion.motion.v1", '{"version":1}');
    expect(readStoredMotion()).toBeNull();
    writeStoredMotion(DEFAULT_RECIPES);
    clearStoredMotion();
    expect(memory.has(RECIPES_KEY)).toBe(false);
    expect(memory.has("grok-motion.motion.v1")).toBe(true);
  });
  it("rejects malformed vectors, expression events and state references", () => {
    const doc = () => structuredClone({ version: 2, shape: "grok", recipes: DEFAULT_RECIPES });
    const badVector = doc();
    badVector.recipes.clips[0]!.tracks.position![0]!.v = [1] as unknown as [number, number];
    const badExpression = doc();
    badExpression.recipes.clips[0]!.tracks.expression![0]!.v = "unknown";
    const badNext = doc();
    badNext.recipes.states.waking!.next = "unknown";
    for (const value of [badVector, badExpression, badNext, { version: 1 }, null])
      expect(parseMotionDoc(JSON.stringify(value))).toBeNull();
  });
  it("reports blocked storage without throwing", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    expect(writeStoredMotion(DEFAULT_RECIPES)).toBe(false);
    expect(readStoredMotion()).toBeNull();
    expect(clearStoredMotion()).toBe(false);
  });
});
