import type { Recipes } from "./types";

export interface ScopedRecipes {
  recipes: Recipes;
  stateId: string;
}

/** Keeps a state, its `next` chain, and the clips those states reference. */
export function scopeRecipes(recipes: Recipes, stateId: string): ScopedRecipes {
  const fallback = Object.keys(recipes.states)[0] ?? "idle";
  const root = recipes.states[stateId] ? stateId : fallback;
  const stateIds = new Set<string>();
  const queue = [root];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (stateIds.has(id)) continue;
    const state = recipes.states[id];
    if (!state) continue;
    stateIds.add(id);
    if (state.next) queue.push(state.next);
  }

  const clipNames = new Set<string>();
  for (const id of stateIds) {
    for (const name of recipes.states[id]?.clips ?? []) clipNames.add(name);
  }

  return {
    stateId: root,
    recipes: {
      ...recipes,
      clips: recipes.clips.filter((clip) => clipNames.has(clip.name)),
      states: Object.fromEntries([...stateIds].map((id) => [id, recipes.states[id]!])),
    },
  };
}
