import { readStoredValue } from "@/lib/storage";
import { BODY_SHAPES, type BodyShape } from "./shapes";

export { BODY_SHAPES, BODY_SHAPE_LABELS, BODY_SHAPE_SVG_PATHS, type BodyShape } from "./shapes";

const SHAPE_KEY = "grok-motion.body-shape.v1";

export function readBodyShape(): BodyShape {
  const saved = readStoredValue(SHAPE_KEY) as BodyShape | null;
  return saved && (BODY_SHAPES as readonly string[]).includes(saved) ? saved : "sphere";
}

export function writeBodyShape(shape: BodyShape): boolean {
  try {
    localStorage.setItem(SHAPE_KEY, shape);
    return true;
  } catch {
    return false;
  }
}
