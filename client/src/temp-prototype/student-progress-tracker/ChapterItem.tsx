import { format } from 'date-fns';
import { Info } from 'lucide-react';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { getCellColor, getProficiencyLabel } from '@/new-ui/batches/utils/matrix-utils';

import { ChapterProgress } from './types';

interface ChapterItemProps {
    chapter: ChapterProgress;
}

export function ChapterItem({ chapter }: ChapterItemProps) {
    // Determine status for getCellColor map
    // proficiencyLevel: 8=absent, 9=not_started. 
    // status: 'practicing' | 'completed' | 'absent' | 'not_started'
    let status: 'practicing' | 'completed' | 'absent' | 'not_started' = 'practicing';

    if (chapter.proficiencyLevel === 8) status = 'absent';
    else if (chapter.proficiencyLevel === 9) status = 'not_started';
    else if (chapter.proficiencyLevel >= 3) status = 'completed';

    const colors = getCellColor(chapter.proficiencyLevel, status);
    const label = getProficiencyLabel(chapter.proficiencyLevel);

    const hasInfo = Boolean(chapter.notes || chapter.lastEvaluatedAt);

    return (
        <div
            className={`
              relative flex flex-col justify-between p-3 rounded-lg border transition-all cursor-default
              ${colors.bgColor} ${colors.darkBgColor} 
              ${colors.borderColor} ${colors.darkBorderColor}
              hover:shadow-sm
            `}
        >
            {/* Header: Code & Title */}
            <div className="flex justify-between items-start gap-2 mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider opacity-90 ${colors.textColor} ${colors.darkTextColor}`}>
                    {chapter.chapterCode}
                </span>
                {chapter.lastEvaluatedAt && (
                    <span className={`text-[10px] opacity-70 font-medium ${colors.textColor} ${colors.darkTextColor}`}>
                        {format(new Date(chapter.lastEvaluatedAt), 'MMM d')}
                    </span>
                )}
            </div>

            {/* Title */}
            <div className={`text-sm font-medium leading-tight mb-3 line-clamp-2 min-h-[2.5em] ${colors.textColor} ${colors.darkTextColor}`}>
                {chapter.chapterTitle}
            </div>

            {/* Footer: Proficiency Label */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5 dark:border-white/10">
                <span className={`text-xs font-semibold ${colors.textColor} ${colors.darkTextColor}`}>
                    {label}
                </span>

                {hasInfo && (
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-default p-1 -m-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                    <Info className={`w-3 h-3 opacity-60 ${colors.textColor} ${colors.darkTextColor}`} />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center" className="max-w-[280px] p-3 bg-white dark:bg-black border shadow-md">
                                <div className="space-y-2">
                                    {chapter.lastEvaluatedAt && (
                                        <div className="text-xs space-y-0.5">
                                            <p>
                                                <span className="opacity-70">Evaluated:</span>{' '}
                                                <span className="font-medium">
                                                    {format(new Date(chapter.lastEvaluatedAt), 'MMM d, yyyy')}
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
                                            "{chapter.notes}"
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
