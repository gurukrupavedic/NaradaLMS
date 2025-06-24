/**
 * Modern Colorful Switch Component - Vedic LMS Design System
 * 
 * Enhanced switch/toggle component with vibrant colors and educational variants.
 * Perfect for publish/unpublish controls, feature toggles, and settings in LMS.
 * 
 * Features:
 * - 12 vibrant color variants with smooth animations
 * - Educational semantic variants for LMS contexts
 * - Loading states and disabled styling
 * - Size variants and label support
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] disabled:cursor-not-allowed disabled:opacity-50 p-0.5",
  {
    variants: {
      variant: {
        default: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        blue: "data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(59,130,246,0.3)]",
        green: "data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(34,197,94,0.3)]",
        purple: "data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(147,51,234,0.3)]",
        orange: "data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(249,115,22,0.3)]",
        pink: "data-[state=checked]:bg-pink-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(236,72,153,0.3)]",
        indigo: "data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(99,102,241,0.3)]",
        teal: "data-[state=checked]:bg-teal-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(20,184,166,0.3)]",
        cyan: "data-[state=checked]:bg-cyan-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(8,145,178,0.3)]",
        yellow: "data-[state=checked]:bg-yellow-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(202,138,4,0.3)]",
        lime: "data-[state=checked]:bg-lime-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(101,163,13,0.3)]",
        rose: "data-[state=checked]:bg-rose-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(244,63,94,0.3)]",
        emerald: "data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200 focus-visible:shadow-[0_0_0_2px_rgba(16,185,129,0.3)]"
      },
      size: {
        sm: "h-5 w-9",
        default: "h-6 w-12", 
        lg: "h-8 w-14"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-white shadow-lg transition-transform data-[state=unchecked]:translate-x-0",
  {
    variants: {
      size: {
        sm: "h-4 w-4 data-[state=checked]:translate-x-4",
        default: "h-5 w-5 data-[state=checked]:translate-x-6",
        lg: "h-6 w-6 data-[state=checked]:translate-x-6"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  // Content publishing
  published: "green",
  featured: "yellow",
  archived: "purple",
  
  // Feature toggles
  notifications: "blue",
  autoplay: "orange",
  captions: "teal",
  
  // User preferences
  darkmode: "indigo",
  sound: "pink",
  advanced: "cyan"
} as const;

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {
  educational?: keyof typeof educationalVariants;
  label?: string;
  description?: string;
  loading?: boolean;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, variant, size, educational, label, description, loading, disabled, ...props }, ref) => {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  const switchElement = (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        switchVariants({ variant: finalVariant, size }),
        loading && "opacity-70 cursor-wait",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      <SwitchPrimitive.Thumb className={cn(switchThumbVariants({ size }))} />
    </SwitchPrimitive.Root>
  );
  
  // If no label, return just the switch
  if (!label && !description) {
    return switchElement;
  }
  
  // Return switch with label and description
  return (
    <div className="flex items-center space-x-3">
      {switchElement}
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {loading && <span className="ml-2 text-xs text-gray-500">(updating...)</span>}
          </label>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
});
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch, switchVariants };