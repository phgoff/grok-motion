import { readStoredValue } from "@/lib/storage";
import type { Recipes } from "./types";
import { parseProgram } from "./program";

export const RECIPES_KEY = "grok-motion.recipes.v1";
export interface MotionDoc {
  version: 2;
  shape: "grok";
  recipes: Recipes;
  updatedAt: number;
}

export function parseMotionDoc(raw: string): MotionDoc | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 2 ||
    !("shape" in value) ||
    value.shape !== "grok" ||
    !("recipes" in value)
  )
    return null;
  const recipes = parseProgram(value.recipes);
  if (!recipes) return null;
  return {
    version: 2,
    shape: "grok",
    recipes,
    updatedAt:
      "updatedAt" in value &&
      typeof value.updatedAt === "number" &&
      Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : 0,
  };
}
export function readStoredMotion(): MotionDoc | null {
  const raw = readStoredValue(RECIPES_KEY);
  return raw ? parseMotionDoc(raw) : null;
}
export function writeStoredMotion(recipes: Recipes): boolean {
  try {
    localStorage.setItem(
      RECIPES_KEY,
      JSON.stringify({
        version: 2,
        shape: "grok",
        recipes: { clips: recipes.clips, states: recipes.states },
        updatedAt: Date.now(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function clearStoredMotion(): boolean {
  try {
    localStorage.removeItem(RECIPES_KEY);
    return true;
  } catch {
    return false;
  }
}
