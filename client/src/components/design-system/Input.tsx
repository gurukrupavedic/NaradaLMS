/**
 * Modern Colorful Input Component - Vedic LMS Design System
 * 
 * Enhanced input component with vibrant focus colors and educational variants.
 * Replaces shadcn/ui Input with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant focus color variants
 * - Educational semantic variants for LMS contexts
 * - Consistent styling with design system
 * - Size variants and state management
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "focus-visible:border-blue-500 focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]",
        blue: "focus-visible:border-blue-500 focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]",
        green: "focus-visible:border-green-500 focus-visible:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]",
        purple: "focus-visible:border-purple-500 focus-visible:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]",
        orange: "focus-visible:border-orange-500 focus-visible:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]",
        pink: "focus-visible:border-pink-500 focus-visible:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]",
        indigo: "focus-visible:border-indigo-500 focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]",
        teal: "focus-visible:border-teal-500 focus-visible:shadow-[0_0_0_3px_rgba(20,184,166,0.15)]",
        cyan: "focus-visible:border-cyan-500 focus-visible:shadow-[0_0_0_3px_rgba(8,145,178,0.15)]",
        yellow: "focus-visible:border-yellow-500 focus-visible:shadow-[0_0_0_3px_rgba(202,138,4,0.15)]",
        lime: "focus-visible:border-lime-500 focus-visible:shadow-[0_0_0_3px_rgba(101,163,13,0.15)]",
        rose: "focus-visible:border-rose-500 focus-visible:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]",
        emerald: "focus-visible:border-emerald-500 focus-visible:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-4 py-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  search: "blue",
  title: "purple",
  description: "teal",
  content: "green",
  email: "cyan",
  password: "indigo",
  name: "orange"
} as const;

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  educational?: keyof typeof educationalVariants;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, educational, type, ...props }, ref) => {
    // Use educational variant if provided
    const finalVariant = educational ? educationalVariants[educational] : variant;
    
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant: finalVariant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };