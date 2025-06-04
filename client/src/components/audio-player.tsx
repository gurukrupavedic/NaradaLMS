import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause } from "lucide-react";
import type { AudioFile, AudioMapping } from "@shared/schema";

interface AudioPlayerProps {
  audioFile?: AudioFile;
  mappings: AudioMapping[];
  onSegmentPlay?: (segmentId: number) => void;
}

export default function AudioPlayer({ audioFile, mappings, onSegmentPlay }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [audioFile]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed: string) => {
    const newSpeed = parseFloat(speed);
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const playSegment = (startTime: number, endTime: number, segmentId?: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = startTime;
    audio.play();
    setIsPlaying(true);

    if (segmentId && onSegmentPlay) {
      onSegmentPlay(segmentId);
    }

    // Optional: Stop at end time
    const stopAtEnd = () => {
      if (audio.currentTime >= endTime) {
        audio.pause();
        setIsPlaying(false);
        audio.removeEventListener('timeupdate', stopAtEnd);
      }
    };
    audio.addEventListener('timeupdate', stopAtEnd);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioFile) {
    return (
      <div className="text-gray-500 text-sm">
        No audio file available
      </div>
    );
  }

  return (
    <div className="w-full">
      <audio
        ref={audioRef}
        src={`/api/audio-files/${audioFile.filename}`}
        preload="metadata"
      />
      
      <div className="flex items-center space-x-4 mb-3">
        <Button
          onClick={togglePlayPause}
          className="p-2 bg-vedic-brown text-white rounded-full hover:bg-vedic-brown/90"
          size="sm"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Speed:</span>
          <Select value={playbackSpeed.toString()} onValueChange={handleSpeedChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1.0x</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Waveform/Progress Bar */}
      <div className="audio-waveform mb-2" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;
        if (audioRef.current) {
          audioRef.current.currentTime = newTime;
        }
      }}>
        <div 
          className="progress-indicator" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Expose playSegment function for external use */}
      {React.createElement('div', { 
        ref: (el: any) => {
          if (el) {
            el.playSegment = playSegment;
          }
        },
        style: { display: 'none' }
      })}
    </div>
  );
}

// Export the playSegment function type for use in other components
export type PlaySegmentFunction = (startTime: number, endTime: number, segmentId?: number) => void;
