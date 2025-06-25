/**
 * Modern Colorful Progress Component - LMS Design System v1.0
 * 
 * Enhanced progress component with vibrant colors, educational variants, and animations.
 * Replaces shadcn/ui Progress with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant color variants with smooth animations
 * - Educational semantic variants for learning contexts
 * - Linear and circular progress indicators
 * - Percentage display and custom labels
 * 
 * @author LMS Design System v1.0
 * @since 2025-06-24
 */

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const progressVariants = cva(
  "relative h-2 w-full overflow-hidden rounded-full focus:outline-none focus:shadow-[0_0_0_2px_rgba(59,130,246,0.3)]",
  {
    variants: {
      variant: {
        default: "bg-secondary",
        blue: "bg-blue-100",
        green: "bg-green-100", 
        purple: "bg-purple-100",
        orange: "bg-orange-100",
        pink: "bg-pink-100",
        indigo: "bg-indigo-100",
        teal: "bg-teal-100",
        cyan: "bg-cyan-100",
        yellow: "bg-yellow-100",
        lime: "bg-lime-100",
        rose: "bg-rose-100",
        emerald: "bg-emerald-100"
      },
      size: {
        sm: "h-1",
        default: "h-2",
        lg: "h-3",
        xl: "h-4"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-primary",
        blue: "bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
        green: "bg-gradient-to-r from-green-500 to-green-600 shadow-[0_0_10px_rgba(34,197,94,0.3)]",
        purple: "bg-gradient-to-r from-purple-500 to-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.3)]",
        orange: "bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
        pink: "bg-gradient-to-r from-pink-500 to-pink-600 shadow-[0_0_10px_rgba(236,72,153,0.3)]",
        indigo: "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.3)]",
        teal: "bg-gradient-to-r from-teal-500 to-teal-600 shadow-[0_0_10px_rgba(20,184,166,0.3)]",
        cyan: "bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-[0_0_10px_rgba(8,145,178,0.3)]",
        yellow: "bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_0_10px_rgba(202,138,4,0.3)]",
        lime: "bg-gradient-to-r from-lime-500 to-lime-600 shadow-[0_0_10px_rgba(101,163,13,0.3)]",
        rose: "bg-gradient-to-r from-rose-500 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]",
        emerald: "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

// Educational semantic variants for learning contexts
const educationalVariants = {
  // Learning progress
  lesson: "blue",
  chapter: "purple", 
  track: "emerald",
  course: "indigo",
  
  // Performance indicators  
  completion: "green",
  mastery: "emerald",
  practice: "orange",
  assessment: "pink",
  
  // System states
  loading: "cyan",
  processing: "teal",
  success: "green",
  warning: "yellow"
} as const;

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  value?: number;
  educational?: keyof typeof educationalVariants;
  showPercentage?: boolean;
  label?: string;
  animated?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant, size, educational, showPercentage, label, animated, ...props }, ref) => {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  const percentage = Math.min(Math.max(value || 0, 0), 100);
  
  return (
    <div className="w-full space-y-2">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="font-medium text-gray-700">{label}</span>}
          {showPercentage && <span className="text-gray-500">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ variant: finalVariant, size }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            progressIndicatorVariants({ variant: finalVariant }),
            animated && "animate-pulse"
          )}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

// Circular Progress Component
export interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  variant?: keyof typeof educationalVariants | "default";
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ value, size = 120, strokeWidth = 8, variant = "default", showPercentage, label, className }, ref) => {
    const normalizedValue = Math.min(Math.max(value || 0, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;
    
    // Color mapping for stroke
    const colorMap: Record<string, string> = {
      default: "#6366f1",
      blue: "#3b82f6",
      green: "#22c55e", 
      purple: "#a855f7",
      orange: "#f97316",
      pink: "#ec4899",
      indigo: "#6366f1",
      teal: "#14b8a6",
      cyan: "#06b6d4",
      yellow: "#eab308",
      lime: "#84cc16",
      rose: "#f43f5e",
      emerald: "#10b981"
    };
    
    const strokeColor = colorMap[variant] || colorMap.default;
    
    return (
      <div ref={ref} className={cn("inline-flex flex-col items-center space-y-2", className)}>
        <div className="relative inline-flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${strokeColor}40)`
              }}
            />
          </svg>
          {showPercentage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-semibold" style={{ color: strokeColor }}>
                {normalizedValue.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        {label && (
          <span className="text-sm font-medium text-gray-700 text-center">
            {label}
          </span>
        )}
      </div>
    );
  }
);
CircularProgress.displayName = "CircularProgress";

export { Progress, CircularProgress };