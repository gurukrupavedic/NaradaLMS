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
  "z-50 overflow-hidden rounded-md px-2.5 py-1.5 text-xs font-normal shadow-sm border backdrop-blur-sm animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
  {
    variants: {
      variant: {
        default: "bg-gray-800/90 text-gray-100 border-gray-600/40 shadow-[0_4px_16px_rgba(0,0,0,0.15)]",
        blue: "bg-blue-50/95 text-blue-800 border-blue-200/60 shadow-[0_4px_16px_rgba(59,130,246,0.08)]",
        green: "bg-green-50/95 text-green-800 border-green-200/60 shadow-[0_4px_16px_rgba(34,197,94,0.08)]",
        purple: "bg-purple-50/95 text-purple-800 border-purple-200/60 shadow-[0_4px_16px_rgba(147,51,234,0.08)]",
        orange: "bg-orange-50/95 text-orange-800 border-orange-200/60 shadow-[0_4px_16px_rgba(251,146,60,0.08)]",
        pink: "bg-pink-50/95 text-pink-800 border-pink-200/60 shadow-[0_4px_16px_rgba(236,72,153,0.08)]",
        indigo: "bg-indigo-50/95 text-indigo-800 border-indigo-200/60 shadow-[0_4px_16px_rgba(99,102,241,0.08)]",
        teal: "bg-teal-50/95 text-teal-800 border-teal-200/60 shadow-[0_4px_16px_rgba(20,184,166,0.08)]",
        cyan: "bg-cyan-50/95 text-cyan-800 border-cyan-200/60 shadow-[0_4px_16px_rgba(8,145,178,0.08)]",
        yellow: "bg-yellow-50/95 text-yellow-800 border-yellow-200/60 shadow-[0_4px_16px_rgba(234,179,8,0.08)]",
        lime: "bg-lime-50/95 text-lime-800 border-lime-200/60 shadow-[0_4px_16px_rgba(132,204,22,0.08)]",
        rose: "bg-rose-50/95 text-rose-800 border-rose-200/60 shadow-[0_4px_16px_rgba(244,63,94,0.08)]",
        emerald: "bg-emerald-50/95 text-emerald-800 border-emerald-200/60 shadow-[0_4px_16px_rgba(16,185,129,0.08)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

// Educational semantic variants for LMS contexts
const educationalVariants = {
  // Help and guidance
  help: "blue" as const,           // General help information
  info: "cyan" as const,           // Informational content
  tip: "teal" as const,            // Helpful tips and suggestions
  warning: "yellow" as const,      // Caution and warning messages
  
  // Feature explanations
  feature: "purple" as const,      // New feature introductions
  shortcut: "indigo" as const,     // Keyboard shortcuts and quick actions
  beta: "orange" as const,         // Beta features and experimental functionality
  
  // Content contexts
  audio: "orange" as const,        // Audio-related tooltips
  video: "pink" as const,          // Video content explanations
  text: "green" as const,          // Text editing and content tooltips
  assessment: "rose" as const,     // Assessment and grading tooltips
  
  // User actions
  save: "green" as const,          // Save actions and confirmations
  delete: "rose" as const,         // Delete and destructive actions
  edit: "purple" as const,         // Editing functionality
  publish: "emerald" as const      // Publishing and making content live
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
  variant?: "default" | "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  educational?: keyof typeof educationalVariants;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
  className?: string;
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  children,
  variant = "default",
  educational,
  side = "top",
  delayDuration = 400,
  className
}) => {
  // Use educational variant if provided, otherwise use explicit variant
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          variant={finalVariant as any}
          className={className}
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