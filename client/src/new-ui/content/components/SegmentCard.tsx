/**
 * Segment Card Component - New UI
 * 
 * Simple, reusable segment card for mapping and segmentation workflows.
 * Built with shadcn Card component for consistency with new-ui design system.
 * 
 * Features:
 * - Status-based border styling (ready, recording, mapped)
 * - Script-aware font rendering (Telugu/JIMS, Hindi/Adishila, English)
 * - Simple #N numbering format
 * - Click handler support
 */

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Script } from "@shared/types/text-segmentation";

interface SegmentCardProps {
    segmentNumber: number;
    content: string;
    script?: Script;
    status?: 'ready' | 'recording' | 'mapped';
    fontSize?: string;
    onClick?: () => void;
    className?: string;
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
    className
}: SegmentCardProps) {
    const fontFamily = getFontFamily(script);

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all duration-200",
                status === 'ready' && "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
                status === 'recording' && "border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 shadow-md animate-subtle-pulse",
                status === 'mapped' && "border-green-400 bg-green-400/5 dark:bg-green-400/10 hover:bg-green-400/10 dark:hover:bg-green-400/20",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-center px-4 py-2 gap-3">
                {/* Segment Number */}
                <div className="flex-shrink-0">
                    <span className="font-mono text-sm text-muted-foreground">
                        #{segmentNumber}
                    </span>
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                    <div
                        className="text-foreground leading-relaxed whitespace-pre-wrap break-words"
                        style={{
                            fontFamily,
                            fontSize,
                            lineHeight: '1.4'
                        }}
                    >
                        {content}
                    </div>
                </div>
            </div>
        </Card>
    );
}
