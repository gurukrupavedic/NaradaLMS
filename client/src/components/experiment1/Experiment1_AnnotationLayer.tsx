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

import React, { useState, useRef, useCallback } from 'react';
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Text Segmentation Studio</h3>
        <p className="text-sm text-muted-foreground">
          Select text to create segments for audio synchronization
        </p>
      </div>

      {/* EXPERIMENT1: Text content with annotation overlays */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Content ({currentLanguage.toUpperCase()})
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {segments.filter(s => s.textReferences[currentLanguage]).length} segments created
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px] p-4 border rounded-lg bg-slate-50">
            {renderTextWithOverlays()}
          </div>
        </CardContent>
      </Card>

      {/* EXPERIMENT1: Segment creation dialog */}
      {isSelecting && selectedRange && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Selected text:</p>
                <p className="text-sm bg-white p-2 rounded border">
                  "{(content[currentLanguage] || '').slice(selectedRange.start, selectedRange.end)}"
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateSegment} className="flex-1">
                  Create Segment #{segments.length + 1}
                </Button>
                <Button variant="outline" onClick={handleCancelSelection}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600">
            <h4 className="font-medium mb-2">How to use:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Select text by clicking and dragging</li>
              <li>Click "Create Segment" to save (automatically numbered)</li>
              <li>Manage all segments using the cards in the right panel</li>
              <li>Click segment cards to highlight text in content</li>
              <li>Drag cards to reorder segments or delete as needed</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};