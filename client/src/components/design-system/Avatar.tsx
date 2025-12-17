/**
 * Modern Colorful Avatar Component - LMS Design System v1.0
 * 
 * Enhanced avatar component with vibrant colors, educational variants, and status indicators.
 * Replaces shadcn/ui Avatar with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant color variants for fallback backgrounds
 * - Educational role-based variants
 * - Status indicators and online presence
 * - Size variants and initials generation
 * 
 * @author LMS Design System v1.0
 * @since 2025-06-24
 */

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
        "2xl": "h-20 w-20"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
);

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-full text-white font-semibold border-2 border-white shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-gray-500",
        blue: "bg-blue-600",
        green: "bg-green-600",
        purple: "bg-purple-600",
        orange: "bg-orange-600",
        pink: "bg-pink-600",
        indigo: "bg-indigo-600",
        teal: "bg-teal-600",
        cyan: "bg-cyan-600",
        yellow: "bg-yellow-600",
        lime: "bg-lime-600",
        rose: "bg-rose-600",
        emerald: "bg-emerald-600"
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-xl"
      }
    },
    defaultVariants: {
      variant: "blue",
      size: "default"
    }
  }
);

// Educational role-based variants
const educationalVariants = {
  // User roles
  admin: "purple",
  instructor: "indigo", 
  student: "blue",
  guest: "cyan",
  
  // System roles
  moderator: "orange",
  reviewer: "teal",
  editor: "green",
  
  // Status-based
  online: "green",
  away: "yellow",
  busy: "rose",
  offline: "default"
} as const;

// Status indicator positions
const statusVariants = cva(
  "absolute rounded-full border-2 border-white",
  {
    variants: {
      size: {
        sm: "h-2 w-2 bottom-0 right-0",
        default: "h-3 w-3 bottom-0 right-0",
        lg: "h-3.5 w-3.5 bottom-0 right-0",
        xl: "h-4 w-4 bottom-0.5 right-0.5",
        "2xl": "h-5 w-5 bottom-1 right-1"
      },
      status: {
        online: "bg-green-500",
        away: "bg-yellow-500",
        busy: "bg-red-500",
        offline: "bg-gray-400"
      }
    },
    defaultVariants: {
      size: "default",
      status: "offline"
    }
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  name?: string;
  variant?: keyof typeof educationalVariants | "default" | "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald" | "gray";
  educational?: keyof typeof educationalVariants;
  status?: "online" | "away" | "busy" | "offline";
  showStatus?: boolean;
}

// Helper function to generate initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Helper function to get color variant from name
function getVariantFromName(name: string): string {
  const colors = ["blue", "green", "purple", "orange", "pink", "indigo", "teal", "cyan", "yellow", "lime", "rose", "emerald"];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size = "default", src, alt, fallback, name, variant, educational, status, showStatus, ...props }, ref) => {
  // Determine final variant
  const normalizedEducational = educational ? educationalVariants[educational] : undefined;
  const finalVariant = normalizedEducational || variant || (name ? getVariantFromName(name) : "blue");

  const normalizedSize = size === "md" ? "default" : size;
  
  // Generate fallback text
  const fallbackText = fallback || (name ? getInitials(name) : "U");
  
  // Simple approach - always use direct div for now
  return (
    <div className="relative inline-block">
      <div
        className={cn(
          // Base avatar styles
          "flex items-center justify-center rounded-full font-semibold text-white",
          // Size variants
          normalizedSize === "sm" && "h-8 w-8 text-xs",
          normalizedSize === "default" && "h-10 w-10 text-sm", 
          normalizedSize === "lg" && "h-12 w-12 text-base",
          normalizedSize === "xl" && "h-16 w-16 text-lg",
          normalizedSize === "2xl" && "h-20 w-20 text-xl",
          // Color variants
          finalVariant === "blue" && "bg-blue-600",
          finalVariant === "green" && "bg-green-600",
          finalVariant === "purple" && "bg-purple-600",
          finalVariant === "orange" && "bg-orange-600",
          finalVariant === "pink" && "bg-pink-600",
          finalVariant === "indigo" && "bg-indigo-600",
          finalVariant === "teal" && "bg-teal-600",
          finalVariant === "cyan" && "bg-cyan-600",
          finalVariant === "yellow" && "bg-yellow-600",
          finalVariant === "lime" && "bg-lime-600",
          finalVariant === "rose" && "bg-rose-600",
          finalVariant === "emerald" && "bg-emerald-600",
          finalVariant === "gray" && "bg-gray-600",
          finalVariant === "admin" && "bg-purple-600",
          finalVariant === "instructor" && "bg-indigo-600",
          finalVariant === "student" && "bg-blue-600",
          finalVariant === "guest" && "bg-cyan-600",
          className
        )}
      >
        {fallbackText}
      </div>
      
      {showStatus && status && (
        <div 
          className={cn(
            "absolute rounded-full border-2 border-white",
            normalizedSize === "sm" && "h-2 w-2 bottom-0 right-0",
            normalizedSize === "default" && "h-3 w-3 bottom-0 right-0",
            normalizedSize === "lg" && "h-3.5 w-3.5 bottom-0 right-0",
            normalizedSize === "xl" && "h-4 w-4 bottom-0.5 right-0.5",
            normalizedSize === "2xl" && "h-5 w-5 bottom-1 right-1",
            status === "online" && "bg-green-500",
            status === "away" && "bg-yellow-500",
            status === "busy" && "bg-red-500",
            status === "offline" && "bg-gray-400"
          )}
        />
      )}
    </div>
  );
});
Avatar.displayName = "Avatar";

// Legacy components for backward compatibility
const AvatarImage = AvatarPrimitive.Image;
const AvatarFallback = AvatarPrimitive.Fallback;

export { Avatar, AvatarImage, AvatarFallback };