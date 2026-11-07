import {
  buildModel,
  createRuntime,
  createStateMachine,
  makeConfig,
  makeMorphGenerators,
  makeTrail,
} from "@/motion/reference/grok-player.js";
import { inkFor } from "@/mascot/palettes";
import type { Clip, MotionSnapshot, Recipes, XY } from "./types";
import type { SeatKind } from "@/mascot/outlines";

export interface SessionOptions {
  recipes: Recipes;
  fill: string;
  seed?: number;
  initialState?: string;
  soloClipId?: string;
  compact?: boolean;
  reducedMotion?: boolean;
  outline?: readonly XY[];
  seat?: SeatKind;
}

export function createGrokSession({
  recipes,
  fill,
  seed = 1,
  initialState = "idle",
  soloClipId,
  compact = false,
  reducedMotion = false,
  outline,
  seat = "sphere",
}: SessionOptions) {
  let currentFill = fill;
  const config = makeConfig(recipes);
  if (outline) {
    config.$h = outline.map(([x, y]): XY => [config.x + x * config.x, config.x - y * config.x]);
  }
  const runtime = createRuntime(config, { body: "sphere", isReducedMotion: reducedMotion });
  const machine = createStateMachine(config, runtime, initialState, { seed, isCompact: compact });
  const generators = makeMorphGenerators(config);
  const trail = makeTrail(config);
  const solo = soloClipId ? recipes.clips.find((clip) => clip.name === soloClipId) : undefined;
  if (solo) runtime.load(solo, { transition: "instant", phase: 0 });
  let reduced = reducedMotion;
  const settle = () => {
    const state = recipes.states[machine.state];
    const clip = solo ?? recipes.clips.find((entry) => entry.name === state?.clips[0]);
    if (clip) runtime.load(clip, { isPlaying: false, transition: "instant", phase: 0 });
    runtime.setMorph(state?.morph ?? null, { isInstant: true });
    runtime.holdFace(state?.face ?? null);
    runtime.pause();
    for (let step = 0; step < 90; step++) runtime.advance(1 / 60);
    runtime.seek(0);
  };
  if (reduced) settle();
  const snapshot = (): MotionSnapshot => ({
    state: machine.state,
    clip: solo?.name ?? machine.clip,
    face: runtime.face,
    time: runtime.time,
    duration: runtime.duration,
    loops: runtime.loopCount,
    morph: runtime.frame().morph,
  });
  return {
    config,
    snapshot,
    frame: () => runtime.frame(),
    model: (size = 280) =>
      buildModel(
        runtime.frame(),
        { inkPaint: currentFill, spotPaint: inkFor(currentFill), cutout: false },
        size,
        config,
        generators,
        trail,
        () => {},
        outline,
        seat,
      ),
    setFill(newFill: string) {
      currentFill = newFill;
    },
    advance(dt: number) {
      if (reduced || !Number.isFinite(dt) || dt <= 0) return;
      if (!solo) machine.advance(dt);
      runtime.advance(dt);
    },
    seek(time: number) {
      if (!Number.isFinite(time)) return;
      const max = runtime.duration > 0 ? runtime.duration : 10;
      runtime.seek(Math.max(0, Math.min(max, time)));
    },
    play() {
      runtime.play();
    },
    pause() {
      runtime.pause();
    },
    updateClip(updatedClip: Clip) {
      if (solo && solo.name === updatedClip.name) {
        const currentTime = runtime.time;
        runtime.load(updatedClip, {
          transition: "instant",
          phase: runtime.duration > 0 ? currentTime / runtime.duration : 0,
          isPlaying: runtime.isPlaying,
        });
        runtime.seek(currentTime);
      }
    },
    setState(id: string) {
      machine.setState(id);
      if (reduced) settle();
    },
    setCompact(value: boolean) {
      machine.setCompact(value);
    },
    setReducedMotion(value: boolean) {
      reduced = value;
      if (value) settle();
      else runtime.play();
    },
    setFollow(value: boolean) {
      runtime.setGazeAlways(value);
      if (!value) runtime.setGaze(null);
    },
    setGaze(value: XY | null) {
      if (!reduced) runtime.setGaze(value);
    },
    poke() {
      if (!reduced) runtime.poke("bounce");
    },
    blink() {
      if (!reduced) runtime.blink();
    },
  };
}

export type GrokSession = ReturnType<typeof createGrokSession>;
