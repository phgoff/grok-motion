import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/utils";

export interface ScrubberInputProps {
  label?: ReactNode;
  value: number;
  defaultValue?: number;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  suffix?: string;
  hideReset?: boolean;
  ariaLabel?: string;
  onChange: (value: number) => void;
  className?: string;
}

export function formatScrubberNumber(val: number, decimals: number = 2): string {
  if (!Number.isFinite(val)) return "0";
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(val * factor) / factor;
  return rounded.toString();
}

export function ScrubberInput({
  label,
  value,
  defaultValue = 0,
  step = 1,
  min,
  max,
  decimals = 2,
  suffix,
  hideReset = false,
  ariaLabel,
  onChange,
  className,
}: ScrubberInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    startX: number;
    startVal: number;
    pointerId: number;
    hasMoved: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(formatScrubberNumber(value, decimals));
    }
  }, [value, decimals, isEditing]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (isEditing) return;
    if (e.button !== 0) return;

    if ((e.target as HTMLElement).closest("button[data-reset]")) {
      return;
    }

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      startX: e.clientX,
      startVal: value,
      pointerId: e.pointerId,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - drag.startX;
    if (!drag.hasMoved && Math.abs(deltaX) > 2) {
      drag.hasMoved = true;
    }

    if (drag.hasMoved) {
      const multiplier = e.shiftKey ? 5 : e.altKey ? 0.1 : 1;
      const sensitivity = step * multiplier;
      let nextVal = drag.startVal + deltaX * sensitivity;

      if (min !== undefined) nextVal = Math.max(min, nextVal);
      if (max !== undefined) nextVal = Math.min(max, nextVal);

      const factor = Math.pow(10, decimals);
      nextVal = Math.round(nextVal * factor) / factor;

      onChange(nextVal);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const wasJustClick = !drag.hasMoved;
    dragRef.current = null;
    setIsDragging(false);

    if (wasJustClick) {
      setIsEditing(true);
      setEditValue(formatScrubberNumber(value, decimals));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  };

  const commitEdit = () => {
    const parsed = Number(editValue);
    if (Number.isFinite(parsed)) {
      let nextVal = parsed;
      if (min !== undefined) nextVal = Math.max(min, nextVal);
      if (max !== undefined) nextVal = Math.min(max, nextVal);
      const factor = Math.pow(10, decimals);
      nextVal = Math.round(nextVal * factor) / factor;
      onChange(nextVal);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      setEditValue(formatScrubberNumber(value, decimals));
    } else if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      commitEdit();
      inputRef.current?.blur();
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(defaultValue);
    if (isEditing) {
      setIsEditing(false);
    }
  };

  const isResetActive = Math.abs(value - defaultValue) > 0.001;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "group relative flex h-8 min-w-0 items-center justify-between rounded-md border border-line/70 bg-panel/90 px-2.5 py-1 shadow-xs transition-colors",
        isDragging
          ? "cursor-ew-resize border-line-2 bg-active select-none"
          : "cursor-ew-resize hover:border-line-2 hover:bg-hover",
        isEditing && "cursor-text border-accent ring-1 ring-accent",
        className,
      )}
      title="Click to edit, or drag left/right to scrub. Shift for fast, Alt for fine."
    >
      {label !== undefined && (
        <span className="font-mono text-[12px] font-semibold text-muted/70 select-none mr-1.5 shrink-0 flex items-center">
          {label}
        </span>
      )}

      <div className="flex-1 min-w-0 flex items-center">
        {isEditing ? (
          <input
            ref={inputRef}
            aria-label={ariaLabel || (typeof label === "string" ? `${label} value` : "value")}
            type="text"
            className="w-full bg-transparent font-mono text-[12px] font-medium text-foreground outline-none text-left"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="flex items-baseline w-full truncate font-mono text-[12px] font-medium text-foreground select-none text-left">
            <span>{formatScrubberNumber(value, decimals)}</span>
            {suffix && (
              <span className="ml-0.5 text-[10px] font-normal text-muted/60">{suffix}</span>
            )}
          </span>
        )}
      </div>

      {!hideReset && isResetActive && (
        <button
          type="button"
          data-reset
          aria-label={
            typeof label === "string"
              ? `Reset ${label} to ${defaultValue}`
              : `Reset to ${defaultValue}`
          }
          onClick={handleReset}
          className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted/50 transition-all hover:text-foreground active:scale-90"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M9 14L4 9l5-5" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
          </svg>
        </button>
      )}
    </div>
  );
}
