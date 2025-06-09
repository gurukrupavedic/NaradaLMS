import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Trash2, FileText, Eye, EyeOff } from "lucide-react";

interface Chapter {
  id: number;
  trackId: number;
  title: string;
  description: string;
  order: number;
  status: 'draft' | 'published';
}

interface ChapterCardProps {
  chapter: Chapter;
  index: number;
  totalChapters: number;
  isMovePending: boolean;
  isTogglePending: boolean;
  onEdit: (chapterId: number) => void;
  onDelete: (chapter: Chapter) => void;
  onMove: (chapterId: number, direction: 'up' | 'down') => void;
  onToggleStatus: (chapterId: number) => void;
}

export function ChapterCard({
  chapter,
  index,
  totalChapters,
  isMovePending,
  isTogglePending,
  onEdit,
  onDelete,
  onMove,
  onToggleStatus
}: ChapterCardProps) {
  return (
    <Card 
      key={chapter.id} 
      className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onEdit(chapter.id)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Chapter Ordering Controls */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 sm:h-5 sm:w-5 p-0"
                disabled={chapter.order === 1 || isMovePending}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(chapter.id, 'up');
                }}
                title="Move chapter up"
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 sm:h-5 sm:w-5 p-0"
                disabled={index === totalChapters - 1 || isMovePending}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(chapter.id, 'down');
                }}
                title="Move chapter down"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>

            {/* Chapter Info */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                  Chapter {index + 1}: {chapter.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                  {chapter.description}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    chapter.status === 'published' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {chapter.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isTogglePending}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(chapter.id);
              }}
              title={chapter.status === "published" ? "Unpublish Chapter" : "Publish Chapter"}
            >
              {chapter.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(chapter);
              }}
              title="Delete chapter"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}