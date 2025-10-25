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
    <Card>
      <CardHeader className="py-3 px-6">
        <CardTitle className="text-base font-medium">Audio Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Audio element */}
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        {/* Audio Playback Section */}
        <div className="space-y-3">
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
          
          {/* Audio play/pause control */}
          <Button
            variant="outline"
            onClick={togglePlayPause}
            className="w-full flex items-center justify-center"
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
        
        {/* Mapping Session Controls Section */}
        <div className="space-y-3 pt-2 border-t">
          {mappingSession === 'idle' ? (
            <Button onClick={startMappingSession} className="w-full">
              Start Mapping Session
            </Button>
          ) : (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={pauseMappingSession}
                className="w-full justify-start"
              >
                <div className="flex items-center w-full">
                  <div className="w-5 flex items-center justify-center">
                    {mappingSession === 'paused' ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                  </div>
                  <span className="ml-2">
                    {mappingSession === 'paused' ? 'Resume Session' : 'Pause Session'}
                  </span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                onClick={stopMappingSession}
                className="w-full justify-start"
              >
                <div className="flex items-center w-full">
                  <div className="w-5 flex items-center justify-center">
                    <Square className="h-4 w-4" />
                  </div>
                  <span className="ml-2">End Session</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                onClick={resetMappingSession}
                className="w-full justify-start"
              >
                <div className="flex items-center w-full">
                  <div className="w-5 flex items-center justify-center">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <span className="ml-2">Reset Session</span>
                </div>
              </Button>
            </div>
          )}
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