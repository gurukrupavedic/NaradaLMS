/**
 * LMS Mapping Segment Card Component - LMS Design System v1.0
 * 
 * Compact, status-focused segment cards for audio mapping workflow.
 * Optimized for recording sessions with clear visual state feedback.
 * 
 * Features:
 * - Three mapping states: ready, recording, mapped
 * - Status badges with icons and labels
 * - Compact design matching TextSegment aesthetics
 * - Script-aware font rendering (Telugu/JIMS, Hindi/Adishila San, English/JIMS)
 * - 28px default font size for Vedic content
 * - Pulsing animation for active recording state
 * - Click handler for recording workflow
 * 
 * @author LMS Design System v1.0
 * @since 2025-10-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Clock, Link2Off, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

const mappingSegmentCardVariants = cva(
  "relative bg-white border rounded-lg transition-all duration-200 cursor-pointer",
  {
    variants: {
      status: {
        ready: "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
        recording: "border-blue-500 bg-blue-50 shadow-md animate-subtle-pulse",
        mapped: "border-gray-200 bg-white hover:bg-gray-50"
      }
    },
    defaultVariants: {
      status: "ready"
    }
  }
);

const numberPillVariants = cva(
  "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm z-10 bg-gray-500 pointer-events-none"
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
    fontSize = '28px',
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
          return "'Adishila San', 'Noto Sans Devanagari', serif";
        case 'en':
          return "'JIMS', 'Noto Sans Telugu', sans-serif";
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
        {/* Numbering Pill */}
        <div className={cn(numberPillVariants())}>
          {segmentNumber}
        </div>

        {/* Content with status badge */}
        <div className="flex items-center px-4 py-1.5 gap-4">
          {/* Status Badge */}
          <div className="flex-shrink-0">
            {status === 'recording' ? (
              <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 pointer-events-none">
                <Clock className="h-3 w-3 mr-1 animate-strong-pulse" />
                Recording
              </Badge>
            ) : status === 'mapped' ? (
              <Badge variant="default" className="text-xs bg-green-100 text-green-700 pointer-events-none">
                <Zap className="h-4 w-4 mr-1" />
                Mapped
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs pointer-events-none">
                <Link2Off className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            )}
          </div>
          
          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div 
              className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words"
              style={{
                fontFamily: fontFamily,
                fontSize: fontSize,
                ...style
              }}
            >
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MappingSegmentCard.displayName = "MappingSegmentCard";

export { MappingSegmentCard, mappingSegmentCardVariants };
