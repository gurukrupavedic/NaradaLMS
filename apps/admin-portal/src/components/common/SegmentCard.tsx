import { Card } from "@narada/ui";
import { cn } from "@narada/ui";
import { LinkStatusIcon } from "@shared/components/LinkStatusIcon";
import type { Script } from "@narada/types";

interface SegmentCardProps {
    segmentNumber: number;
    content: string;
    script?: Script;
    status?: 'ready' | 'recording' | 'mapped';
    fontSize?: string;
    onClick?: () => void;
    className?: string;
    badgeNumber?: boolean;
    showStatusIcon?: boolean;
}

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
                "cursor-pointer transition-colors transition-shadow duration-200",
                status === 'ready' && "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
                status === 'recording' && "border-mantra-base bg-mantra-surface shadow-md animate-subtle-pulse",
                status === 'mapped' && "border-vidyut-base bg-vidyut-surface/50 shadow-none",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-center px-4 py-2 gap-3">
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

                <div className="flex-1 min-w-0">
                    <div
                        className="text-foreground leading-[1.4] whitespace-pre-wrap break-words"
                        style={{
                            fontFamily,
                            fontSize: (script === 'te' || script === 'hi') ? '2rem' : fontSize,
                        }}
                    >
                        {content}
                    </div>
                </div>

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
