import { useRef } from "react";
import { MascotRuntime, type MascotRuntimeHandle } from "@/motion/ui/MascotRuntime";
import { GROK_SPHERE_DESIGN } from "@/mascot/defaults";
import { DEFAULT_RECIPES } from "@/motion/model/program";
import { stageDesignFor } from "@/motion/model/stageTheme";
import { cn } from "@/lib/utils";

const SPHERE_DARK = stageDesignFor(GROK_SPHERE_DESIGN, "dark");

export function BrandMark({
  playing = true,
  sleepWhenIdle = false,
  className,
}: {
  playing?: boolean;
  sleepWhenIdle?: boolean;
  className?: string;
}) {
  const runtime = useRef<MascotRuntimeHandle>(null);

  return (
    <div
      className={cn(
        "relative w-full h-full aspect-square overflow-visible flex items-center justify-center pointer-events-none",
        className,
      )}
    >
      <MascotRuntime
        ref={runtime}
        design={SPHERE_DARK}
        recipes={DEFAULT_RECIPES}
        initialState="reading"
        follow={false}
        paused={!playing && sleepWhenIdle}
        className="w-full h-full"
        label="Grok reading sphere"
      />
    </div>
  );
}
