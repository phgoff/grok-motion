import type { Clip, Recipes, XY } from "@/motion/model/types";

export interface Config {
  readonly baseEulerDeg: number[];
  readonly x: number;
  $h: XY[];
}
export interface Frame {
  body: string;
  bodyRoll: number;
  pitch: number;
  yaw: number;
  zoom: number;
  offset: XY;
  squash: XY;
  squashAnchor: number;
  quat: readonly number[];
  eyes: unknown;
  morph: { kind: string | null; amount: number; spin: number; isSettled: boolean } | null;
}
export interface Runtime {
  readonly time: number;
  readonly duration: number;
  readonly loopCount: number;
  readonly face: string;
  readonly isPlaying: boolean;
  readonly isSettled: boolean;
  load(
    clip: Clip,
    options?: { isPlaying?: boolean; transition?: "bridge" | "instant"; phase?: number },
  ): void;
  advance(dt: number): void;
  frame(): Frame;
  setMorph(kind: string | null, options?: { isInstant?: boolean }): void;
  holdFace(name: string | null): void;
  setGaze(gaze: XY | null): void;
  setGazeAlways(follow: boolean): void;
  poke(kind: "bounce" | "nod" | "shake", options?: { turns?: number }): void;
  blink(): void;
  seek(time: number): void;
  pause(): void;
  play(): void;
}
export interface Machine {
  readonly state: string;
  readonly clip: string | null;
  setState(id: string): void;
  setCompact(compact: boolean): void;
  advance(dt: number): void;
}
export interface ModelBase {
  size: number;
  inkPaint: string;
  spotPaint: string;
  cutout: boolean;
}
export interface SphereModel extends ModelBase {
  mode: "sphere";
  bodyD: string;
  eyesD: string;
  glow: {
    body: {
      transform: string;
      focus: number;
      stops: { offset: number; color: string; opacity: number }[];
    };
    halo: { d: string; gradient: unknown } | null;
  } | null;
}
export interface MorphModel extends ModelBase {
  mode: "morph";
  center: XY;
  bodyPts: XY[];
  eyesPts: XY[][];
  head: { translate: XY; rotation: number; scale: number; opacity: number } | null;
  parts: unknown[];
  zoom: number;
}
export type RenderModel = SphereModel | MorphModel;
export interface Renderer {
  svg: SVGSVGElement;
  render(model: RenderModel): void;
}
export function makeConfig(recipes: Recipes): Config;
export function createRuntime(
  config: Config,
  options?: { body?: string; zoomMul?: number; isGazeAlways?: boolean; isReducedMotion?: boolean },
): Runtime;
export function createStateMachine(
  config: Config,
  runtime: Runtime,
  initial: string,
  options?: { seed?: number; isCompact?: boolean; firstPhase?: number },
): Machine;
export function makeMorphGenerators(config: Config): unknown;
export function makeTrail(config: Config): unknown;
export function buildModel(
  frame: Frame,
  theme: { inkPaint: string; spotPaint: string; cutout: boolean },
  size: number,
  config: Config,
  generators: unknown,
  trail: unknown,
  warn: (body: string) => void,
  outline?: readonly XY[],
  seat?: "front" | "sphere",
): RenderModel;
export function createRenderer(doc: Document, uid: string, size: number, config: Config): Renderer;
