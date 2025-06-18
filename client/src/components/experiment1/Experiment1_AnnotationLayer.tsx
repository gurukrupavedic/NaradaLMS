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
      setIsSelecting(true);
    }
  }, [content, currentLanguage, segments.length]);

  // EXPERIMENT1: Create new segment from selection
  const handleCreateSegment = () => {
    if (!selectedRange) return;

    const newSegment = {
      conceptualName: `#${segments.length + 1}`, // Auto-generated, will be replaced by fluid numbering
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

  // EXPERIMENT1: Pure CSS overlay approach - no DOM manipulation
  const renderTextWithOverlays = () => {
    const textContent = content[currentLanguage] || '';
    if (!textContent) return <p className="text-muted-foreground">No content available for this language</p>;

    return (
      <div className="relative">
        {/* EXPERIMENT1: Original text - never modified */}
        <div 
          ref={textRef}
          className="whitespace-pre-wrap leading-relaxed cursor-text p-4 border rounded-lg bg-white relative"
          onMouseUp={handleMouseUp}
          style={{ userSelect: 'text' }}
        >
          {textContent}
        </div>
        
        {/* EXPERIMENT1: Visual indicators for segments (outside main text) */}
        {segments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {segments
              .filter(segment => segment.textReferences[currentLanguage])
              .map((segment, index) => {
                const range = segment.textReferences[currentLanguage]!;
                const segmentText = textContent.slice(range.start, range.end);
                const color = `hsl(${(index * 137.5) % 360}, 70%, 85%)`;
                
                return (
                  <div
                    key={segment.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border cursor-pointer hover:shadow-sm"
                    style={{ backgroundColor: color }}
                    title={`Characters ${range.start}-${range.end}`}
                    onClick={() => {
                      // Highlight the text in the original content
                      const textElement = textRef.current;
                      if (textElement && window.getSelection) {
                        const selection = window.getSelection();
                        const range = document.createRange();
                        const textNode = textElement.firstChild;
                        if (textNode) {
                          range.setStart(textNode, segment.textReferences[currentLanguage]!.start);
                          range.setEnd(textNode, segment.textReferences[currentLanguage]!.end);
                          selection?.removeAllRanges();
                          selection?.addRange(range);
                        }
                      }
                    }}
                  >
                    <span className="font-mono">{segment.conceptualName}</span>
                    <span className="truncate max-w-32" title={segmentText}>
                      {segmentText.length > 20 ? segmentText.slice(0, 20) + '...' : segmentText}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSegmentDelete(segment.id);
                      }}
                      className="text-red-600 hover:text-red-800 ml-1"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
          </div>
        )}
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

      {/* EXPERIMENT1: Instructions */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600">
            <h4 className="font-medium mb-2">How to use:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Select text by clicking and dragging</li>
              <li>Click "Create Segment" to save (automatically numbered)</li>
              <li>Existing segments appear highlighted with numbers</li>
              <li>Drag segments in the right panel to reorder</li>
              <li>Click on segments to select or delete them</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};