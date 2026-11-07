import { useRef, useState } from "react";
import type { MascotDesign } from "@/mascot/design";
import { cn } from "@/lib/utils";
import { stateLabel } from "@/motion/model/program";
import type { Recipes } from "@/motion/model/types";
import { MascotRuntime, type MascotRuntimeHandle } from "./MascotRuntime";
import type { BodyShape } from "@/mascot/shapes";
import { stageDesignFor, type StageTheme } from "@/motion/model/stageTheme";

function StateCard({
  id,
  recipes,
  design,
  seed,
  stage,
  shape,
}: {
  id: string;
  recipes: Recipes;
  design: MascotDesign;
  seed: number;
  stage: StageTheme;
  shape?: BodyShape;
}) {
  const player = useRef<MascotRuntimeHandle>(null);
  const state = recipes.states[id];
  if (!state) return null;
  return (
    <button
      type="button"
      className={cn(
        "motion-state-card",
        stage === "light" ? "motion-state-card-light" : "motion-stage-dark",
      )}
      onClick={() => player.current?.poke()}
      aria-label={`Poke ${stateLabel(id)}`}
    >
      <MascotRuntime
        ref={player}
        design={design}
        recipes={recipes}
        seed={seed}
        initialState={id}
        follow={false}
        label={stateLabel(id)}
        shape={shape}
      />
      <span className="flex w-full items-baseline justify-between gap-2">
        <span className="state-name text-body font-medium text-foreground">{stateLabel(id)}</span>
        <span className="state-meta font-mono text-[9px] tabular-nums text-muted">
          {state.clips.length} {state.clips.length === 1 ? "clip" : "clips"}
        </span>
      </span>
    </button>
  );
}
export function StateGallery({
  design,
  recipes,
  seed = 1,
  stage,
  shape,
}: {
  design: MascotDesign;
  recipes: Recipes;
  seed?: number;
  stage: StageTheme;
  shape?: BodyShape;
}) {
  const [group, setGroup] = useState("all");
  const stageDesign = stageDesignFor(design, stage);
  const groups = [
    { label: "All states", id: "all", states: Object.keys(recipes.states) },
    ...recipes.lifecycleGroups.map((entry) => ({ ...entry, id: entry.label })),
  ];
  const visible = groups.find((entry) => entry.id === group)?.states ?? [];
  return (
    <section aria-labelledby="gallery-title" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="gallery-title" className="text-title font-semibold text-foreground">
            Every state, one silhouette.
          </h2>
          <p className="mt-1 text-caption leading-5 text-muted">
            The original expressions and motion recipes. Click one to poke it.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter states by group">
          {groups.map((entry) => (
            <button
              type="button"
              key={entry.id}
              aria-pressed={group === entry.id}
              onClick={() => setGroup(entry.id)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-[11px] transition-colors",
                group === entry.id
                  ? "border-line-2 bg-active text-foreground"
                  : "border-line text-muted hover:text-foreground",
              )}
            >
              {entry.label} <span className="ml-1 opacity-60">{entry.states.length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-6 gap-3 max-[1220px]:grid-cols-4 max-[860px]:grid-cols-3 max-[560px]:grid-cols-2">
        {visible.map((id, index) => (
          <StateCard
            key={id}
            id={id}
            recipes={recipes}
            design={stageDesign}
            seed={seed + index * 17}
            stage={stage}
            shape={shape}
          />
        ))}
      </div>
    </section>
  );
}
