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
  "inline-flex items-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border",
        
        // Refined Style - Subtle backgrounds with rich text
        blue: "border-transparent bg-blue-100/70 text-blue-700 hover:bg-blue-200/80 hover:text-blue-800",
        green: "border-transparent bg-green-100/70 text-green-700 hover:bg-green-200/80 hover:text-green-800",
        purple: "border-transparent bg-purple-100/70 text-purple-700 hover:bg-purple-200/80 hover:text-purple-800",
        orange: "border-transparent bg-orange-100/70 text-orange-700 hover:bg-orange-200/80 hover:text-orange-800",
        pink: "border-transparent bg-pink-100/70 text-pink-700 hover:bg-pink-200/80 hover:text-pink-800",
        indigo: "border-transparent bg-indigo-100/70 text-indigo-700 hover:bg-indigo-200/80 hover:text-indigo-800",
        teal: "border-transparent bg-teal-100/70 text-teal-700 hover:bg-teal-200/80 hover:text-teal-800",
        cyan: "border-transparent bg-cyan-100/70 text-cyan-700 hover:bg-cyan-200/80 hover:text-cyan-800",
        yellow: "border-transparent bg-yellow-100/70 text-yellow-700 hover:bg-yellow-200/80 hover:text-yellow-800",
        lime: "border-transparent bg-lime-100/70 text-lime-700 hover:bg-lime-200/80 hover:text-lime-800",
        rose: "border-transparent bg-rose-100/70 text-rose-700 hover:bg-rose-200/80 hover:text-rose-800",
        emerald: "border-transparent bg-emerald-100/70 text-emerald-700 hover:bg-emerald-200/80 hover:text-emerald-800"
      },
      style: {
        // Style 1: Classic rounded with subtle shadow
        classic: "rounded-full px-2.5 py-0.5 text-xs border-transparent",
        
        // Style 2: Modern pill with subtle gradient 
        modern: "rounded-full px-3 py-1 text-xs bg-gradient-to-r shadow-sm hover:shadow-md hover:scale-[1.02] border-transparent",
        
        // Style 3: Sharp rectangular with subtle border accent
        sharp: "rounded-md px-2 py-1 text-xs border-l-2 bg-opacity-60"
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5", 
        lg: "text-sm px-3 py-1"
      }
    },
    compoundVariants: [
      // Modern style gets subtle gradient backgrounds 
      {
        style: "modern",
        variant: "blue",
        class: "from-blue-400/80 to-blue-500/80 text-white shadow-blue-500/15 hover:shadow-blue-500/25"
      },
      {
        style: "modern", 
        variant: "green",
        class: "from-green-400/80 to-green-500/80 text-white shadow-green-500/15 hover:shadow-green-500/25"
      },
      {
        style: "modern",
        variant: "purple", 
        class: "from-purple-400/80 to-purple-500/80 text-white shadow-purple-500/15 hover:shadow-purple-500/25"
      },
      {
        style: "modern",
        variant: "orange",
        class: "from-orange-400/80 to-orange-500/80 text-white shadow-orange-500/15 hover:shadow-orange-500/25"
      },
      {
        style: "modern",
        variant: "pink",
        class: "from-pink-400/80 to-pink-500/80 text-white shadow-pink-500/15 hover:shadow-pink-500/25"
      },
      {
        style: "modern",
        variant: "indigo", 
        class: "from-indigo-400/80 to-indigo-500/80 text-white shadow-indigo-500/15 hover:shadow-indigo-500/25"
      },
      {
        style: "modern",
        variant: "teal",
        class: "from-teal-400/80 to-teal-500/80 text-white shadow-teal-500/15 hover:shadow-teal-500/25"
      },
      {
        style: "modern",
        variant: "cyan",
        class: "from-cyan-400/80 to-cyan-500/80 text-white shadow-cyan-500/15 hover:shadow-cyan-500/25"
      },
      {
        style: "modern",
        variant: "yellow",
        class: "from-yellow-400/80 to-yellow-500/80 text-white shadow-yellow-500/15 hover:shadow-yellow-500/25"
      },
      {
        style: "modern",
        variant: "lime",
        class: "from-lime-400/80 to-lime-500/80 text-white shadow-lime-500/15 hover:shadow-lime-500/25"
      },
      {
        style: "modern",
        variant: "rose",
        class: "from-rose-400/80 to-rose-500/80 text-white shadow-rose-500/15 hover:shadow-rose-500/25"
      },
      {
        style: "modern",
        variant: "emerald",
        class: "from-emerald-400/80 to-emerald-500/80 text-white shadow-emerald-500/15 hover:shadow-emerald-500/25"
      },
      
      // Sharp style gets subtle backgrounds with accent borders
      {
        style: "sharp",
        variant: "blue",
        class: "bg-blue-100 text-blue-800 border-blue-600"
      },
      {
        style: "sharp",
        variant: "green", 
        class: "bg-green-100 text-green-800 border-green-600"
      },
      {
        style: "sharp",
        variant: "purple",
        class: "bg-purple-100 text-purple-800 border-purple-600"
      },
      {
        style: "sharp",
        variant: "orange",
        class: "bg-orange-100 text-orange-800 border-orange-600"
      },
      {
        style: "sharp",
        variant: "pink",
        class: "bg-pink-100 text-pink-800 border-pink-600"
      },
      {
        style: "sharp",
        variant: "indigo",
        class: "bg-indigo-100 text-indigo-800 border-indigo-600"
      },
      {
        style: "sharp",
        variant: "teal",
        class: "bg-teal-100 text-teal-800 border-teal-600"
      },
      {
        style: "sharp",
        variant: "cyan",
        class: "bg-cyan-100 text-cyan-800 border-cyan-600"
      },
      {
        style: "sharp",
        variant: "yellow",
        class: "bg-yellow-100 text-yellow-800 border-yellow-600"
      },
      {
        style: "sharp",
        variant: "lime",
        class: "bg-lime-100 text-lime-800 border-lime-600"
      },
      {
        style: "sharp",
        variant: "rose",
        class: "bg-rose-100 text-rose-800 border-rose-600"
      },
      {
        style: "sharp",
        variant: "emerald",
        class: "bg-emerald-100 text-emerald-800 border-emerald-600"
      }
    ],
    defaultVariants: {
      variant: "default",
      style: "classic",
      size: "md"
    },
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
  dotColor?: string;
}

function Badge({ className, variant, style, size, educational, icon, pulse, dotColor, children, ...props }: BadgeProps) {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  return (
    <div 
      className={cn(
        badgeVariants({ variant: finalVariant, style, size }), 
        pulse && "animate-pulse",
        className
      )} 
      {...props}
    >
      {dotColor && (
        <span 
          className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {icon && <span className="mr-1 flex-shrink-0">{icon}</span>}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };