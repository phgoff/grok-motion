import { describe, expect, it } from "vite-plus/test";
import { GROK_SPHERE_DESIGN } from "@/mascot/defaults";
import { createMotionReactComponent } from "./export-react";
import { DEFAULT_RECIPES } from "./program";

function embeddedRecipes(source: string) {
  const match = source.match(/const recipes = (\{.*\});\nconst fill =/);
  if (!match?.[1]) throw new Error("Missing embedded recipes");
  return JSON.parse(match[1]) as typeof DEFAULT_RECIPES;
}

describe("React export source", () => {
  it("embeds only the requested state and its clips", () => {
    const source = createMotionReactComponent(GROK_SPHERE_DESIGN, DEFAULT_RECIPES, "celebrate");
    const recipes = embeddedRecipes(source);
    expect(Object.keys(recipes.states)).toEqual(["celebrate"]);
    expect(recipes.clips).toHaveLength(1);
    expect(source).toContain('state = "celebrate"');
  });
});
