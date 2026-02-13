import React, { useEffect, useState } from 'react';
import { Button, Badge, cn } from '@narada/ui';
import { Play, Square, MapPin, Zap, Moon, Sun } from 'lucide-react';
import { AudioPlayerControls } from '@/components/common/AudioPlayerControls';
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
    onMarkSegment,
    onUndoMark
}: FocusMappingViewProps) {
    const [isCinemaMode, setCinemaMode] = useState(true);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    const activeIndex = activeSegmentId !== null
        ? segments.findIndex(s => s.id === activeSegmentId)
        : -1;

    const currentSegment = activeIndex >= 0 ? segments[activeIndex] : null;
    const nextSegment = activeIndex >= 0 && activeIndex < segments.length - 1
        ? segments[activeIndex + 1]
        : null;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!e.repeat) setIsSpacePressed(true);

                if (isPlaying) {
                    onMarkSegment();
                } else {
                    onTogglePlayPause();
                }
            } else if (e.code === 'Backspace' && activeIndex > 0) {
                // onUndoMark();
            } else if (e.code === 'Escape') {
                onStopSession();
            } else if (e.code === 'ArrowRight') {
                onSeek(Math.min(currentTime + 5, duration));
            } else if (e.code === 'ArrowLeft') {
                onSeek(Math.max(currentTime - 5, 0));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isPlaying, onMarkSegment, onTogglePlayPause, onStopSession, activeIndex, currentTime, duration, onSeek]);

    if (!currentSegment) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                    <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Ready to Map</h3>
                <p className="text-muted-foreground max-w-md">
                    Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">SPACE</kbd> to start the audio.
                    Then press <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">SPACE</kbd> again at the end of each sentence to mark the timestamp.
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
        <div className={cn(
            "h-full flex flex-col rounded-lg overflow-hidden relative border transition-colors duration-300",
            isCinemaMode ? "dark bg-slate-950 border-slate-800" : "bg-background border-border"
        )}>
            <div className={cn(
                "flex items-center gap-4 p-4 backdrop-blur-sm border-b transition-colors duration-300",
                isCinemaMode ? "bg-slate-900/50 border-white/10" : "bg-muted/30 border-border"
            )}>
                <div className="flex-shrink-0">
                    <Badge variant="outline" className={cn(
                        "h-8 px-3 transition-colors",
                        isCinemaMode ? "bg-white/5 border-white/20 text-white" : "bg-background border-border text-foreground"
                    )}>
                        {activeIndex + 1} / {segments.length}
                    </Badge>
                </div>

                <div className="flex-1">
                    <AudioPlayerControls
                        variant="minimal"
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        duration={duration}
                        onPlay={onTogglePlayPause}
                        onPause={onPauseSession}
                        onSeek={onSeek}
                        onSkipForward={() => onSeek(Math.min(currentTime + 5, duration))}
                        onSkipBackward={() => onSeek(Math.max(currentTime - 5, 0))}
                        showVolumeControl={false}
                        className={cn(
                            "bg-transparent border-0 shadow-none p-0 transition-colors",
                            isCinemaMode
                                ? "text-white [&_.text-muted-foreground]:text-slate-400 [&_.text-foreground]:text-white"
                                : ""
                        )}
                    />
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onStopSession}
                        className={cn(
                            "h-8 border",
                            isCinemaMode
                                ? "bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-500/20"
                                : "bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20"
                        )}
                    >
                        <Square className="w-4 h-4 mr-1" /> End
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-24 relative">
                <div className="w-full max-w-6xl text-center space-y-8 animate-in fade-in zoom-in duration-300">
                    <div className={cn(
                        "text-sm font-medium uppercase tracking-widest transition-colors",
                        isCinemaMode ? "text-slate-400" : "text-muted-foreground"
                    )}>
                        Current Segment
                    </div>
                    <div className={cn(
                        "text-5xl md:text-6xl font-bold leading-tight transition-all",
                        currentScript === 'te' || currentScript === 'hi' ? 'font-telugu leading-lose' : 'font-sans',
                        isCinemaMode ? "text-white" : "text-foreground"
                    )}>
                        {currentText}
                    </div>
                </div>

                {nextText && (
                    <div className="w-full max-w-2xl text-center space-y-2 opacity-40 scale-90 transition-all">
                        <div className={cn(
                            "text-xs font-medium uppercase tracking-widest transition-colors",
                            isCinemaMode ? "text-slate-500" : "text-muted-foreground"
                        )}>
                            Up Next
                        </div>
                        <div className={cn(
                            "text-xl md:text-2xl font-medium truncate transition-colors",
                            currentScript === 'te' || currentScript === 'hi' ? 'font-telugu' : 'font-sans',
                            isCinemaMode ? "text-slate-300" : "text-foreground"
                        )}>
                            {nextText}
                        </div>
                    </div>
                )}
            </div>

            <div className={cn(
                "p-4 backdrop-blur-sm border-t transition-colors duration-300 relative",
                isCinemaMode ? "bg-slate-900/50 border-white/10" : "bg-muted/30 border-border"
            )}>
                <div className="max-w-md mx-auto">
                    <Button
                        onClick={isPlaying ? onMarkSegment : handleResume}
                        size="lg"
                        className={cn(
                            "w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all transform active:scale-95 duration-100",
                            isSpacePressed && "scale-95 ring-2 ring-offset-2 ring-blue-500 ring-offset-slate-900",
                            isCinemaMode
                                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                                : ""
                        )}
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
                    <p className={cn(
                        "text-center text-xs mt-2 select-none flex items-center justify-center gap-1.5 transition-colors",
                        isCinemaMode ? "text-slate-500" : "text-muted-foreground"
                    )}>
                        Tap <kbd className={cn(
                            "pointer-events-none h-5 select-none items-center justify-center gap-1 rounded border px-2 min-w-[3rem] font-mono text-[10px] font-medium opacity-100 inline-flex transition-colors",
                            isCinemaMode
                                ? "bg-white/5 border-white/10 text-slate-400"
                                : "bg-muted border-border text-muted-foreground"
                        )}>SPACE</kbd> on keyboard when audio matching current segment is complete.
                    </p>
                </div>

                <div className="absolute right-4 bottom-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-full transition-colors",
                            isCinemaMode
                                ? "text-slate-400 hover:text-white hover:bg-white/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        onClick={() => setCinemaMode(!isCinemaMode)}
                        title={isCinemaMode ? "Exit Cinema Mode" : "Enter Cinema Mode"}
                    >
                        {isCinemaMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
