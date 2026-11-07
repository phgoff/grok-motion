import type { Point } from "@/motion/model/types";

const TOKEN = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

/**
 * Flattens an SVG path into one point ring. Supports the commands the mascot
 * registry uses (M/L/H/V/C/S/Q/T/Z) in absolute and relative form. Arcs are
 * rejected rather than silently approximated, so a future raster or arc path
 * fails loudly instead of producing a wrong body.
 */
export function flattenSvgPath(d: string, curveSteps = 18): Point[] {
  const tokens = d.match(TOKEN);
  if (!tokens) return [];
  const steps = Math.max(1, Math.floor(curveSteps));

  const rings: Point[][] = [];
  let ring: Point[] = [];
  let cursor = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let command = "";
  let previousCubic: Point | null = null;
  let previousQuad: Point | null = null;

  const read = (): number => {
    const token = tokens[cursor++];
    if (token === undefined) throw new Error("Unexpected end of SVG path");
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error(`Bad SVG path number "${token}"`);
    return value;
  };

  const absolute = (relative: boolean, px: number, py: number): Point =>
    relative ? { x: x + px, y: y + py } : { x: px, y: py };

  const addPoint = (point: Point) => {
    ring.push(point);
    x = point.x;
    y = point.y;
  };

  const addLine = (point: Point) => {
    addPoint(point);
  };

  const addCubic = (p0: Point, p1: Point, p2: Point, p3: Point) => {
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const u = 1 - t;
      ring.push({
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      });
    }
    x = p3.x;
    y = p3.y;
  };

  const addQuad = (p0: Point, control: Point, p2: Point) => {
    addCubic(
      p0,
      { x: p0.x + (2 / 3) * (control.x - p0.x), y: p0.y + (2 / 3) * (control.y - p0.y) },
      { x: p2.x + (2 / 3) * (control.x - p2.x), y: p2.y + (2 / 3) * (control.y - p2.y) },
      p2,
    );
  };

  const finishRing = () => {
    if (ring.length >= 3) {
      const first = ring[0]!;
      const last = ring[ring.length - 1]!;
      if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-9) ring.pop();
      if (ring.length >= 3) rings.push(ring);
    }
    ring = [];
    previousCubic = null;
    previousQuad = null;
  };

  while (cursor < tokens.length) {
    const token = tokens[cursor]!;
    if (/[a-zA-Z]/.test(token)) {
      cursor++;
      command = token;
    } else if (command === "") {
      throw new Error(`SVG path starts with a number: "${token}"`);
    }

    const upper = command.toUpperCase();
    const relative = command !== upper;

    switch (upper) {
      case "M": {
        finishRing();
        const point = absolute(relative, read(), read());
        startX = point.x;
        startY = point.y;
        addPoint(point);
        command = relative ? "l" : "L";
        break;
      }
      case "L": {
        addLine(absolute(relative, read(), read()));
        previousCubic = null;
        previousQuad = null;
        break;
      }
      case "H": {
        const nextX = relative ? x + read() : read();
        addLine({ x: nextX, y });
        previousCubic = null;
        previousQuad = null;
        break;
      }
      case "V": {
        const nextY = relative ? y + read() : read();
        addLine({ x, y: nextY });
        previousCubic = null;
        previousQuad = null;
        break;
      }
      case "C": {
        const p0 = { x, y };
        const p1 = absolute(relative, read(), read());
        const p2 = absolute(relative, read(), read());
        const p3 = absolute(relative, read(), read());
        addCubic(p0, p1, p2, p3);
        previousCubic = p2;
        previousQuad = null;
        break;
      }
      case "S": {
        const p0 = { x, y };
        const p1: Point = previousCubic
          ? { x: 2 * x - previousCubic.x, y: 2 * y - previousCubic.y }
          : { x, y };
        const p2 = absolute(relative, read(), read());
        const p3 = absolute(relative, read(), read());
        addCubic(p0, p1, p2, p3);
        previousCubic = p2;
        previousQuad = null;
        break;
      }
      case "Q": {
        const p0 = { x, y };
        const control = absolute(relative, read(), read());
        const p2 = absolute(relative, read(), read());
        addQuad(p0, control, p2);
        previousQuad = control;
        previousCubic = null;
        break;
      }
      case "T": {
        const p0 = { x, y };
        const control: Point = previousQuad
          ? { x: 2 * x - previousQuad.x, y: 2 * y - previousQuad.y }
          : { x, y };
        const p2 = absolute(relative, read(), read());
        addQuad(p0, control, p2);
        previousQuad = control;
        previousCubic = null;
        break;
      }
      case "Z": {
        finishRing();
        x = startX;
        y = startY;
        command = "";
        break;
      }
      case "A": {
        throw new Error(
          "SVG arc commands are not supported by the motion adapter; provide a path of lines and curves",
        );
      }
      default:
        throw new Error(`Unsupported SVG path command "${command}"`);
    }
  }

  finishRing();
  if (rings.length === 0) return [];
  return rings.reduce((longest, candidate) =>
    candidate.length > longest.length ? candidate : longest,
  );
}
