import { format } from "date-fns";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";
import { Badge } from "../badge";
import { cn } from "../../lib/utils";
import { getProficiencyStatus, getProficiencyLabel } from "@narada/types";
import { getProficiencyBadgeClasses } from "./proficiency-badge-classes";
import type { ChapterProgress } from "@narada/types";

interface ChapterItemProps {
  chapter: ChapterProgress;
  onClick?: (chapter: ChapterProgress) => void;
}

export function ChapterItem({ chapter, onClick }: ChapterItemProps) {
  const status = getProficiencyStatus(chapter.proficiencyLevel);
  const colors = getProficiencyBadgeClasses(chapter.proficiencyLevel ?? 9, status);
  const label = getProficiencyLabel(chapter.proficiencyLevel);
  const hasInfo = Boolean(chapter.notes || chapter.lastEvaluatedAt);

  const handleClick = () => {
    if (onClick) onClick(chapter);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between p-3 rounded-lg border transition-all bg-card/80",
        onClick ? "cursor-pointer hover:shadow-md hover:border-primary/40" : "cursor-default hover:shadow-sm"
      )}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70 text-muted-foreground">
          {chapter.chapterCode}
        </span>
        {chapter.lastEvaluatedAt && (
          <span className="text-[10px] opacity-70 font-medium text-muted-foreground">
            {format(new Date(chapter.lastEvaluatedAt), "MMM d")}
          </span>
        )}
      </div>
      <div className="text-sm font-medium leading-tight mb-3 line-clamp-2 min-h-[2.5em] text-foreground">
        {chapter.chapterTitle}
      </div>
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 font-semibold border",
            colors.bgColor,
            colors.darkBgColor,
            colors.textColor,
            colors.darkTextColor,
            colors.borderColor,
            colors.darkBorderColor
          )}
        >
          {label}
        </Badge>
        {hasInfo && (
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
                {chapter.lastEvaluatedAt && (
                  <div className="text-xs space-y-0.5">
                    <p>
                      <span className="opacity-70">Evaluated:</span>{" "}
                      <span className="font-medium">
                        {format(new Date(chapter.lastEvaluatedAt), "MMM d, yyyy")}
                      </span>
                    </p>
                    {chapter.evaluatedBy && (
                      <p>
                        <span className="opacity-70">By:</span>{" "}
                        <span className="font-medium">{chapter.evaluatedBy}</span>
                      </p>
                    )}
                  </div>
                )}
                {chapter.notes && (
                  <div className="pt-1 border-t text-xs italic opacity-90">&quot;{chapter.notes}&quot;</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
