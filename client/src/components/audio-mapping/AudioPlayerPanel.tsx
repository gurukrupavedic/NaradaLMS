/**
 * Audio Player Panel Component
 * 
 * Handles audio playback controls, session management, and progress tracking
 * for audio mapping sessions.
 * 
 * Created: January 2025
 * Purpose: Audio controls for mapping workflow
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { formatDuration } from '@shared/utils/text-segmentation';

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
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Audio Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Audio element */}
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={([value]) => seekTo(value)}
            className="w-full"
          />
        </div>
        
        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={togglePlayPause}
              disabled={mappingSession === 'idle'}
              className="w-full"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </>
              )}
            </Button>
          </div>
          
          {mappingSession === 'idle' ? (
            <Button onClick={startMappingSession} className="w-full">
              Start Mapping Session
            </Button>
          ) : (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={pauseMappingSession}
                className="w-full"
              >
                {mappingSession === 'paused' ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={stopMappingSession}
                className="w-full"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
              <Button 
                variant="outline" 
                onClick={resetMappingSession}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
        </div>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Audio File Progress</span>
            <span>{mappedCount} / {totalCount}</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>

        {/* Instructions */}
        {mappingSession === 'active' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>How to map:</strong> Click on each segment card (right) when you hear it being recited in the audio.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};