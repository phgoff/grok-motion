import reference from "@/motion/reference/grok-recipes.json";
import {
  TRACKS,
  type Clip,
  type Ease,
  type ExpressionKeyframe,
  type NumericKeyframe,
  type Recipes,
  type RecipeState,
} from "./types";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item: unknown) => typeof item === "string");

function parseEase(value: unknown): Ease | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const [x1, y1, x2, y2]: unknown[] = value;
  if (
    !finite(x1) ||
    !finite(y1) ||
    !finite(x2) ||
    !finite(y2) ||
    x1 < 0 ||
    x1 > 1 ||
    x2 < 0 ||
    x2 > 1
  )
    return null;
  return [x1, y1, x2, y2];
}

function parseClip(value: unknown): Clip | null {
  if (
    !record(value) ||
    typeof value.name !== "string" ||
    !finite(value.duration) ||
    value.duration <= 0 ||
    !record(value.tracks)
  )
    return null;
  const tracks: Clip["tracks"] = {};
  for (const spec of TRACKS) {
    const input = value.tracks[spec.id];
    if (input === undefined) continue;
    if (!Array.isArray(input)) return null;
    const keys: NumericKeyframe[] = [];
    for (const key of input) {
      if (
        !record(key) ||
        !finite(key.t) ||
        key.t < 0 ||
        key.t > value.duration ||
        !Array.isArray(key.v) ||
        key.v.length !== spec.axes.length ||
        !key.v.every(finite)
      )
        return null;
      const ease = parseEase(key.ease);
      if (!ease || (keys.at(-1)?.t ?? -1) > key.t) return null;
      keys.push({ t: key.t, v: key.v, ease });
    }
    tracks[spec.id] = keys;
  }
  const expression = value.tracks.expression;
  if (expression !== undefined) {
    if (!Array.isArray(expression)) return null;
    const keys: ExpressionKeyframe[] = [];
    for (const key of expression) {
      if (
        !record(key) ||
        !finite(key.t) ||
        key.t < 0 ||
        key.t > value.duration ||
        typeof key.v !== "string" ||
        !(
          key.v === "blink" ||
          reference.expressionNames.includes(key.v) ||
          key.v in reference.expressionAliases
        )
      )
        return null;
      if (key.cut !== undefined && typeof key.cut !== "boolean") return null;
      const ease = key.ease === undefined ? undefined : parseEase(key.ease);
      if (ease === null || (keys.at(-1)?.t ?? -1) > key.t) return null;
      keys.push({
        t: key.t,
        v: key.v,
        ...(ease ? { ease } : {}),
        ...(typeof key.cut === "boolean" ? { cut: key.cut } : {}),
      });
    }
    tracks.expression = keys;
  }
  const clip: Clip = { name: value.name, duration: value.duration, tracks };
  if (typeof value.body === "string") clip.body = value.body;
  if (finite(value.squashAnchor)) clip.squashAnchor = value.squashAnchor;
  if (record(value.workArea) && finite(value.workArea.start) && finite(value.workArea.end))
    clip.workArea = { start: value.workArea.start, end: value.workArea.end };
  if (record(value.inspect)) {
    clip.inspect = {};
    if (finite(value.inspect.bias)) clip.inspect.bias = value.inspect.bias;
    if (typeof value.inspect.follow === "boolean") clip.inspect.follow = value.inspect.follow;
  }
  return clip;
}

export function parseProgram(value: unknown): Recipes | null {
  if (
    !record(value) ||
    !Array.isArray(value.clips) ||
    !record(value.states) ||
    value.clips.length === 0
  )
    return null;
  const clips: Clip[] = [];
  for (const candidate of value.clips) {
    const clip = parseClip(candidate);
    if (!clip || clips.some((entry) => entry.name === clip.name)) return null;
    clips.push(clip);
  }
  const clipNames = new Set(clips.map((clip) => clip.name));
  const stateNames = Object.keys(reference.states);
  const states: Record<string, RecipeState> = {};
  const morphs = new Set(Object.keys(reference.constants.morph.stateMap));
  for (const id of stateNames) {
    const state = value.states[id];
    if (
      !record(state) ||
      !strings(state.clips) ||
      !state.clips.every((name) => clipNames.has(name))
    )
      return null;
    const parsed: RecipeState = { clips: state.clips };
    if (state.compactClips !== undefined) {
      if (!strings(state.compactClips) || !state.compactClips.every((name) => clipNames.has(name)))
        return null;
      parsed.compactClips = state.compactClips;
    }
    if (state.face !== undefined) {
      if (typeof state.face !== "string" || !reference.expressionNames.includes(state.face))
        return null;
      parsed.face = state.face;
    }
    if (state.morph !== undefined) {
      if (typeof state.morph !== "string" || !morphs.has(state.morph)) return null;
      parsed.morph = state.morph;
    }
    if (state.next !== undefined) {
      if (typeof state.next !== "string" || !stateNames.includes(state.next)) return null;
      parsed.next = state.next;
    }
    if (state.holdSeconds !== undefined) {
      if (!finite(state.holdSeconds) || state.holdSeconds <= 0 || parsed.next === undefined)
        return null;
      parsed.holdSeconds = state.holdSeconds;
    }
    states[id] = parsed;
  }
  return { ...reference, clips, states };
}

const initial = parseProgram(reference);
if (!initial) throw new Error("The bundled motion recipes are invalid");
export const DEFAULT_RECIPES: Recipes = initial;
export const stateLabel = (id: string) =>
  id.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
export const clipLabel = (name: string) => name.replaceAll("_", " ");
