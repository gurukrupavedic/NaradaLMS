/**
 * LMS Text Segment Component - LMS Design System v1.0
 * 
 * Clean, visual-first text segment cards for ChapterEditor with minimal UI clutter.
 * Follows modern design principles: icon-based status, clean color hierarchy.
 * 
 * Features:
 * - Responsive auto-height with text wrapping (no truncation)
 * - Icon-only mapping status (green Link2/gray Link2Off)
 * - Universal blue selection state (works with any variant color)
 * - Clean interactive states: static, dragging, selected
 * - Hover-revealed delete action, persistent mapping icon
 * - Content-only display with numbered pills
 * - 24-color variant system with no color conflicts
 * - Script-aware font rendering (Telugu/JIMS, Hindi/Adishila San, English/JIMS)
 * - Custom font sizing support (28px default for Vedic content)
 * 
 * @author LMS Design System v1.0
 * @since 2025-06-24
 * @updated 2025-10-24 - Added script and fontSize props
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Trash2, Zap } from "lucide-react";

// Connected circles icon for "Mapped" status
const ConnectedCirclesIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="12" r="3" />
    <line x1="9" y1="12" x2="15" y2="12" />
  </svg>
);

const textSegmentVariants = cva(
  "relative bg-white border rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing group",
  {
    variants: {
      variant: {
        // 24-color system variants with enhanced visual feedback
        blue: "border-l-4 border-l-blue-500 border-gray-200 hover:border-l-blue-600 hover:bg-blue-50/30 hover:shadow-md",
        green: "border-l-4 border-l-green-500 border-gray-200 hover:border-l-green-600 hover:bg-green-50/30 hover:shadow-md",
        purple: "border-l-4 border-l-purple-500 border-gray-200 hover:border-l-purple-600 hover:bg-purple-50/30 hover:shadow-md",
        orange: "border-l-4 border-l-orange-500 border-gray-200 hover:border-l-orange-600 hover:bg-orange-50/30 hover:shadow-md",
        pink: "border-l-4 border-l-pink-500 border-gray-200 hover:border-l-pink-600 hover:bg-pink-50/30 hover:shadow-md",
        indigo: "border-l-4 border-l-indigo-500 border-gray-200 hover:border-l-indigo-600 hover:bg-indigo-50/30 hover:shadow-md",
        teal: "border-l-4 border-l-teal-500 border-gray-200 hover:border-l-teal-600 hover:bg-teal-50/30 hover:shadow-md",
        cyan: "border-l-4 border-l-cyan-500 border-gray-200 hover:border-l-cyan-600 hover:bg-cyan-50/30 hover:shadow-md",
        yellow: "border-l-4 border-l-yellow-500 border-gray-200 hover:border-l-yellow-600 hover:bg-yellow-50/30 hover:shadow-md",
        lime: "border-l-4 border-l-lime-500 border-gray-200 hover:border-l-lime-600 hover:bg-lime-50/30 hover:shadow-md",
        rose: "border-l-4 border-l-rose-500 border-gray-200 hover:border-l-rose-600 hover:bg-rose-50/30 hover:shadow-md",
        emerald: "border-l-4 border-l-emerald-500 border-gray-200 hover:border-l-emerald-600 hover:bg-emerald-50/30 hover:shadow-md",
        gray: "border-l-4 border-l-gray-400 border-gray-200 hover:border-l-gray-500 hover:bg-gray-50 hover:shadow-md"
      },

      state: {
        static: "",
        dragging: "shadow-lg scale-[0.98] opacity-75 rotate-1 cursor-grabbing z-10",
        selected: "shadow-lg shadow-indigo-200/40 bg-gradient-to-r from-indigo-50/80 to-white border-indigo-300/60 scale-[1.01]"
      },
      size: {
        sm: "p-3 text-sm",
        md: "p-4 text-base", 
        lg: "p-5 text-lg"
      }
    },
    defaultVariants: {
      variant: "gray",
      state: "static",
      size: "md"
    }
  }
);

const numberPillVariants = cva(
  "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm z-10",
  {
    variants: {
      variant: {
        blue: "bg-blue-500",
        green: "bg-green-500", 
        purple: "bg-purple-500",
        orange: "bg-orange-500",
        pink: "bg-pink-500",
        indigo: "bg-indigo-500",
        teal: "bg-teal-500",
        cyan: "bg-cyan-500",
        yellow: "bg-yellow-600",
        lime: "bg-lime-500",
        rose: "bg-rose-500",
        emerald: "bg-emerald-500",
        gray: "bg-gray-500"
      }
    },
    defaultVariants: {
      variant: "gray",
      size: "md"
    }
  }
);

export interface TextSegmentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof textSegmentVariants> {
  content: string;
  segmentNumber?: number;
  maxLines?: number; // Optional line limit instead of character truncation
  isMapped?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onToggleMapping?: () => void;
  showActions?: boolean;
  script?: 'te' | 'hi' | 'en'; // Script for automatic font-family mapping
  fontSize?: string; // Custom font size (e.g., '28px', '1.5rem')
}

const TextSegment = React.forwardRef<HTMLDivElement, TextSegmentProps>(
  ({ 
    className, 
    content, 
    segmentNumber,
    maxLines, // Optional line limiting instead of character truncation
    variant = "gray",
    size = "md",
    state,
    isMapped = false,
    isSelected = false,
    isDragging = false,
    onSelect,
    onDelete,
    onToggleMapping,
    showActions = true,
    script,
    fontSize,
    onClick,
    style,
    ...props 
  }, ref) => {
    // Determine state based on props
    const currentState = isDragging ? "dragging" : isSelected ? "selected" : "static";
    const finalState = state || currentState;
    
    // Get font family based on script
    const getFontFamily = (scriptType?: 'te' | 'hi' | 'en'): string | undefined => {
      if (!scriptType) return undefined;
      
      switch (scriptType) {
        case 'te':
          return "'JIMS', 'Noto Sans Telugu', sans-serif";
        case 'hi':
          return "'AdishilaSanVedic', 'Noto Sans Devanagari', serif";
        case 'en':
          return "'AdishilaSan', 'Noto Sans', sans-serif";
        default:
          return undefined;
      }
    };
    
    const fontFamily = getFontFamily(script);
    
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) {
        onSelect?.();
        onClick?.(e);
      }
    };

    // Clean className without mapping background tints
    const combinedClassName = cn(
      textSegmentVariants({ variant, state: finalState, size }),
      className
    );

    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.();
    };

    const handleMappingClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleMapping?.();
    };
    
    return (
      <div
        ref={ref}
        className={combinedClassName}
        onClick={handleClick}
        {...props}
      >
        {/* Numbering Pill */}
        {segmentNumber && (
          <div className={cn(numberPillVariants({ variant: isSelected ? "indigo" : variant }))}>
            {segmentNumber}
          </div>
        )}



        {/* Action Icons - Always visible for mapping status, hover for delete */}
        {showActions && (
          <div className="absolute top-2 right-2 flex gap-1 transition-opacity">
            {/* Mapping Status Icon - Always visible */}
            <button
              onClick={handleMappingClick}
              className={cn(
                "p-1 rounded transition-colors",
                isMapped 
                  ? "text-green-600 hover:bg-green-100" 
                  : "text-gray-400 hover:bg-gray-100"
              )}
              title={isMapped ? "Mapped to audio" : "Not mapped"}
            >
              <Zap className={cn("h-3 w-3", isMapped ? "text-green-600" : "text-gray-400")} />
            </button>

            {/* Delete Icon - Hover only */}
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete segment"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Content - Responsive with auto-height and text wrapping */}
        <div 
          className={cn(
            "leading-relaxed text-gray-800 cursor-grab active:cursor-grabbing whitespace-pre-wrap break-words",
            segmentNumber ? "mt-2" : "",
            showActions ? "pr-16" : "", // Space for action icons
            size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base",
            maxLines && "line-clamp-none", // Disable line clamping by default
            maxLines === 3 && "line-clamp-3",
            maxLines === 4 && "line-clamp-4",
            maxLines === 5 && "line-clamp-5"
          )}
          style={{
            fontFamily: fontFamily,
            fontSize: fontSize,
            ...style
          }}
        >
          {content}
        </div>


      </div>
    );
  }
);
TextSegment.displayName = "TextSegment";

export { TextSegment, textSegmentVariants };