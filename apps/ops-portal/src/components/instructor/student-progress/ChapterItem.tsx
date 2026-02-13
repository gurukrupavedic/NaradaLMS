import { format } from 'date-fns';
import { Info } from 'lucide-react';

import { ProficiencyLevel } from '@/components/batches/types';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@narada/ui';
import { Badge } from '@narada/ui';
import { getCellColor, getProficiencyLabel } from '@/components/batches/utils';

// We need to define or import ChapterProgress.
// It's defined in useTrackProgress types usually.
// I'll define a compatible interface here or import if I export it from hooks.
// I'll import from hooks if I exported it.
import { ChapterProgress } from '@/lib/hooks/useTrackProgress';

interface ChapterItemProps {
    chapter: ChapterProgress;
    onClick?: (chapter: ChapterProgress) => void;
}

export function ChapterItem({ chapter, onClick }: ChapterItemProps) {
    // Determine status for getCellColor map
    // Align with batch matrix logic:
    // - proficiencyLevel === null → 'not_started'
    // - proficiencyLevel === 8 → 'absent'
    // - proficiencyLevel === 0 → 'practicing'
    // - proficiencyLevel === 9 → 'not_started' (explicit NS)
    // - proficiencyLevel >= 4 → 'completed' (or L4)
    // - proficiencyLevel 1-3 → 'practicing'

    // Note: My hook uses 'proficiency' field, Monolith used 'proficiencyLevel'.
    // I need to check my hook definition again.
    // In `useTrackProgress.ts` (Step 199), I used `StudentTrackProgressResponse`.
    // I should check the type definition in `useTrackProgress.ts`.
    // The backend sends EXACTLY what monolith expected ?
    // `useTrackProgress.ts` in monolith expected `StudentProgressData`.
    // I'll need to check the interface.

    // Assuming `chapter` has `proficiency` or `proficiencyLevel`.
    // I'll check/fix after this write if types mismatch.
    // For now assuming `proficiency` as per my earlier read of my own hook types, 
    // OR `proficiencyLevel` if I matched monolith.
    // Monolith `ChapterProgress` has `proficiencyLevel`.
    // I'll assume `proficiencyLevel` for now as I aim for parity.

    const level = chapter.proficiencyLevel ?? 9;

    let status: 'practicing' | 'completed' | 'absent' | 'not_started' = 'not_started';

    if (level === null || level === undefined) {
        status = 'not_started';
    } else if (level === 8) {
        status = 'absent';
    } else if (level === 9) {
        status = 'not_started';
    } else if (level >= 4) {
        status = 'completed';
    } else {
        // 0, 1, 2, 3 → practicing
        status = 'practicing';
    }

    const colors = getCellColor(level as ProficiencyLevel, status);
    const label = getProficiencyLabel(level as ProficiencyLevel | null);

    const hasInfo = Boolean(chapter.notes || chapter.evaluatedAt);

    const handleClick = () => {
        if (onClick) {
            onClick(chapter);
        }
    };

    return (
        <div
            className={`
        relative flex flex-col justify-between p-3 rounded-lg border transition-all bg-card/80
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/40' : 'cursor-default hover:shadow-sm'}
      `}
            onClick={handleClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : -1}
            onKeyDown={(e) => {
                if (!onClick) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            {/* Header: Code & Title */}
            <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70 text-muted-foreground">
                    {chapter.chapterCode}
                </span>
                {chapter.evaluatedAt && (
                    <span className="text-[10px] opacity-70 font-medium text-muted-foreground">
                        {format(new Date(chapter.evaluatedAt), 'MMM d')}
                    </span>
                )}
            </div>

            {/* Title */}
            <div className="text-sm font-medium leading-tight mb-3 line-clamp-2 min-h-[2.5em] text-foreground">
                {chapter.chapterTitle}
            </div>

            {/* Footer: Proficiency Label */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                <Badge
                    variant="outline"
                    className={`
            text-[10px] px-1.5 py-0 h-5 font-semibold border
            ${colors.bgColor} ${colors.darkBgColor}
            ${colors.textColor} ${colors.darkTextColor}
            ${colors.borderColor} ${colors.darkBorderColor}
          `}
                >
                    {label}
                </Badge>

                {hasInfo && (
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-default p-1 -m-1 rounded-full hover:bg-muted transition-colors">
                                    <Info className="w-3 h-3 text-muted-foreground opacity-60" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                align="center"
                                className="max-w-[280px] p-3 bg-white dark:bg-black text-popover-foreground border shadow-md"
                            >
                                <div className="space-y-2">
                                    {chapter.evaluatedAt && (
                                        <div className="text-xs space-y-0.5">
                                            <p>
                                                <span className="opacity-70">Evaluated:</span>{' '}
                                                <span className="font-medium">
                                                    {format(new Date(chapter.evaluatedAt), 'MMM d, yyyy')}
                                                </span>
                                            </p>
                                            {chapter.evaluatedBy && (
                                                <p>
                                                    <span className="opacity-70">By:</span>{' '}
                                                    <span className="font-medium">{chapter.evaluatedBy}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {chapter.notes && (
                                        <div className="pt-1 border-t text-xs italic opacity-90">
                                            &quot;{chapter.notes}&quot;
                                        </div>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
}
