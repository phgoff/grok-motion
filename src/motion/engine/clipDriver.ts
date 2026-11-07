import type { Ease } from "@/motion/model/types";

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const channel = (t: number, p1: number, p2: number) =>
  3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;

const slope = (t: number, p1: number, p2: number) =>
  3 * (1 - t) * (1 - t) * p1 + 6 * (1 - t) * t * (p2 - p1) + 3 * t * t * (1 - p2);

/**
 * Solves a CSS cubic-bezier timing function at `progress` and returns its
 * output. The output is not clamped: control points with y outside [0, 1] are
 * the overshoot the engine relies on for snappy motion.
 */
export function cubicBezierEase(progress: number, ease: Ease): number {
  const x = clampUnit(progress);
  if (x === 0) return 0;
  if (x === 1) return 1;

  const [x1, y1, x2, y2] = ease;
  if (x1 === y1 && x2 === y2) return x;

  let t = x;
  for (let index = 0; index < 8; index++) {
    const error = channel(t, x1, x2) - x;
    if (Math.abs(error) < 1e-6) return channel(t, y1, y2);
    const derivative = slope(t, x1, x2);
    if (Math.abs(derivative) < 1e-6) break;
    t = clampUnit(t - error / derivative);
  }

  let low = 0;
  let high = 1;
  t = x;
  for (let index = 0; index < 24; index++) {
    const value = channel(t, x1, x2);
    if (Math.abs(value - x) < 1e-7) break;
    if (value < x) low = t;
    else high = t;
    t = (low + high) / 2;
  }
  return channel(t, y1, y2);
}
