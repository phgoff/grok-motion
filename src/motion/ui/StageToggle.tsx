import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StageTheme } from "@/motion/model/stageTheme";

export interface StageToggleProps {
  stage: StageTheme;
  onToggle: () => void;
  tone?: "stage" | "panel";
  className?: string;
}

export function StageToggle({ stage, onToggle, tone = "stage", className }: StageToggleProps) {
  const isLight = stage === "light";
  const darkOnLight = tone === "stage" && isLight;
  const action = `Switch to ${isLight ? "dark" : "light"} stage`;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={action}
      title={action}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        darkOnLight
          ? "border-black/15 bg-black/5 text-black/70 hover:bg-black/10 hover:text-black focus-visible:outline-black/40"
          : "border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white focus-visible:outline-white/40",
        className,
      )}
    >
      <span aria-hidden="true" className="relative grid h-3.5 w-3.5 place-items-center">
        <Sun
          className={cn(
            "col-start-1 row-start-1 h-3.5 w-3.5 transition-opacity duration-150",
            isLight ? "opacity-100" : "opacity-0",
          )}
        />
        <Moon
          className={cn(
            "col-start-1 row-start-1 absolute h-3.5 w-3.5 transition-opacity duration-150",
            isLight ? "opacity-0" : "opacity-100",
          )}
        />
      </span>
    </button>
  );
}
