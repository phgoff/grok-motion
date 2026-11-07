import { describe, expect, it } from "vite-plus/test";
import { createBotBridge, type BotTransport } from "./botBridge";
import { DEFAULT_RECIPES } from "@/motion/model/program";
import type { Clip, MotionSnapshot } from "@/motion/model/types";

interface TransportCall {
  method: string;
  args: unknown[];
}

function recordingTransport() {
  const calls: TransportCall[] = [];
  const transport: BotTransport = {
    loadClip: (clip, time) => calls.push({ method: "loadClip", args: [clip, time] }),
    setMorph: (name) => calls.push({ method: "setMorph", args: [name] }),
    holdFace: (face) => calls.push({ method: "holdFace", args: [face] }),
    seek: (time) => calls.push({ method: "seek", args: [time] }),
    setPlaying: (playing) => calls.push({ method: "setPlaying", args: [playing] }),
    blink: () => calls.push({ method: "blink", args: [] }),
    poke: (name) => calls.push({ method: "poke", args: [name] }),
  };
  return { calls, transport };
}

const snap = (over: Partial<MotionSnapshot> & { state: string }): MotionSnapshot => ({
  clip: null,
  face: "neutral",
  time: 0,
  duration: 2,
  loops: 0,
  morph: null,
  ...over,
});

const methods = (calls: TransportCall[]) => calls.map((call) => call.method);

describe("bot bridge", () => {
  it("loads the stock clip object on first sync and aligns the phase", () => {
    const { calls, transport } = recordingTransport();
    const bridge = createBotBridge(transport);
    const snapshot = snap({ state: "idle", clip: "Idle_A", time: 0.75 });
    bridge.sync(snapshot, DEFAULT_RECIPES);
    const load = calls.find((call) => call.method === "loadClip");
    expect(load, "loadClip called").toBeDefined();
    expect(load?.args[0]).toBe(DEFAULT_RECIPES.clips.find((c) => c.name === "Idle_A"));
    expect(load?.args[1]).toBe(0.75);
    expect(methods(calls)).toContain("setMorph");
    expect(methods(calls)).toContain("holdFace");
  });

  it("does not reload while neither state nor clip changes, but forwards morph/face edges", () => {
    const { calls, transport } = recordingTransport();
    const bridge = createBotBridge(transport);
    const base = snap({
      state: "thinking",
      clip: "Idle_B",
      time: 0.1,
      morph: { kind: "thinking", amount: 1, spin: 0, isSettled: true },
    });
    bridge.sync(base, DEFAULT_RECIPES);
    bridge.sync({ ...base, time: 0.2 }, DEFAULT_RECIPES);
    expect(methods(calls).filter((m) => m === "loadClip")).toHaveLength(1);
    expect(calls.filter((c) => c.method === "setMorph")).toHaveLength(1);

    bridge.sync({ ...base, morph: null }, DEFAULT_RECIPES);
    expect(calls.filter((c) => c.method === "setMorph").at(-1)?.args).toEqual([null]);
    expect(methods(calls).filter((m) => m === "loadClip")).toHaveLength(1);
  });

  it("reloads even for a repeated clip name when the state changes (2D bridge parity)", () => {
    const { calls, transport } = recordingTransport();
    const bridge = createBotBridge(transport);
    bridge.sync(snap({ state: "listening", clip: "Idle_D", time: 1 }), DEFAULT_RECIPES);
    bridge.sync(snap({ state: "suspicious", clip: "Idle_D", time: 0 }), DEFAULT_RECIPES);
    expect(methods(calls).filter((m) => m === "loadClip")).toHaveLength(2);
    const faces = calls.filter((c) => c.method === "holdFace").map((c) => c.args[0]);
    expect(faces).toEqual(["calm", "squinted"]);
  });

  it("holds the state face when set and releases it otherwise", () => {
    const { calls, transport } = recordingTransport();
    const bridge = createBotBridge(transport);
    bridge.sync(snap({ state: "sleeping", clip: "Idle_B" }), DEFAULT_RECIPES);
    bridge.sync(snap({ state: "idle", clip: "Idle_B" }), DEFAULT_RECIPES);
    const faces = calls.filter((c) => c.method === "holdFace").map((c) => c.args[0]);
    expect(faces).toEqual(["sleepy", null]);
  });

  it("ignores an unknown or missing clip without crashing", () => {
    const { calls, transport } = recordingTransport();
    const bridge = createBotBridge(transport);
    expect(() =>
      bridge.sync(snap({ state: "idle", clip: "Nope_A" }), DEFAULT_RECIPES),
    ).not.toThrow();
    expect(() => bridge.sync(snap({ state: "idle", clip: null }), DEFAULT_RECIPES)).not.toThrow();
    expect(methods(calls)).not.toContain("loadClip");
  });

  it("force-loads an edited clip and suppresses the duplicate sync reload", () => {
    const { calls, transport } = recordingTransport();
    const bridge = createBotBridge(transport);
    const edited: Clip = {
      ...DEFAULT_RECIPES.clips.find((c) => c.name === "Idle_A")!,
      duration: 9,
    };
    const snapshot = snap({ state: "idle", clip: "Idle_A", time: 1.25 });
    bridge.loadEditedClip(edited, snapshot);
    bridge.sync(snapshot, DEFAULT_RECIPES);
    const loads = calls.filter((c) => c.method === "loadClip");
    expect(loads).toHaveLength(1);
    expect(loads[0]?.args[0]).toBe(edited);
    expect(loads[0]?.args[1]).toBe(1.25);
  });

  it("forwards discrete commands", () => {
    const { calls, transport } = recordingTransport();
    const bridge = createBotBridge(transport);
    bridge.seek(3.5);
    bridge.setPlaying(false);
    bridge.blink();
    bridge.poke();
    bridge.poke("nod");
    expect(calls).toEqual([
      { method: "seek", args: [3.5] },
      { method: "setPlaying", args: [false] },
      { method: "blink", args: [] },
      { method: "poke", args: ["bounce"] },
      { method: "poke", args: ["nod"] },
    ]);
  });
});
