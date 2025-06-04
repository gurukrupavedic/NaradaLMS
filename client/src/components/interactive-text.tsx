import { useState, useMemo } from "react";
import type { TextSegment, AudioFile, AudioMapping } from "@shared/schema";

interface InteractiveTextProps {
  content: string;
  segments: TextSegment[];
  selectedScript: 'te' | 'hi' | 'en';
  audioFile?: AudioFile;
  mappings: AudioMapping[];
}

interface ProcessedSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  mapping?: AudioMapping;
}

export default function InteractiveText({ 
  content, 
  segments, 
  selectedScript, 
  audioFile, 
  mappings 
}: InteractiveTextProps) {
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  // Process segments and sort by start position
  const processedSegments = useMemo(() => {
    const processed: ProcessedSegment[] = [];

    segments.forEach(segment => {
      const textRef = segment.textReferences[selectedScript];
      if (textRef && textRef.start < content.length && textRef.end <= content.length) {
        const segmentText = content.slice(textRef.start, textRef.end);
        const mapping = mappings.find(m => m.segmentId === segment.id);
        
        processed.push({
          id: segment.id,
          start: textRef.start,
          end: textRef.end,
          text: segmentText,
          mapping,
        });
      }
    });

    return processed.sort((a, b) => a.start - b.start);
  }, [content, segments, selectedScript, mappings]);

  // Build the interactive content
  const interactiveContent = useMemo(() => {
    if (processedSegments.length === 0) {
      return [{ type: 'text', content, isInteractive: false }];
    }

    const parts: Array<{ type: 'text' | 'segment'; content: string; segmentData?: ProcessedSegment; isInteractive: boolean }> = [];
    let lastEnd = 0;

    processedSegments.forEach(segment => {
      // Add non-interactive text before this segment
      if (segment.start > lastEnd) {
        parts.push({
          type: 'text',
          content: content.slice(lastEnd, segment.start),
          isInteractive: false,
        });
      }

      // Add the interactive segment
      parts.push({
        type: 'segment',
        content: segment.text,
        segmentData: segment,
        isInteractive: true,
      });

      lastEnd = segment.end;
    });

    // Add remaining non-interactive text
    if (lastEnd < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastEnd),
        isInteractive: false,
      });
    }

    return parts;
  }, [content, processedSegments]);

  const playSegment = (segment: ProcessedSegment) => {
    if (!segment.mapping || !audioFile) {
      console.warn('No audio mapping or file available for segment');
      return;
    }

    setActiveSegment(segment.id);

    // Find audio element and play segment
    const audioElements = document.querySelectorAll('audio');
    const audio = audioElements[0]; // Assuming single audio player
    
    if (audio) {
      audio.currentTime = segment.mapping.startTime;
      audio.play();

      // Remove active state after segment duration
      const duration = segment.mapping.endTime - segment.mapping.startTime;
      setTimeout(() => {
        setActiveSegment(null);
      }, duration * 1000);
    }
  };

  const getFontClass = () => {
    switch (selectedScript) {
      case 'te':
        return 'font-tiro-telugu';
      case 'hi':
        return 'font-tiro-devanagari';
      case 'en':
        return 'font-tiro-devanagari'; // IAST also uses Devanagari font
      default:
        return 'font-tiro-devanagari';
    }
  };

  return (
    <div className={`text-lg leading-relaxed ${getFontClass()}`}>
      {interactiveContent.map((part, index) => {
        if (part.type === 'segment' && part.segmentData) {
          const segment = part.segmentData;
          const isActive = activeSegment === segment.id;
          const hasMapping = !!segment.mapping;

          return (
            <span
              key={`segment-${segment.id}`}
              className={`interactive-segment ${isActive ? 'active' : ''} ${!hasMapping ? 'cursor-default opacity-75' : ''}`}
              onClick={() => hasMapping && playSegment(segment)}
              title={hasMapping ? `Click to play: ${segment.text}` : 'No audio mapping available'}
            >
              {part.content}
            </span>
          );
        }

        return (
          <span key={`text-${index}`}>
            {part.content}
          </span>
        );
      })}
    </div>
  );
}
