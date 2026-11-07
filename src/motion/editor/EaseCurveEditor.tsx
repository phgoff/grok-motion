import { memo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cubicBezierEase } from "../engine/clipDriver";
import type { Ease } from "@/motion/model/types";
import { RadioGroup, RadioGroupSegment } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface EaseCurveEditorProps {
  ease: Ease;
  onChange: (ease: Ease) => void;
  className?: string;
}

const Y_BASE_MIN = -0.45;
const Y_BASE_MAX = 1.85;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;
const toX = (value: number) => value * 100;

const CUBIC_GRID = [0, 0.25, 0.5, 0.75, 1] as const;

export const EASE_PRESETS: readonly { label: string; ease: Ease }[] = [
  { label: "Default", ease: [0.65, 0, 0.35, 1] },
  { label: "Snappy", ease: [0.23, 1, 0.32, 1] },
  { label: "Ease Out", ease: [0, 0, 0.58, 1] },
  { label: "Ease In", ease: [0.42, 0, 1, 1] },
  { label: "Bounce", ease: [0.34, 1.56, 0.64, 1] },
  { label: "Linear", ease: [0, 0, 1, 1] },
];

export const EaseCurveEditor = memo(function EaseCurveEditor({
  ease,
  onChange,
  className,
}: EaseCurveEditorProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; which: 1 | 2 } | null>(null);
  const [x1, y1, x2, y2] = ease;

  const yMin = Math.min(Y_BASE_MIN, y1 - 0.2, y2 - 0.2);
  const yMax = Math.max(Y_BASE_MAX, y1 + 0.2, y2 + 0.2);
  const ySpan = yMax - yMin;
  const toTop = (value: number) => ((yMax - value) / ySpan) * 100;

  const handles = [
    { which: 1 as const, x: x1, y: y1 },
    { which: 2 as const, x: x2, y: y2 },
  ];
  const overshoot = y1 < 0 || y1 > 1 || y2 < 0 || y2 > 1;
  const sample = cubicBezierEase(0.5, ease);
  const curve = `M ${toX(0)} ${toTop(0)} C ${toX(x1)} ${toTop(y1)} ${toX(x2)} ${toTop(
    y2,
  )} ${toX(1)} ${toTop(1)}`;

  const currentPreset = EASE_PRESETS.find((preset) =>
    preset.ease.every((val, idx) => Math.abs(val - ease[idx]) < 0.03),
  );

  const apply = (which: 1 | 2, x: number, y: number) => {
    onChange(which === 1 ? [x, y, x2, y2] : [x1, y1, x, y]);
  };

  const beginDrag = (which: 1 | 2, event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, which };
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const plot = plotRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !plot) return;
    const rect = plot.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = round(clamp((event.clientX - rect.left) / rect.width, 0, 1));
    const y = round(clamp(yMax - ((event.clientY - rect.top) / rect.height) * ySpan, yMin, yMax));
    apply(drag.which, x, y);
  };

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const nudge = (which: 1 | 2, event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const handle = which === 1 ? { x: x1, y: y1 } : { x: x2, y: y2 };
    let { x, y } = handle;
    switch (event.key) {
      case "ArrowLeft":
        x -= step;
        break;
      case "ArrowRight":
        x += step;
        break;
      case "ArrowUp":
        y += step;
        break;
      case "ArrowDown":
        y -= step;
        break;
      default:
        return;
    }
    event.preventDefault();
    apply(which, round(clamp(x, 0, 1)), round(clamp(y, yMin, yMax)));
  };

  return (
    <div className={cn("flex flex-1 flex-col gap-2.5 w-full min-h-0", className)}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-caption font-semibold text-foreground shrink-0">Ease Curve</span>
        <code
          className="truncate font-mono text-[11px] font-medium text-muted text-right"
          title={`cubic-bezier(${ease.map((v) => v.toFixed(2)).join(", ")})`}
        >
          cubic-bezier({ease.map((v) => v.toFixed(2)).join(", ")})
        </code>
      </div>

      <RadioGroup
        value={currentPreset?.label ?? ""}
        onValueChange={(val) => {
          const found = EASE_PRESETS.find((p) => p.label === val);
          if (found) onChange(found.ease);
        }}
        className="flex flex-wrap gap-1"
        aria-label="Ease curve presets"
      >
        {EASE_PRESETS.map((preset) => {
          const isSelected = preset.label === currentPreset?.label;
          return (
            <RadioGroupSegment
              key={preset.label}
              value={preset.label}
              active={isSelected}
              onClick={() => onChange(preset.ease)}
            >
              {preset.label}
            </RadioGroupSegment>
          );
        })}
      </RadioGroup>

      <div className="relative w-full flex-1 min-h-[180px]">
        <div
          ref={plotRef}
          className="relative h-full min-h-[180px] w-full touch-none rounded-md border border-line bg-background/50 select-none overflow-hidden"
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {CUBIC_GRID.map((fraction) => (
              <line
                key={fraction}
                x1={toX(fraction)}
                y1={0}
                x2={toX(fraction)}
                y2={100}
                stroke="var(--line)"
                strokeWidth={0.5}
              />
            ))}

            <line
              x1={0}
              y1={toTop(1)}
              x2={100}
              y2={toTop(1)}
              stroke="var(--line-2)"
              strokeWidth={0.6}
              strokeDasharray="2 2"
            />
            <line
              x1={0}
              y1={toTop(0)}
              x2={100}
              y2={toTop(0)}
              stroke="var(--line-2)"
              strokeWidth={0.6}
              strokeDasharray="2 2"
            />

            <line
              x1={toX(0)}
              y1={toTop(0)}
              x2={toX(x1)}
              y2={toTop(y1)}
              stroke="var(--line-2)"
              strokeWidth={0.7}
              strokeDasharray="2 2"
            />

            <line
              x1={toX(1)}
              y1={toTop(1)}
              x2={toX(x2)}
              y2={toTop(y2)}
              stroke="var(--line-2)"
              strokeWidth={0.7}
              strokeDasharray="2 2"
            />

            <path d={curve} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />
          </svg>

          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
            style={{ left: "50%", top: `${toTop(sample)}%` }}
          />

          {handles.map((handle) => (
            <button
              key={handle.which}
              type="button"
              aria-label={`Ease control point ${handle.which}, x ${handle.x.toFixed(
                2,
              )}, y ${handle.y.toFixed(2)}. Arrow keys adjust, shift for larger steps.`}
              className={cn(
                "absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 bg-panel-raised shadow-[0_1px_4px_rgb(0_0_0/0.5)] transition-[border-color,background-color] duration-75 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                handle.which === 1
                  ? "border-accent hover:bg-accent/20"
                  : "border-foreground/70 hover:bg-foreground/15",
              )}
              style={{ left: `${handle.x * 100}%`, top: `${toTop(handle.y)}%` }}
              onPointerDown={(event) => beginDrag(handle.which, event)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={() => {
                dragRef.current = null;
              }}
              onKeyDown={(event) => nudge(handle.which, event)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-mono text-[11px] text-muted select-none">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span>
            P1: ({x1.toFixed(2)}, {y1.toFixed(2)})
          </span>
          <span className="text-muted/40">·</span>
          <span>
            P2: ({x2.toFixed(2)}, {y2.toFixed(2)})
          </span>
        </div>
        <div className="whitespace-nowrap tabular-nums">
          {overshoot ? (
            <span className="font-semibold text-accent">Overshoot</span>
          ) : (
            <span>sample: {sample.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
});
