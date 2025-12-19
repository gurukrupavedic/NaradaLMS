import React from 'react';
import type { AudioFile, SegmentMapping } from '@shared/schema';
import type { TextSegment } from '@shared/types/text-segmentation';

interface InteractiveSegmentsProps {
  content: string;
  segments: (TextSegment & {
    mappings: (SegmentMapping & {
      audioFile: AudioFile;
    })[];
  })[];
  selectedLanguage: string;
  selectedAudioFile?: AudioFile;
  onSegmentClick: (segmentId: number) => void;
  activeSegment?: number;
  fontClass: string;
}

export function InteractiveSegments({
  content,
  segments,
  selectedLanguage,
  selectedAudioFile,
  onSegmentClick,
  activeSegment,
  fontClass,
}: InteractiveSegmentsProps) {
  // Process content to make segments interactive
  const processContent = (text: string) => {
    if (!segments.length) {
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    }

    // Sort segments by start position to process them in order
    const sortedSegments = [...segments].sort((a, b) => {
      const aRef = a.textReferences[selectedLanguage as keyof typeof a.textReferences];
      const bRef = b.textReferences[selectedLanguage as keyof typeof b.textReferences];
      if (!aRef || !bRef) return 0;
      return aRef.start - bRef.start;
    });

    let processedText = text;
    let offset = 0;

    // Process segments from end to start to maintain character positions
    for (let i = sortedSegments.length - 1; i >= 0; i--) {
      const segment = sortedSegments[i];
      const textRef = segment.textReferences[selectedLanguage as keyof typeof segment.textReferences];
      
      if (textRef) {
        const { start, end } = textRef;
        const segmentText = text.substring(start, end);
        
        // Check if this segment has audio mapping for the selected audio file
        const hasMapping = selectedAudioFile ? 
          segment.mappings.some((m: any) => m.audioFileId === selectedAudioFile.id) : 
          segment.mappings.length > 0;

        const isActive = activeSegment === segment.id;
        
        const segmentElement = `<span 
          class="interactive-segment ${isActive ? 'active' : ''} ${hasMapping ? 'cursor-pointer' : 'cursor-default'} 
                 inline-block px-1 py-0.5 rounded transition-all duration-200 
                 ${hasMapping ? 'hover:bg-yellow-200' : ''} 
                 ${isActive ? 'bg-orange-300 text-white' : hasMapping ? 'hover:bg-yellow-100' : ''}"
          data-segment-id="${segment.id}"
          data-has-mapping="${hasMapping}"
          title="${segment.conceptualName}"
        >${segmentText}</span>`;
        
        processedText = processedText.substring(0, start) + segmentElement + processedText.substring(end);
      }
    }

    return <div dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  // Handle click events on segments
  const handleContentClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const segmentElement = target.closest('.interactive-segment');
    
    if (segmentElement) {
      const segmentId = parseInt(segmentElement.getAttribute('data-segment-id') || '0');
      const hasMapping = segmentElement.getAttribute('data-has-mapping') === 'true';
      
      if (hasMapping && segmentId) {
        onSegmentClick(segmentId);
      }
    }
  };

  return (
    <div 
      className={`prose max-w-none ${fontClass} text-lg leading-relaxed cursor-text select-text`}
      onClick={handleContentClick}
    >
      {processContent(content)}
    </div>
  );
}
