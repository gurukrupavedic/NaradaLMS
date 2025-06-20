/**
 * Text Annotation Layer - Production Component
 * 
 * Clean annotation workflow with:
 * - Integrated header with segment count
 * - Full height responsive layout
 * - Independent scrolling content area
 * - Clean text selection and highlighting
 * 
 * Status: Production Ready
 * Migrated: January 2025
 * Purpose: Intuitive text segmentation workflow
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Edit3 } from 'lucide-react';
import { Plus, X } from 'lucide-react';
import type { TextSegment, Language, ContentMap, TextRange } from '@shared/types';
import { getLanguageLabel, getDisplayText, getSegmentationText, normalizeLineBreaks } from '@shared/utils';

interface AnnotationLayerProps {
  content: ContentMap;
  currentLanguage: Language;
  segments: TextSegment[];
  selectedSegmentId?: string;
  onSegmentCreate: (segment: TextSegment) => void;
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
  onSegmentDelete: (id: string) => void;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
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

  // Handle text selection and show floating toolbar
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowFloatingToolbar(false);
      setSelectedRange(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setShowFloatingToolbar(false);
      setSelectedRange(null);
      return;
    }

    // Calculate position within the normalized text
    const position = getTextPosition(selectedText);
    
    if (position.start === 0 && position.end === 0) {
      setShowFloatingToolbar(false);
      setSelectedRange(null);
      return;
    }

    setSelectedRange({
      start: position.start,
      end: position.end,
      text: selectedText
    });
    setShowFloatingToolbar(true);
  }, [normalizedText]);

  // Create segment from selection
  const handleCreateSegment = useCallback(() => {
    if (!selectedRange) return;

    const newSegment: TextSegment = {
      id: Date.now().toString(),
      conceptualName: selectedRange.text.substring(0, 50),
      textReferences: {
        [currentLanguage]: {
          start: selectedRange.start,
          end: selectedRange.end
        }
      }
    };

    onSegmentCreate(newSegment);
    setSelectedRange(null);
    setShowFloatingToolbar(false);
    
    // Clear browser selection
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, currentLanguage, onSegmentCreate]);

  // Get segments for current language, sorted by position
  const currentLanguageSegments = segments
    .filter(segment => segment.textReferences[currentLanguage])
    .sort((a, b) => {
      const aStart = a.textReferences[currentLanguage]?.start || 0;
      const bStart = b.textReferences[currentLanguage]?.start || 0;
      return aStart - bStart;
    });

  // Render text with segment highlighting
  const renderTextWithHighlights = () => {
    if (!normalizedText) {
      return <div className="text-gray-500 italic">No content available for {getLanguageLabel(currentLanguage)}</div>;
    }

    if (currentLanguageSegments.length === 0) {
      return <div className="whitespace-pre-wrap leading-relaxed">{normalizedText}</div>;
    }

    const parts = [];
    let lastEnd = 0;

    currentLanguageSegments.forEach((segment, index) => {
      const ref = segment.textReferences[currentLanguage];
      if (!ref) return;

      // Add text before this segment
      if (ref.start > lastEnd) {
        parts.push(
          <span key={`before-${index}`} className="text-gray-900">
            {normalizedText.substring(lastEnd, ref.start)}
          </span>
        );
      }

      // Add highlighted segment
      parts.push(
        <span
          key={segment.id}
          className={`px-1 py-0.5 rounded cursor-pointer transition-all duration-200 ${
            selectedSegmentId === segment.id
              ? 'bg-blue-200 border border-blue-400'
              : 'bg-yellow-100 border border-yellow-300 hover:bg-yellow-200'
          }`}
          title={segment.conceptualName}
          onClick={(e) => {
            e.stopPropagation();
            // Could trigger segment selection callback here
          }}
        >
          {normalizedText.substring(ref.start, ref.end)}
        </span>
      );

      lastEnd = ref.end;
    });

    // Add remaining text
    if (lastEnd < normalizedText.length) {
      parts.push(
        <span key="remaining" className="text-gray-900">
          {normalizedText.substring(lastEnd)}
        </span>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with segment count */}
      <div className="flex-shrink-0 p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Text Annotation</h3>
            <Badge variant="secondary" className="text-xs">
              {getLanguageLabel(currentLanguage)}
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs">
            {currentLanguageSegments.length} segments
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Select text to create segments for annotation
        </p>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            <div
              ref={textRef}
              className="relative cursor-text select-text"
              onMouseUp={handleTextSelection}
            >
              {renderTextWithHighlights()}
            </div>
          </div>
        </ScrollArea>

        {/* Floating toolbar */}
        {showFloatingToolbar && selectedRange && (
          <div
            data-floating-toolbar
            className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10"
            style={{ maxWidth: '300px' }}
          >
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900">Selected Text</div>
                <div className="text-gray-600 text-xs mt-1">
                  Characters {selectedRange.start}-{selectedRange.end}
                </div>
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-20 overflow-y-auto">
                  "{selectedRange.text}"
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateSegment}
                  className="flex-1"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create Segment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowFloatingToolbar(false);
                    setSelectedRange(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnotationLayer;