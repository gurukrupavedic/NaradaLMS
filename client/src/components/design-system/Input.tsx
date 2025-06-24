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
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "focus-visible:ring-ring",
        blue: "focus-visible:ring-blue-500 focus-visible:border-blue-500",
        green: "focus-visible:ring-green-500 focus-visible:border-green-500",
        purple: "focus-visible:ring-purple-500 focus-visible:border-purple-500",
        orange: "focus-visible:ring-orange-500 focus-visible:border-orange-500",
        pink: "focus-visible:ring-pink-500 focus-visible:border-pink-500",
        indigo: "focus-visible:ring-indigo-500 focus-visible:border-indigo-500",
        teal: "focus-visible:ring-teal-500 focus-visible:border-teal-500",
        cyan: "focus-visible:ring-cyan-500 focus-visible:border-cyan-500",
        yellow: "focus-visible:ring-yellow-500 focus-visible:border-yellow-500",
        lime: "focus-visible:ring-lime-500 focus-visible:border-lime-500",
        rose: "focus-visible:ring-rose-500 focus-visible:border-rose-500",
        emerald: "focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
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