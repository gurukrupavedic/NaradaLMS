/**
 * EXPERIMENT 1: Musixmatch-Inspired Audio Mapping
 * 
 * This component provides a continuous playback workflow where users
 * click on text segment cards when they hear them being recited.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test intuitive click-when-heard mapping workflow
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Square, RotateCcw, CheckCircle, Circle, Clock } from 'lucide-react';
import { TimestampPill } from './TimestampPill';
import type { TextSegment, AudioMapping, Language, ContentMap } from '@shared/experiment1-types';
import { getSegmentText, filterSegmentsByLanguage, getSegmentMapping, formatTime as formatTimeUtil } from '@shared/experiment1-utils';

interface ProgressiveMapperProps {
  audioUrl: string;
  segments: TextSegment[];
  currentLanguage: Language;
  content: ContentMap;
  mappings: AudioMapping[];
  onMappingCreate: (mapping: AudioMapping) => void;
  onMappingUpdate: (segmentId: string, mapping: Partial<AudioMapping>) => void;
  onMappingDelete: (segmentId: string) => void;
}

export const Experiment1_ProgressiveMapper: React.FC<ProgressiveMapperProps> = ({
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
  
  // EXPERIMENT1: Mapping session state
  const [mappingSession, setMappingSession] = useState<'idle' | 'active' | 'paused'>('idle');
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  
  // Removed inline editing state - now handled by TimestampPill component
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // EXPERIMENT1: Filter segments by current language
  const currentLanguageSegments = filterSegmentsByLanguage(segments, currentLanguage);

  // EXPERIMENT1: Calculate progress
  const mappedSegments = currentLanguageSegments.filter(s => getSegmentMapping(s.id, mappings));
  const progressPercentage = currentLanguageSegments.length > 0 ? (mappedSegments.length / currentLanguageSegments.length) * 100 : 0;

  // EXPERIMENT1: Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      // End active segment if session is active
      if (mappingSession === 'active' && activeSegmentId) {
        handleSegmentEnd();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [mappingSession, activeSegmentId]);

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

  // EXPERIMENT1: Mapping session controls
  const startMappingSession = () => {
    setMappingSession('active');
    setActiveSegmentId(null);
    setSessionStartTime(currentTime);
    
    // Clear existing mappings for current language
    currentLanguageSegments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
    
    // Start playing audio if not already playing
    const audio = audioRef.current;
    if (audio && !isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  const pauseMappingSession = () => {
    if (mappingSession === 'active') {
      setMappingSession('paused');
      const audio = audioRef.current;
      if (audio && isPlaying) {
        audio.pause();
        setIsPlaying(false);
      }
    } else if (mappingSession === 'paused') {
      setMappingSession('active');
      const audio = audioRef.current;
      if (audio && !isPlaying) {
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  const stopMappingSession = () => {
    // End active segment if exists
    if (activeSegmentId) {
      handleSegmentEnd();
    }
    
    setMappingSession('idle');
    setActiveSegmentId(null);
    
    const audio = audioRef.current;
    if (audio && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const resetMappingSession = () => {
    setMappingSession('idle');
    setActiveSegmentId(null);
    
    // Clear all mappings for current language segments
    currentLanguageSegments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
    
    // Reset audio to beginning
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // EXPERIMENT1: Segment mapping handlers
  const handleSegmentClick = (segmentId: string) => {
    if (mappingSession !== 'active') return;

    // End previous segment if exists
    if (activeSegmentId && activeSegmentId !== segmentId) {
      handleSegmentEnd();
    }

    // Start new segment
    setActiveSegmentId(segmentId);
    const mapping: AudioMapping = {
      segmentId,
      startTime: currentTime,
      endTime: currentTime // Will be updated when segment ends
    };
    onMappingCreate(mapping);
  };

  const handleSegmentEnd = () => {
    if (!activeSegmentId) return;
    
    // Update the mapping with end time
    onMappingUpdate(activeSegmentId, { endTime: currentTime });
    setActiveSegmentId(null);
  };

  // EXPERIMENT1: Play specific segment
  const handlePlaySegment = (mapping: AudioMapping, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent segment click when clicking play button
    
    const audio = audioRef.current;
    if (!audio) return;

    // Set audio to start time
    audio.currentTime = mapping.startTime;
    setCurrentTime(mapping.startTime);
    
    // Play audio
    audio.play();
    setIsPlaying(true);

    // Set up end time listener
    const checkEndTime = () => {
      if (audio.currentTime >= mapping.endTime) {
        audio.pause();
        setIsPlaying(false);
        audio.removeEventListener('timeupdate', checkEndTime);
      }
    };
    
    audio.addEventListener('timeupdate', checkEndTime);
  };

  // Timestamp editing now handled by TimestampPill component

  // EXPERIMENT1: Helper functions
  const getSegmentStatus = (segmentId: string) => {
    if (activeSegmentId === segmentId) return 'active';
    if (getSegmentMapping(segmentId, mappings)) return 'completed';
    return 'inactive';
  };

  if (!audioUrl) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No audio file selected. Please upload an audio file to begin mapping.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)]">
      {/* Left Column: Audio Mapping Session (1/3) */}
      <div className="col-span-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Audio Mapping Session</span>
              <Badge variant={mappingSession === 'active' ? 'default' : mappingSession === 'paused' ? 'secondary' : 'outline'}>
                {mappingSession === 'active' ? 'Recording' : mappingSession === 'paused' ? 'Paused' : 'Ready'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Audio element */}
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTimeUtil(currentTime)}</span>
                <span>{formatTimeUtil(duration)}</span>
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
                  size="sm"
                  onClick={togglePlayPause}
                  disabled={mappingSession === 'idle'}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
                    {mappingSession === 'paused' ? 'Resume' : 'Pause'}
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
                <span>Progress</span>
                <span>{mappedSegments.length} / {currentLanguageSegments.length}</span>
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
      </div>

      {/* Right Column: Text Segments (2/3) */}
      <div className="col-span-8">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Text Segments - Click When Heard</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100vh-450px)] flex flex-col">
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-3 pr-2">
                {currentLanguageSegments.map((segment, index) => {
                  const mapping = getSegmentMapping(segment.id, mappings);
                  const status = getSegmentStatus(segment.id);
                  const segmentText = getSegmentText(segment, content, currentLanguage);
                  
                  return (
                    <div key={segment.id} className="flex items-center gap-4">
                      {/* Left: Timestamp pill */}
                      <div className="w-32 flex-shrink-0 flex items-center justify-start">
                        {mapping && status === 'completed' ? (
                          <TimestampPill
                            segmentId={segment.id}
                            startTime={mapping.startTime}
                            endTime={mapping.endTime}
                            onPlay={(start, end) => {
                              const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
                              handlePlaySegment(mapping, fakeEvent);
                            }}
                            onDelete={(segmentId) => onMappingDelete(segmentId)}
                            onTimestampUpdate={onMappingUpdate}
                            duration={duration}
                          />
                        ) : (
                          <div className="w-full h-8 rounded-lg bg-gray-100 border border-gray-200 opacity-50"></div>
                        )}
                      </div>

                      {/* Right: Segment card */}
                      <div className="flex-1">
                        <div
                          onClick={() => handleSegmentClick(segment.id)}
                          className={`border rounded-lg transition-all cursor-pointer ${
                            status === 'active' 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : mappingSession === 'active'
                              ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start px-4 py-3">
                            {/* Left: Number and status */}
                            <div className="flex items-center gap-3 mr-4">
                              <span className="font-medium text-lg text-gray-700 min-w-8">#{index + 1}</span>
                              <div className="flex-shrink-0">
                                {status === 'active' ? (
                                  <Badge variant="default" className="text-xs bg-blue-100 text-blue-700">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Recording
                                  </Badge>
                                ) : status === 'completed' ? (
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Mapped
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    <Circle className="h-3 w-3 mr-1" />
                                    Ready
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Right: Content */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-700 leading-relaxed">
                                {segmentText}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};