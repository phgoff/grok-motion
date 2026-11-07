import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BODY_SHAPES,
  BODY_SHAPE_LABELS,
  BODY_SHAPE_SVG_PATHS,
  type BodyShape,
} from "@/mascot/geometry";

export interface ShapePickerProps {
  shape: BodyShape;
  onChange: (shape: BodyShape) => void;
  className?: string;
}

export function ShapeIcon({ shape, className }: { shape: BodyShape; className?: string }) {
  return (
    <svg
      viewBox="-1.25 -1.25 2.5 2.5"
      className={cn("h-4 w-4 shrink-0 overflow-visible", className)}
      aria-hidden="true"
    >
      {shape === "sphere" ? (
        <circle cx="0" cy="0" r="0.95" fill="none" stroke="currentColor" strokeWidth="0.2" />
      ) : (
        <path
          d={BODY_SHAPE_SVG_PATHS[shape]}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function ShapePicker({ shape, onChange, className }: ShapePickerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [hoveredShape, setHoveredShape] = useState<BodyShape | null>(null);

  const displayedLabel = hoveredShape ? BODY_SHAPE_LABELS[hoveredShape] : BODY_SHAPE_LABELS[shape];

  return (
    <section aria-label="Body shape" className={cn("flex flex-col gap-2", className)}>
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group flex items-center gap-1.5 text-left transition-colors hover:text-foreground"
          aria-expanded={isOpen}
          aria-controls="body-shape-grid"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted group-hover:text-foreground">
            Shape
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted transition-transform duration-200 group-hover:text-foreground",
              isOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground/80">
          <ShapeIcon shape={hoveredShape ?? shape} className="h-3.5 w-3.5 text-foreground" />
          <span>{displayedLabel}</span>
        </div>
      </header>

      {isOpen && (
        <div
          id="body-shape-grid"
          role="group"
          aria-label="Body shapes"
          className="grid grid-cols-6 gap-1 rounded-lg border border-line bg-background/30 p-1.5"
        >
          {BODY_SHAPES.map((s) => {
            const isSelected = s === shape;
            const label = BODY_SHAPE_LABELS[s];
            return (
              <button
                key={s}
                type="button"
                aria-pressed={isSelected}
                aria-label={label}
                title={label}
                onClick={() => onChange(s)}
                onMouseEnter={() => setHoveredShape(s)}
                onMouseLeave={() => setHoveredShape(null)}
                className={cn(
                  "relative flex h-8 w-full items-center justify-center rounded-md border text-muted transition-colors",
                  isSelected
                    ? "border-line-2 bg-active text-foreground shadow-xs"
                    : "border-transparent hover:border-line hover:bg-hover hover:text-foreground",
                )}
              >
                <ShapeIcon shape={s} className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
