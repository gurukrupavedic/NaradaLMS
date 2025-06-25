/**
 * Enhanced Button Component - Vedic LMS Design System
 * 
 * Advanced button component with 5 sophisticated styling approaches.
 * All styles follow our unified design system principles with vibrant colors.
 * 
 * Styling Approaches:
 * - classic: Clean baseline (current style)
 * - fluorescent: Dashboard tile-inspired glow effects  
 * - gradient: Modern gradient backgrounds with depth
 * - enhanced: Sophisticated depth and shadow system
 * - card: Feature card-inspired hover mechanics
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// Base styles for all buttons
const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

// Size variants with proper progression
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

// Enhanced color configuration for all styling approaches
const colorConfig = {
  blue: { 
    primary: "bg-blue-500", hover: "hover:bg-blue-600", 
    text: "text-blue-700", border: "border-blue-300", 
    hoverBorder: "hover:border-blue-400", bgHover: "hover:bg-blue-50",
    fluorescent: "hover:shadow-[0_4px_20px_rgba(59,130,246,0.6)] hover:shadow-blue-200/80",
    gradient: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(59,130,246,0.3),0_4px_20px_rgba(219,234,254,1),0_0_25px_rgba(219,234,254,0.6)]"
  },
  green: { 
    primary: "bg-green-500", hover: "hover:bg-green-600", 
    text: "text-green-700", border: "border-green-300", 
    hoverBorder: "hover:border-green-400", bgHover: "hover:bg-green-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(220,252,231,0.8)]",
    gradient: "bg-gradient-to-r from-green-500 to-green-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(16,185,129,0.3),0_4px_20px_rgba(220,252,231,1),0_0_25px_rgba(220,252,231,0.6)]"
  },
  purple: { 
    primary: "bg-purple-500", hover: "hover:bg-purple-600", 
    text: "text-purple-700", border: "border-purple-300", 
    hoverBorder: "hover:border-purple-400", bgHover: "hover:bg-purple-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(243,232,255,0.8)]",
    gradient: "bg-gradient-to-r from-purple-500 to-purple-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(139,92,246,0.3),0_4px_20px_rgba(243,232,255,1),0_0_25px_rgba(243,232,255,0.6)]"
  },
  orange: { 
    primary: "bg-orange-500", hover: "hover:bg-orange-600", 
    text: "text-orange-700", border: "border-orange-300", 
    hoverBorder: "hover:border-orange-400", bgHover: "hover:bg-orange-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(255,237,213,0.8)]",
    gradient: "bg-gradient-to-r from-orange-500 to-orange-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(249,115,22,0.3),0_4px_20px_rgba(255,237,213,1),0_0_25px_rgba(255,237,213,0.6)]"
  },
  pink: { 
    primary: "bg-pink-500", hover: "hover:bg-pink-600", 
    text: "text-pink-700", border: "border-pink-300", 
    hoverBorder: "hover:border-pink-400", bgHover: "hover:bg-pink-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(252,231,243,0.8)]",
    gradient: "bg-gradient-to-r from-pink-500 to-pink-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(236,72,153,0.3),0_4px_20px_rgba(252,231,243,1),0_0_25px_rgba(252,231,243,0.6)]"
  },
  indigo: { 
    primary: "bg-indigo-500", hover: "hover:bg-indigo-600", 
    text: "text-indigo-700", border: "border-indigo-300", 
    hoverBorder: "hover:border-indigo-400", bgHover: "hover:bg-indigo-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(224,231,255,0.8)]",
    gradient: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(99,102,241,0.3),0_4px_20px_rgba(224,231,255,1),0_0_25px_rgba(224,231,255,0.6)]"
  },
  teal: { 
    primary: "bg-teal-500", hover: "hover:bg-teal-600", 
    text: "text-teal-700", border: "border-teal-300", 
    hoverBorder: "hover:border-teal-400", bgHover: "hover:bg-teal-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(204,251,241,0.8)]",
    gradient: "bg-gradient-to-r from-teal-500 to-teal-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(20,184,166,0.3),0_4px_20px_rgba(204,251,241,1),0_0_25px_rgba(204,251,241,0.6)]"
  },
  cyan: { 
    primary: "bg-cyan-500", hover: "hover:bg-cyan-600", 
    text: "text-cyan-700", border: "border-cyan-300", 
    hoverBorder: "hover:border-cyan-400", bgHover: "hover:bg-cyan-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(207,250,254,0.8)]",
    gradient: "bg-gradient-to-r from-cyan-500 to-cyan-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(8,145,178,0.3),0_4px_20px_rgba(207,250,254,1),0_0_25px_rgba(207,250,254,0.6)]"
  },
  yellow: { 
    primary: "bg-yellow-500", hover: "hover:bg-yellow-600", 
    text: "text-yellow-700", border: "border-yellow-300", 
    hoverBorder: "hover:border-yellow-400", bgHover: "hover:bg-yellow-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(254,249,195,0.8)]",
    gradient: "bg-gradient-to-r from-yellow-500 to-yellow-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(202,138,4,0.3),0_4px_20px_rgba(254,249,195,1),0_0_25px_rgba(254,249,195,0.6)]"
  },
  lime: { 
    primary: "bg-lime-500", hover: "hover:bg-lime-600", 
    text: "text-lime-700", border: "border-lime-300", 
    hoverBorder: "hover:border-lime-400", bgHover: "hover:bg-lime-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(236,252,203,0.8)]",
    gradient: "bg-gradient-to-r from-lime-500 to-lime-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(101,163,13,0.3),0_4px_20px_rgba(236,252,203,1),0_0_25px_rgba(236,252,203,0.6)]"
  },
  rose: { 
    primary: "bg-rose-500", hover: "hover:bg-rose-600", 
    text: "text-rose-700", border: "border-rose-300", 
    hoverBorder: "hover:border-rose-400", bgHover: "hover:bg-rose-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(255,228,230,0.8)]",
    gradient: "bg-gradient-to-r from-rose-500 to-rose-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(244,63,94,0.3),0_4px_20px_rgba(255,228,230,1),0_0_25px_rgba(255,228,230,0.6)]"
  },
  emerald: { 
    primary: "bg-emerald-500", hover: "hover:bg-emerald-600", 
    text: "text-emerald-700", border: "border-emerald-300", 
    hoverBorder: "hover:border-emerald-400", bgHover: "hover:bg-emerald-50",
    fluorescent: "hover:shadow-[0_4px_14px_rgba(209,250,229,0.8)]",
    gradient: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    cardGlow: "hover:shadow-[0_8px_25px_rgba(0,0,0,0.08),0_0_0_1px_rgba(16,185,129,0.3),0_4px_20px_rgba(209,250,229,1),0_0_25px_rgba(209,250,229,0.6)]"
  }
};

// Styling approach generators with dramatic visual differences
const getStyleApproach = (variant: string, color: string, styleApproach: string) => {
  const colorInfo = colorConfig[color as keyof typeof colorConfig];
  if (!colorInfo) return "";

  const approaches = {
    solid: {
      classic: `${colorInfo.primary} ${colorInfo.hover} text-white shadow-sm hover:shadow-md transition-all duration-200`,
      
      fluorescent: `${colorInfo.primary} ${colorInfo.hover} text-white shadow-md hover:shadow-[0_0_30px_rgba(59,130,246,0.8),0_0_60px_rgba(59,130,246,0.4)] hover:transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 border-2 border-blue-400/30 hover:border-blue-300/60`,
      
      gradient: `bg-gradient-to-br from-${color}-400 via-${color}-500 to-${color}-600 hover:from-${color}-500 hover:via-${color}-600 hover:to-${color}-700 text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20`,
      
      enhanced: `${colorInfo.primary} ${colorInfo.hover} text-white shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:transform hover:-translate-y-2 hover:scale-110 transition-all duration-400 ring-2 ring-${color}-200 hover:ring-${color}-300`,
      
      card: `${colorInfo.primary} text-white shadow-lg hover:shadow-[0_8px_25px_rgba(0,0,0,0.15),0_0_0_2px_rgba(59,130,246,0.4),0_4px_20px_rgba(219,234,254,1),0_0_25px_rgba(219,234,254,0.8)] hover:transform hover:-translate-y-1 transition-all duration-300 border border-${color}-300/50 hover:border-${color}-200`
    },
    outline: {
      classic: `border-2 ${colorInfo.border} ${colorInfo.hoverBorder} bg-white ${colorInfo.bgHover} ${colorInfo.text} transition-all duration-200`,
      
      fluorescent: `border-3 border-${color}-400 bg-white ${colorInfo.text} hover:bg-${color}-50 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:border-${color}-500 hover:transform hover:-translate-y-1 transition-all duration-300`,
      
      gradient: `border-3 border-${color}-400 bg-white ${colorInfo.text} hover:bg-gradient-to-r hover:from-${color}-500 hover:to-${color}-600 hover:text-white hover:border-transparent hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl`,
      
      enhanced: `border-3 border-${color}-400 bg-white ${colorInfo.text} hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] hover:bg-${color}-500 hover:text-white hover:border-${color}-500 hover:transform hover:-translate-y-2 hover:scale-105 transition-all duration-400`,
      
      card: `border-3 border-${color}-300 bg-white ${colorInfo.text} hover:shadow-[0_8px_25px_rgba(0,0,0,0.1),0_0_0_2px_rgba(59,130,246,0.3),0_4px_20px_rgba(219,234,254,0.8)] hover:border-${color}-400 hover:bg-${color}-25 transition-all duration-300`
    },
    ghost: {
      classic: `${colorInfo.bgHover} ${colorInfo.text} hover:bg-opacity-80 transition-all duration-200`,
      
      fluorescent: `${colorInfo.text} hover:bg-gradient-to-r hover:from-${color}-100 hover:to-${color}-200 hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:transform hover:-translate-y-1 hover:scale-105 transition-all duration-300`,
      
      gradient: `${colorInfo.text} hover:bg-gradient-to-r hover:from-${color}-500 hover:to-${color}-600 hover:text-white hover:shadow-xl hover:scale-105 transition-all duration-300`,
      
      enhanced: `${colorInfo.text} hover:bg-${color}-500 hover:text-white hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] hover:transform hover:-translate-y-2 hover:scale-110 transition-all duration-400`,
      
      card: `${colorInfo.text} hover:bg-white hover:shadow-[0_8px_25px_rgba(0,0,0,0.1),0_0_0_1px_rgba(59,130,246,0.3),0_4px_20px_rgba(219,234,254,0.8)] hover:transform hover:-translate-y-1 transition-all duration-300`
    }
  };

  return approaches[variant as keyof typeof approaches]?.[styleApproach as keyof typeof approaches.solid] || "";
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outline" | "ghost";
  color?: keyof typeof colorConfig;
  size?: keyof typeof sizeStyles;
  styleApproach?: "classic" | "fluorescent" | "gradient" | "enhanced" | "card";
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
    styleApproach = "classic",
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
      getStyleApproach(variant, color, styleApproach),
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
          <svg
            className={cn(
              "animate-spin",
              size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
            )}
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
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