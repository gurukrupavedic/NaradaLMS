import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, MapPin, ArrowRight, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TextSegment, AudioMapping, Script, ContentMap } from '@shared/types/text-segmentation';
import { getSegmentText } from '@shared/utils/text-segmentation';

interface FocusMappingViewProps {
    segments: TextSegment[];
    currentScript: Script;
    content: ContentMap;
    mappings: AudioMapping[];
    activeSegmentId: number | null;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    isPaused: boolean;
    onTogglePlayPause: () => void;
    onPauseSession: () => void;
    onSeek: (time: number) => void;
    onStopSession: () => void;
    onResetSession: () => void;
    onMarkSegment: () => void;
    onUndoMark: () => void;
}

export function FocusMappingView({
    segments,
    currentScript,
    content,
    mappings,
    activeSegmentId,
    currentTime,
    duration,
    isPlaying,
    isPaused,
    onTogglePlayPause,
    onPauseSession,
    onSeek,
    onStopSession,
    onResetSession,
    onMarkSegment,
    onUndoMark
}: FocusMappingViewProps) {
    // ... activeIndex derived state ...
    // Find index of active segment
    const activeIndex = activeSegmentId !== null
        ? segments.findIndex(s => s.id === activeSegmentId)
        : -1;

    // Derived states
    const currentSegment = activeIndex >= 0 ? segments[activeIndex] : null;
    const nextSegment = activeIndex >= 0 && activeIndex < segments.length - 1
        ? segments[activeIndex + 1]
        : null;

    // Keyboard listener
    useEffect(() => {
        // ... (keep existing effect)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                // If playing, mark segment. If paused, toggle play.
                if (isPlaying) {
                    onMarkSegment();
                } else {
                    onTogglePlayPause();
                }
            } else if (e.code === 'Backspace' && activeIndex > 0) {
                // Determine logic for undo/backspace
                // For now, let's just allow undoing the last mark
                // onUndoMark();
            } else if (e.code === 'Escape') {
                onStopSession();
            } else if (e.code === 'ArrowRight') {
                // skip forward 5s
                onSeek(Math.min(currentTime + 5, duration));
            } else if (e.code === 'ArrowLeft') {
                // skip backward 5s
                onSeek(Math.max(currentTime - 5, 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, onMarkSegment, onTogglePlayPause, onStopSession, activeIndex, currentTime, duration, onSeek]);

    // Format helpers
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!currentSegment) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="bg-blue-50 p-4 rounded-full">
                    <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">Ready to Map</h3>
                <p className="text-muted-foreground max-w-md">
                    Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">SPACE</kbd> to start the audio.
                    Then press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">SPACE</kbd> again at the end of each sentence to mark the timestamp.
                </p>
                <Button onClick={onTogglePlayPause} size="lg" className="mt-4">
                    <Play className="w-4 h-4 mr-2" /> Start Session
                </Button>
            </div>
        );
    }

    const currentText = getSegmentText(currentSegment, content, currentScript);
    const nextText = nextSegment ? getSegmentText(nextSegment, content, currentScript) : null;

    const handleResume = () => {
        onTogglePlayPause();
        if (isPaused) {
            onPauseSession();
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 text-white rounded-lg overflow-hidden relative">
            {/* Top Bar */}
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 backdrop-blur-sm border-b border-white/10">
                {/* Left: Info */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <Badge variant="outline" className="text-white border-white/20 bg-white/5">
                        {activeIndex + 1} / {segments.length}
                    </Badge>
                    <span className="font-mono text-sm tracking-wider text-white w-24">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                {/* Middle: Seek Bar */}
                <div className="flex-1 px-4">
                    <Slider
                        value={[currentTime]}
                        max={duration}
                        step={0.1}
                        onValueChange={(val) => onSeek(val[0])}
                        className="cursor-pointer"
                        thumbClassName="bg-blue-600 h-6 w-6 border-2 border-slate-800 ring-offset-slate-900 hover:scale-110 transition-transform"
                    />
                </div>

                {/* Right: Controls */}
                <div className="flex gap-2 flex-shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onPauseSession}
                        className={cn(
                            "hover:bg-white/10",
                            isPaused ? "text-green-400 hover:text-green-300" : "text-amber-400 hover:text-amber-300"
                        )}
                    >
                        {isPaused ? (
                            <>
                                <Play className="w-4 h-4 mr-1" /> Continue
                            </>
                        ) : (
                            <>
                                <Pause className="w-4 h-4 mr-1" /> Pause
                            </>
                        )}
                    </Button>

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onStopSession}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/20"
                    >
                        <Square className="w-4 h-4 mr-1" /> End
                    </Button>
                </div>
            </div>

            {/* Main Prompter Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-24 relative">

                {/* Current Segment */}
                <div className="w-full max-w-6xl text-center space-y-8 animate-in fade-in zoom-in duration-300">
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-widest">
                        Current Segment
                    </div>
                    <div className={cn(
                        "text-5xl md:text-6xl font-bold leading-tight transition-all",
                        currentScript === 'te' || currentScript === 'hi' ? 'font-telugu leading-lose' : 'font-sans'
                    )}>
                        {currentText}
                    </div>
                </div>

                {/* Next Segment Preview */}
                {nextText && (
                    <div className="w-full max-w-2xl text-center space-y-2 opacity-40 scale-90 transition-all">
                        <div className="text-xs font-medium uppercase tracking-widest">
                            Up Next
                        </div>
                        <div className={cn(
                            "text-xl md:text-2xl font-medium truncate",
                            currentScript === 'te' || currentScript === 'hi' ? 'font-telugu' : 'font-sans'
                        )}>
                            {nextText}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-sm border-t border-white/10">
                <div className="max-w-xl mx-auto">
                    <Button
                        onClick={isPlaying ? onMarkSegment : handleResume}
                        size="lg"
                        className="w-full h-20 text-xl font-bold rounded-xl shadow-lg shadow-blue-900/20 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all transform active:scale-95"
                    >
                        {isPlaying ? (
                            <>
                                <Zap className="w-6 h-6 mr-2" />
                                MAP NEXT
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6 mr-2" />
                                RESUME
                            </>
                        )}
                    </Button>
                    <p className="text-center text-xs text-slate-500 mt-3 select-none flex items-center justify-center gap-1.5">
                        Tap <kbd className="pointer-events-none h-5 select-none items-center justify-center gap-1 rounded border border-white/10 border-b-2 bg-white/5 px-2 min-w-[3rem] font-mono text-[10px] font-medium text-slate-400 opacity-100 inline-flex">SPACE</kbd> on keyboard when audio matching current segment is complete.
                    </p>
                </div>
            </div>
        </div>
    );
}
