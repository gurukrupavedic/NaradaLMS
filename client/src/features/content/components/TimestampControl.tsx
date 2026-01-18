import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Play, Trash2, Check, X, Plus } from 'lucide-react';
import { formatDuration } from '@shared/utils/text-segmentation';
import type { AudioMapping } from '@shared/types/text-segmentation';

interface TimestampControlProps {
    segmentId: number;
    // If mapped
    startTime?: number;
    endTime?: number;
    isMapped: boolean;

    // For unmapped/creation
    previousSegmentEndTime?: number; // to auto-suggest start time
    isFirstSegment?: boolean;

    // Controls
    duration: number;
    isEditing: boolean;
    onEditStart: () => void;
    onEditCancel: () => void;

    // Actions
    onPlay?: (start: number, end: number) => void;
    onDelete?: (segmentId: number) => void;
    onUpdate?: (segmentId: number, updates: { startTime?: number; endTime?: number }) => void;
    onCreate?: (mapping: AudioMapping) => void;

    readOnly?: boolean;
    className?: string;
}

export function TimestampControl({
    segmentId,
    startTime = 0,
    endTime = 0,
    isMapped,
    previousSegmentEndTime = 0,
    isFirstSegment = false,
    duration,
    isEditing,
    onEditStart,
    onEditCancel,
    onPlay,
    onDelete,
    onUpdate,
    onCreate,
    readOnly = false,
    className
}: TimestampControlProps) {
    const [editStartStr, setEditStartStr] = useState('');
    const [editEndStr, setEditEndStr] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Helpers ---
    const parseTime = (str: string): number => {
        const parts = str.split(':');
        if (parts.length !== 2) return -1;
        const mins = parseInt(parts[0]);
        const secs = parseFloat(parts[1]);
        if (isNaN(mins) || isNaN(secs)) return -1;
        return mins * 60 + secs;
    };

    const formatTime = (time: number) => formatDuration(time, { showDecimal: true });

    // --- Handlers ---
    const handleStartEdit = () => {
        if (readOnly) return;
        onEditStart();
        if (isMapped) {
            setEditStartStr(formatTime(startTime));
            setEditEndStr(formatTime(endTime));
        } else {
            // Creation mode defaults
            const suggestedStart = isFirstSegment ? 0 : previousSegmentEndTime;
            setEditStartStr(formatTime(suggestedStart));
            setEditEndStr('');
        }
    };

    const handleSave = () => {
        if (readOnly) return;
        const newStart = parseTime(editStartStr);
        const newEnd = parseTime(editEndStr);

        // Validation
        if (newStart < 0 || newEnd < 0) return alert("Invalid time format (mm:ss.s)");
        if (newStart > duration || newEnd > duration) return alert("Time exceeds duration");
        if (newStart >= newEnd) return alert("Start time must be before end time");

        if (isMapped && onUpdate) {
            onUpdate(segmentId, { startTime: newStart, endTime: newEnd });
        } else if (!isMapped && onCreate) {
            onCreate({ segmentId, startTime: newStart, endTime: newEnd });
        }
        onEditCancel();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') onEditCancel();
    };

    // Click outside to cancel
    useEffect(() => {
        if (!isEditing) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onEditCancel();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditing]);


    // --- Render ---

    // 1. Edit Mode
    if (isEditing) {
        return (
            <div
                ref={containerRef}
                className={cn(
                    "flex items-center gap-1 bg-background border border-primary ring-1 ring-primary rounded-md p-1 h-10 shadow-sm animate-in fade-in zoom-in-95 duration-100 min-w-[200px]",
                    className
                )}
            >
                <Input
                    value={editStartStr}
                    onChange={e => setEditStartStr(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-7 w-16 px-1 text-xs text-center font-mono border-muted-foreground/30 focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="0:00.0"
                    autoFocus
                />
                <span className="text-muted-foreground text-[10px]">–</span>
                <Input
                    value={editEndStr}
                    onChange={e => setEditEndStr(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-7 w-16 px-1 text-xs text-center font-mono border-muted-foreground/30 focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="0:00.0"
                />
                <div className="flex items-center ml-1 border-l pl-1 gap-0.5">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={handleSave}
                        aria-label="Save timestamp"
                    >
                        <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={onEditCancel}
                        aria-label="Cancel edit"
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        );
    }

    // 2. Mapped View (Control Strip)
    if (isMapped) {
        return (
            <div className={cn(
                "group flex items-center bg-background border rounded-md shadow-sm h-10 overflow-hidden hover:border-primary/50 transition-all min-w-[180px]",
                readOnly && "hover:border-border opacity-80",
                className
            )}>
                {/* Play Action */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-full w-9 rounded-none border-r border-transparent group-hover:border-border/50 hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPlay?.(startTime, endTime);
                    }}
                    title="Play segment"
                    aria-label="Play segment"
                >
                    <Play className="h-3.5 w-3.5 fill-current" />
                </Button>

                {/* Time Display (Click to Edit) */}
                <button
                    className={cn(
                        "flex-1 flex items-center justify-center h-full px-3 text-xs font-medium font-mono text-foreground/80 hover:text-primary hover:bg-muted/30 transition-colors whitespace-nowrap",
                        readOnly && "cursor-default hover:text-foreground/80 hover:bg-transparent"
                    )}
                    onClick={handleStartEdit}
                    disabled={readOnly}
                    title={readOnly ? "Read-only" : "Click to edit timestamp"}
                >
                    {formatDuration(startTime, { showDecimal: true })}
                    <span className="mx-1.5 text-muted-foreground/50">–</span>
                    {formatDuration(endTime, { showDecimal: true })}
                </button>

                {/* Delete Action (Hidden if readOnly) */}
                {!readOnly && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-full w-9 rounded-none border-l border-transparent group-hover:border-border/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(segmentId);
                        }}
                        title="Remove mapping"
                        aria-label="Remove mapping"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        );
    }

    // 3. Unmapped View (Add Button)
    if (readOnly) {
        return (
            <div className={cn(
                "flex items-center justify-center gap-2 w-32 h-9 rounded-md border border-dashed border-border/50 bg-muted/10 text-muted-foreground/50 text-xs font-medium cursor-not-allowed",
                className
            )}>
                <span>--:--</span>
            </div>
        );
    }

    return (
        <button
            className={cn(
                "flex items-center justify-center gap-2 w-32 h-9 rounded-md border border-dashed border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/50 hover:text-primary text-muted-foreground transition-all text-xs font-medium",
                className
            )}
            onClick={handleStartEdit}
        >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Timestamp</span>
        </button>
    );
}
