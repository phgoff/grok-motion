import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />;
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-line text-accent shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 aria-checked:border-accent aria-checked:bg-accent/10",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2 w-2 fill-current text-accent" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

/**
 * Segmented pill item for preset selectors and toolbars, preserving full
 * Radix RadioGroup keyboard navigation, roving tabindex, and accessibility.
 */
const RadioGroupSegment = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    active?: boolean;
  }
>(({ className, children, active, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "relative rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition-all duration-150 outline-none select-none",
        "border border-line/70 bg-panel/60 text-muted hover:border-line-2 hover:text-foreground active:scale-[0.98]",
        "focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent",
        "data-[state=checked]:border-foreground/80 data-[state=checked]:bg-foreground/10 data-[state=checked]:text-foreground data-[state=checked]:font-semibold",
        active && "border-foreground/80 bg-foreground/10 text-foreground font-semibold",
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupSegment.displayName = "RadioGroupSegment";

export { RadioGroup, RadioGroupItem, RadioGroupSegment };
