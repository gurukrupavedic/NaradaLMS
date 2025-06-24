/**
 * Modern Colorful Tooltip Component - Vedic LMS Design System
 * 
 * Enhanced tooltip component with vibrant colors and educational variants.
 * Perfect for help text, feature explanations, and user guidance in LMS.
 * 
 * Features:
 * - 12 vibrant color variants with subtle styling
 * - Educational semantic variants for LMS contexts
 * - Multiple positioning options
 * - Keyboard navigation support
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tooltipContentVariants = cva(
  "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm text-white animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "bg-gray-900",
        blue: "bg-blue-600",
        green: "bg-green-600",
        purple: "bg-purple-600",
        orange: "bg-orange-600",
        pink: "bg-pink-600",
        indigo: "bg-indigo-600",
        teal: "bg-teal-600",
        cyan: "bg-cyan-600",
        yellow: "bg-yellow-600 text-gray-900",
        lime: "bg-lime-600",
        rose: "bg-rose-600",
        emerald: "bg-emerald-600"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  // Help and guidance
  help: "blue",
  info: "cyan",
  tip: "teal",
  warning: "yellow",
  
  // Feature explanations
  feature: "purple",
  shortcut: "indigo",
  beta: "orange",
  
  // Content contexts
  audio: "orange",
  video: "pink",
  text: "green",
  assessment: "rose"
} as const;

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  educational?: keyof typeof educationalVariants;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, variant, educational, sideOffset = 4, ...props }, ref) => {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(tooltipContentVariants({ variant: finalVariant }), className)}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Convenience component for simple tooltips
export interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  variant?: keyof typeof educationalVariants | "default";
  educational?: keyof typeof educationalVariants;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  children,
  variant,
  educational,
  side = "top",
  delayDuration = 400
}) => {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          variant={variant as any}
          educational={educational}
        >
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
};

// Export everything
const Tooltip = Object.assign(TooltipRoot, {
  Provider: TooltipProvider,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Simple: SimpleTooltip
});

export { 
  Tooltip,
  TooltipProvider, 
  TooltipRoot, 
  TooltipTrigger, 
  TooltipContent,
  SimpleTooltip,
  tooltipContentVariants 
};