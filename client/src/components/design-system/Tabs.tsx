/**
 * Modern Colorful Tabs Component - Vedic LMS Design System
 * 
 * Enhanced tabs component with vibrant colors, educational variants, and smooth animations.
 * Replaces shadcn/ui Tabs with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant color variants with active state indicators
 * - Educational semantic variants for LMS contexts
 * - Smooth transitions and hover effects
 * - Icon support and badge integration
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tabsListVariants = cva(
  "inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
  {
    variants: {
      variant: {
        default: "bg-muted",
        blue: "bg-blue-50 border border-blue-200",
        green: "bg-green-50 border border-green-200",
        purple: "bg-purple-50 border border-purple-200",
        orange: "bg-orange-50 border border-orange-200",
        pink: "bg-pink-50 border border-pink-200",
        indigo: "bg-indigo-50 border border-indigo-200",
        teal: "bg-teal-50 border border-teal-200",
        cyan: "bg-cyan-50 border border-cyan-200",
        yellow: "bg-yellow-50 border border-yellow-200",
        lime: "bg-lime-50 border border-lime-200",
        rose: "bg-rose-50 border border-rose-200",
        emerald: "bg-emerald-50 border border-emerald-200"
      },
      size: {
        sm: "h-8 p-0.5",
        md: "h-12 p-1",
        lg: "h-16 p-1.5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(59,130,246,0.2)] disabled:pointer-events-none disabled:opacity-50 gap-2",
  {
    variants: {
      variant: {
        default: "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-background/60",
        blue: "text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(59,130,246,0.25)] hover:bg-blue-100 hover:text-blue-800",
        green: "text-green-700 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(34,197,94,0.25)] hover:bg-green-100 hover:text-green-800",
        purple: "text-purple-700 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(147,51,234,0.25)] hover:bg-purple-100 hover:text-purple-800",
        orange: "text-orange-700 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(249,115,22,0.25)] hover:bg-orange-100 hover:text-orange-800",
        pink: "text-pink-700 data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(236,72,153,0.25)] hover:bg-pink-100 hover:text-pink-800",
        indigo: "text-indigo-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(99,102,241,0.25)] hover:bg-indigo-100 hover:text-indigo-800",
        teal: "text-teal-700 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(20,184,166,0.25)] hover:bg-teal-100 hover:text-teal-800",
        cyan: "text-cyan-700 data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(8,145,178,0.25)] hover:bg-cyan-100 hover:text-cyan-800",
        yellow: "text-yellow-700 data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(202,138,4,0.25)] hover:bg-yellow-100 hover:text-yellow-800",
        lime: "text-lime-700 data-[state=active]:bg-lime-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(101,163,13,0.25)] hover:bg-lime-100 hover:text-lime-800",
        rose: "text-rose-700 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(244,63,94,0.25)] hover:bg-rose-100 hover:text-rose-800",
        emerald: "text-emerald-700 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(16,185,129,0.25)] hover:bg-emerald-100 hover:text-emerald-800"
      },
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-4 py-2.5 text-sm", 
        lg: "px-6 py-3 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

// Educational semantic variants for LMS contexts
const educationalVariants = {
  // ChapterEditor tabs
  content: "green",
  audio: "orange", 
  segments: "purple",
  mapping: "teal",
  
  // General LMS tabs
  overview: "blue",
  lessons: "indigo",
  progress: "purple",
  settings: "cyan",
  users: "pink",
  reports: "emerald"
} as const;

const Tabs = TabsPrimitive.Root;

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {
  educational?: keyof typeof educationalVariants;
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, size, educational, ...props }, ref) => {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(tabsListVariants({ variant: finalVariant, size }), className)}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  educational?: keyof typeof educationalVariants;
  badge?: string | number;
  icon?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, size, educational, badge, icon, children, ...props }, ref) => {
  // Use educational variant if provided
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(tabsTriggerVariants({ variant: finalVariant }), className)}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge && (
        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white/20 rounded-full">
          {badge}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };