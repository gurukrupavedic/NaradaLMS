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

interface TextSegment {
  id: string;
  conceptualName: string;
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
  order: number;
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
  
  // EXPERIMENT1: Mapping session state
  const [mappingSession, setMappingSession] = useState<'idle' | 'active' | 'paused'>('idle');
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // EXPERIMENT1: Filter segments by current language
  const currentLanguageSegments = segments
    .filter(segment => segment.textReferences[currentLanguage])
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // EXPERIMENT1: Calculate progress
  const mappedSegments = currentLanguageSegments.filter(s => mappings.some(m => m.segmentId === s.id));
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

  // EXPERIMENT1: Helper functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSegmentText = (segment: TextSegment) => {
    const textRef = segment.textReferences[currentLanguage];
    if (!textRef || !content[currentLanguage]) return segment.conceptualName;
    
    const text = content[currentLanguage];
    return text.slice(textRef.start, textRef.end);
  };

  const getSegmentStatus = (segmentId: string) => {
    if (activeSegmentId === segmentId) return 'active';
    if (mappings.some(m => m.segmentId === segmentId)) return 'completed';
    return 'inactive';
  };

  const getSegmentMapping = (segmentId: string) => {
    return mappings.find(m => m.segmentId === segmentId);
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
    <div className="space-y-6">
      {/* EXPERIMENT1: Audio player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audio Mapping Session</span>
            <Badge variant={mappingSession === 'active' ? 'default' : mappingSession === 'paused' ? 'secondary' : 'outline'}>
              {mappingSession === 'active' ? 'Recording' : mappingSession === 'paused' ? 'Paused' : 'Ready'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio element */}
          <audio ref={audioRef} src={audioUrl} preload="metadata" />
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
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
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayPause}
              disabled={mappingSession === 'idle'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            {mappingSession === 'idle' ? (
              <Button onClick={startMappingSession}>
                Start Mapping Session
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={pauseMappingSession}>
                  {mappingSession === 'paused' ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="outline" onClick={stopMappingSession}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
                <Button variant="outline" onClick={resetMappingSession}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </>
            )}
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Mapping Progress</span>
              <span>{mappedSegments.length} / {currentLanguageSegments.length} segments</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* EXPERIMENT1: Segment cards */}
      <Card>
        <CardHeader>
          <CardTitle>Text Segments - Click When Heard</CardTitle>
          {mappingSession === 'active' && (
            <p className="text-sm text-muted-foreground">
              Click on each segment card when you hear it being recited in the audio.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {currentLanguageSegments.map((segment, index) => {
                const status = getSegmentStatus(segment.id);
                const mapping = getSegmentMapping(segment.id);
                const segmentText = getSegmentText(segment);
                
                return (
                  <div
                    key={segment.id}
                    onClick={() => handleSegmentClick(segment.id)}
                    className={`border rounded-lg transition-all cursor-pointer ${
                      status === 'active' 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : status === 'completed'
                        ? 'border-green-300 bg-green-50'
                        : mappingSession === 'active'
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
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
                      
                      {/* Middle: Content */}
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="text-sm text-gray-700 mb-1 leading-relaxed">
                          {segmentText}
                        </div>
                        {mapping && status === 'completed' && (
                          <div className="text-xs text-green-600">
                            {formatTime(mapping.startTime)} - {formatTime(mapping.endTime)}
                          </div>
                        )}
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
  );
};