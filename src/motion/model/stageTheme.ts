import type { MascotDesign } from "@/mascot/design";
import { readStoredValue } from "@/lib/storage";

export type StageTheme = "light" | "dark";

const KEY = "grok-motion.stage-theme.v1";

export function readStageTheme(): StageTheme {
  return readStoredValue(KEY) === "light" ? "light" : "dark";
}

export function writeStageTheme(value: StageTheme): boolean {
  try {
    localStorage.setItem(KEY, value);
    return true;
  } catch {
    return false;
  }
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/\w\w/g)
    ?.map((pair) => Number.parseInt(pair, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  if (!channels || channels.length < 3) return 0;
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

const isNearBlack = (hex: string) => relativeLuminance(hex) <= 0.18;
const isNearWhite = (hex: string) => relativeLuminance(hex) >= 0.85;

/**
 * Make the body swap with the stage, like a light-dark(#000, #fff) convention:
 * a near-black body on a dark stage
 * becomes off-white (eyes go dark), and a near-white body on a light stage
 * becomes black. Hues the user picked stay untouched on both stages.
 */
export function stageDesignFor(design: MascotDesign, stage: StageTheme): MascotDesign {
  if (stage === "dark" && isNearBlack(design.fill)) {
    return { ...design, fill: "#fffefa", edge: isNearBlack(design.edge) ? "#fffefa" : design.edge };
  }
  if (stage === "light" && isNearWhite(design.fill)) {
    return { ...design, fill: "#000000", edge: isNearWhite(design.edge) ? "#000000" : design.edge };
  }
  return design;
}
