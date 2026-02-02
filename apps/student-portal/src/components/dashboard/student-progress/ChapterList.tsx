import { ChapterProgress } from '@narada/types';
import { ChapterItem } from './ChapterItem';

interface ChapterListProps {
  chapters: ChapterProgress[];
  onChapterClick?: (chapter: ChapterProgress) => void;
}

export function ChapterList({ chapters, onChapterClick }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm italic">
        No chapters found for this track.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {chapters.map((chapter) => (
        <ChapterItem key={chapter.chapterId} chapter={chapter} onClick={onChapterClick} />
      ))}
    </div>
  );
}
