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
        
        // Solid Style - Rich backgrounds with white text
        blue: "border-transparent bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md",
        green: "border-transparent bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md",
        purple: "border-transparent bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md",
        orange: "border-transparent bg-orange-600 text-white hover:bg-orange-700 shadow-sm hover:shadow-md",
        pink: "border-transparent bg-pink-600 text-white hover:bg-pink-700 shadow-sm hover:shadow-md",
        indigo: "border-transparent bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md",
        teal: "border-transparent bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow-md",
        cyan: "border-transparent bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm hover:shadow-md",
        yellow: "border-transparent bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow-md",
        lime: "border-transparent bg-lime-600 text-white hover:bg-lime-700 shadow-sm hover:shadow-md",
        rose: "border-transparent bg-rose-600 text-white hover:bg-rose-700 shadow-sm hover:shadow-md",
        emerald: "border-transparent bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md"
      },
      style: {
        // Style 1: Classic rounded with subtle shadow
        classic: "rounded-full px-2.5 py-0.5 text-xs border-transparent",
        
        // Style 2: Modern pill with gradient and glow
        modern: "rounded-full px-3 py-1 text-xs bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border-transparent",
        
        // Style 3: Sharp rectangular with border accent
        sharp: "rounded-md px-2 py-1 text-xs border-l-4 bg-opacity-10 border-current"
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5", 
        lg: "text-sm px-3 py-1"
      }
    },
    compoundVariants: [
      // Modern style gets gradient backgrounds and enhanced effects
      {
        style: "modern",
        variant: "blue",
        class: "from-blue-500 to-blue-700 shadow-blue-500/25 hover:shadow-blue-500/40"
      },
      {
        style: "modern", 
        variant: "green",
        class: "from-green-500 to-green-700 shadow-green-500/25 hover:shadow-green-500/40"
      },
      {
        style: "modern",
        variant: "purple", 
        class: "from-purple-500 to-purple-700 shadow-purple-500/25 hover:shadow-purple-500/40"
      },
      {
        style: "modern",
        variant: "orange",
        class: "from-orange-500 to-orange-700 shadow-orange-500/25 hover:shadow-orange-500/40"
      },
      {
        style: "modern",
        variant: "pink",
        class: "from-pink-500 to-pink-700 shadow-pink-500/25 hover:shadow-pink-500/40"
      },
      {
        style: "modern",
        variant: "indigo", 
        class: "from-indigo-500 to-indigo-700 shadow-indigo-500/25 hover:shadow-indigo-500/40"
      },
      {
        style: "modern",
        variant: "teal",
        class: "from-teal-500 to-teal-700 shadow-teal-500/25 hover:shadow-teal-500/40"
      },
      {
        style: "modern",
        variant: "cyan",
        class: "from-cyan-500 to-cyan-700 shadow-cyan-500/25 hover:shadow-cyan-500/40"
      },
      {
        style: "modern",
        variant: "yellow",
        class: "from-yellow-500 to-yellow-700 shadow-yellow-500/25 hover:shadow-yellow-500/40"
      },
      {
        style: "modern",
        variant: "lime",
        class: "from-lime-500 to-lime-700 shadow-lime-500/25 hover:shadow-lime-500/40"
      },
      {
        style: "modern",
        variant: "rose",
        class: "from-rose-500 to-rose-700 shadow-rose-500/25 hover:shadow-rose-500/40"
      },
      {
        style: "modern",
        variant: "emerald",
        class: "from-emerald-500 to-emerald-700 shadow-emerald-500/25 hover:shadow-emerald-500/40"
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