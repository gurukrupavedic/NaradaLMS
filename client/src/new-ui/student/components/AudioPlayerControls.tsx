import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

export interface AudioPlayerControlsProps {
  title?: string;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  volume?: number; // 0 - 100
  isMuted?: boolean;
  playbackRate?: number; // e.g., 0.75, 1, 1.25, 1.5, 2
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
  onVolumeChange?: (v: number) => void;
  onMuteToggle?: () => void;
  onPlaybackRateChange?: (r: number) => void;
  onSkipForward?: () => void;
  onSkipBackward?: () => void;
  className?: string;
}

function formatTime(seconds?: number) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60).toString();
  return `${m}:${s}`;
}

export function AudioPlayerControls({
  title,
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
  onSkipForward,
  onSkipBackward,
  className,
}: AudioPlayerControlsProps) {
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className={className}>
      {title ? (
        <div className="text-sm font-medium mb-2 truncate" title={title}>
          {title}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {isPlaying ? (
          <Button size="sm" variant="outline" onClick={onPause} aria-label="Pause">
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onPlay} aria-label="Play">
            <Play className="h-4 w-4" />
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={onSkipBackward} aria-label="Skip back 10s">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onSkipForward} aria-label="Skip forward 10s">
          <SkipForward className="h-4 w-4" />
        </Button>

        {onStop ? (
          <Button size="sm" variant="ghost" onClick={onStop} aria-label="Stop">
            ■
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onMuteToggle} aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <span className="text-xs text-muted-foreground">Vol: {effectiveVolume}%</span>
        <span className="text-xs text-muted-foreground">Speed: {playbackRate}x</span>
      </div>
    </div>
  );
}
