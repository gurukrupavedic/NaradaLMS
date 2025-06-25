/**
 * Refined Button Component - Vedic LMS Design System
 * 
 * Lightweight, modern button component with refined visual weight and clean API.
 * Removes CVA complexity for direct className composition and better performance.
 * 
 * Features:
 * - 12 refined color variants with subtle interactions
 * - Solid, outline, and ghost variants
 * - Proper loading states and icon support
 * - Consistent size progression and spacing
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Base styles for all buttons
const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none";

// Size variants with proper progression and balance
const sizeStyles = {
  sm: "h-8 px-3 py-1.5 text-sm rounded-md gap-1.5",
  default: "h-10 px-4 py-2 text-sm rounded-lg gap-2", 
  lg: "h-12 px-6 py-2.5 text-base rounded-lg gap-2.5",
  icon: {
    sm: "h-8 w-8 rounded-md",
    default: "h-10 w-10 rounded-lg", 
    lg: "h-12 w-12 rounded-lg"
  }
};

// Color variants with refined palette
const colorConfig = {
  blue: { bg: "bg-blue-500", hover: "hover:bg-blue-600", text: "text-blue-700", border: "border-blue-300", hoverBorder: "hover:border-blue-400", bgHover: "hover:bg-blue-50" },
  green: { bg: "bg-green-500", hover: "hover:bg-green-600", text: "text-green-700", border: "border-green-300", hoverBorder: "hover:border-green-400", bgHover: "hover:bg-green-50" },
  purple: { bg: "bg-purple-500", hover: "hover:bg-purple-600", text: "text-purple-700", border: "border-purple-300", hoverBorder: "hover:border-purple-400", bgHover: "hover:bg-purple-50" },
  orange: { bg: "bg-orange-500", hover: "hover:bg-orange-600", text: "text-orange-700", border: "border-orange-300", hoverBorder: "hover:border-orange-400", bgHover: "hover:bg-orange-50" },
  pink: { bg: "bg-pink-500", hover: "hover:bg-pink-600", text: "text-pink-700", border: "border-pink-300", hoverBorder: "hover:border-pink-400", bgHover: "hover:bg-pink-50" },
  indigo: { bg: "bg-indigo-500", hover: "hover:bg-indigo-600", text: "text-indigo-700", border: "border-indigo-300", hoverBorder: "hover:border-indigo-400", bgHover: "hover:bg-indigo-50" },
  teal: { bg: "bg-teal-500", hover: "hover:bg-teal-600", text: "text-teal-700", border: "border-teal-300", hoverBorder: "hover:border-teal-400", bgHover: "hover:bg-teal-50" },
  cyan: { bg: "bg-cyan-500", hover: "hover:bg-cyan-600", text: "text-cyan-700", border: "border-cyan-300", hoverBorder: "hover:border-cyan-400", bgHover: "hover:bg-cyan-50" },
  yellow: { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", text: "text-yellow-700", border: "border-yellow-300", hoverBorder: "hover:border-yellow-400", bgHover: "hover:bg-yellow-50" },
  lime: { bg: "bg-lime-500", hover: "hover:bg-lime-600", text: "text-lime-700", border: "border-lime-300", hoverBorder: "hover:border-lime-400", bgHover: "hover:bg-lime-50" },
  rose: { bg: "bg-rose-500", hover: "hover:bg-rose-600", text: "text-rose-700", border: "border-rose-300", hoverBorder: "hover:border-rose-400", bgHover: "hover:bg-rose-50" },
  emerald: { bg: "bg-emerald-500", hover: "hover:bg-emerald-600", text: "text-emerald-700", border: "border-emerald-300", hoverBorder: "hover:border-emerald-400", bgHover: "hover:bg-emerald-50" }
};

// Variant style generators
const getVariantStyles = (variant: string, color: string) => {
  const colorInfo = colorConfig[color as keyof typeof colorConfig];
  if (!colorInfo) return "";

  switch (variant) {
    case "solid":
      return `${colorInfo.bg} ${colorInfo.hover} text-white shadow-sm hover:shadow-md`;
    case "outline":
      return `border-2 ${colorInfo.border} ${colorInfo.hoverBorder} bg-white ${colorInfo.bgHover} ${colorInfo.text}`;
    case "ghost":
      return `${colorInfo.bgHover} ${colorInfo.text} hover:bg-opacity-80`;
    default:
      return `${colorInfo.bg} ${colorInfo.hover} text-white shadow-sm hover:shadow-md`;
  }
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outline" | "ghost";
  color?: keyof typeof colorConfig;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = "solid", 
    color = "blue", 
    size = "default", 
    loading = false,
    icon,
    iconPosition = "left",
    fullWidth = false,
    children, 
    disabled, 
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    const isIconOnly = !children && icon;
    
    // Use icon-specific sizing for icon-only buttons
    const sizeClass = isIconOnly ? 
      (typeof sizeStyles.icon === 'object' ? sizeStyles.icon[size] : sizeStyles.icon) : 
      sizeStyles[size];
    
    const buttonClasses = cn(
      baseStyles,
      sizeClass,
      getVariantStyles(variant, color),
      fullWidth && "w-full",
      className
    );

    return (
      <button
        className={buttonClasses}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 className={cn(
            "animate-spin",
            size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
          )} />
        )}
        {!loading && icon && iconPosition === "left" && (
          <span className={cn(
            size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
          )}>
            {icon}
          </span>
        )}
        {children}
        {!loading && icon && iconPosition === "right" && (
          <span className={cn(
            size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
          )}>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };