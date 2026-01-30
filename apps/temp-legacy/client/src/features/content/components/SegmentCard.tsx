/**
 * Segment Card Component - New UI
 * 
 * Unified segment card for mapping and segmentation workflows.
 * Built with shadcn Card component for consistency with new-ui design system.
 * 
 * Features:
 * - Status-based border styling (ready, recording, mapped)
 * - Script-aware font rendering (Telugu/JIMS, Hindi/Adishila, English)
 * - Optional badge-style numbering with status-aware colors
 * - Optional status icon (LinkStatusIcon) for mapping workflows
 * - Click handler support
 * 
 * Replaces legacy MappingSegmentCard from design-system.
 */

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LinkStatusIcon } from "@shared/components/LinkStatusIcon";
import type { Script } from "@shared/types/text-segmentation";

interface SegmentCardProps {
    segmentNumber: number;
    content: string;
    script?: Script;
    status?: 'ready' | 'recording' | 'mapped';
    fontSize?: string;
    onClick?: () => void;
    className?: string;
    /** Show colored badge-style number instead of simple #N */
    badgeNumber?: boolean;
    /** Show status icon (zap) on the right side */
    showStatusIcon?: boolean;
}

// Get font family based on script
const getFontFamily = (script?: Script): string | undefined => {
    if (!script) return undefined;

    switch (script) {
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

export function SegmentCard({
    segmentNumber,
    content,
    script,
    status = 'ready',
    fontSize = '30px',
    onClick,
    className,
    badgeNumber = false,
    showStatusIcon = false,
}: SegmentCardProps) {
    const fontFamily = getFontFamily(script);

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all duration-200",
                status === 'ready' && "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
                status === 'recording' && "border-mantra-base bg-mantra-surface shadow-md animate-subtle-pulse",
                status === 'mapped' && "border-vidyut-base bg-vidyut-surface/50 shadow-none",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-center px-4 py-2 gap-3">
                {/* Segment Number */}
                <div className="flex-shrink-0 self-start pt-1">
                    {badgeNumber ? (
                        <span className={cn(
                            "text-xs font-medium px-1.5 py-0.5 rounded",
                            status === 'mapped'
                                ? "bg-vidyut-base/20 text-vidyut-base"
                                : "bg-muted text-muted-foreground"
                        )}>
                            #{segmentNumber}
                        </span>
                    ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                            #{segmentNumber}
                        </span>
                    )}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                    <div
                        className="text-foreground leading-relaxed whitespace-pre-wrap break-words"
                        style={{
                            fontFamily,
                            fontSize: (script === 'te' || script === 'hi') ? '2rem' : fontSize,
                            lineHeight: '1.4'
                        }}
                    >
                        {content}
                    </div>
                </div>

                {/* Status Icon */}
                {showStatusIcon && (
                    <div className="flex-shrink-0 opacity-80">
                        <LinkStatusIcon
                            status={status === 'mapped' ? 'mapped' : 'unmapped'}
                            size="sm"
                        />
                    </div>
                )}
            </div>
        </Card>
    );
}
