import { useMemo } from "react";

interface TextSegment {
  id: number;
  conceptualName: string;
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
}

interface AudioFile {
  id: string;
  name: string;
  reciter: string;
  url: string;
}

interface AudioMapping {
  segmentId: number;
  audioFileId: string;
  startTime: number;
  endTime: number;
}

interface InteractiveTextProps {
  content: string;
  segments: TextSegment[];
  selectedScript: 'te' | 'hi' | 'en';
  audioFile?: AudioFile | null;
  mappings: AudioMapping[];
  activeSegment?: number | null;
  onSegmentClick: (segmentId: number) => void;
}

interface ProcessedSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  hasAudioMapping: boolean;
  isActive: boolean;
}

export function InteractiveText({
  content,
  segments,
  selectedScript,
  audioFile,
  mappings,
  activeSegment,
  onSegmentClick,
}: InteractiveTextProps) {
  const processedContent = useMemo(() => {
    if (!content || !segments.length) {
      return [{
        type: 'text' as const,
        content,
        isInteractive: false
      }];
    }

    // Get valid segments for current script with character positions
    const validSegments = segments
      .map(segment => {
        const ref = segment.textReferences[selectedScript];
        if (!ref) return null;

        const hasMapping = audioFile && mappings.some(m => 
          m.segmentId === segment.id && 
          m.audioFileId === audioFile.id
        );

        return {
          id: segment.id,
          start: ref.start,
          end: ref.end,
          text: content.slice(ref.start, ref.end),
          hasAudioMapping: Boolean(hasMapping),
          isActive: activeSegment === segment.id
        };
      })
      .filter(Boolean) as ProcessedSegment[];

    // Sort segments by start position
    validSegments.sort((a, b) => a.start - b.start);

    // Build parts array with text and segments
    const parts: Array<{
      type: 'text' | 'segment';
      content: string;
      segmentData?: ProcessedSegment;
      isInteractive: boolean;
    }> = [];

    let lastEnd = 0;

    for (const segment of validSegments) {
      // Add text before segment
      if (segment.start > lastEnd) {
        const textBefore = content.slice(lastEnd, segment.start);
        if (textBefore) {
          parts.push({
            type: 'text',
            content: textBefore,
            isInteractive: false
          });
        }
      }

      // Add segment
      parts.push({
        type: 'segment',
        content: segment.text,
        segmentData: segment,
        isInteractive: true
      });

      lastEnd = segment.end;
    }

    // Add remaining text
    if (lastEnd < content.length) {
      const remainingText = content.slice(lastEnd);
      if (remainingText) {
        parts.push({
          type: 'text',
          content: remainingText,
          isInteractive: false
        });
      }
    }

    return parts;
  }, [content, segments, selectedScript, audioFile, mappings, activeSegment]);

  const getFontClass = (script: string) => {
    switch (script) {
      case 'te':
        return 'font-["Tiro_Telugu"]';
      case 'hi':
        return 'font-["Tiro_Devanagari_Sanskrit"]';
      case 'en':
        return 'font-["Tiro_Devanagari_Sanskrit"]'; // IAST uses Devanagari font
      default:
        return 'font-sans';
    }
  };

  const getSegmentStyles = (segment: ProcessedSegment) => {
    let baseStyles = 'inline cursor-pointer border-b-2 transition-all duration-200 ';
    
    if (segment.isActive) {
      baseStyles += 'bg-vedic-gold/30 border-vedic-brown text-vedic-brown font-semibold ';
    } else if (segment.hasAudioMapping) {
      baseStyles += 'border-vedic-gold/50 hover:bg-vedic-gold/20 hover:border-vedic-brown ';
    } else {
      baseStyles += 'border-gray-300 hover:bg-gray-100 hover:border-gray-400 ';
    }

    return baseStyles;
  };

  return (
    <div className={`leading-relaxed text-lg ${getFontClass(selectedScript)}`}>
      {processedContent.map((part, index) => (
        part.type === 'segment' && part.segmentData ? (
          <span
            key={`segment-${part.segmentData.id}-${index}`}
            className={getSegmentStyles(part.segmentData)}
            onClick={() => onSegmentClick(part.segmentData!.id)}
            title={part.segmentData.hasAudioMapping ? 
              'Click to play audio segment' : 
              'No audio mapping available'
            }
          >
            {part.content}
          </span>
        ) : (
          <span key={`text-${index}`}>
            {part.content}
          </span>
        )
      ))}
    </div>
  );
}