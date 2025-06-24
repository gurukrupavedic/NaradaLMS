/**
 * LMS Text Segment Component - Vedic LMS Design System
 * 
 * Specialized text segment cards for ChapterEditor with proper interactive states,
 * numbering pills, action icons, and content-only display (no artificial titles).
 * 
 * Features:
 * - Content-only display (no titles/names)
 * - Interactive states: static, dragging, selected
 * - Numbering pill for segment order
 * - Delete and mapping status icons
 * - 24-color variant system with inspector integration
 * - Proper LMS-specific design patterns
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Trash2, Link2, Link2Off } from "lucide-react";

const textSegmentVariants = cva(
  "relative bg-white border rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing group",
  {
    variants: {
      variant: {
        // 24-color system variants
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
        selected: "shadow-lg shadow-blue-200/40 bg-gradient-to-r from-blue-50/80 to-white border-blue-300/60 scale-[1.01]"
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
      variant: "gray"
    }
  }
);

export interface TextSegmentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof textSegmentVariants> {
  content: string;
  segmentNumber?: number;
  maxLength?: number;
  isMapped?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onToggleMapping?: () => void;
  showActions?: boolean;
}

const TextSegment = React.forwardRef<HTMLDivElement, TextSegmentProps>(
  ({ 
    className, 
    content, 
    segmentNumber,
    maxLength = 150, 
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
    onClick,
    ...props 
  }, ref) => {
    // Determine state based on props
    const currentState = isDragging ? "dragging" : isSelected ? "selected" : "static";
    const finalState = state || currentState;
    
    // Truncate content if needed
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;
    
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) {
        onSelect?.();
        onClick?.(e);
      }
    };

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
        className={cn(textSegmentVariants({ variant, state: finalState, size }), className)}
        onClick={handleClick}
        {...props}
      >
        {/* Numbering Pill */}
        {segmentNumber && (
          <div className={cn(numberPillVariants({ variant }))}>
            {segmentNumber}
          </div>
        )}



        {/* Action Icons (visible on hover) */}
        {showActions && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Mapping Status Icon */}
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
              {isMapped ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
            </button>

            {/* Delete Icon */}
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete segment"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Content - No title, just content */}
        <div className={cn(
          "leading-relaxed text-gray-800 cursor-grab active:cursor-grabbing",
          segmentNumber ? "mt-2" : "",
          showActions ? "pr-16" : "", // Space for action icons
          size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base"
        )}>
          {truncatedContent}
        </div>

        {/* Status Footer (optional visual indicator) */}
        {(isSelected || isMapped) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {isSelected && (
              <div className="flex items-center gap-1 text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Selected</span>
              </div>
            )}
            {isMapped && (
              <div className="flex items-center gap-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Mapped</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);
TextSegment.displayName = "TextSegment";

export { TextSegment, textSegmentVariants };