/**
 * FloatingSelectionToolbar.tsx
 * Floating toolbar that appears when text is selected
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface FloatingSelectionToolbarProps {
  isVisible: boolean;
  onCreateSegment: () => void;
  onCancel: () => void;
  nextSegmentNumber: number;
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  isVisible,
  onCreateSegment,
  onCancel,
  nextSegmentNumber
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible]);

  const updatePosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    if (rect.width === 0 && rect.height === 0) return;

    // Position toolbar above the selection
    const toolbarHeight = 40; // Approximate toolbar height
    const offset = 8; // Space between selection and toolbar
    
    let top = rect.top - toolbarHeight - offset;
    let left = rect.left + (rect.width / 2);

    // If toolbar would be above viewport, show below selection
    if (top < 0) {
      top = rect.bottom + offset;
    }

    // Ensure toolbar stays within viewport horizontally
    if (toolbarRef.current) {
      const toolbarWidth = toolbarRef.current.offsetWidth || 100;
      const maxLeft = window.innerWidth - toolbarWidth - 16;
      const minLeft = 16;
      
      left = Math.max(minLeft, Math.min(maxLeft, left - toolbarWidth / 2));
    }

    setPosition({ top, left });
  };

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-1 bg-white border border-gray-300 rounded-lg shadow-lg p-1 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-700"
        onClick={onCreateSegment}
        title={`Create Segment #${nextSegmentNumber}`}
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