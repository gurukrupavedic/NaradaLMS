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
import { Trash2, Edit3 } from 'lucide-react';
import { FloatingSelectionToolbar } from './FloatingSelectionToolbar';

interface TextRange {
  start: number;
  end: number;
}

interface TextSegment {
  id: string;
  conceptualName: string;
  textReferences: {
    te?: TextRange;
    hi?: TextRange;
    en?: TextRange;
  };
  order: number;
}

interface Experiment1_AnnotationLayer_v2Props {
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  currentLanguage: 'te' | 'hi' | 'en';
  segments: TextSegment[];
  selectedSegmentId?: string;
  onSegmentCreate: (segment: TextSegment) => void;
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
  onSegmentDelete: (id: string) => void;
}

export const Experiment1_AnnotationLayer_v2: React.FC<Experiment1_AnnotationLayer_v2Props> = ({
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

  // Get current text content
  const currentText = content[currentLanguage] || '';

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

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Get the range relative to the text container
    const range = selection.getRangeAt(0);
    const textContainer = textRef.current;
    if (!textContainer) return;

    // Calculate character positions
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(textContainer);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + selectedText.length;

    setSelectedRange({ start, end });
    setShowFloatingToolbar(true);
  }, []);

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
    if (!currentText) return <div className="text-muted-foreground">No content available for {currentLanguage}</div>;

    // Get all segments for current language
    const languageSegments = segments
      .filter(segment => segment.textReferences[currentLanguage])
      .sort((a, b) => a.textReferences[currentLanguage]!.start - b.textReferences[currentLanguage]!.start);

    if (languageSegments.length === 0) {
      return <div className="whitespace-pre-wrap leading-relaxed">{currentText}</div>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    languageSegments.forEach((segment, index) => {
      const range = segment.textReferences[currentLanguage]!;
      
      // Add text before this segment
      if (range.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`} className="whitespace-pre-wrap">
            {currentText.slice(lastIndex, range.start)}
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
          {currentText.slice(range.start, range.end)}
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
    if (lastIndex < currentText.length) {
      parts.push(
        <span key="text-end" className="whitespace-pre-wrap">
          {currentText.slice(lastIndex)}
        </span>
      );
    }

    return <div className="leading-relaxed">{parts}</div>;
  };

  const getLanguageLabel = () => {
    switch (currentLanguage) {
      case 'te': return 'Telugu';
      case 'hi': return 'Hindi';
      case 'en': return 'English';
      default: return currentLanguage.toUpperCase();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Integrated Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-muted/30 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Content ({getLanguageLabel()})</h2>
          <Badge variant="secondary">
            {segments.length} segments created
          </Badge>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>How to create segments:</strong> Select any text below and use the floating toolbar to create a new segment.
              Click on highlighted segments to select them or right-click to edit.
            </p>
          </div>

          {/* Text Content with Highlighting */}
          <div
            ref={textRef}
            className="relative p-6 bg-white border rounded-lg min-h-96 cursor-text font-serif text-base leading-relaxed"
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

          {/* Floating Selection Toolbar */}
          {showFloatingToolbar && selectedRange && (
            <FloatingSelectionToolbar
              selectedText={currentText.slice(selectedRange.start, selectedRange.end)}
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