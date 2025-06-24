/**
 * Modern Colorful Avatar Component - Vedic LMS Design System
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
 * @author Vedic LMS Design System
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
  "flex h-full w-full items-center justify-center rounded-full text-white font-medium",
  {
    variants: {
      variant: {
        default: "bg-muted",
        blue: "bg-gradient-to-br from-blue-500 to-blue-600",
        green: "bg-gradient-to-br from-green-500 to-green-600",
        purple: "bg-gradient-to-br from-purple-500 to-purple-600",
        orange: "bg-gradient-to-br from-orange-500 to-orange-600",
        pink: "bg-gradient-to-br from-pink-500 to-pink-600",
        indigo: "bg-gradient-to-br from-indigo-500 to-indigo-600",
        teal: "bg-gradient-to-br from-teal-500 to-teal-600",
        cyan: "bg-gradient-to-br from-cyan-500 to-cyan-600",
        yellow: "bg-gradient-to-br from-yellow-500 to-yellow-600",
        lime: "bg-gradient-to-br from-lime-500 to-lime-600",
        rose: "bg-gradient-to-br from-rose-500 to-rose-600",
        emerald: "bg-gradient-to-br from-emerald-500 to-emerald-600"
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
      variant: "default",
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
  variant?: keyof typeof educationalVariants | "default";
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
function getVariantFromName(name: string): keyof typeof educationalVariants {
  const colors = Object.keys(educationalVariants) as (keyof typeof educationalVariants)[];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, src, alt, fallback, name, variant, educational, status, showStatus, ...props }, ref) => {
  // Determine final variant
  const finalVariant = educational || variant || (name ? getVariantFromName(name) : "default");
  
  // Generate fallback text
  const fallbackText = fallback || (name ? getInitials(name) : "?");
  
  // If no src provided, use direct fallback without Radix Image
  if (!src) {
    return (
      <div className="relative inline-block">
        <div
          ref={ref}
          className={cn(
            avatarVariants({ size }),
            avatarFallbackVariants({ 
              variant: finalVariant === "default" ? "blue" : finalVariant, 
              size 
            }),
            className
          )}
          {...props}
        >
          {fallbackText}
        </div>
        
        {showStatus && status && (
          <div className={cn(statusVariants({ size, status }))} />
        )}
      </div>
    );
  }

  // Use Radix only when src is provided
  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        <AvatarPrimitive.Image
          src={src}
          alt={alt || name}
          className="aspect-square h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className={cn(avatarFallbackVariants({ 
            variant: finalVariant === "default" ? "blue" : finalVariant, 
            size 
          }))}
        >
          {fallbackText}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      
      {showStatus && status && (
        <div className={cn(statusVariants({ size, status }))} />
      )}
    </div>
  );
});
Avatar.displayName = "Avatar";

// Legacy components for backward compatibility
const AvatarImage = AvatarPrimitive.Image;
const AvatarFallback = AvatarPrimitive.Fallback;

export { Avatar, AvatarImage, AvatarFallback };