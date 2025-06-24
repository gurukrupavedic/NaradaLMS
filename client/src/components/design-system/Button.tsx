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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.4),0_0_0_4px_currentColor] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
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
        
        // Colorful outline variants
        "outline-blue": "border border-blue-300 text-blue-600 bg-transparent hover:bg-blue-50 hover:border-blue-400 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]",
        "outline-green": "border border-green-300 text-green-600 bg-transparent hover:bg-green-50 hover:border-green-400 hover:shadow-[0_2px_8px_rgba(34,197,94,0.15)]",
        "outline-purple": "border border-purple-300 text-purple-600 bg-transparent hover:bg-purple-50 hover:border-purple-400 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]",
        "outline-orange": "border border-orange-300 text-orange-600 bg-transparent hover:bg-orange-50 hover:border-orange-400 hover:shadow-[0_2px_8px_rgba(249,115,22,0.15)]",
        "outline-pink": "border border-pink-300 text-pink-600 bg-transparent hover:bg-pink-50 hover:border-pink-400 hover:shadow-[0_2px_8px_rgba(236,72,153,0.15)]",
        "outline-indigo": "border border-indigo-300 text-indigo-600 bg-transparent hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-[0_2px_8px_rgba(99,102,241,0.15)]",
        "outline-teal": "border border-teal-300 text-teal-600 bg-transparent hover:bg-teal-50 hover:border-teal-400 hover:shadow-[0_2px_8px_rgba(20,184,166,0.15)]",
        "outline-cyan": "border border-cyan-300 text-cyan-600 bg-transparent hover:bg-cyan-50 hover:border-cyan-400 hover:shadow-[0_2px_8px_rgba(8,145,178,0.15)]",
        "outline-yellow": "border border-yellow-300 text-yellow-600 bg-transparent hover:bg-yellow-50 hover:border-yellow-400 hover:shadow-[0_2px_8px_rgba(202,138,4,0.15)]",
        "outline-lime": "border border-lime-300 text-lime-600 bg-transparent hover:bg-lime-50 hover:border-lime-400 hover:shadow-[0_2px_8px_rgba(101,163,13,0.15)]",
        "outline-rose": "border border-rose-300 text-rose-600 bg-transparent hover:bg-rose-50 hover:border-rose-400 hover:shadow-[0_2px_8px_rgba(244,63,94,0.15)]",
        "outline-emerald": "border border-emerald-300 text-emerald-600 bg-transparent hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-[0_2px_8px_rgba(16,185,129,0.15)]",
        
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