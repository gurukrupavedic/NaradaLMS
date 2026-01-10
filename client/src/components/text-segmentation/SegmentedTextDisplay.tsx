/**
 * Segmented Text Display Component
 * 
 * Reusable component for displaying text with interactive segment highlighting.
 * Used in both Segmentation (edit mode) and Preview (read-only mode) tabs.
 * 
 * Created: January 2025
 */

import type { TextSegment, Script, ContentMap } from '@shared/types/text-segmentation';
import { getDisplayText } from '@shared/utils/text-segmentation';

interface SegmentedTextDisplayProps {
  content: ContentMap;
  currentScript: Script;
  segments: TextSegment[];
  selectedSegmentId?: number;
  onSegmentClick?: (segmentId: number | undefined) => void;
  mode: 'edit' | 'preview';  // edit allows text selection, preview is read-only
  className?: string;
}

export const SegmentedTextDisplay: React.FC<SegmentedTextDisplayProps> = ({
  content,
  currentScript,
  segments,
  selectedSegmentId,
  onSegmentClick,
  mode,
  className = ''
}) => {
  // Get normalized text content
  const normalizedText = getDisplayText(content, currentScript);

  // Render highlighted text with segment overlays
  const renderHighlightedText = () => {
    if (!normalizedText) {
      return <div className="text-muted-foreground">No content available for {currentScript}</div>;
    }

    // Get all segments for current script
    const scriptSegments = [...segments]
      .sort((a, b) => a.startPosition - b.startPosition);

    if (scriptSegments.length === 0) {
      return (
        <div
          className="whitespace-pre-wrap leading-relaxed"
          style={{
            fontFamily: currentScript === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
              currentScript === 'hi' ? "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif" :
                "'AdishilaSan', 'Noto Sans', sans-serif",
            fontSize: 'var(--font-size-standard)',
            fontWeight: currentScript === 'hi' ? 'var(--font-weight-devanagari)' : 400
          }}
        >
          {normalizedText}
        </div>
      );
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    scriptSegments.forEach((segment, index) => {
      const range = { start: segment.startPosition, end: segment.endPosition };

      // Add text before this segment
      if (range.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`} className="whitespace-pre-wrap">
            {normalizedText.slice(lastIndex, range.start)}
          </span>
        );
      }

      // Add highlighted segment
      const isSelected = segment.id === selectedSegmentId;
      parts.push(
        <span
          key={segment.id}
          className={`relative rounded-sm px-0.5 mx-0.5 cursor-pointer select-none transition-colors ${isSelected
            ? 'bg-blue-50 border-2 border-blue-200 ring-1 ring-blue-300'
            : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          title={`Segment ${segment.order + 1}: ${normalizedText.slice(range.start, Math.min(range.end, range.start + 50))}${range.end - range.start > 50 ? '...' : ''}`}
          onClick={() => onSegmentClick?.(isSelected ? undefined : segment.id)}
        >
          {normalizedText.slice(range.start, range.end)}

        </span>
      );

      lastIndex = range.end;
    });

    // Add remaining text
    if (lastIndex < normalizedText.length) {
      parts.push(
        <span key="text-end" className="whitespace-pre-wrap">
          {normalizedText.slice(lastIndex)}
        </span>
      );
    }

    return (
      <div
        className="leading-relaxed"
        style={{
          fontFamily: currentScript === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
            currentScript === 'hi' ? "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif" :
              "'AdishilaSan', 'Noto Sans', sans-serif",
          fontSize: 'var(--font-size-standard)',
          fontWeight: currentScript === 'hi' ? 'var(--font-weight-devanagari)' : 400,
          lineHeight: '1.4'
        }}
      >
        {parts}
      </div>
    );
  };

  return (
    <div
      className={`${className} ${mode === 'edit' ? 'cursor-text' : 'cursor-default'}`}
      style={{
        userSelect: mode === 'edit' ? 'text' : 'none'
      }}
    >
      {renderHighlightedText()}
    </div>
  );
};
