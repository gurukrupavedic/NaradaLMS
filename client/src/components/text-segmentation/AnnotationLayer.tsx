/**
 * Text Annotation Layer Component
 * 
 * Provides text selection, highlighting, and segment creation functionality
 * with integrated header and full height responsive layout.
 * 
 * Created: January 2025
 * Purpose: Clean annotation workflow with improved UX
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Edit3 } from 'lucide-react';
import { Plus, X } from 'lucide-react';
import type { TextSegment, Language, ContentMap, TextRange } from '@shared/types/text-segmentation';
import { getDisplayText, generateSegmentId, isValidTextRange } from '@shared/utils/text-utils';

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

  // Get normalized text content
  const displayText = getDisplayText(content, currentLanguage);
  const normalizedText = displayText.replace(/\r\n|\r/g, '\n');

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !textRef.current) {
      setSelectedRange(null);
      setShowFloatingToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const textContent = textRef.current.textContent || '';
    
    // Get selection bounds relative to the text content
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    
    if (startOffset === endOffset) {
      setSelectedRange(null);
      setShowFloatingToolbar(false);
      return;
    }

    // Validate the range
    if (isValidTextRange(textContent, startOffset, endOffset)) {
      const newRange: TextRange = {
        start: startOffset,
        end: endOffset,
        text: textContent.slice(startOffset, endOffset),
        language: currentLanguage
      };
      
      setSelectedRange(newRange);
      setShowFloatingToolbar(true);
    }
  }, [currentLanguage]);

  // Create segment from selection
  const handleCreateSegment = useCallback(() => {
    if (!selectedRange) return;

    const conceptualName = selectedRange.text?.trim() || 'Unnamed Segment';
    const newSegment: TextSegment = {
      id: generateSegmentId(),
      conceptualName: conceptualName.length > 50 ? conceptualName.slice(0, 47) + '...' : conceptualName,
      textReferences: {
        [currentLanguage]: {
          start: selectedRange.start,
          end: selectedRange.end
        }
      },
      order: segments.length
    };

    onSegmentCreate(newSegment);
    setSelectedRange(null);
    setShowFloatingToolbar(false);
    
    // Clear selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, [selectedRange, currentLanguage, segments.length, onSegmentCreate]);

  // Cancel selection
  const handleCancelSelection = useCallback(() => {
    setSelectedRange(null);
    setShowFloatingToolbar(false);
    
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  // Handle segment editing
  const handleSegmentEdit = useCallback((segmentId: string, newName: string) => {
    if (newName.trim()) {
      onSegmentUpdate(segmentId, { conceptualName: newName.trim() });
    }
    setEditingSegment(null);
  }, [onSegmentUpdate]);

  // Render highlighted text with segments
  const renderHighlightedText = useCallback(() => {
    if (!normalizedText) {
      return <p className="text-muted-foreground italic">No content available for this language</p>;
    }

    // Get segments for current language, sorted by position
    const languageSegments = segments
      .filter(segment => segment.textReferences[currentLanguage])
      .sort((a, b) => {
        const rangeA = a.textReferences[currentLanguage]!;
        const rangeB = b.textReferences[currentLanguage]!;
        return rangeA.start - rangeB.start;
      });

    if (languageSegments.length === 0) {
      return <p className="whitespace-pre-wrap leading-relaxed">{normalizedText}</p>;
    }

    const elements: React.ReactNode[] = [];
    let lastEnd = 0;

    languageSegments.forEach((segment, index) => {
      const range = segment.textReferences[currentLanguage]!;
      
      // Add text before this segment
      if (range.start > lastEnd) {
        const beforeText = normalizedText.slice(lastEnd, range.start);
        elements.push(
          <span key={`before-${index}`} className="whitespace-pre-wrap">
            {beforeText}
          </span>
        );
      }

      // Add highlighted segment
      const segmentText = normalizedText.slice(range.start, range.end);
      const isSelected = selectedSegmentId === segment.id;
      
      elements.push(
        <span
          key={segment.id}
          className={`relative inline-block px-1 py-0.5 rounded-sm cursor-pointer transition-colors ${
            isSelected
              ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500'
              : 'bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800'
          }`}
          title={segment.conceptualName}
          onClick={() => {
            // Handle segment selection if needed
          }}
        >
          {segmentText}
        </span>
      );

      lastEnd = range.end;
    });

    // Add remaining text
    if (lastEnd < normalizedText.length) {
      const remainingText = normalizedText.slice(lastEnd);
      elements.push(
        <span key="remaining" className="whitespace-pre-wrap">
          {remainingText}
        </span>
      );
    }

    return <div className="leading-relaxed">{elements}</div>;
  }, [normalizedText, segments, currentLanguage, selectedSegmentId]);

  // Get segments for current language
  const currentLanguageSegments = segments.filter(segment => 
    segment.textReferences[currentLanguage]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">Text Segmentation</h3>
            <Badge variant="secondary" className="text-xs">
              {currentLanguageSegments.length} segments
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Select text to create segments
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="flex-1 relative">
        <ScrollArea className="h-full">
          <div className="p-6">
            <div
              ref={textRef}
              className="prose max-w-none"
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
            >
              {renderHighlightedText()}
            </div>
          </div>
        </ScrollArea>

        {/* Floating Toolbar */}
        {showFloatingToolbar && selectedRange && (
          <div className="absolute top-4 right-4 bg-background border rounded-lg shadow-lg p-2 flex items-center gap-2 z-10">
            <Button
              size="sm"
              onClick={handleCreateSegment}
              className="h-8"
            >
              <Plus className="w-3 h-3 mr-1" />
              Create Segment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelSelection}
              className="h-8"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Segments List */}
      <div className="flex-none border-t bg-muted/30">
        <ScrollArea className="h-48">
          <div className="p-4 space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Segments ({currentLanguageSegments.length})
            </h4>
            {currentLanguageSegments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No segments created yet. Select text above to create segments.
              </p>
            ) : (
              currentLanguageSegments
                .sort((a, b) => {
                  const rangeA = a.textReferences[currentLanguage]!;
                  const rangeB = b.textReferences[currentLanguage]!;
                  return rangeA.start - rangeB.start;
                })
                .map((segment) => (
                  <div
                    key={segment.id}
                    className="flex items-center justify-between p-2 bg-background border rounded-md hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      {editingSegment === segment.id ? (
                        <Input
                          defaultValue={segment.conceptualName}
                          onBlur={(e) => handleSegmentEdit(segment.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSegmentEdit(segment.id, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingSegment(null);
                            }
                          }}
                          className="h-6 text-sm"
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">
                          {segment.conceptualName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingSegment(segment.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSegmentDelete(segment.id)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};