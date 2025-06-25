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
  "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-300 ease-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 p-0.5 group",
  {
    variants: {
      variant: {
        default: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input border-gray-300 data-[state=checked]:border-primary/20 data-[state=unchecked]:border-gray-300",
        blue: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-blue-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-blue-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(59,130,246,0.12)] data-[state=checked]:shadow-blue-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(59,130,246,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        green: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-600 data-[state=checked]:to-green-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-green-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(34,197,94,0.12)] data-[state=checked]:shadow-green-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(34,197,94,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(34,197,94,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        purple: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-600 data-[state=checked]:to-purple-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-purple-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(147,51,234,0.12)] data-[state=checked]:shadow-purple-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(147,51,234,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(147,51,234,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        orange: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-600 data-[state=checked]:to-orange-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-orange-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(249,115,22,0.12)] data-[state=checked]:shadow-orange-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(249,115,22,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(249,115,22,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        pink: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-600 data-[state=checked]:to-pink-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-pink-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(236,72,153,0.12)] data-[state=checked]:shadow-pink-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(236,72,153,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(236,72,153,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        indigo: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-600 data-[state=checked]:to-indigo-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-indigo-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(99,102,241,0.12)] data-[state=checked]:shadow-indigo-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(99,102,241,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        teal: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-600 data-[state=checked]:to-teal-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-teal-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(20,184,166,0.12)] data-[state=checked]:shadow-teal-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(20,184,166,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(20,184,166,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        cyan: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-600 data-[state=checked]:to-cyan-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-cyan-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(8,145,178,0.12)] data-[state=checked]:shadow-cyan-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(8,145,178,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(8,145,178,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        yellow: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-yellow-600 data-[state=checked]:to-yellow-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-yellow-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(202,138,4,0.12)] data-[state=checked]:shadow-yellow-600/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(202,138,4,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(202,138,4,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        lime: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-lime-600 data-[state=checked]:to-lime-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-lime-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(101,163,13,0.12)] data-[state=checked]:shadow-lime-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(101,163,13,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(101,163,13,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        rose: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-rose-600 data-[state=checked]:to-rose-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-rose-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(244,63,94,0.12)] data-[state=checked]:shadow-rose-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(244,63,94,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(244,63,94,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ],
        emerald: [
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-600 data-[state=checked]:to-emerald-500",
          "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-100",
          "data-[state=checked]:border-emerald-400/30 data-[state=unchecked]:border-gray-300",
          "data-[state=checked]:shadow-[0_0_15px_rgba(16,185,129,0.12)] data-[state=checked]:shadow-emerald-500/15",
          "focus-visible:shadow-[0_0_0_3px_rgba(16,185,129,0.2)]",
          "hover:data-[state=checked]:shadow-[0_0_18px_rgba(16,185,129,0.18)]",
          "hover:data-[state=unchecked]:border-gray-400"
        ]
      },
      size: {
        sm: "h-5 w-9",
        default: "h-6 w-11", 
        lg: "h-7 w-12"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-white transition-all duration-300 ease-out data-[state=unchecked]:translate-x-0 relative",
  {
    variants: {
      size: {
        sm: [
          "h-4 w-4 data-[state=checked]:translate-x-4",
          "shadow-[0_2px_8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]",
          "data-[state=checked]:shadow-[0_2px_12px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.8)]"
        ],
        default: [
          "h-5 w-5 data-[state=checked]:translate-x-5",
          "shadow-[0_3px_10px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.3)]",
          "data-[state=checked]:shadow-[0_4px_14px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.8),inset_0_1px_0_rgba(255,255,255,0.4)]"
        ],
        lg: [
          "h-5 w-5 data-[state=checked]:translate-x-5",
          "shadow-[0_4px_12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.3)]",
          "data-[state=checked]:shadow-[0_5px_16px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.8),inset_0_1px_0_rgba(255,255,255,0.4)]"
        ]
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
);

// Enhanced thumb with inner glow effect for checked state
const switchThumbInnerVariants = cva(
  "absolute inset-0.5 rounded-full opacity-0 transition-opacity duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "data-[state=checked]:opacity-15 bg-gray-500",
        blue: "data-[state=checked]:opacity-20 bg-blue-400",
        green: "data-[state=checked]:opacity-20 bg-green-400",
        purple: "data-[state=checked]:opacity-20 bg-purple-400",
        orange: "data-[state=checked]:opacity-20 bg-orange-400",
        pink: "data-[state=checked]:opacity-20 bg-pink-400",
        indigo: "data-[state=checked]:opacity-20 bg-indigo-400",
        teal: "data-[state=checked]:opacity-20 bg-teal-400",
        cyan: "data-[state=checked]:opacity-20 bg-cyan-400",
        yellow: "data-[state=checked]:opacity-20 bg-yellow-400",
        lime: "data-[state=checked]:opacity-20 bg-lime-400",
        rose: "data-[state=checked]:opacity-20 bg-rose-400",
        emerald: "data-[state=checked]:opacity-20 bg-emerald-400"
      }
    },
    defaultVariants: {
      variant: "default"
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
  showStatusText?: boolean;
  onText?: string;
  offText?: string;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, variant, size, educational, label, description, loading, disabled, showStatusText, onText = "ON", offText = "OFF", ...props }, ref) => {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  const switchElement = (
    <div className="relative inline-flex items-center">
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
        <SwitchPrimitive.Thumb className={cn(switchThumbVariants({ size }))}>
          <div className={cn(switchThumbInnerVariants({ variant: finalVariant }))} />
        </SwitchPrimitive.Thumb>
        {showStatusText && (
          <>
            {/* OFF text - positioned in left area when switch is unchecked */}
            <span 
              className={cn(
                "absolute font-semibold transition-all duration-300 select-none pointer-events-none text-gray-600 transform",
                size === "sm" ? "text-[8px] left-1.5" : size === "lg" ? "text-[9px] left-2" : "text-[9px] left-1.5",
                "data-[state=checked]:opacity-0 data-[state=checked]:scale-90",
                "data-[state=unchecked]:opacity-100 data-[state=unchecked]:scale-100"
              )}
            >
              {offText}
            </span>
            {/* ON text - positioned in right area when switch is checked */}
            <span 
              className={cn(
                "absolute font-semibold transition-all duration-300 select-none pointer-events-none text-white/90 transform",
                size === "sm" ? "text-[8px] right-1.5" : size === "lg" ? "text-[9px] right-2" : "text-[9px] right-1.5",
                "data-[state=checked]:opacity-100 data-[state=checked]:scale-100",
                "data-[state=unchecked]:opacity-0 data-[state=unchecked]:scale-90"
              )}
            >
              {onText}
            </span>
          </>
        )}
      </SwitchPrimitive.Root>
    </div>
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