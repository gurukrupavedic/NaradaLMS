/**
 * EXPERIMENT 1: Clean Annotation Layer with Integrated Header
 * 
 * Rebuilt from scratch with:
 * - Integrated header with segment count
 * - Full height responsive layout
 * - Independent scrolling content area
 * - Clean text selection and highlighting
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test clean annotation workflow with improved UX
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Edit3 } from 'lucide-react';
import { Plus, X } from 'lucide-react';
import type { TextSegment, Language, ContentMap, TextRange } from '@shared/experiment1-types';
import { getLanguageLabel, getDisplayText, getSegmentationText, normalizeLineBreaks } from '@shared/experiment1-utils';

interface AnnotationLayerProps {
  content: ContentMap;
  currentLanguage: Language;
  segments: TextSegment[];
  selectedSegmentId?: string;
  onSegmentCreate: (segment: TextSegment) => void;
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
  onSegmentDelete: (id: string) => void;
}

export const Experiment1_AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  content,
  currentLanguage,
  segments,
  selectedSegmentId,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentDelete
}) => {
  // State for text selection and segment creation
  const [selectedRange, setSelectedRange] = useState<TextRange | null>(null);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState<boolean>(false);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Get normalized text content (same for both display and segmentation)
  const normalizedText = getDisplayText(content, currentLanguage);

  // Simplified text position calculation with normalization
  const getTextPosition = (selectedText: string): { start: number, end: number } => {
    const trimmedSelection = selectedText.trim();
    if (!trimmedSelection) return { start: 0, end: 0 };
    
    // Normalize both texts for consistent position calculation
    const normalizedSelection = normalizeLineBreaks(trimmedSelection);
    const startIndex = normalizedText.indexOf(normalizedSelection);
    
    if (startIndex === -1) {
      console.warn('Could not find selection in normalized text');
      return { start: 0, end: 0 };
    }
    
    return {
      start: startIndex,
      end: startIndex + normalizedSelection.length
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

  // Handle text selection with normalized line break matching
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    console.log('Selection detected:', { 
      selectedText: selectedText.substring(0, 50) + '...', 
      length: selectedText.length,
      isMultiLine: selectedText.includes('\n')
    });

    // Use the simplified position calculation
    const range = getTextPosition(selectedText);
    
    if (range.start >= 0) {
      console.log('Match found at position:', range.start, 'to', range.end);
      setSelectedRange(range);
      setShowFloatingToolbar(true);
      return;
    }
    
    console.warn('Could not find selected text in content');
  }, [normalizedText]);

  // Create new segment from selection
  const handleCreateSegment = useCallback((conceptualName: string) => {
    if (!selectedRange) return;

    const newSegment: TextSegment = {
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conceptualName,
      textReferences: {
        [currentLanguage]: selectedRange
      },
      order: segments.length
    };

    onSegmentCreate(newSegment);
    setSelectedRange(null);
    setShowFloatingToolbar(false);

    // Clear selection
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, currentLanguage, segments.length, onSegmentCreate]);

  // Render highlighted text with segment overlays
  const renderHighlightedText = () => {
    if (!normalizedText) return <div className="text-muted-foreground">No content available for {currentLanguage}</div>;

    // Get all segments for current language
    const languageSegments = segments
      .filter(segment => segment.textReferences[currentLanguage])
      .sort((a, b) => a.textReferences[currentLanguage]!.start - b.textReferences[currentLanguage]!.start);

    if (languageSegments.length === 0) {
      return <div className="whitespace-pre-wrap leading-relaxed">{normalizedText}</div>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    languageSegments.forEach((segment, index) => {
      const range = segment.textReferences[currentLanguage]!;
      
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
          className={`relative rounded px-1 py-0.5 cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-blue-200 text-blue-900 ring-2 ring-blue-400' 
              : 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200'
          }`}
          title={segment.conceptualName}
        >
          {normalizedText.slice(range.start, range.end)}
          {editingSegment === segment.id && (
            <div className="absolute top-full left-0 z-10 mt-1 p-2 bg-white border rounded shadow-lg min-w-48">
              <Input
                defaultValue={segment.conceptualName}
                placeholder="Segment name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const newName = (e.target as HTMLInputElement).value.trim();
                    if (newName) {
                      onSegmentUpdate(segment.id, { conceptualName: newName });
                    }
                    setEditingSegment(null);
                  } else if (e.key === 'Escape') {
                    setEditingSegment(null);
                  }
                }}
                onBlur={(e) => {
                  const newName = e.target.value.trim();
                  if (newName && newName !== segment.conceptualName) {
                    onSegmentUpdate(segment.id, { conceptualName: newName });
                  }
                  setEditingSegment(null);
                }}
                autoFocus
                className="text-sm"
              />
              <div className="flex gap-1 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSegment(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    onSegmentDelete(segment.id);
                    setEditingSegment(null);
                  }}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
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

    return <div className="leading-relaxed">{parts}</div>;
  };



  return (
    <div className="h-full overflow-y-auto">
      {/* Header - now inside scrollable area and sticky */}
      <div className="sticky top-0 z-10 px-6 py-3 bg-gray-50 border-b">
        <h2 className="text-base font-semibold text-gray-700">Content ({getLanguageLabel(currentLanguage)})</h2>
      </div>

      {/* Content Area */}
      <div className="p-4">
        <div className="space-y-4">
          {/* Text Content with Highlighting */}
          <div
            ref={textRef}
            className="relative p-6 bg-white border rounded-lg min-h-96 cursor-text font-serif text-base leading-relaxed shadow-sm"
            onMouseUp={handleTextSelection}
            onContextMenu={(e) => {
              e.preventDefault();
              const target = e.target as HTMLElement;
              const segmentElement = target.closest('[title]');
              if (segmentElement) {
                const segmentTitle = segmentElement.getAttribute('title');
                const segment = segments.find(s => s.conceptualName === segmentTitle);
                if (segment) {
                  setEditingSegment(segment.id);
                }
              }
            }}
          >
            {renderHighlightedText()}
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
  onCreateSegment: (segmentName: string) => void;
  onCancel: () => void;
}> = ({ segments, onCreateSegment, onCancel }) => {
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
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, []);

  return (
    <div
      data-floating-toolbar
      className="fixed z-50 flex items-center gap-1 bg-white border border-gray-300 rounded-lg shadow-lg p-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-700"
        onClick={() => {
          const segmentName = `Segment ${segments.length + 1}`;
          onCreateSegment(segmentName);
        }}
        title={`Create Segment #${segments.length + 1}`}
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
        onClick={onCancel}
        title="Cancel selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};