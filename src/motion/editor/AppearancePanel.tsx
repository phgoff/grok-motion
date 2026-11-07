import { lazy, memo, Suspense } from "react";
import { Palette as PaletteIcon, RotateCcw } from "lucide-react";
import { BOT_CHARACTER_PALETTE, paletteLabelFor } from "@/mascot/palettes";
import type { MascotDesign } from "@/mascot/design";
import { GROK_SPHERE_DESIGN } from "@/mascot/defaults";
import { cn } from "@/lib/utils";
import type { BodyShape } from "@/mascot/geometry";
import { ShapePicker } from "@/motion/ui/ShapePicker";

const ColorPickerPopover = lazy(() =>
  import("@/components/ui/color-picker").then((m) => ({ default: m.ColorPickerPopover })),
);

function ColorTriggerFallback({ color }: { color: string }) {
  return (
    <div className="flex h-7 w-full items-center justify-between rounded-md border border-border px-2 text-[12px]">
      <span className="text-muted-foreground select-none">Color</span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-4 w-4 rounded-[4px] border border-black/20"
          style={{ background: color }}
        />
        <span className="text-foreground tabular-nums">{color.toUpperCase()}</span>
      </span>
    </div>
  );
}

export interface AppearancePanelProps {
  design: MascotDesign;
  onDesignChange: (patch: Partial<MascotDesign>) => void;
  shape?: BodyShape;
  onShapeChange?: (shape: BodyShape) => void;
  className?: string;
}

export const AppearancePanel = memo(function AppearancePanel({
  design,
  onDesignChange,
  shape,
  onShapeChange,
  className,
}: AppearancePanelProps) {
  const defaults = { ...GROK_SPHERE_DESIGN };

  const isColorModified =
    design.fill.toLowerCase() !== defaults.fill.toLowerCase() ||
    design.edge.toLowerCase() !== defaults.edge.toLowerCase();

  return (
    <aside
      className={cn(
        "flex w-[310px] shrink-0 flex-col border-r border-[var(--sidebar-border,var(--line))] bg-[var(--sidebar,var(--panel))] overflow-hidden select-none",
        className,
      )}
      aria-label="Mascot appearance panel"
    >
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--sidebar-border,var(--line))] bg-[var(--sidebar-accent,#292929)]/50 px-3">
        <div className="flex items-center gap-1.5 text-caption font-semibold text-[var(--sidebar-foreground,var(--foreground))]">
          <PaletteIcon className="h-3.5 w-3.5 text-accent" />
          <span>Appearance</span>
        </div>
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto page-scrollbar p-3 flex flex-col gap-3">
        {/* SHAPE SECTION */}
        {onShapeChange && (
          <div className="rounded-lg border border-line bg-panel p-3">
            <ShapePicker shape={shape ?? "sphere"} onChange={onShapeChange} />
          </div>
        )}

        {/* COLOR SECTION */}
        <div className="rounded-lg border border-line bg-panel p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold text-foreground">Color</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted">{paletteLabelFor(design)}</span>
              {isColorModified && (
                <button
                  type="button"
                  className="p-1 rounded-md text-muted/60 hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
                  title={`Reset color (${defaults.fill})`}
                  aria-label="Reset color to default"
                  onClick={() => onDesignChange({ fill: defaults.fill, edge: defaults.edge })}
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Character Palette */}
          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-muted">
              Character Palette
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {BOT_CHARACTER_PALETTE.map((item) => {
                const color = item.ink.includes("light-dark")
                  ? item.id === "black"
                    ? "#000000"
                    : "#777777"
                  : item.ink;
                const selected = design.fill.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "relative aspect-square rounded-md border border-black/30 transition-all duration-150 hover:scale-105 cursor-pointer",
                      selected
                        ? "ring-2 ring-foreground ring-offset-1 ring-offset-panel shadow-sm"
                        : "opacity-90 hover:opacity-100",
                    )}
                    aria-pressed={selected}
                    aria-label={`${item.label} character palette`}
                    title={`${item.label} (${color})`}
                    style={{ background: color }}
                    onClick={() => onDesignChange({ fill: color, edge: color })}
                  />
                );
              })}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="pt-1 [&>*]:w-full">
            <Suspense fallback={<ColorTriggerFallback color={design.fill} />}>
              <ColorPickerPopover
                triggerLabel="Color"
                value={design.fill}
                onValueChange={(val) => onDesignChange({ fill: val, edge: val })}
                size="compact"
                triggerClassName="w-full justify-between"
              />
            </Suspense>
          </div>
        </div>
      </div>
    </aside>
  );
});
