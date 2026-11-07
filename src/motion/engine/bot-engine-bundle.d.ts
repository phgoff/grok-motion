import type React from "react";

export interface BotHandle {
  attach: (e: { host: HTMLElement; canvas: HTMLElement }) => () => void;
  update: (props: Partial<BotProps> & { body?: string }) => void;
  setState: (state: string) => void;
  setBody: (body: string) => void;
  setPlaying: (isPlaying: boolean) => void;
  setExpression: (expr: string, opt?: any) => void;
  releaseExpression: () => void;
  blink: () => void;
  look: (dir: string) => void;
  restart: () => void;
  poke: (arg?: any) => void;
  gaze: (pos: { x: number; y: number } | null) => void;
  seek: (time: number) => void;
  snapshot: () => {
    state: string;
    clip: string;
    face: string;
    time: number;
    duration: number;
    loops: number;
    morph: any;
  };
  getMachine: () => any;
}

export interface BotAppearance {
  ink: [number, number, number];
  spot: [number, number, number];
  cutout: boolean;
  inkPaint: string;
  spotPaint: string;
}

export interface BotProps {
  shape: string;
  color: string;
  state?: string;
  size?: number;
  fill?: any;
  eyeColor?: string;
  isPaused?: boolean;
  isFollowingPointer?: boolean;
  isEmphasized?: boolean;
  maxFrameRate?: number;
  seed?: number | string;
  clip?: any;
  /** Kept by the bundle's internal normalizer (`Dp`). */
  morph?: string | null;
  /** Kept by the bundle's internal normalizer (`Dp`). */
  appearance?: BotAppearance;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  ref?: React.Ref<BotHandle>;
}

export const Bot: React.FC<BotProps>;
/** Runtime default for `fill` — kept here because the bundle exports it. */
export const DEFAULT_FILL: number;
export function getFillMultiplier(fill: number): number;

export interface BotPoseProps {
  shape: string;
  color: string;
  size: number;
  pose?: string;
  face?: string;
}

export const BotPose: React.FC<BotPoseProps>;

export function normalizeBotShape(shape: string): string;
export function getBotFrame(shape: string, pose: string, face?: string): any;
export function renderBotSvgTree(
  frame: any,
  appearance: any,
  size: number,
  id: string,
  options?: any,
): any;
export function updateBotSvgDom(container: Element, tree: any): void;
export function createBotController(options: any): BotHandle;

export const BOT_COLORS: readonly { id: string; label: string; ink: string }[];
export const BOT_EXPRESSIONS: readonly string[];
export const BOT_STATE_GROUPS: readonly { label: string; states: string[] }[];
export const BOT_GESTURES: readonly string[];
