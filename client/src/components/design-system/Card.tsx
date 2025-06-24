/**
 * Modern Colorful Card Component - Vedic LMS Design System
 * 
 * Enhanced card component with vibrant colors, glow effects, and educational variants.
 * Replaces shadcn/ui Card with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant color variants with fluorescent glow effects
 * - Educational variants (lesson, progress, content, feature)
 * - Consistent hover states and interactions
 * - Multi-language typography support
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Color variants matching your experiments
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-gray-200 hover:border-gray-300 hover:shadow-lg",
        blue: "border-blue-200 hover:border-blue-300 hover:shadow-blue-100 hover:shadow-lg",
        green: "border-green-200 hover:border-green-300 hover:shadow-green-100 hover:shadow-lg", 
        purple: "border-purple-200 hover:border-purple-300 hover:shadow-purple-100 hover:shadow-lg",
        orange: "border-orange-200 hover:border-orange-300 hover:shadow-orange-100 hover:shadow-lg",
        pink: "border-pink-200 hover:border-pink-300 hover:shadow-pink-100 hover:shadow-lg",
        indigo: "border-indigo-200 hover:border-indigo-300 hover:shadow-indigo-100 hover:shadow-lg",
        teal: "border-teal-200 hover:border-teal-300 hover:shadow-teal-100 hover:shadow-lg",
        cyan: "border-cyan-200 hover:border-cyan-300 hover:shadow-cyan-100 hover:shadow-lg",
        yellow: "border-yellow-200 hover:border-yellow-300 hover:shadow-yellow-100 hover:shadow-lg",
        lime: "border-lime-200 hover:border-lime-300 hover:shadow-lime-100 hover:shadow-lg",
        rose: "border-rose-200 hover:border-rose-300 hover:shadow-rose-100 hover:shadow-lg",
        emerald: "border-emerald-200 hover:border-emerald-300 hover:shadow-emerald-100 hover:shadow-lg"
      },
      size: {
        sm: "p-4",
        default: "p-6", 
        lg: "p-8"
      },
      interactive: {
        true: "cursor-pointer hover:transform hover:-translate-y-1",
        false: ""
      },
      glow: {
        none: "",
        subtle: "hover:shadow-[0_4px_14px_rgba(59,130,246,0.15)]", // Default blue glow
        medium: "hover:shadow-[0_4px_20px_rgba(59,130,246,0.25)]",
        strong: "hover:shadow-[0_6px_30px_rgba(59,130,246,0.35)]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default", 
      interactive: false,
      glow: "none"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  lesson: "blue",
  progress: "purple", 
  content: "green",
  feature: "indigo",
  audio: "orange",
  text: "teal",
  assessment: "rose",
  track: "emerald"
} as const;

export interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  educational?: keyof typeof educationalVariants;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, glow, educational, ...props }, ref) => {
    // Use educational variant if provided
    const finalVariant = educational ? educationalVariants[educational] : variant;
    
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant: finalVariant, size, interactive, glow }), className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };