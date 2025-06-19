/**
 * EXPERIMENT 1: Annotation Layer + Progressive Mapping Segmentation
 * 
 * This component provides an annotation overlay system for text segmentation.
 * Users can select text ranges to create segments without modifying the source content.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test intuitive text segmentation workflow using overlay approach
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface Experiment1_AnnotationLayerProps {
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  currentLanguage: 'te' | 'hi' | 'en';
  segments: TextSegment[];
  selectedSegmentId?: string;
  onSegmentCreate: (segment: Omit<TextSegment, 'id' | 'order'>) => void;
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
  onSegmentDelete: (id: string) => void;
}

export const Experiment1_AnnotationLayer: React.FC<Experiment1_AnnotationLayerProps> = ({
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
      
      // Hide if clicking outside the text area
      if (textRef.current && !textRef.current.contains(target)) {
        setShowFloatingToolbar(false);
        setSelectedRange(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);
    // Listen for clicks outside the text area
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // EXPERIMENT1: Handle text selection for segment creation
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textContent = content[currentLanguage] || '';
    
    // EXPERIMENT1: Calculate character offsets relative to the entire text content
    const containerElement = textRef.current;
    if (!containerElement) return;

    // Get the text content and calculate positions
    const fullText = containerElement.textContent || '';
    const selectedText = range.toString().trim();
    
    if (!selectedText) return;

    // Find the start position of selected text in the full content
    const rangeStartContainer = range.startContainer;
    const rangeEndContainer = range.endContainer;
    
    // Calculate character offset from the beginning of the text
    let start = 0;
    let end = 0;
    
    // Create a temporary range to calculate positions
    const tempRange = document.createRange();
    tempRange.selectNodeContents(containerElement);
    tempRange.setEnd(rangeStartContainer, range.startOffset);
    start = tempRange.toString().length;
    
    tempRange.selectNodeContents(containerElement);
    tempRange.setEnd(rangeEndContainer, range.endOffset);
    end = tempRange.toString().length;
    
    if (start !== end && selectedText) {
      setSelectedRange({ start, end });
      setShowFloatingToolbar(true);
    }
  }, [content, currentLanguage, segments.length]);

  // Create new segment from selection
  const handleCreateSegment = () => {
    if (!selectedRange) return;

    const newSegment = {
      conceptualName: `#${segments.length + 1}`, // Auto-generated, will be replaced by fluid numbering
      textReferences: {
        [currentLanguage]: selectedRange
      }
    };

    onSegmentCreate(newSegment);
    
    // Reset selection state
    setSelectedRange(null);
    setShowFloatingToolbar(false);
    window.getSelection()?.removeAllRanges();
  };

  // Cancel segment creation
  const handleCancelSelection = () => {
    setSelectedRange(null);
    setShowFloatingToolbar(false);
    window.getSelection()?.removeAllRanges();
  };



  // EXPERIMENT1: Render text with highlighting for selected segment
  const renderTextWithOverlays = () => {
    const textContent = content[currentLanguage] || '';
    if (!textContent) return <p className="text-muted-foreground">No content available for this language</p>;

    // Find the selected segment for highlighting
    const selectedSegment = selectedSegmentId 
      ? segments.find(s => s.id === selectedSegmentId && s.textReferences[currentLanguage])
      : null;

    // Render text with highlighted selection
    let textElement;
    if (selectedSegment) {
      const selectedRange = selectedSegment.textReferences[currentLanguage]!;
      const beforeText = textContent.slice(0, selectedRange.start);
      const highlightedText = textContent.slice(selectedRange.start, selectedRange.end);
      const afterText = textContent.slice(selectedRange.end);

      textElement = (
        <div 
          ref={textRef}
          className="whitespace-pre-wrap leading-relaxed cursor-text p-4 border rounded-lg bg-white relative"
          onMouseUp={handleMouseUp}
          style={{ userSelect: 'text' }}
        >
          {beforeText}
          <span className="bg-blue-200 border border-blue-300 rounded px-1 py-0.5 text-blue-900 font-medium">
            {highlightedText}
          </span>
          {afterText}
        </div>
      );
    } else {
      textElement = (
        <div 
          ref={textRef}
          className="whitespace-pre-wrap leading-relaxed cursor-text p-4 border rounded-lg bg-white relative"
          onMouseUp={handleMouseUp}
          style={{ userSelect: 'text' }}
        >
          {textContent}
        </div>
      );
    }

    return (
      <div className="relative">
        {textElement}

      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Clean header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-1">Content ({currentLanguage.toUpperCase()})</h3>
        <p className="text-sm text-muted-foreground">
          {segments.filter(s => s.textReferences[currentLanguage]).length} segments created
        </p>
      </div>

      {/* Clean content area */}
      <div className="flex-1 min-h-[400px] p-6 bg-slate-50 rounded-lg border border-gray-200">
        <div ref={textRef} className="leading-relaxed text-gray-800">
          {renderTextWithOverlays()}
        </div>
      </div>

      {/* Floating toolbar for text selection */}
      <FloatingSelectionToolbar
        isVisible={showFloatingToolbar}
        onCreateSegment={handleCreateSegment}
        onCancel={handleCancelSelection}
        nextSegmentNumber={segments.length + 1}
      />
    </div>
  );
};