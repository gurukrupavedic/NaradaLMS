import React from 'react';
import { Button } from '@/components/ui/button';

export interface AudioPlayerControlsProps {
  title?: string;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  volume?: number;
  isMuted?: boolean;
  playbackRate?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
  onToggleMute?: () => void;
  onChangeVolume?: (v: number) => void;
  onChangePlaybackRate?: (r: number) => void;
  onSkipForward?: () => void;
  onSkipBackward?: () => void;
  className?: string;
}

export function AudioPlayerControls({ onPlay, onPause, onStop }: AudioPlayerControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={onPlay}>Play</Button>
      <Button size="sm" variant="outline" onClick={onPause}>Pause</Button>
      <Button size="sm" variant="outline" onClick={onStop}>Stop</Button>
    </div>
  );
}
