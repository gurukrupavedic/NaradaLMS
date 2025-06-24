/**
 * Modern Loading Components - Vedic LMS Design System
 * 
 * Comprehensive loading states with vibrant colors and educational variants.
 * Perfect for content loading, processing states, and skeleton UI in LMS.
 * 
 * Features:
 * - Multiple loading patterns: spinner, skeleton, progress
 * - 12 vibrant color variants matching design system
 * - Educational semantic variants for LMS contexts
 * - Size variants and custom messaging
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Spinner Variants
const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-solid border-current border-r-transparent",
  {
    variants: {
      variant: {
        default: "text-gray-600",
        blue: "text-blue-600",
        green: "text-green-600",
        purple: "text-purple-600",
        orange: "text-orange-600",
        pink: "text-pink-600",
        indigo: "text-indigo-600",
        teal: "text-teal-600",
        cyan: "text-cyan-600",
        yellow: "text-yellow-600",
        lime: "text-lime-600",
        rose: "text-rose-600",
        emerald: "text-emerald-600"
      },
      size: {
        sm: "h-4 w-4 border",
        md: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-2",
        xl: "h-12 w-12 border-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

// Skeleton Variants
const skeletonVariants = cva(
  "animate-pulse rounded-md bg-gray-200",
  {
    variants: {
      variant: {
        default: "bg-gray-200",
        blue: "bg-blue-100",
        green: "bg-green-100",
        purple: "bg-purple-100",
        orange: "bg-orange-100",
        pink: "bg-pink-100",
        indigo: "bg-indigo-100",
        teal: "bg-teal-100",
        cyan: "bg-cyan-100",
        yellow: "bg-yellow-100",
        lime: "bg-lime-100",
        rose: "bg-rose-100",
        emerald: "bg-emerald-100"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  // Content operations
  loading: "blue",
  processing: "purple",
  uploading: "orange",
  saving: "green",
  
  // Audio operations
  "audio-processing": "orange",
  "audio-loading": "teal",
  
  // Content types
  chapter: "indigo",
  lesson: "cyan",
  assessment: "pink"
} as const;

// Spinner Component
export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  educational?: keyof typeof educationalVariants;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, variant, size, educational, ...props }, ref) => {
    const finalVariant = educational ? educationalVariants[educational] : variant;
    
    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ variant: finalVariant, size }), className)}
        {...props}
      />
    );
  }
);
Spinner.displayName = "Spinner";

// Skeleton Component
export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  educational?: keyof typeof educationalVariants;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, educational, ...props }, ref) => {
    const finalVariant = educational ? educationalVariants[educational] : variant;
    
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant: finalVariant }), className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

// Loading Screen Component
export interface LoadingScreenProps {
  message?: string;
  variant?: keyof typeof educationalVariants | "default";
  educational?: keyof typeof educationalVariants;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading...",
  variant,
  educational,
  size = "lg",
  className
}) => {
  const finalVariant = educational || variant;
  
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4 p-8", className)}>
      <Spinner variant={finalVariant as any} size={size} />
      <p className="text-sm text-gray-600 animate-pulse">{message}</p>
    </div>
  );
};

// Content Loading Skeleton Templates
const ContentSkeleton: React.FC<{ variant?: any; educational?: keyof typeof educationalVariants }> = ({ 
  variant, 
  educational 
}) => {
  const finalVariant = educational ? educationalVariants[educational] : variant;
  
  return (
    <div className="space-y-4">
      <Skeleton variant={finalVariant} className="h-6 w-3/4" />
      <Skeleton variant={finalVariant} className="h-4 w-full" />
      <Skeleton variant={finalVariant} className="h-4 w-5/6" />
      <Skeleton variant={finalVariant} className="h-4 w-2/3" />
    </div>
  );
};

const ChapterSkeleton: React.FC<{ educational?: keyof typeof educationalVariants }> = ({ educational }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton educational={educational} className="h-8 w-1/2" />
        <Skeleton educational={educational} className="h-4 w-1/4" />
      </div>
      <div className="space-y-3">
        <Skeleton educational={educational} className="h-4 w-full" />
        <Skeleton educational={educational} className="h-4 w-11/12" />
        <Skeleton educational={educational} className="h-4 w-3/4" />
      </div>
      <div className="flex space-x-4">
        <Skeleton educational={educational} className="h-10 w-20" />
        <Skeleton educational={educational} className="h-10 w-24" />
      </div>
    </div>
  );
};

const AudioLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Skeleton educational="audio-processing" className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton educational="audio-processing" className="h-4 w-1/3" />
          <Skeleton educational="audio-processing" className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton educational="audio-processing" className="h-2 w-full" />
      <div className="flex justify-center space-x-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} educational="audio-processing" className="h-8 w-1 rounded-full" />
        ))}
      </div>
    </div>
  );
};

// Main Loading export with all variants
const Loading = Object.assign(LoadingScreen, {
  Spinner,
  Skeleton,
  Screen: LoadingScreen,
  Content: ContentSkeleton,
  Chapter: ChapterSkeleton,
  Audio: AudioLoadingSkeleton
});

export { 
  Loading,
  LoadingScreen,
  Spinner, 
  Skeleton,
  ContentSkeleton,
  ChapterSkeleton,
  AudioLoadingSkeleton,
  spinnerVariants,
  skeletonVariants 
};