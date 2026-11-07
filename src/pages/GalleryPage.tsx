import { useRef, useState } from "react";
import { Bug, Dices, Download, Eye, Pause, Play } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import type { Route } from "@/app/router";
import { GROK_SPHERE_DESIGN } from "@/mascot/defaults";
import { useBodyShape } from "@/mascot/useBodyShape";
import { DEFAULT_RECIPES, clipLabel, stateLabel } from "@/motion/model/program";
import { readStoredMotion } from "@/motion/model/store";
import { stageDesignFor } from "@/motion/model/stageTheme";
import type { MotionSnapshot } from "@/motion/model/types";
import { MascotRuntime, type MascotRuntimeHandle } from "@/motion/ui/MascotRuntime";
import { ShapePicker } from "@/motion/ui/ShapePicker";
import { StateDropdowns } from "@/motion/ui/StateDropdowns";
import { StateGallery } from "@/motion/ui/StateGallery";

const CONTROL =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-[11px] text-muted transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-offset-2 max-[900px]:gap-1 max-[900px]:px-2 max-[900px]:py-1.5";

export function GalleryPage({ navigate }: { navigate: (next: Route) => void }) {
  const design = GROK_SPHERE_DESIGN;
  const [recipes] = useState(() => readStoredMotion()?.recipes ?? DEFAULT_RECIPES);
  const [shape, setShape] = useBodyShape();
  const [seed, setSeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [debug, setDebug] = useState(false);
  const [snapshot, setSnapshot] = useState<MotionSnapshot | null>(null);
  const runtime = useRef<MascotRuntimeHandle>(null);
  const stateId = snapshot?.state ?? "idle";
  const state = recipes.states[stateId];
  const transition = (id: string) => runtime.current?.transitionTo(id);

  return (
    <>
      <TopBar route="gallery" navigate={navigate} />
      <main className="motion-page page-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[1280px] px-[clamp(16px,3vw,40px)] pb-16 pt-[104px] max-[1080px]:pt-[92px] max-[640px]:pt-[80px]">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4 max-[900px]:mb-4">
            <div>
              <h1 className="text-[clamp(28px,4vw,42px)] font-semibold leading-tight tracking-[-0.025em] text-foreground">
                Grok Motion.
              </h1>
              <p className="mt-2 text-caption leading-5 text-muted">
                The Grok mascot, rendered live in your browser.
              </p>
            </div>
          </header>
          {/* Preview takes three quarters, settings one quarter; the control
              buttons live under the preview, not inside the panel. */}
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(260px,1fr)] items-stretch gap-4 max-[900px]:grid-cols-1">
            <div className="flex min-h-0 min-w-0 flex-col gap-3">
              <section
                aria-label={`${design.name} motion preview`}
                className="relative grid min-h-[300px] flex-1 place-items-center overflow-hidden rounded-xl border border-line motion-stage-dark"
              >
                <button
                  type="button"
                  aria-label="Poke mascot"
                  onClick={() => runtime.current?.poke()}
                  className="w-full max-w-[380px] max-[900px]:max-w-[260px] cursor-pointer transition-transform active:scale-[0.98]"
                >
                  <MascotRuntime
                    ref={runtime}
                    design={stageDesignFor(design, "dark")}
                    recipes={recipes}
                    seed={seed}
                    paused={paused}
                    follow={false}
                    debug={debug}
                    initialState="idle"
                    label={`${design.name} animated with the Grok motion engine`}
                    onSnapshot={setSnapshot}
                    shape={shape}
                  />
                </button>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 left-4 text-[12px] font-medium text-white/55"
                >
                  {stateLabel(stateId)}
                </span>
              </section>
              <div className="flex flex-wrap items-center gap-2 max-[900px]:gap-1.5">
                <button
                  type="button"
                  className={CONTROL}
                  aria-label="Blink"
                  onClick={() => runtime.current?.blink()}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={CONTROL}
                  aria-label={paused ? "Resume motion" : "Pause motion"}
                  aria-pressed={paused}
                  onClick={() => setPaused((value) => !value)}
                >
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  className={CONTROL}
                  aria-label="Random seed"
                  title="Random seed"
                  onClick={() => setSeed(Math.floor(Math.random() * 9999) + 1)}
                >
                  <Dices className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={CONTROL}
                  aria-label="Toggle debug"
                  aria-pressed={debug}
                  onClick={() => setDebug((value) => !value)}
                >
                  <Bug className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={CONTROL}
                  aria-label="Export current state as a React component"
                  title={`Download the ${stateLabel(stateId)} state as a React component`}
                  onClick={async () => {
                    const { downloadMotionReactComponent } =
                      await import("@/motion/model/export-react");
                    downloadMotionReactComponent(design, recipes, stateId);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <aside
              aria-label="Grok settings"
              className="flex min-h-0 flex-col rounded-xl border border-line bg-panel/45"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                <ShapePicker shape={shape} onChange={setShape} />
                <StateDropdowns
                  groups={recipes.lifecycleGroups}
                  active={stateId}
                  onSelect={transition}
                />
                <section
                  aria-label="Now playing"
                  className="rounded-lg border border-line bg-background/40 p-3"
                >
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    Now playing
                  </p>
                  <h2 className="text-title font-semibold text-foreground">
                    {stateLabel(stateId)}
                  </h2>
                  <p className="mt-1.5 font-mono text-[11px] text-foreground/75" aria-live="off">
                    {clipLabel(snapshot?.clip ?? "Idle_B")}
                  </p>
                  <dl className="mt-4 grid gap-2.5 text-[11px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Eyes</dt>
                      <dd className="text-foreground">{snapshot?.face ?? "neutral"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Decoration</dt>
                      <dd className="text-foreground">{state?.morph ?? "None"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Next</dt>
                      <dd className="text-right text-foreground">
                        {state?.next
                          ? `${stateLabel(state.next)}${state.holdSeconds ? ` after ${state.holdSeconds}s` : " after clips"}`
                          : "None"}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 border-t border-line pt-3 text-[10px] leading-5 text-muted">
                    {state?.clips.map(clipLabel).join(" · ")}
                  </p>
                </section>
              </div>
            </aside>
          </div>

          <StateGallery design={design} recipes={recipes} seed={seed} stage="dark" shape={shape} />
        </div>
      </main>
    </>
  );
}
