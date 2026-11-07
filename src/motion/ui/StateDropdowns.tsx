import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import { useFluidHover, useRegisterFluidHoverItem } from "@/hooks/use-fluid-hover";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import { Elevated } from "@/lib/elevated";
import { shapeMap } from "@/lib/shape-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  popupMotionClass,
  popupScrollAreaClass,
  popupViewportClass,
  isDisabledRow,
} from "@/lib/popup";
import { stateLabel } from "@/motion/model/program";

export interface StateDropdownsProps {
  groups: readonly { label: string; states: readonly string[] }[];
  active: string;
  onSelect: (id: string) => void;
}

const popupShape = shapeMap.rounded;

function StateDropdownItem({
  id,
  index,
  isChecked,
  isActive,
  registerItem,
  onSelect,
}: {
  id: string;
  index: number;
  isChecked: boolean;
  isActive: boolean;
  registerItem: (index: number, element: HTMLElement | null) => void;
  onSelect: (id: string, index: number) => void;
}) {
  const itemRef = useRef<HTMLButtonElement>(null);
  useRegisterFluidHoverItem(registerItem, index, itemRef);

  return (
    <button
      ref={itemRef}
      type="button"
      role="option"
      aria-selected={isChecked}
      data-fluid-hover-index={index}
      data-value={id}
      onClick={() => onSelect(id, index)}
      className={cn(
        "relative z-10 flex h-8.5 shrink-0 items-center justify-between gap-2 px-2.5 rounded-lg text-[13px] leading-normal cursor-pointer outline-none select-none transition-[color] duration-80",
        isActive || isChecked ? "text-foreground font-medium" : "text-muted-foreground",
      )}
    >
      <span className="flex-1 text-left truncate leading-normal py-0.5">{stateLabel(id)}</span>

      <span aria-hidden className="shrink-0 w-4 h-4 flex items-center justify-center">
        <AnimatePresence initial={false}>
          {isChecked && (
            <motion.svg
              key="check"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
            >
              <motion.path
                d="M4 12L9 17L20 6"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: 0.08, ease: "easeOut" },
                }}
                exit={{
                  pathLength: 0,
                  transition: { duration: 0.04, ease: "easeIn" },
                }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}

interface StateGroupDropdownProps {
  label: string;
  states: readonly string[];
  active: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
  panelId: string;
}

function StateGroupDropdown({
  label,
  states,
  active,
  isOpen,
  onToggle,
  onSelect,
  onClose,
  panelId,
}: StateGroupDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containsActive = states.includes(active);

  const hover = useFluidHover(containerRef, {
    axis: "y",
    isItemDisabled: isDisabledRow,
  });

  const [checkedIndex, setCheckedIndex] = useState<number | undefined>(undefined);
  const ackTimeoutRef = useRef<number | null>(null);

  const clearAckTimeout = useCallback(() => {
    if (ackTimeoutRef.current !== null) {
      window.clearTimeout(ackTimeoutRef.current);
      ackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearAckTimeout, [clearAckTimeout]);

  useEffect(() => {
    if (!isOpen) {
      setCheckedIndex(undefined);
      return;
    }

    hover.remeasure();

    let inner: number;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (container) {
          const items = Array.from(
            container.querySelectorAll("[data-fluid-hover-index]"),
          ) as HTMLElement[];
          const idx = items.findIndex((el) => el.getAttribute("data-value") === active);
          setCheckedIndex(idx !== -1 ? idx : undefined);
        }
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [isOpen, active, hover.remeasure]);

  const handlePick = useCallback(
    (id: string, idx: number) => {
      setCheckedIndex(idx);
      onSelect(id);
      clearAckTimeout();
      ackTimeoutRef.current = window.setTimeout(() => {
        ackTimeoutRef.current = null;
        onClose();
      }, 250);
    },
    [onSelect, onClose, clearAckTimeout],
  );

  const checkedRect =
    hover.isMeasured && checkedIndex != null ? hover.itemRects[checkedIndex] : null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "group flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 text-[13px] font-medium transition-all duration-80 outline-none select-none",
          isOpen
            ? "border border-border bg-hover/90 text-foreground shadow-xs"
            : containsActive
              ? "border border-line-2/70 bg-panel-raised/90 text-foreground hover:border-border hover:bg-hover"
              : "border border-line/60 bg-panel-raised/60 text-muted hover:border-border/60 hover:bg-hover/80 hover:text-foreground",
        )}
      >
        <span className="text-left font-medium">{label}</span>
        <span className="flex items-center gap-2">
          {containsActive ? (
            <span className="text-[12px] font-normal text-muted-foreground group-hover:text-foreground transition-colors">
              {stateLabel(active)}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            strokeWidth={1.75}
            className={cn(
              "h-4 w-4 text-muted transition-transform duration-150 group-hover:text-foreground",
              isOpen && "rotate-180 text-foreground",
            )}
          />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(popupMotionClass, "absolute inset-x-0 top-full z-30 mt-1.5")}
            initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.96, transition: spring.fast.exit }}
            transition={spring.fast}
            style={{ transformOrigin: "top" }}
          >
            <Elevated
              offset={2}
              shadowLevel={3}
              className={cn(
                "flex flex-col max-h-56 overflow-hidden border border-border/80 bg-surface-2/95 backdrop-blur-md select-none outline-none",
                popupShape.container,
              )}
              onMouseEnter={hover.handlers.onMouseEnter}
              onMouseMove={hover.handlers.onMouseMove}
              onMouseLeave={hover.handlers.onMouseLeave}
              onClick={hover.handlers.onClick}
            >
              <ScrollArea
                className={popupScrollAreaClass}
                viewportClassName={cn(popupViewportClass, "scroll-fade max-h-56")}
              >
                <div
                  ref={containerRef}
                  id={panelId}
                  role="listbox"
                  aria-label={label}
                  className="relative flex flex-col p-1"
                >
                  <AnimatePresence>
                    {checkedRect && (
                      <motion.div
                        className={`absolute ${popupShape.bg} bg-active pointer-events-none`}
                        initial={false}
                        animate={{
                          top: checkedRect.top,
                          left: checkedRect.left,
                          width: checkedRect.width,
                          height: checkedRect.height,
                          opacity: 1,
                        }}
                        exit={{ opacity: 0, transition: spring.moderate.exit }}
                        transition={{
                          ...spring.moderate,
                          opacity: { duration: 0.08 },
                        }}
                      />
                    )}
                  </AnimatePresence>

                  <FluidHoverHighlight hover={hover} hidden={!isOpen} className={popupShape.bg} />

                  {states.map((id, index) => {
                    const isChecked = id === active;
                    const isActive = hover.activeIndex === index;
                    return (
                      <StateDropdownItem
                        key={id}
                        id={id}
                        index={index}
                        isChecked={isChecked}
                        isActive={isActive}
                        registerItem={hover.registerItem}
                        onSelect={handlePick}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </Elevated>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StateDropdowns({ groups, active, onSelect }: StateDropdownsProps) {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen("");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen("");
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="flex flex-col gap-2" role="group" aria-label="Choose a state">
      {groups.map((group) => {
        const isOpen = open === group.label;
        const panelId = `${baseId}-${group.label.toLowerCase()}`;
        return (
          <StateGroupDropdown
            key={group.label}
            label={group.label}
            states={group.states}
            active={active}
            isOpen={isOpen}
            panelId={panelId}
            onToggle={() => setOpen((current) => (current === group.label ? "" : group.label))}
            onSelect={onSelect}
            onClose={() => setOpen("")}
          />
        );
      })}
    </div>
  );
}
