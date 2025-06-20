/**
 * Audio Player Panel - Production Component
 * 
 * Handles audio playback controls, session management, and progress tracking
 * Extracted from ProgressiveMapper for better separation of concerns
 * 
 * Status: Production Ready
 * Migrated: January 2025
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

// Local formatTime function
const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0 || !isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

interface AudioPlayerPanelProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  mappingSession: 'idle' | 'active' | 'paused';
  progressPercentage: number;
  mappedCount: number;
  totalCount: number;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  startMappingSession: () => void;
  pauseMappingSession: () => void;
  stopMappingSession: () => void;
  resetMappingSession: () => void;
}

export const AudioPlayerPanel: React.FC<AudioPlayerPanelProps> = ({
  audioRef,
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  mappingSession,
  progressPercentage,
  mappedCount,
  totalCount,
  togglePlayPause,
  seekTo,
  startMappingSession,
  pauseMappingSession,
  stopMappingSession,
  resetMappingSession
}) => {
  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const getSessionButtonText = () => {
    switch (mappingSession) {
      case 'idle': return 'Start Mapping';
      case 'active': return 'Pause Session';
      case 'paused': return 'Resume Session';
      default: return 'Start Mapping';
    }
  };

  const getSessionButtonAction = () => {
    switch (mappingSession) {
      case 'idle': return startMappingSession;
      case 'active': return pauseMappingSession;
      case 'paused': return pauseMappingSession;
      default: return startMappingSession;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Audio Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hidden audio element */}
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        {/* Progress tracking */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mapping Progress</span>
            <span>{mappedCount}/{totalCount} segments</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-gray-500 text-center">
            {Math.round(progressPercentage)}% Complete
          </div>
        </div>

        {/* Session controls */}
        <div className="space-y-3">
          <Button
            onClick={getSessionButtonAction()}
            className="w-full"
            variant={mappingSession === 'active' ? 'secondary' : 'default'}
          >
            {getSessionButtonText()}
          </Button>
          
          {mappingSession !== 'idle' && (
            <div className="flex gap-2">
              <Button
                onClick={stopMappingSession}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
              <Button
                onClick={resetMappingSession}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* Audio player controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Button
              onClick={togglePlayPause}
              size="lg"
              className="rounded-full w-14 h-14"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </Button>
          </div>

          {/* Time display */}
          <div className="text-center text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Seek slider */}
          <div className="px-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
          </div>
        </div>

        {/* Session status */}
        {mappingSession !== 'idle' && (
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900">
              {mappingSession === 'active' ? 'Mapping Session Active' : 'Session Paused'}
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {mappingSession === 'active' ? 'Click segments when you hear them' : 'Resume to continue mapping'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioPlayerPanel;