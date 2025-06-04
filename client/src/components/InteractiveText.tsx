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
  onSegmentClick
}: InteractiveTextProps) {
  const processedSegments = useMemo(() => {
    if (!content || !segments) return [];

    const processedSegs: ProcessedSegment[] = [];
    
    segments.forEach(segment => {
      const reference = segment.textReferences[selectedScript];
      if (reference) {
        const hasMapping = mappings.some(m => 
          m.segmentId === segment.id && 
          (!audioFile || m.audioFileId === audioFile.id)
        );
        
        processedSegs.push({
          id: segment.id,
          start: reference.start,
          end: reference.end,
          text: content.slice(reference.start, reference.end),
          hasAudioMapping: hasMapping,
          isActive: activeSegment === segment.id
        });
      }
    });

    return processedSegs.sort((a, b) => a.start - b.start);
  }, [content, segments, selectedScript, mappings, audioFile, activeSegment]);

  const renderTextWithSegments = () => {
    if (!content || processedSegments.length === 0) {
      return <span>{content}</span>;
    }

    const elements: JSX.Element[] = [];
    let lastEnd = 0;

    processedSegments.forEach((segment, index) => {
      // Add text before this segment
      if (segment.start > lastEnd) {
        elements.push(
          <span key={`text-${index}`}>
            {content.slice(lastEnd, segment.start)}
          </span>
        );
      }

      // Add the interactive segment
      elements.push(
        <span
          key={`segment-${segment.id}`}
          className={getSegmentStyles(segment)}
          onClick={() => onSegmentClick(segment.id)}
          style={{ cursor: 'pointer' }}
        >
          {segment.text}
        </span>
      );

      lastEnd = segment.end;
    });

    // Add remaining text after the last segment
    if (lastEnd < content.length) {
      elements.push(
        <span key="text-end">
          {content.slice(lastEnd)}
        </span>
      );
    }

    return elements;
  };

  const getSegmentStyles = (segment: ProcessedSegment) => {
    let classes = 'transition-all duration-200 ';
    
    if (segment.isActive) {
      classes += 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 ';
    } else if (segment.hasAudioMapping) {
      classes += 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800 ';
    } else {
      classes += 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ';
    }
    
    classes += 'px-1 py-0.5 rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600';
    
    return classes;
  };

  // Font classes for different scripts
  const getFontClass = () => {
    switch (selectedScript) {
      case 'te':
        return 'font-tiro-telugu text-xl leading-relaxed';
      case 'hi':
        return 'font-tiro-devanagari text-xl leading-relaxed';
      case 'en':
        return 'font-serif text-lg leading-relaxed';
      default:
        return 'text-lg leading-relaxed';
    }
  };

  return (
    <div className={`${getFontClass()} p-6 bg-white dark:bg-gray-900 rounded-lg border`}>
      <div className="text-justify">
        {renderTextWithSegments()}
      </div>
    </div>
  );
}