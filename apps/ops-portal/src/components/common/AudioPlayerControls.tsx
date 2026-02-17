import * as React from "react"
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    SkipBack,
    SkipForward,
    Settings,
} from "lucide-react"

import { cn, Button, Slider, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@narada/ui"

export interface AudioPlayerControlsProps {
    // Audio state
    isPlaying?: boolean
    currentTime?: number
    duration?: number
    volume?: number // 0-100
    isMuted?: boolean
    playbackRate?: number

    // Event handlers
    onPlay?: () => void
    onPause?: () => void
    onStop?: () => void
    onSeek?: (time: number) => void
    onVolumeChange?: (volume: number) => void
    onMuteToggle?: () => void
    onPlaybackRateChange?: (rate: number) => void
    onSkipBackward?: () => void
    onSkipForward?: () => void

    // Customization
    title?: string
    headerContent?: React.ReactNode
    className?: string
    showSkipButtons?: boolean
    showPlaybackRate?: boolean
    showVolumeControl?: boolean
    disabled?: boolean
    variant?: 'default' | 'minimal'
}

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00.0"
    const mins = Math.floor(seconds / 60)
    const wholeSecs = Math.floor(seconds % 60)
    const tenths = Math.floor((seconds % 1) * 10)
    return `${mins}:${wholeSecs.toString().padStart(2, '0')}.${tenths}`
}

export function AudioPlayerControls({
    isPlaying = false,
    currentTime = 0,
    duration = 0,
    volume = 80,
    isMuted = false,
    playbackRate = 1,
    onPlay,
    onPause,
    onStop,
    onSeek,
    onVolumeChange,
    onMuteToggle,
    onPlaybackRateChange,
    onSkipBackward,
    onSkipForward,
    title,
    headerContent,
    className,
    showSkipButtons = true,
    showPlaybackRate = true,
    showVolumeControl = true,
    disabled = false,
    variant = 'default',
}: AudioPlayerControlsProps) {

    const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2]

    if (variant === 'minimal') {
        return (
            <div className={cn("w-full flex items-center gap-3 bg-background border rounded-lg px-3 py-2", className)}>
                {/* Play/Pause Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 rounded-full transition-colors hover:bg-accent flex-shrink-0",
                        isPlaying && "bg-accent text-accent-foreground"
                    )}
                    onClick={isPlaying ? onPause : onPlay}
                    disabled={disabled}
                >
                    {isPlaying ? (
                        <Pause className="h-4 w-4 fill-current" />
                    ) : (
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                    <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                </Button>



                {/* Time Display */}
                <span className="text-xs font-mono text-muted-foreground tabular-nums flex-shrink-0 min-w-[3rem]">
                    {formatTime(currentTime)}
                </span>

                {/* Slider */}
                <div className="flex-1 min-w-[80px]">
                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={(val) => onSeek?.(val[0])}
                        disabled={disabled}
                        className="cursor-pointer"
                        rangeClassName="bg-primary"
                        thumbClassName="border-primary"
                    />
                </div>

                {/* Duration */}
                <span className="text-xs font-mono text-muted-foreground tabular-nums flex-shrink-0 min-w-[3rem] text-right">
                    {formatTime(duration)}
                </span>

                {/* Controls Group */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                    {/* Skip Buttons (Simplified) */}
                    {showSkipButtons && (
                        <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hidden md:flex text-muted-foreground hover:text-foreground" onClick={onSkipBackward} disabled={disabled} aria-label="Skip backward">
                                <SkipBack className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hidden md:flex text-muted-foreground hover:text-foreground" onClick={onSkipForward} disabled={disabled} aria-label="Skip forward">
                                <SkipForward className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}

                    {/* Playback Rate (Compact) */}
                    {showPlaybackRate && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground gap-0.5 min-w-[2.5rem]" disabled={disabled}>
                                    {playbackRate}x
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {playbackRates.map((rate) => (
                                    <DropdownMenuItem key={rate} onClick={() => onPlaybackRateChange?.(rate)} className={cn("text-xs cursor-pointer", playbackRate === rate && "font-bold bg-accent")}>
                                        {rate}x
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        )
    }

    // Default Layout (Card)
    return (
        <div className={cn("w-full bg-background rounded-xl border p-4 space-y-4", className)}>
            {/* Title & Header Content */}
            {(title || headerContent) && (
                <div className="flex items-center justify-between gap-4">
                    {title && (
                        <h4 className="text-sm font-medium text-foreground truncate flex-1" title={title}>
                            {title}
                        </h4>
                    )}
                    {headerContent && (
                        <div className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {headerContent}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={(val) => onSeek?.(val[0])}
                    disabled={disabled}
                    className="cursor-pointer"
                    rangeClassName="bg-primary"
                    thumbClassName="border-primary"
                />
                <div className="flex justify-between text-xs font-mono text-muted-foreground tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-2">

                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                    {showSkipButtons && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            onClick={onSkipBackward}
                            disabled={disabled}
                        >
                            <SkipBack className="h-5 w-5" />
                            <span className="sr-only">Skip Back</span>
                        </Button>
                    )}

                    <Button
                        variant="default"
                        size="icon"
                        className="h-10 w-10 rounded-full shadow-md bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-transform"
                        onClick={isPlaying ? onPause : onPlay}
                        disabled={disabled}
                    >
                        {isPlaying ? (
                            <Pause className="h-5 w-5 fill-current" />
                        ) : (
                            <Play className="h-5 w-5 fill-current ml-1" />
                        )}
                        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                    </Button>

                    {showSkipButtons && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            onClick={onSkipForward}
                            disabled={disabled}
                        >
                            <SkipForward className="h-5 w-5" />
                            <span className="sr-only">Skip Forward</span>
                        </Button>
                    )}
                </div>

                {/* Secondary Controls (Volume & Rate) */}
                <div className="flex items-center gap-1 sm:gap-3">

                    {showVolumeControl && (
                        <div className="flex items-center gap-2 group">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={onMuteToggle}
                                disabled={disabled}
                            >
                                {isMuted || volume === 0 ? (
                                    <VolumeX className="h-4 w-4" />
                                ) : (
                                    <Volume2 className="h-4 w-4" />
                                )}
                                <span className="sr-only">Toggle Mute</span>
                            </Button>
                            <div className="w-20 hidden sm:block">
                                <Slider
                                    value={[isMuted ? 0 : volume]}
                                    max={100}
                                    step={1}
                                    onValueChange={(val) => onVolumeChange?.(val[0])}
                                    disabled={disabled}
                                    rangeClassName="bg-primary"
                                    thumbClassName="border-primary"
                                />
                            </div>
                        </div>
                    )}

                    {showPlaybackRate && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 min-w-[3rem]"
                                    disabled={disabled}
                                >
                                    <span>{playbackRate}x</span>
                                    <Settings className="h-3.5 w-3.5 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {playbackRates.map((rate) => (
                                    <DropdownMenuItem
                                        key={rate}
                                        onClick={() => onPlaybackRateChange?.(rate)}
                                        className={cn("text-xs cursor-pointer", playbackRate === rate && "font-bold bg-accent")}
                                    >
                                        {rate}x Speed
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </div>
    )
}
