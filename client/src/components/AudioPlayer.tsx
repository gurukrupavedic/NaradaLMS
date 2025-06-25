import React, { useState, useRef, useEffect } from 'react';
import { 
  Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/design-system';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2 } from 'lucide-react';
import type { AudioFile, AudioSegmentMapping, Segment } from '@shared/schema';

interface AudioPlayerProps {
  audioFiles: AudioFile[];
  mappings: (AudioSegmentMapping & { audioFile: AudioFile; segment: Segment })[];
  selectedAudioFile?: AudioFile;
  onAudioFileChange: (audioFile: AudioFile) => void;
  activeSegment?: number;
  onSegmentPlay?: (segmentId: number) => void;
}

export function AudioPlayer({
  audioFiles,
  mappings,
  selectedAudioFile,
  onAudioFileChange,
  activeSegment,
  onSegmentPlay,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState([1]);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load audio file when selection changes
  useEffect(() => {
    if (selectedAudioFile && audioRef.current) {
      audioRef.current.src = `/api/audio-files/${selectedAudioFile.filename}`;
      audioRef.current.load();
    }
  }, [selectedAudioFile]);

  // Update time and handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedAudioFile]);

  // Play specific segment when activeSegment changes
  useEffect(() => {
    if (activeSegment && selectedAudioFile && audioRef.current) {
      const mapping = mappings.find(
        m => m.segmentId === activeSegment && m.audioFileId === selectedAudioFile.id
      );
      
      if (mapping) {
        const startTime = parseFloat(mapping.startTime);
        audioRef.current.currentTime = startTime;
        handlePlay();
        
        // Stop at end time
        const checkEndTime = () => {
          if (audioRef.current && audioRef.current.currentTime >= parseFloat(mapping.endTime)) {
            handlePause();
          }
        };
        
        const interval = setInterval(checkEndTime, 100);
        setTimeout(() => clearInterval(interval), (parseFloat(mapping.endTime) - startTime + 1) * 1000);
      }
    }
  }, [activeSegment, selectedAudioFile, mappings]);

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handlePlaybackRateChange = (rate: string) => {
    const newRate = parseFloat(rate);
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0];
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioFiles.length) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6">
        <p className="text-gray-600 text-center">No audio files available</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button
            onClick={isPlaying ? handlePause : handlePlay}
            className="bg-amber-700 hover:bg-amber-800 text-white rounded-full p-3"
            disabled={!selectedAudioFile}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Speed:</span>
            <Select value={playbackRate.toString()} onValueChange={handlePlaybackRateChange}>
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
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Reciter:</span>
            <Select
              value={selectedAudioFile?.id.toString() || ""}
              onValueChange={(value) => {
                const audioFile = audioFiles.find(af => af.id.toString() === value);
                if (audioFile) onAudioFileChange(audioFile);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select reciter" />
              </SelectTrigger>
              <SelectContent>
                {audioFiles.map((audioFile) => (
                  <SelectItem key={audioFile.id} value={audioFile.id.toString()}>
                    {audioFile.reciter || audioFile.originalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Volume2 size={16} className="text-gray-600" />
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="w-20"
            />
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative">
        <Slider
          value={[currentTime]}
          onValueChange={handleSeek}
          max={duration || 100}
          step={0.1}
          className="w-full h-4 bg-gradient-to-r from-amber-200 to-orange-200 rounded-lg"
        />
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}
