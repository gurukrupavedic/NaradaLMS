/**
 * LMS Mapping Segment Card Component - LMS Design System v1.0
 * 
 * Simplified segment cards for audio mapping workflow.
 * Consistent with Segmentation tab design for unified UX.
 * 
 * Features:
 * - Three mapping states: ready, recording, mapped (visual border styling)
 * - Simple #N numbering format (consistent with Segmentation tab)
 * - Compact design matching TextSegment aesthetics
 * - Script-aware font rendering (Telugu/JIMS, Hindi/Adishila San, English/JIMS)
 * - 30px default font size for Vedic content
 * - Pulsing animation for active recording state
 * - Click handler for recording workflow
 * 
 * @author LMS Design System v1.0
 * @since 2025-10-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LinkStatusIcon } from '@shared/components/LinkStatusIcon';

const mappingSegmentCardVariants = cva(
  "relative bg-card border rounded-lg transition-all duration-200 cursor-pointer",
  {
    variants: {
      status: {
        ready: "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
        recording: "border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 shadow-md animate-subtle-pulse",
        mapped: "border-green-400 bg-green-400/5 dark:bg-green-400/10 hover:bg-green-400/10 dark:hover:bg-green-400/20"
      }
    },
    defaultVariants: {
      status: "ready"
    }
  }
);



export interface MappingSegmentCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof mappingSegmentCardVariants> {
  content: string;
  segmentNumber: number;
  status?: 'ready' | 'recording' | 'mapped';
  script?: 'te' | 'hi' | 'en';
  fontSize?: string;
  onSegmentClick?: () => void;
}

const MappingSegmentCard = React.forwardRef<HTMLDivElement, MappingSegmentCardProps>(
  ({
    className,
    content,
    segmentNumber,
    status = 'ready',
    script,
    fontSize = '30px',
    onSegmentClick,
    onClick,
    style,
    ...props
  }, ref) => {

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
      onSegmentClick?.();
      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        className={cn(mappingSegmentCardVariants({ status }), className)}
        onClick={handleClick}
        {...props}
      >
        {/* Content with #N numbering */}
        <div className="flex items-center px-4 py-2 gap-3">
          {/* Segment Number - Simple #N format */}
          <div className="flex-shrink-0 self-start pt-1">
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              status === 'mapped'
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            )}>
              #{segmentNumber}
            </span>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div
              className="text-foreground leading-relaxed whitespace-pre-wrap break-words"
              style={{
                fontFamily: fontFamily,
                fontSize: fontSize,
                lineHeight: '1.4',
                ...style
              }}
            >
              {content}
            </div>
          </div>

          {/* Status Icon (Subtle Zap) */}
          <div className="flex-shrink-0 self-start pt-1.5 opacity-80">
            <LinkStatusIcon
              status={status === 'mapped' ? 'mapped' : 'unmapped'}
              size="sm"
            />
          </div>
        </div>
      </div>
    );
  }
);

MappingSegmentCard.displayName = "MappingSegmentCard";

export { MappingSegmentCard, mappingSegmentCardVariants };
