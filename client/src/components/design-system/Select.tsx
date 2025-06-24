/**
 * Modern Colorful Select Component - Vedic LMS Design System
 * 
 * Enhanced select component with vibrant colors, educational variants, and improved UX.
 * Replaces shadcn/ui Select with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant focus color variants
 * - Educational semantic variants for LMS contexts
 * - Icon support and custom styling
 * - Consistent with Input component design
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const selectTriggerVariants = cva(
  "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]",
        blue: "focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]",
        green: "focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]",
        purple: "focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]",
        orange: "focus:border-orange-500 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]",
        pink: "focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]",
        indigo: "focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]",
        teal: "focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.15)]",
        cyan: "focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(8,145,178,0.15)]",
        yellow: "focus:border-yellow-500 focus:shadow-[0_0_0_3px_rgba(202,138,4,0.15)]",
        lime: "focus:border-lime-500 focus:shadow-[0_0_0_3px_rgba(101,163,13,0.15)]",
        rose: "focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]",
        emerald: "focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  // Content management
  language: "blue",
  script: "purple",
  role: "indigo",
  status: "green",
  
  // Learning contexts
  track: "emerald",
  chapter: "teal",
  lesson: "blue",
  difficulty: "orange",
  
  // System settings
  theme: "purple",
  sort: "cyan",
  filter: "pink"
} as const;

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

export interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectTriggerVariants> {
  educational?: keyof typeof educationalVariants;
}

export interface SelectContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  variant?: keyof typeof educationalVariants | "default";
  educational?: keyof typeof educationalVariants;
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, variant, educational, children, ...props }, ref) => {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(selectTriggerVariants({ variant: finalVariant }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

// Context to pass color variant to dropdown items
const SelectContext = React.createContext<{ variant?: string }>({});

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = "popper", variant, educational, ...props }, ref) => {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant || "blue";
  
  return (
    <SelectContext.Provider value={{ variant: finalVariant }}>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          position={position}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              "p-2",
              position === "popper" &&
                "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectContext.Provider>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-2 pl-8 pr-2 text-sm font-semibold text-gray-500", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

// Color mapping for hover states
const hoverColorMap: Record<string, { bg: string; text: string; check: string }> = {
  blue: { bg: "hover:bg-blue-50 focus:bg-blue-50", text: "hover:text-blue-700 focus:text-blue-700", check: "text-blue-600" },
  green: { bg: "hover:bg-green-50 focus:bg-green-50", text: "hover:text-green-700 focus:text-green-700", check: "text-green-600" },
  purple: { bg: "hover:bg-purple-50 focus:bg-purple-50", text: "hover:text-purple-700 focus:text-purple-700", check: "text-purple-600" },
  orange: { bg: "hover:bg-orange-50 focus:bg-orange-50", text: "hover:text-orange-700 focus:text-orange-700", check: "text-orange-600" },
  pink: { bg: "hover:bg-pink-50 focus:bg-pink-50", text: "hover:text-pink-700 focus:text-pink-700", check: "text-pink-600" },
  indigo: { bg: "hover:bg-indigo-50 focus:bg-indigo-50", text: "hover:text-indigo-700 focus:text-indigo-700", check: "text-indigo-600" },
  teal: { bg: "hover:bg-teal-50 focus:bg-teal-50", text: "hover:text-teal-700 focus:text-teal-700", check: "text-teal-600" },
  cyan: { bg: "hover:bg-cyan-50 focus:bg-cyan-50", text: "hover:text-cyan-700 focus:text-cyan-700", check: "text-cyan-600" },
  yellow: { bg: "hover:bg-yellow-50 focus:bg-yellow-50", text: "hover:text-yellow-700 focus:text-yellow-700", check: "text-yellow-600" },
  lime: { bg: "hover:bg-lime-50 focus:bg-lime-50", text: "hover:text-lime-700 focus:text-lime-700", check: "text-lime-600" },
  rose: { bg: "hover:bg-rose-50 focus:bg-rose-50", text: "hover:text-rose-700 focus:text-rose-700", check: "text-rose-600" },
  emerald: { bg: "hover:bg-emerald-50 focus:bg-emerald-50", text: "hover:text-emerald-700 focus:text-emerald-700", check: "text-emerald-600" }
};

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const { variant = "blue" } = React.useContext(SelectContext);
  const colors = hoverColorMap[variant] || hoverColorMap.blue;
  
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-8 pr-2 text-sm outline-none transition-all duration-150 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        colors.bg,
        colors.text,
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className={cn("h-4 w-4", colors.check)} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("mx-2 my-1 h-px bg-gray-200", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};