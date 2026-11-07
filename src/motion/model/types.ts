import type reference from "@/motion/reference/grok-recipes.json";

export interface Point {
  x: number;
  y: number;
}
export type XY = readonly [number, number];
export type Ease = readonly [number, number, number, number];
export type NumericTrack = "position" | "rotation" | "squash" | "scale" | "lids";
export interface NumericKeyframe {
  t: number;
  v: number[];
  ease: Ease;
}
export interface ExpressionKeyframe {
  t: number;
  v: string;
  ease?: Ease;
  cut?: boolean;
}
export interface Clip {
  name: string;
  duration: number;
  body?: string;
  squashAnchor?: number;
  workArea?: { start: number; end: number };
  inspect?: { bias?: number; follow?: boolean };
  tracks: Partial<Record<NumericTrack, NumericKeyframe[]>> & { expression?: ExpressionKeyframe[] };
}
export interface RecipeState {
  clips: string[];
  compactClips?: string[];
  face?: string;
  morph?: string;
  next?: string;
  holdSeconds?: number;
}
export type Recipes = Omit<typeof reference, "clips" | "states"> & {
  clips: Clip[];
  states: Record<string, RecipeState>;
};
export interface MotionSnapshot {
  state: string;
  clip: string | null;
  face: string;
  time: number;
  duration: number;
  loops: number;
  morph: { kind: string | null; amount: number; spin: number; isSettled: boolean } | null;
}

export const TRACKS: readonly {
  id: NumericTrack;
  label: string;
  axes: readonly string[];
  fallback: readonly number[];
}[] = [
  { id: "position", label: "Position", axes: ["X", "Y"], fallback: [0, 0] },
  { id: "rotation", label: "Rotation", axes: ["Pitch", "Yaw", "Roll"], fallback: [0, 0, 0] },
  { id: "squash", label: "Squash", axes: ["X", "Y"], fallback: [1, 1] },
  { id: "scale", label: "Scale", axes: ["Scale"], fallback: [0.6] },
  { id: "lids", label: "Lids", axes: ["Closed"], fallback: [0] },
];
