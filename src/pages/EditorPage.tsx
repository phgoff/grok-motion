import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import type { Route } from "@/app/router";
import { GROK_SPHERE_DESIGN } from "@/mascot/defaults";
import { useBodyShape } from "@/mascot/useBodyShape";
import type { MascotDesign } from "@/mascot/design";
import { EditorWorkspace } from "@/motion/editor/EditorWorkspace";
import { DEFAULT_RECIPES } from "@/motion/model/program";
import { clearStoredMotion, readStoredMotion, writeStoredMotion } from "@/motion/model/store";
import { readStageTheme, writeStageTheme, type StageTheme } from "@/motion/model/stageTheme";

export function EditorPage({ navigate }: { navigate: (next: Route) => void }) {
  const [design, setDesign] = useState<MascotDesign>(GROK_SPHERE_DESIGN);
  const [saved, setSaved] = useState(() => readStoredMotion()?.recipes ?? DEFAULT_RECIPES);
  const [recipes, setRecipes] = useState(saved);
  const [status, setStatus] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const [stage, setStage] = useState<StageTheme>(readStageTheme);
  const [shape, setShape] = useBodyShape();

  useEffect(
    () => () => {
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    },
    [],
  );

  const flashStatus = (message: string) => {
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    setStatus(message);
    statusTimerRef.current = window.setTimeout(() => setStatus(null), 3500);
  };

  const toggleStage = () =>
    setStage((current) => {
      const next = current === "light" ? "dark" : "light";
      writeStageTheme(next);
      return next;
    });

  const save = () => {
    if (!writeStoredMotion(recipes)) {
      flashStatus("Browser storage blocked");
      return;
    }
    setSaved(recipes);
    flashStatus("Saved recipes");
  };

  const reset = () => {
    const cleared = clearStoredMotion();
    setRecipes(DEFAULT_RECIPES);
    setSaved(DEFAULT_RECIPES);
    flashStatus(cleared ? "Reset to original recipes" : "Original recipes restored");
  };

  return (
    <>
      <TopBar route="editor" navigate={navigate} />
      <div className="flex h-screen flex-col overflow-hidden pt-[72px] bg-background">
        <EditorWorkspace
          design={design}
          recipes={recipes}
          onChange={setRecipes}
          onSave={save}
          onReset={reset}
          onDiscard={() => {
            setRecipes(saved);
            flashStatus("Discarded unsaved changes");
          }}
          onDesignChange={setDesign}
          status={status}
          seed={1}
          stage={stage}
          shape={shape}
          onShapeChange={setShape}
          onStageToggle={toggleStage}
        />
      </div>
    </>
  );
}
