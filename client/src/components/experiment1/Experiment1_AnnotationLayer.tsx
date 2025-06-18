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
  onSegmentCreate: (segment: Omit<TextSegment, 'id' | 'order'>) => void;
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
  onSegmentDelete: (id: string) => void;
}

export const Experiment1_AnnotationLayer: React.FC<Experiment1_AnnotationLayerProps> = ({
  content,
  currentLanguage,
  segments,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentDelete
}) => {
  // EXPERIMENT1: State for text selection and segment creation
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TextRange | null>(null);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // EXPERIMENT1: Handle text selection for segment creation
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textContent = content[currentLanguage] || '';
    
    // EXPERIMENT1: Calculate character offsets relative to the text content
    const start = range.startOffset;
    const end = range.endOffset;
    
    if (start !== end && range.toString().trim()) {
      setSelectedRange({ start, end });
      setIsSelecting(true);
      setNewSegmentName(`Segment ${segments.length + 1}`);
    }
  }, [content, currentLanguage, segments.length]);

  // EXPERIMENT1: Create new segment from selection
  const handleCreateSegment = () => {
    if (!selectedRange || !newSegmentName.trim()) return;

    const newSegment = {
      conceptualName: newSegmentName.trim(),
      textReferences: {
        [currentLanguage]: selectedRange
      }
    };

    onSegmentCreate(newSegment);
    
    // EXPERIMENT1: Reset selection state
    setSelectedRange(null);
    setIsSelecting(false);
    setNewSegmentName('');
    window.getSelection()?.removeAllRanges();
  };

  // EXPERIMENT1: Cancel segment creation
  const handleCancelSelection = () => {
    setSelectedRange(null);
    setIsSelecting(false);
    setNewSegmentName('');
    window.getSelection()?.removeAllRanges();
  };

  // EXPERIMENT1: Generate overlay styles for existing segments
  const getSegmentOverlays = () => {
    const textContent = content[currentLanguage] || '';
    if (!textContent) return [];

    return segments
      .filter(segment => segment.textReferences[currentLanguage])
      .map((segment, index) => {
        const range = segment.textReferences[currentLanguage]!;
        const segmentText = textContent.slice(range.start, range.end);
        
        return {
          id: segment.id,
          name: segment.conceptualName,
          text: segmentText,
          start: range.start,
          end: range.end,
          color: `hsl(${(index * 137.5) % 360}, 70%, 85%)` // EXPERIMENT1: Generate distinct colors
        };
      });
  };

  // EXPERIMENT1: Render text with segment overlays
  const renderTextWithOverlays = () => {
    const textContent = content[currentLanguage] || '';
    if (!textContent) return <p className="text-muted-foreground">No content available for this language</p>;

    const overlays = getSegmentOverlays();
    if (overlays.length === 0) {
      return (
        <div 
          ref={textRef}
          className="whitespace-pre-wrap leading-relaxed cursor-text"
          onMouseUp={handleMouseUp}
          style={{ userSelect: 'text' }}
        >
          {textContent}
        </div>
      );
    }

    // EXPERIMENT1: Split text into segments with overlays
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    overlays
      .sort((a, b) => a.start - b.start)
      .forEach((overlay, index) => {
        // Add text before this segment
        if (overlay.start > lastIndex) {
          elements.push(
            <span key={`text-${index}`}>
              {textContent.slice(lastIndex, overlay.start)}
            </span>
          );
        }

        // Add segment with overlay
        elements.push(
          <span
            key={overlay.id}
            className="relative px-1 py-0.5 rounded cursor-pointer transition-all hover:ring-2 hover:ring-blue-400"
            style={{ backgroundColor: overlay.color }}
            title={`Segment: ${overlay.name}`}
            onClick={() => setEditingSegment(overlay.id)}
          >
            {overlay.text}
            <Badge 
              variant="secondary" 
              className="absolute -top-6 left-0 text-xs opacity-80 hover:opacity-100"
            >
              {overlay.name}
            </Badge>
          </span>
        );

        lastIndex = overlay.end;
      });

    // Add remaining text
    if (lastIndex < textContent.length) {
      elements.push(
        <span key="text-end">
          {textContent.slice(lastIndex)}
        </span>
      );
    }

    return (
      <div 
        ref={textRef}
        className="whitespace-pre-wrap leading-relaxed cursor-text relative"
        onMouseUp={handleMouseUp}
        style={{ userSelect: 'text' }}
      >
        {elements}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* EXPERIMENT1: Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Text Segmentation Studio</h3>
          <p className="text-sm text-muted-foreground">
            Select text to create segments for audio synchronization
          </p>
        </div>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          Experiment 1
        </Badge>
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
                <Input
                  placeholder="Enter segment name"
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSegment()}
                  className="flex-1"
                />
                <Button onClick={handleCreateSegment} disabled={!newSegmentName.trim()}>
                  Create Segment
                </Button>
                <Button variant="outline" onClick={handleCancelSelection}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EXPERIMENT1: Instructions */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600">
            <h4 className="font-medium mb-2">How to use:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Select text by clicking and dragging</li>
              <li>Enter a descriptive name for the segment</li>
              <li>Click "Create Segment" to save</li>
              <li>Existing segments appear highlighted with labels</li>
              <li>Click on segments to edit or delete them</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};