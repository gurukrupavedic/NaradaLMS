/**
 * Modern Colorful Button Component - Vedic LMS Design System
 * 
 * Enhanced button component with vibrant colors, glow effects, and educational variants.
 * Replaces shadcn/ui Button with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant color variants with fluorescent glow effects
 * - Educational semantic variants for LMS contexts
 * - Consistent hover states and interactions
 * - Size variants and icon support
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary colored variants
        blue: "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(59,130,246,0.4)] active:bg-blue-800",
        green: "bg-green-600 text-white hover:bg-green-700 hover:shadow-[0_4px_14px_rgba(34,197,94,0.4)] active:bg-green-800",
        purple: "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-[0_4px_14px_rgba(147,51,234,0.4)] active:bg-purple-800",
        orange: "bg-orange-600 text-white hover:bg-orange-700 hover:shadow-[0_4px_14px_rgba(249,115,22,0.4)] active:bg-orange-800",
        pink: "bg-pink-600 text-white hover:bg-pink-700 hover:shadow-[0_4px_14px_rgba(236,72,153,0.4)] active:bg-pink-800",
        indigo: "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-[0_4px_14px_rgba(99,102,241,0.4)] active:bg-indigo-800",
        teal: "bg-teal-600 text-white hover:bg-teal-700 hover:shadow-[0_4px_14px_rgba(20,184,166,0.4)] active:bg-teal-800",
        cyan: "bg-cyan-600 text-white hover:bg-cyan-700 hover:shadow-[0_4px_14px_rgba(8,145,178,0.4)] active:bg-cyan-800",
        yellow: "bg-yellow-600 text-white hover:bg-yellow-700 hover:shadow-[0_4px_14px_rgba(202,138,4,0.4)] active:bg-yellow-800",
        lime: "bg-lime-600 text-white hover:bg-lime-700 hover:shadow-[0_4px_14px_rgba(101,163,13,0.4)] active:bg-lime-800",
        rose: "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-[0_4px_14px_rgba(244,63,94,0.4)] active:bg-rose-800",
        emerald: "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-[0_4px_14px_rgba(16,185,129,0.4)] active:bg-emerald-800",
        
        // Standard variants
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      },
      glow: {
        none: "",
        subtle: "hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)]",
        medium: "hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]",
        strong: "hover:shadow-[0_6px_30px_rgba(0,0,0,0.2)]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: "none"
    }
  }
);

// Educational semantic variants for LMS contexts
const educationalVariants = {
  // Actions
  save: "green",
  edit: "blue", 
  delete: "rose",
  publish: "emerald",
  preview: "purple",
  
  // Content types
  lesson: "blue",
  audio: "orange",
  text: "teal",
  assessment: "pink",
  
  // Navigation
  next: "indigo",
  previous: "purple",
  home: "cyan"
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  educational?: keyof typeof educationalVariants;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, educational, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // Use educational variant if provided
    const finalVariant = educational ? educationalVariants[educational] : variant;
    
    return (
      <Comp
        className={cn(buttonVariants({ variant: finalVariant, size, glow }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };