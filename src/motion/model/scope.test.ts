import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_RECIPES } from "./program";
import { scopeRecipes } from "./scope";

describe("recipe export scope", () => {
  it("keeps one state and its clips for a terminal state", () => {
    const scoped = scopeRecipes(DEFAULT_RECIPES, "idle");
    expect(Object.keys(scoped.recipes.states)).toEqual(["idle"]);
    expect(scoped.recipes.clips.map((clip) => clip.name).sort()).toEqual(
      ["Idle_A", "Idle_B", "Idle_D"].sort(),
    );
  });

  it("follows the next chain", () => {
    const scoped = scopeRecipes(DEFAULT_RECIPES, "waking");
    expect(Object.keys(scoped.recipes.states).sort()).toEqual(["waking", "idle"].sort());
  });

  it("drops unreferenced clips", () => {
    const scoped = scopeRecipes(DEFAULT_RECIPES, "celebrate");
    expect(scoped.recipes.clips).toHaveLength(1);
  });

  it("falls back to the first state when the id is unknown", () => {
    const scoped = scopeRecipes(DEFAULT_RECIPES, "missing");
    expect(scoped.recipes.states[scoped.stateId]).toBeDefined();
  });
});
