/**
 * Modern Colorful Alert Component - Vedic LMS Design System
 * 
 * Enhanced alert component with vibrant colors, educational variants, and status indicators.
 * Replaces shadcn/ui Alert with modern colorful design system aesthetics.
 * 
 * Features:
 * - 12 vibrant color variants with icon support
 * - Educational semantic variants for LMS contexts
 * - Dismissible alerts with smooth animations
 * - Success, warning, error, and info states
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        
        // Success variants
        success: "border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600",
        "success-solid": "border-green-600 bg-green-600 text-white [&>svg]:text-green-100",
        
        // Warning variants  
        warning: "border-yellow-200 bg-yellow-50 text-yellow-800 [&>svg]:text-yellow-600",
        "warning-solid": "border-yellow-600 bg-yellow-600 text-white [&>svg]:text-yellow-100",
        
        // Error variants
        error: "border-red-200 bg-red-50 text-red-800 [&>svg]:text-red-600",
        "error-solid": "border-red-600 bg-red-600 text-white [&>svg]:text-red-100",
        
        // Info variants
        info: "border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600", 
        "info-solid": "border-blue-600 bg-blue-600 text-white [&>svg]:text-blue-100",
        
        // Educational variants
        lesson: "border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600",
        progress: "border-purple-200 bg-purple-50 text-purple-800 [&>svg]:text-purple-600",
        audio: "border-orange-200 bg-orange-50 text-orange-800 [&>svg]:text-orange-600",
        completion: "border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600",
        assessment: "border-pink-200 bg-pink-50 text-pink-800 [&>svg]:text-pink-600",
        
        // Color variants
        blue: "border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600",
        green: "border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600", 
        purple: "border-purple-200 bg-purple-50 text-purple-800 [&>svg]:text-purple-600",
        orange: "border-orange-200 bg-orange-50 text-orange-800 [&>svg]:text-orange-600",
        pink: "border-pink-200 bg-pink-50 text-pink-800 [&>svg]:text-pink-600",
        indigo: "border-indigo-200 bg-indigo-50 text-indigo-800 [&>svg]:text-indigo-600",
        teal: "border-teal-200 bg-teal-50 text-teal-800 [&>svg]:text-teal-600",
        cyan: "border-cyan-200 bg-cyan-50 text-cyan-800 [&>svg]:text-cyan-600",
        yellow: "border-yellow-200 bg-yellow-50 text-yellow-800 [&>svg]:text-yellow-600",
        lime: "border-lime-200 bg-lime-50 text-lime-800 [&>svg]:text-lime-600",
        rose: "border-rose-200 bg-rose-50 text-rose-800 [&>svg]:text-rose-600",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 [&>svg]:text-emerald-600"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  // Learning states
  "lesson-complete": "completion",
  "chapter-progress": "progress", 
  "audio-ready": "audio",
  "assessment-due": "assessment",
  
  // System notifications
  "content-saved": "success",
  "upload-complete": "success",
  "mapping-progress": "info",
  "validation-error": "error",
  "draft-saved": "warning"
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  educational?: keyof typeof educationalVariants;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, educational, icon, dismissible, onDismiss, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true);
    
    // Use educational variant if provided
    const finalVariant = educational ? educationalVariants[educational] : variant;
    
    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };
    
    if (!isVisible) return null;
    
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant: finalVariant }), className)}
        {...props}
      >
        <div className={cn("flex gap-3", dismissible && "pr-8")}>
          {icon && (
            <div className="flex-shrink-0 mt-0.5">
              {icon}
            </div>
          )}
          <div className="flex-1">
            {children}
          </div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-sm opacity-70 transition-all duration-200 hover:opacity-100 focus:outline-none focus:shadow-[0_0_0_2px_rgba(59,130,246,0.3)]"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };