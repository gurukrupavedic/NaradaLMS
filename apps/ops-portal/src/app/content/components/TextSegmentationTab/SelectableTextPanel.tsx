import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, cn } from '@narada/ui';
import { Plus } from 'lucide-react';
import type { TextSegment, Script, ContentMap } from '@shared/types/text-segmentation';
import { getDisplayText } from '@shared/utils/text-segmentation';

interface SelectableTextPanelProps {
    content: ContentMap;
    script: Script;
    segments: (Omit<TextSegment, 'createdAt' | 'createdBy' | 'script'> & { createdAt?: string | Date | null; createdBy?: string; script: string | Script })[];
    selectedSegmentId?: number;
    onSegmentSelect?: (segmentId: number | undefined) => void;
    onCreateSegment: (data: { script: string; startPosition: number; endPosition: number }) => void;
    disabled?: boolean;
}

export function SelectableTextPanel({
    content,
    script,
    segments,
    selectedSegmentId,
    onSegmentSelect,
    onCreateSegment,
    disabled = false,
}: SelectableTextPanelProps) {
    const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
    const [showToolbar, setShowToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
    const textContainerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Get plain text for this script
    const plainText = getDisplayText(content, script);

    // Calculate text position from DOM selection
    const getTextPosition = (selection: Selection, container: HTMLElement): { start: number; end: number } | null => {
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);

        const preSelectionRange = document.createRange();
        preSelectionRange.selectNodeContents(container);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const startPosition = preSelectionRange.toString().length;

        const fullRange = document.createRange();
        fullRange.selectNodeContents(container);
        fullRange.setEnd(range.endContainer, range.endOffset);
        const endPosition = fullRange.toString().length;

        return { start: startPosition, end: endPosition };
    };

    // Handle text selection
    const handleTextSelection = useCallback(() => {
        if (disabled) return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !textContainerRef.current) {
            setShowToolbar(false);
            setSelectedRange(null);
            return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText) {
            setShowToolbar(false);
            setSelectedRange(null);
            return;
        }

        const range = getTextPosition(selection, textContainerRef.current);
        if (range && range.start >= 0 && range.end > range.start) {
            setSelectedRange(range);

            // Position toolbar
            const domRange = selection.getRangeAt(0);
            const rect = domRange.getBoundingClientRect();

            const toolbarHeight = 40;
            const offset = 8;

            let top = rect.top - toolbarHeight - offset;
            const left = rect.left + (rect.width / 2);

            if (top < 0) {
                top = rect.bottom + offset;
            }

            setToolbarPosition({ top, left });
            setShowToolbar(true);
        }
    }, [disabled]);

    // Handle segment creation
    const handleCreateSegment = useCallback(() => {
        if (!selectedRange) return;

        onCreateSegment({
            script,
            startPosition: selectedRange.start,
            endPosition: selectedRange.end,
        });

        setSelectedRange(null);
        setShowToolbar(false);
        window.getSelection()?.removeAllRanges();
    }, [selectedRange, script, onCreateSegment]);

    // Cancel selection
    const handleCancel = useCallback(() => {
        setShowToolbar(false);
        setSelectedRange(null);
        window.getSelection()?.removeAllRanges();
    }, []);

    // Render text with segment highlights
    const renderSegmentedText = () => {
        if (!plainText || segments.length === 0) {
            return <div className="whitespace-pre-wrap">{plainText || ''}</div>;
        }

        const sortedSegments = [...segments].sort((a, b) => a.startPosition - b.startPosition);
        const parts: React.ReactNode[] = [];
        let lastEnd = 0;

        sortedSegments.forEach((segment, index) => {
            // Text before segment
            if (segment.startPosition > lastEnd) {
                parts.push(
                    <span key={`before-${index}`} className="cursor-text">
                        {plainText.substring(lastEnd, segment.startPosition)}
                    </span>
                );
            }

            // Segment highlight
            const isSelected = selectedSegmentId === segment.id;
            parts.push(
                <span
                    key={`segment-${segment.id}`}
                    id={`left-segment-${segment.id}`}
                    className={`px-1.5 py-0.5 rounded-sm cursor-pointer transition-all ${isSelected
                        ? 'bg-mantra-base text-white font-medium'
                        : 'bg-mantra-base/[0.08] border-l-2 border-r-2 border-y border-mantra-base/20 hover:bg-mantra-base/15 hover:border-mantra-base/50 text-foreground'
                        }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSegmentSelect?.(segment.id);
                    }}
                    title={`Segment #${segment.order}`}
                >
                    {plainText.substring(segment.startPosition, segment.endPosition)}
                </span>
            );

            lastEnd = segment.endPosition;
        });

        // Remaining text
        if (lastEnd < plainText.length) {
            parts.push(
                <span key="after" className="cursor-text">
                    {plainText.substring(lastEnd)}
                </span>
            );
        }

        return <div className="whitespace-pre-wrap">{parts}</div>;
    };


    // Global click-away listener for "The Singularity" dismissal
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Dismiss if click is outside both the toolbar AND the text container
            if (
                showToolbar &&
                toolbarRef.current &&
                !toolbarRef.current.contains(event.target as Node) &&
                textContainerRef.current &&
                !textContainerRef.current.contains(event.target as Node)
            ) {
                setShowToolbar(false);
                setSelectedRange(null);
                window.getSelection()?.removeAllRanges();
            }
        };

        if (showToolbar) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showToolbar]);

    // Auto-scroll to selected segment
    useEffect(() => {
        if (selectedSegmentId) {
            const element = document.getElementById(`left-segment-${selectedSegmentId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selectedSegmentId]);

    // Update toolbar position on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (showToolbar) {
                setShowToolbar(false);
                setSelectedRange(null);
            }
        };

        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            return () => scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, [showToolbar]);

    return (
        <div className="h-full flex flex-col" ref={scrollContainerRef}>
            <div className="flex-1 overflow-auto" onClick={() => onSegmentSelect?.(undefined)}>
                <div
                    ref={textContainerRef}
                    className={cn(
                        "p-8 tiptap-content max-w-4xl mx-auto text-3xl leading-[1.8]",
                        script === 'hi' ? "font-medium" : "font-normal",
                        disabled ? "select-none cursor-default" : "select-text cursor-text"
                    )}
                    onMouseUp={disabled ? undefined : handleTextSelection}
                    style={{
                        fontFamily: script === 'te' ? 'JIMS, Noto Sans Telugu, sans-serif' :
                            script === 'hi' ? 'AdishilaSanVedic, Noto Sans Devanagari, sans-serif' :
                                'AdishilaSan, Noto Sans, sans-serif',
                    }}
                >
                    {renderSegmentedText()}
                </div>
            </div>

            {/* Floating Toolbar */}
            {showToolbar && selectedRange && !disabled && (
                <div
                    ref={toolbarRef}
                    className="fixed z-50 flex items-center gap-1 bg-sidebar backdrop-blur-md border border-sidebar-border rounded-lg shadow-xl p-1.5"
                    style={{
                        top: `${toolbarPosition.top}px`,
                        left: `${toolbarPosition.left}px`,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-mantra-base hover:text-white"
                        onClick={handleCreateSegment}
                        title="Create Segment"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
