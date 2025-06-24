/**
 * Modern Colorful Badge Component - Vedic LMS Design System
 * 
 * Enhanced badge component with vibrant colors, educational variants, and status indicators.
 * Replaces shadcn/ui Badge with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant color variants with subtle glow effects
 * - Educational semantic variants for LMS contexts
 * - Status indicators and achievement badges
 * - Size variants and icon support
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        
        // Solid color variants
        blue: "border-transparent bg-blue-600 text-white hover:bg-blue-700 shadow-[0_2px_4px_rgba(59,130,246,0.2)]",
        green: "border-transparent bg-green-600 text-white hover:bg-green-700 shadow-[0_2px_4px_rgba(34,197,94,0.2)]",
        purple: "border-transparent bg-purple-600 text-white hover:bg-purple-700 shadow-[0_2px_4px_rgba(147,51,234,0.2)]",
        orange: "border-transparent bg-orange-600 text-white hover:bg-orange-700 shadow-[0_2px_4px_rgba(249,115,22,0.2)]",
        pink: "border-transparent bg-pink-600 text-white hover:bg-pink-700 shadow-[0_2px_4px_rgba(236,72,153,0.2)]",
        indigo: "border-transparent bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_2px_4px_rgba(99,102,241,0.2)]",
        teal: "border-transparent bg-teal-600 text-white hover:bg-teal-700 shadow-[0_2px_4px_rgba(20,184,166,0.2)]",
        cyan: "border-transparent bg-cyan-600 text-white hover:bg-cyan-700 shadow-[0_2px_4px_rgba(8,145,178,0.2)]",
        yellow: "border-transparent bg-yellow-600 text-white hover:bg-yellow-700 shadow-[0_2px_4px_rgba(202,138,4,0.2)]",
        lime: "border-transparent bg-lime-600 text-white hover:bg-lime-700 shadow-[0_2px_4px_rgba(101,163,13,0.2)]",
        rose: "border-transparent bg-rose-600 text-white hover:bg-rose-700 shadow-[0_2px_4px_rgba(244,63,94,0.2)]",
        emerald: "border-transparent bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_2px_4px_rgba(16,185,129,0.2)]",
        
        // Light color variants
        "light-blue": "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
        "light-green": "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
        "light-purple": "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
        "light-orange": "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
        "light-pink": "border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100",
        "light-indigo": "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
        "light-teal": "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
        "light-cyan": "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
        "light-yellow": "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
        "light-lime": "border-lime-200 bg-lime-50 text-lime-700 hover:bg-lime-100",
        "light-rose": "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
        "light-emerald": "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        default: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

// Educational semantic variants for LMS contexts
const educationalVariants = {
  // Content status
  published: "green",
  draft: "yellow",
  archived: "light-purple",
  
  // Learning progress
  completed: "green",
  "in-progress": "blue", 
  locked: "light-purple",
  mastered: "emerald",
  
  // User roles
  admin: "purple",
  instructor: "indigo",
  student: "blue",
  
  // Content types
  lesson: "blue",
  assessment: "pink",
  audio: "orange",
  text: "teal",
  
  // System status
  active: "green",
  inactive: "light-purple",
  new: "cyan",
  featured: "yellow"
} as const;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  educational?: keyof typeof educationalVariants;
  icon?: React.ReactNode;
  pulse?: boolean;
}

function Badge({ className, variant, size, educational, icon, pulse, children, ...props }: BadgeProps) {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  return (
    <div 
      className={cn(
        badgeVariants({ variant: finalVariant, size }), 
        pulse && "animate-pulse",
        className
      )} 
      {...props}
    >
      {icon && <span className="mr-1 shrink-0">{icon}</span>}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };