/**
 * Modern Text Segment Component - Vedic LMS Design System
 * 
 * Visual text segment cards with colored left borders and status indicators.
 * Perfect for showing segmented content in the ChapterEditor and learning interfaces.
 * 
 * Features:
 * - Left border color coding for status (mapped, unmapped, selected)
 * - Content preview with truncation
 * - Interactive hover and selection states
 * - Educational semantic variants
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textSegmentVariants = cva(
  "relative bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-sm",
  {
    variants: {
      status: {
        // Mapping status
        mapped: "border-l-4 border-l-green-500 hover:border-l-green-600 hover:bg-green-50/30",
        unmapped: "border-l-4 border-l-gray-300 hover:border-l-gray-400 hover:bg-gray-50",
        selected: "border-l-4 border-l-blue-500 bg-blue-50/50 hover:bg-blue-50",
        
        // Content types
        sanskrit: "border-l-4 border-l-orange-500 hover:border-l-orange-600 hover:bg-orange-50/30",
        translation: "border-l-4 border-l-purple-500 hover:border-l-purple-600 hover:bg-purple-50/30",
        commentary: "border-l-4 border-l-teal-500 hover:border-l-teal-600 hover:bg-teal-50/30",
        
        // Educational contexts
        lesson: "border-l-4 border-l-blue-500 hover:border-l-blue-600 hover:bg-blue-50/30",
        practice: "border-l-4 border-l-indigo-500 hover:border-l-indigo-600 hover:bg-indigo-50/30",
        assessment: "border-l-4 border-l-pink-500 hover:border-l-pink-600 hover:bg-pink-50/30"
      },
      size: {
        sm: "p-3 text-sm",
        default: "p-4 text-base",
        lg: "p-5 text-lg"
      }
    },
    defaultVariants: {
      status: "unmapped",
      size: "default"
    }
  }
);

const textSegmentContentVariants = cva(
  "transition-colors duration-200",
  {
    variants: {
      status: {
        mapped: "text-gray-900",
        unmapped: "text-gray-700",
        selected: "text-blue-900",
        sanskrit: "text-orange-900",
        translation: "text-purple-900", 
        commentary: "text-teal-900",
        lesson: "text-blue-900",
        practice: "text-indigo-900",
        assessment: "text-pink-900"
      }
    },
    defaultVariants: {
      status: "unmapped"
    }
  }
);

export interface TextSegmentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof textSegmentVariants> {
  title?: string;
  content: string;
  maxLength?: number;
  segmentNumber?: number;
  duration?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

const TextSegment = React.forwardRef<HTMLDivElement, TextSegmentProps>(
  ({ 
    className, 
    title, 
    content, 
    maxLength = 120, 
    segmentNumber, 
    duration,
    status,
    size,
    isSelected,
    onSelect,
    onClick,
    ...props 
  }, ref) => {
    // Auto-detect if selected
    const finalStatus = isSelected ? "selected" : status;
    
    // Truncate content if needed
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;
    
    // Generate title if not provided
    const displayTitle = title || (segmentNumber ? `Segment ${segmentNumber}` : "Text Segment");
    
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onSelect?.();
      onClick?.(e);
    };
    
    return (
      <div
        ref={ref}
        className={cn(textSegmentVariants({ status: finalStatus, size }), className)}
        onClick={handleClick}
        {...props}
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className={cn(
              "font-medium",
              textSegmentContentVariants({ status: finalStatus })
            )}>
              {displayTitle}
            </h4>
            {duration && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {duration}
              </span>
            )}
          </div>
          
          {/* Content */}
          <p className={cn(
            "text-sm leading-relaxed",
            textSegmentContentVariants({ status: finalStatus })
          )}>
            {truncatedContent}
          </p>
          
          {/* Status indicator */}
          {finalStatus === "mapped" && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Mapped to audio</span>
            </div>
          )}
          
          {finalStatus === "selected" && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Selected</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);
TextSegment.displayName = "TextSegment";

export { TextSegment, textSegmentVariants };