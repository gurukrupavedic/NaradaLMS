/**
 * EXPERIMENT 1: Annotation Layer + Progressive Mapping Segmentation
 * 
 * This component provides a progressive audio-text mapping workflow.
 * Users play audio sequentially and map segments to text in chronological order.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test intuitive audio-text synchronization workflow
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Square, CheckCircle, Circle } from 'lucide-react';

interface TextSegment {
  id: string;
  conceptualName: string;
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
  order: number;
  mapped?: boolean;
}

interface AudioMapping {
  segmentId: string;
  startTime: number;
  endTime: number;
}

interface Experiment1_ProgressiveMapperProps {
  audioUrl: string;
  segments: TextSegment[];
  currentLanguage: 'te' | 'hi' | 'en';
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  mappings: AudioMapping[];
  onMappingCreate: (mapping: AudioMapping) => void;
  onMappingUpdate: (segmentId: string, mapping: Partial<AudioMapping>) => void;
  onMappingDelete: (segmentId: string) => void;
}

export const Experiment1_ProgressiveMapper: React.FC<Experiment1_ProgressiveMapperProps> = ({
  audioUrl,
  segments,
  currentLanguage,
  content,
  mappings,
  onMappingCreate,
  onMappingUpdate,
  onMappingDelete
}) => {
  // EXPERIMENT1: Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [segmentStartTime, setSegmentStartTime] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // EXPERIMENT1: Get current segment being mapped
  const currentSegment = segments[currentSegmentIndex];
  const currentMapping = mappings.find(m => m.segmentId === currentSegment?.id);
  
  // EXPERIMENT1: Calculate progress
  const mappedSegments = segments.filter(s => mappings.some(m => m.segmentId === s.id));
  const progressPercentage = segments.length > 0 ? (mappedSegments.length / segments.length) * 100 : 0;

  // EXPERIMENT1: Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // EXPERIMENT1: Audio controls
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

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  // EXPERIMENT1: Segment mapping workflow
  const startMapping = () => {
    setSegmentStartTime(currentTime);
    setIsRecording(true);
  };

  const endMapping = () => {
    if (segmentStartTime === null) return;

    const mapping: AudioMapping = {
      segmentId: currentSegment.id,
      startTime: segmentStartTime,
      endTime: currentTime
    };

    onMappingCreate(mapping);
    setIsRecording(false);
    setSegmentStartTime(null);
    
    // EXPERIMENT1: Auto-advance to next unmapped segment
    const nextUnmappedIndex = segments.findIndex((s, index) => 
      index > currentSegmentIndex && !mappings.some(m => m.segmentId === s.id)
    );
    if (nextUnmappedIndex !== -1) {
      setCurrentSegmentIndex(nextUnmappedIndex);
    }
  };

  const cancelMapping = () => {
    setIsRecording(false);
    setSegmentStartTime(null);
  };

  // EXPERIMENT1: Navigation
  const goToPreviousSegment = () => {
    if (currentSegmentIndex > 0) {
      setCurrentSegmentIndex(currentSegmentIndex - 1);
    }
  };

  const goToNextSegment = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(currentSegmentIndex + 1);
    }
  };

  // EXPERIMENT1: Get segment text for display
  const getSegmentText = (segment: TextSegment) => {
    const textContent = content[currentLanguage] || '';
    const range = segment.textReferences[currentLanguage];
    if (!range) return 'No text for this language';
    return textContent.slice(range.start, range.end);
  };

  // EXPERIMENT1: Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (segments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No text segments available. Create segments first using the annotation layer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* EXPERIMENT1: Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* EXPERIMENT1: Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Progressive Audio Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Map audio segments to text in chronological order
          </p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            Experiment 1
          </Badge>
          <div className="mt-2 text-sm text-muted-foreground">
            {mappedSegments.length} of {segments.length} segments mapped
          </div>
        </div>
      </div>

      {/* EXPERIMENT1: Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Overall Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* EXPERIMENT1: Audio player controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audio Player</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time display */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress slider */}
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            className="w-full"
            onValueChange={([value]) => seekTo(value)}
          />

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => seekTo(Math.max(0, currentTime - 10))}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button onClick={togglePlayPause} size="sm">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => seekTo(Math.min(duration, currentTime + 10))}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-2 rounded">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                Recording segment: {formatTime(currentTime - (segmentStartTime || 0))}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EXPERIMENT1: Current segment mapping */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Current Segment ({currentSegmentIndex + 1} of {segments.length})</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousSegment} disabled={currentSegmentIndex === 0}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextSegment} disabled={currentSegmentIndex === segments.length - 1}>
                Next
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentSegment && (
            <>
              {/* Segment info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{currentSegment.conceptualName}</Badge>
                  {currentMapping ? (
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mapped
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Circle className="h-3 w-3 mr-1" />
                      Not Mapped
                    </Badge>
                  )}
                </div>
                <div className="bg-white p-3 rounded border text-sm">
                  {getSegmentText(currentSegment)}
                </div>
              </div>

              {/* Mapping controls */}
              <div className="space-y-3">
                {currentMapping ? (
                  <div className="bg-green-50 p-3 rounded border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Mapped: {formatTime(currentMapping.startTime)} - {formatTime(currentMapping.endTime)}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => onMappingDelete(currentSegment.id)}>
                        Remove Mapping
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button onClick={startMapping} className="flex-1">
                        Start Mapping at {formatTime(currentTime)}
                      </Button>
                    ) : (
                      <>
                        <Button onClick={endMapping} className="flex-1">
                          End Mapping at {formatTime(currentTime)}
                        </Button>
                        <Button variant="outline" onClick={cancelMapping}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* EXPERIMENT1: Instructions */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600">
            <h4 className="font-medium mb-2">Mapping workflow:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Play audio and listen to the content</li>
              <li>When you hear the text for the current segment, click "Start Mapping"</li>
              <li>Continue playing until the segment ends, then click "End Mapping"</li>
              <li>The system will automatically advance to the next unmapped segment</li>
              <li>Use Previous/Next buttons to navigate between segments manually</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};