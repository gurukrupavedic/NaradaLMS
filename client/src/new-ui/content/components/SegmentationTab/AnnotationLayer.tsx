/**
 * Annotation Layer Component
 * 
 * Clean annotation interface with integrated header for text segmentation.
 * Provides text selection, highlighting, and segment management functionality.
 * 
 * Created: January 2025
 * Purpose: Interactive text annotation and segment creation
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X } from 'lucide-react';
import type { TextSegment, Script, ContentMap, TextRange } from '@shared/types/text-segmentation';
import { getDisplayText, normalizeLineBreaks } from '@shared/utils/text-segmentation';
import { ScriptSelector } from "@/new-ui/components/ScriptSelector";
import { SegmentedTextDisplay } from '@/new-ui/components/SegmentedTextDisplay';

const getScriptLabel = (script: Script): string => {
  switch (script) {
    case 'te': return 'Telugu';
    case 'hi': return 'Devanagari';
    case 'en': return 'IAST';
    default: return script;
  }
};

interface AnnotationLayerProps {
  content: ContentMap;
  currentScript: Script;
  segments: TextSegment[];
  selectedSegmentId?: number;
  onSegmentCreate: (segment: { script: string; startPosition: number; endPosition: number; }) => void;
  onSegmentUpdate: (id: number, updates: Partial<TextSegment>) => void;
  onSegmentDelete: (id: number) => void;
  onSegmentSelect?: (segmentId: number | undefined) => void;
  // NEW PROPS FOR LANGUAGE SELECTOR INTEGRATION
  onScriptChange: (script: Script) => void;
  availableScripts: Script[];
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  content,
  currentScript,
  segments,
  selectedSegmentId,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentDelete,
  onSegmentSelect,
  onScriptChange,
  availableScripts
}) => {
  // State for text selection and segment creation
  const [selectedRange, setSelectedRange] = useState<TextRange | null>(null);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState<boolean>(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Get normalized text content (same for both display and segmentation)
  const normalizedText = getDisplayText(content, currentScript);

  // Calculate actual selection position using DOM Range API (works with repeated text)
  const getTextPosition = (selection: Selection, container: HTMLElement): { start: number, end: number } | null => {
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);

    // Create a range from start of container to start of selection
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startPosition = preSelectionRange.toString().length;

    // Create a range from start of container to end of selection
    const fullRange = document.createRange();
    fullRange.selectNodeContents(container);
    fullRange.setEnd(range.endContainer, range.endOffset);
    const endPosition = fullRange.toString().length;

    return {
      start: startPosition,
      end: endPosition
    };
  };

  // Hide floating toolbar when selection changes or user clicks elsewhere
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setShowFloatingToolbar(false);
        setSelectedRange(null);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't hide if clicking on the floating toolbar itself
      const toolbarElement = document.querySelector('[data-floating-toolbar]');
      if (toolbarElement && toolbarElement.contains(target)) {
        return;
      }

      // Don't hide if clicking within the text content area
      if (textRef.current && textRef.current.contains(target)) {
        return;
      }

      setShowFloatingToolbar(false);
      setSelectedRange(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle text selection using DOM Range API for accurate position detection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Get the text container element
    if (!textRef.current) {
      console.warn('Text container ref not available');
      return;
    }

    console.log('Selection detected:', {
      selectedText: selectedText.substring(0, 50) + '...',
      length: selectedText.length,
      isMultiLine: selectedText.includes('\n')
    });

    // Calculate actual position using DOM Range API (works with repeated text)
    const range = getTextPosition(selection, textRef.current);

    if (range && range.start >= 0 && range.end > range.start) {
      console.log('Position calculated from DOM:', range.start, 'to', range.end);
      setSelectedRange(range);
      setShowFloatingToolbar(true);
      return;
    }

    console.warn('Could not calculate position from selection');
  }, []);

  // Create new segment from selection
  const handleCreateSegment = useCallback(() => {
    if (!selectedRange) return;

    const newSegment = {
      script: currentScript,
      startPosition: selectedRange.start,
      endPosition: selectedRange.end
    };

    onSegmentCreate(newSegment);
    setSelectedRange(null);
    setShowFloatingToolbar(false);

    // Clear selection
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, currentScript, segments.length, onSegmentCreate]);

  // Ref for scroll container to pass to floating toolbar
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-full">
      {/* Content Area */}
      <div className="h-full">
        {/* White Container with integrated header */}
        <div className="bg-white border rounded-lg h-full overflow-hidden shadow-sm flex flex-col">
          {/* Header - fixed at top */}
          <div className="px-6 py-3 bg-gray-50 border-b flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-700">Content ({currentScript === 'te' ? 'Telugu' : currentScript === 'hi' ? 'Hindi' : 'English'})</h2>
          </div>

          {/* Scrollable Content Wrapper */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto"
          >
            {/* Text Content with Highlighting */}
            <div
              ref={textRef}
              className="relative p-6"
              onMouseUp={handleTextSelection}
            >
              <SegmentedTextDisplay
                content={content}
                currentScript={currentScript}
                segments={segments}
                selectedSegmentId={selectedSegmentId}
                onSegmentClick={onSegmentSelect}
                mode="edit"
                className=""
              />
            </div>
          </div>

          {/* Floating Toolbar with proper positioning */}
          {showFloatingToolbar && selectedRange && (
            <FloatingSelectionToolbar
              segments={segments}
              onCreateSegment={handleCreateSegment}
              onCancel={() => {
                setShowFloatingToolbar(false);
                setSelectedRange(null);
                window.getSelection()?.removeAllRanges();
              }}
              scrollContainerRef={scrollContainerRef}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Custom floating toolbar component with proper positioning near text selection
const FloatingSelectionToolbar: React.FC<{
  segments: TextSegment[];
  onCreateSegment: () => void;
  onCancel: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}> = ({ segments, onCreateSegment, onCancel, scrollContainerRef }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) return;

      // Position toolbar above the selection
      const toolbarHeight = 40;
      const offset = 8;

      let top = rect.top - toolbarHeight - offset;
      let left = rect.left + (rect.width / 2);

      // If toolbar would be above viewport, show below selection
      if (top < 0) {
        top = rect.bottom + offset;
      }

      // Keep toolbar within viewport horizontally
      const toolbarWidth = 80; // Approximate width
      if (left - toolbarWidth / 2 < 0) {
        left = toolbarWidth / 2;
      } else if (left + toolbarWidth / 2 > window.innerWidth) {
        left = window.innerWidth - toolbarWidth / 2;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    // Listen to scroll events from the scroll container instead of window
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePosition);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updatePosition);
      }
    };
  }, [scrollContainerRef]);

  return (
    <div
      data-floating-toolbar
      className="fixed z-50 flex items-center gap-1 bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-lg shadow-xl p-1.5 dark:bg-gray-800/95 dark:border-gray-600/80"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-white hover:bg-green-500/20 hover:text-green-300 transition-colors"
        onClick={onCreateSegment}
        title={`Create Segment #${segments.length + 1}`}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-white hover:bg-red-500/20 hover:text-red-300 transition-colors"
        onClick={onCancel}
        title="Cancel selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};