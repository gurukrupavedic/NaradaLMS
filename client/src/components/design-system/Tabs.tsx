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
  "inline-flex items-center justify-center text-muted-foreground relative overflow-hidden backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "bg-gray-100/80 border border-gray-200/60 shadow-sm",
        blue: "bg-gradient-to-r from-blue-50/90 to-blue-100/70 border border-blue-200/60 shadow-[0_2px_8px_rgba(59,130,246,0.12)]",
        green: "bg-gradient-to-r from-green-50/90 to-green-100/70 border border-green-200/60 shadow-[0_2px_8px_rgba(34,197,94,0.12)]",
        purple: "bg-gradient-to-r from-purple-50/90 to-purple-100/70 border border-purple-200/60 shadow-[0_2px_8px_rgba(147,51,234,0.12)]",
        orange: "bg-gradient-to-r from-orange-50/90 to-orange-100/70 border border-orange-200/60 shadow-[0_2px_8px_rgba(249,115,22,0.12)]",
        pink: "bg-gradient-to-r from-pink-50/90 to-pink-100/70 border border-pink-200/60 shadow-[0_2px_8px_rgba(236,72,153,0.12)]",
        indigo: "bg-gradient-to-r from-indigo-50/90 to-indigo-100/70 border border-indigo-200/60 shadow-[0_2px_8px_rgba(99,102,241,0.12)]",
        teal: "bg-gradient-to-r from-teal-50/90 to-teal-100/70 border border-teal-200/60 shadow-[0_2px_8px_rgba(20,184,166,0.12)]",
        cyan: "bg-gradient-to-r from-cyan-50/90 to-cyan-100/70 border border-cyan-200/60 shadow-[0_2px_8px_rgba(8,145,178,0.12)]",
        yellow: "bg-gradient-to-r from-yellow-50/90 to-yellow-100/70 border border-yellow-200/60 shadow-[0_2px_8px_rgba(202,138,4,0.12)]",
        lime: "bg-gradient-to-r from-lime-50/90 to-lime-100/70 border border-lime-200/60 shadow-[0_2px_8px_rgba(101,163,13,0.12)]",
        rose: "bg-gradient-to-r from-rose-50/90 to-rose-100/70 border border-rose-200/60 shadow-[0_2px_8px_rgba(244,63,94,0.12)]",
        emerald: "bg-gradient-to-r from-emerald-50/90 to-emerald-100/70 border border-emerald-200/60 shadow-[0_2px_8px_rgba(16,185,129,0.12)]"
      },
      size: {
        sm: "h-8 p-1 rounded-lg gap-1",
        md: "h-11 p-1 rounded-lg gap-1", 
        lg: "h-13 p-1 rounded-lg gap-1"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] disabled:pointer-events-none disabled:opacity-50 gap-2 relative overflow-hidden group cursor-pointer",
  {
    variants: {
      variant: {
        default: "text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-white/60 hover:text-gray-800",
        blue: "text-blue-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(59,130,246,0.3)] hover:bg-blue-200/50 hover:text-blue-800 data-[state=active]:shadow-inner",
        green: "text-green-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(34,197,94,0.3)] hover:bg-green-200/50 hover:text-green-800 data-[state=active]:shadow-inner",
        purple: "text-purple-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(147,51,234,0.3)] hover:bg-purple-200/50 hover:text-purple-800 data-[state=active]:shadow-inner",
        orange: "text-orange-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-600 data-[state=active]:to-orange-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(249,115,22,0.3)] hover:bg-orange-200/50 hover:text-orange-800 data-[state=active]:shadow-inner",
        pink: "text-pink-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-600 data-[state=active]:to-pink-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(236,72,153,0.3)] hover:bg-pink-200/50 hover:text-pink-800 data-[state=active]:shadow-inner",
        indigo: "text-indigo-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(99,102,241,0.3)] hover:bg-indigo-200/50 hover:text-indigo-800 data-[state=active]:shadow-inner",
        teal: "text-teal-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-teal-600 data-[state=active]:to-teal-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:bg-teal-200/50 hover:text-teal-800 data-[state=active]:shadow-inner",
        cyan: "text-cyan-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(8,145,178,0.3)] hover:bg-cyan-200/50 hover:text-cyan-800 data-[state=active]:shadow-inner",
        yellow: "text-yellow-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-600 data-[state=active]:to-yellow-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(202,138,4,0.3)] hover:bg-yellow-200/50 hover:text-yellow-800 data-[state=active]:shadow-inner",
        lime: "text-lime-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-lime-600 data-[state=active]:to-lime-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(101,163,13,0.3)] hover:bg-lime-200/50 hover:text-lime-800 data-[state=active]:shadow-inner",
        rose: "text-rose-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-600 data-[state=active]:to-rose-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(244,63,94,0.3)] hover:bg-rose-200/50 hover:text-rose-800 data-[state=active]:shadow-inner",
        emerald: "text-emerald-700/80 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:bg-emerald-200/50 hover:text-emerald-800 data-[state=active]:shadow-inner"
      },
      size: {
        sm: "px-3 py-1 text-xs rounded min-w-[56px] data-[state=active]:scale-[1.02]",
        md: "px-4 py-2 text-sm rounded min-w-[72px] data-[state=active]:scale-[1.02]", 
        lg: "px-5 py-2.5 text-sm rounded-md min-w-[88px] font-medium data-[state=active]:scale-[1.02] data-[state=active]:font-semibold"
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
      className={cn(tabsTriggerVariants({ variant: finalVariant, size }), className)}
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