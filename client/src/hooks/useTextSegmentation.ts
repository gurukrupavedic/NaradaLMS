import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface TextSelection {
  start: number;
  end: number;
  selectedText: string;
}

interface TextReference {
  script: string;
  start: number;
  end: number;
}

export function useTextSegmentation() {
  const { toast } = useToast();

  // Text selection state
  const [currentSelection, setCurrentSelection] = useState<TextSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Handle text selection in annotation layer
  const handleTextSelection = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setCurrentSelection(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (!selectedText) {
      setCurrentSelection(null);
      return;
    }

    // Get the container element
    const container = e.currentTarget.querySelector('[data-segmentable]') as HTMLElement;
    if (!container) {
      console.warn('No segmentable container found');
      return;
    }

    // Calculate positions relative to the text content
    const containerRange = document.createRange();
    containerRange.selectNodeContents(container);
    
    // Calculate start position
    const startRange = document.createRange();
    startRange.setStart(containerRange.startContainer, containerRange.startOffset);
    startRange.setEnd(range.startContainer, range.startOffset);
    const startPosition = startRange.toString().length;
    
    // Calculate end position
    const endRange = document.createRange();
    endRange.setStart(containerRange.startContainer, containerRange.startOffset);
    endRange.setEnd(range.endContainer, range.endOffset);
    const endPosition = endRange.toString().length;

    setCurrentSelection({
      start: startPosition,
      end: endPosition,
      selectedText,
    });

    // Clear the browser selection
    selection.removeAllRanges();
  }, []);

  // Create segment data from current selection
  const createSegmentFromSelection = useCallback((
    conceptualName: string,
    script: string,
    chapterId: string
  ) => {
    if (!currentSelection) {
      toast({
        title: "No Text Selected",
        description: "Please select text before creating a segment",
        variant: "destructive",
      });
      return null;
    }

    if (!conceptualName.trim()) {
      toast({
        title: "Segment Name Required",
        description: "Please enter a name for the segment",
        variant: "destructive",
      });
      return null;
    }

    const segmentData = {
      script,
      startPosition: currentSelection.start,
      endPosition: currentSelection.end,
      conceptualName: conceptualName.trim(),
      chapterId: parseInt(chapterId),
      selectedText: currentSelection.selectedText,
    };

    // Clear selection after creating segment
    setCurrentSelection(null);
    
    return segmentData;
  }, [currentSelection, toast]);

  // Render text with segment highlighting
  const renderSegmentedText = useCallback((
    text: string,
    segments: any[],
    allChapterMappings: any[],
    onSegmentClick?: (segment: any) => void
  ) => {
    if (!text || !segments?.length) {
      return (
        <div
          data-segmentable
          className="whitespace-pre-wrap cursor-text"
        >
          {text || ""}
        </div>
      );
    }

    // Sort segments by start position
    const sortedSegments = [...segments].sort((a, b) => a.startPosition - b.startPosition);
    
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    sortedSegments.forEach((segment, index) => {
      // Add text before this segment
      if (segment.startPosition > lastEnd) {
        parts.push(
          <span key={`before-${index}`} className="cursor-text">
            {text.substring(lastEnd, segment.startPosition)}
          </span>
        );
      }

      // Check if segment has audio mapping
      const hasAudioMapping = allChapterMappings?.some(
        (mapping: any) => mapping.textSegmentId === segment.id
      );

      // Add the segmented text with highlighting
      parts.push(
        <span
          key={`segment-${segment.id}`}
          className={`px-1 py-0.5 rounded cursor-pointer transition-colors ${
            hasAudioMapping
              ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
              : "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
          } hover:opacity-80`}
          title={`${segment.conceptualName || `Segment ${segment.id}`}${
            hasAudioMapping ? " (Audio Mapped)" : " (No Audio)"
          }`}
          onClick={() => onSegmentClick?.(segment)}
        >
          {text.substring(segment.startPosition, segment.endPosition)}
        </span>
      );

      lastEnd = segment.endPosition;
    });

    // Add remaining text
    if (lastEnd < text.length) {
      parts.push(
        <span key="after" className="cursor-text">
          {text.substring(lastEnd)}
        </span>
      );
    }

    return (
      <div
        data-segmentable
        className="whitespace-pre-wrap"
      >
        {parts}
      </div>
    );
  }, []);

  // Validate text selection bounds
  const validateSelection = useCallback((
    startPosition: number,
    endPosition: number,
    textLength: number
  ) => {
    if (startPosition < 0 || endPosition < 0) {
      return { valid: false, error: "Selection positions cannot be negative" };
    }

    if (startPosition >= endPosition) {
      return { valid: false, error: "Start position must be before end position" };
    }

    if (endPosition > textLength) {
      return { valid: false, error: "Selection exceeds text length" };
    }

    return { valid: true };
  }, []);

  // Clear current selection
  const clearSelection = useCallback(() => {
    setCurrentSelection(null);
    // Also clear browser selection if any
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  return {
    // State
    currentSelection,
    isSelecting,

    // Actions
    setIsSelecting,
    handleTextSelection,
    createSegmentFromSelection,
    renderSegmentedText,
    validateSelection,
    clearSelection,

    // Computed
    hasSelection: !!currentSelection,
    selectionText: currentSelection?.selectedText || "",
    selectionLength: currentSelection ? currentSelection.end - currentSelection.start : 0,
  };
}