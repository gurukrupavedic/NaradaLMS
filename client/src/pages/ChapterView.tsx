import React, { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TextReferences {
  te?: { start: number; end: number };
  hi?: { start: number; end: number };
  en?: { start: number; end: number };
}

interface Segment {
  id: number;
  chapterId: number;
  conceptualName: string;
  textReferences: TextReferences;
}

interface AudioMapping {
  audioFileId: number;
  segmentId: number;
  startTime: number;
  endTime: number;
}

interface AudioFile {
  id: number;
  chapterId: number;
  filename: string;
  reciter: string;
  duration: number;
}

interface ChapterContent {
  te: string;
  hi: string;
  en: string;
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  proficiencyLevel: number;
  trackId: string;
  segments: Segment[];
  audioFiles: AudioFile[];
  mappings: AudioMapping[];
  content: ChapterContent;
}

type Language = 'te' | 'hi' | 'en';

export function ChapterView() {
  const [, params] = useRoute("/chapter/:id");
  const [, setLocation] = useLocation();
  const [currentLanguage, setCurrentLanguage] = useState<Language>('te');
  const [hoveredSegmentId, setHoveredSegmentId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSegmentId, setCurrentSegmentId] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const { data: chapter, isLoading } = useQuery<Chapter>({
    queryKey: [`/api/chapters/${params?.id}`],
    enabled: !!params?.id,
  });

  // Update current time as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const currentTime = audio.currentTime;
      setCurrentTime(currentTime);
      
      // Check if we need to stop at segment end
      if (chapter && isPlaying && currentSegmentId !== null) {
        const currentMapping = chapter.mappings.find(m => m.segmentId === currentSegmentId);
        if (currentMapping && currentTime >= currentMapping.endTime) {
          audio.pause();
          setIsPlaying(false);
          setCurrentSegmentId(null);
        }
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentSegmentId(null);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [chapter, isPlaying, currentSegmentId]);



  const handleSegmentClick = (segmentId: number) => {
    if (!chapter) return;

    const mapping = chapter.mappings.find(m => m.segmentId === segmentId);
    if (!mapping) {
      toast({
        title: "No Audio Mapping",
        description: "This text segment doesn't have audio mapped yet.",
        variant: "destructive",
      });
      return;
    }

    const audioFile = chapter.audioFiles.find(af => af.id === mapping.audioFileId);
    if (!audioFile) {
      toast({
        title: "Audio File Not Found",
        description: "The audio file for this segment is missing.",
        variant: "destructive",
      });
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Set audio source if needed
    if (audio.src !== `/audio/${audioFile.filename}`) {
      audio.src = `/audio/${audioFile.filename}`;
      audio.playbackRate = playbackSpeed;
    }

    // Set playback position and play
    audio.currentTime = mapping.startTime;
    setCurrentSegmentId(segmentId);
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        toast({
          title: "Playback Error",
          description: "Unable to play audio. Please try again.",
          variant: "destructive",
        });
      });
  };

  const renderInteractiveContent = (content: string, language: Language) => {
    if (!chapter) return content;

    const segments = chapter.segments.filter(s => s.textReferences[language]);
    if (segments.length === 0) return content;

    // Sort segments by start position
    const sortedSegments = [...segments].sort((a, b) => {
      const aStart = a.textReferences[language]?.start || 0;
      const bStart = b.textReferences[language]?.start || 0;
      return aStart - bStart;
    });

    let result = [];
    let lastEnd = 0;

    for (const segment of sortedSegments) {
      const ref = segment.textReferences[language];
      if (!ref) continue;

      // Add text before this segment
      if (ref.start > lastEnd) {
        result.push(
          <span key={`text-${lastEnd}-${ref.start}`}>
            {content.slice(lastEnd, ref.start)}
          </span>
        );
      }

      // Add the interactive segment
      const segmentText = content.slice(ref.start, ref.end);
      const isHovered = hoveredSegmentId === segment.id;
      const isCurrentlyPlaying = currentSegmentId === segment.id && isPlaying;
      const hasMapping = chapter.mappings.some(m => m.segmentId === segment.id);

      result.push(
        <span
          key={`segment-${segment.id}`}
          className={`
            inline cursor-pointer transition-all duration-200 rounded-sm px-1
            ${hasMapping 
              ? 'hover:bg-blue-100 dark:hover:bg-blue-900 hover:shadow-sm' 
              : 'hover:bg-red-100 dark:hover:bg-red-900 hover:shadow-sm'
            }
            ${isHovered 
              ? hasMapping 
                ? 'bg-blue-200 dark:bg-blue-800' 
                : 'bg-red-200 dark:bg-red-800'
              : ''
            }
            ${isCurrentlyPlaying 
              ? 'bg-green-200 dark:bg-green-800 animate-pulse' 
              : ''
            }
          `}
          onClick={() => handleSegmentClick(segment.id)}
          onMouseEnter={() => setHoveredSegmentId(segment.id)}
          onMouseLeave={() => setHoveredSegmentId(null)}
          title={hasMapping ? segment.conceptualName : `${segment.conceptualName} (No audio mapped)`}
        >
          {segmentText}
        </span>
      );

      lastEnd = ref.end;
    }

    // Add remaining text
    if (lastEnd < content.length) {
      result.push(
        <span key={`text-${lastEnd}-end`}>
          {content.slice(lastEnd)}
        </span>
      );
    }

    return result;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Chapter Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            The requested chapter could not be found.
          </p>
        </div>
      </div>
    );
  }

  const currentContent = chapter.content[currentLanguage];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <audio ref={audioRef} preload="metadata" />
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation(`/tracks/${chapter?.trackId}`)}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {chapter.title}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">Chapter {chapter.order}</Badge>
            <Badge variant="outline">Level {chapter.proficiencyLevel}</Badge>
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Content Language</span>
            <div className="flex gap-2">
              <Button
                variant={currentLanguage === 'te' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentLanguage('te')}
              >
                Telugu
              </Button>
              <Button
                variant={currentLanguage === 'hi' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentLanguage('hi')}
              >
                Hindi
              </Button>
              <Button
                variant={currentLanguage === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentLanguage('en')}
              >
                English
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Audio Controls */}
      {chapter.audioFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Audio Playback</span>
              <div className="flex items-center gap-2">
                <select 
                  className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800"
                  value={playbackSpeed}
                  onChange={(e) => {
                    const newSpeed = parseFloat(e.target.value);
                    setPlaybackSpeed(newSpeed);
                    const audio = audioRef.current;
                    if (audio) {
                      audio.playbackRate = newSpeed;
                    }
                  }}
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
                <select 
                  className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800"
                  defaultValue={chapter.audioFiles[0]?.id}
                >
                  {chapter.audioFiles.map((audioFile) => (
                    <option key={audioFile.id} value={audioFile.id}>
                      {audioFile.reciter}
                    </option>
                  ))}
                </select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    
                    if (isPlaying) {
                      audio.pause();
                      setIsPlaying(false);
                    } else {
                      if (!audio.src) {
                        audio.src = `/audio/${chapter.audioFiles[0].filename}`;
                        audio.playbackRate = playbackSpeed;
                      }
                      audio.play().then(() => setIsPlaying(true));
                    }
                  }}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const audio = audioRef.current;
                    if (audio) {
                      audio.pause();
                      audio.currentTime = 0;
                      setIsPlaying(false);
                      setCurrentSegmentId(null);
                    }
                  }}
                >
                  Stop
                </Button>
                
                {currentSegmentId && (
                  <Badge variant="secondary" className="ml-2">
                    Playing: {(() => {
                      const segment = chapter.segments.find(s => s.id === currentSegmentId);
                      if (!segment) return '';
                      const refs = segment.textReferences[currentLanguage];
                      if (!refs) return '';
                      return currentContent.substring(refs.start, refs.end);
                    })()}
                  </Badge>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px]">
                    {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={chapter.audioFiles[0]?.duration || 0}
                    value={currentTime}
                    onChange={(e) => {
                      const audio = audioRef.current;
                      if (audio) {
                        audio.currentTime = parseFloat(e.target.value);
                      }
                    }}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px]">
                    {Math.floor((chapter.audioFiles[0]?.duration || 0) / 60)}:{(Math.floor(chapter.audioFiles[0]?.duration || 0) % 60).toString().padStart(2, '0')}
                  </span>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentLanguage === 'te' && 'Telugu Text'}
            {currentLanguage === 'hi' && 'Devanagari Text'}
            {currentLanguage === 'en' && 'English/IAST Text'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className={`
              prose prose-lg max-w-none leading-relaxed
              ${currentLanguage === 'te' ? 'font-telugu text-2xl' : ''}
              ${currentLanguage === 'hi' ? 'font-devanagari text-2xl' : ''}
              ${currentLanguage === 'en' ? 'font-vedic text-xl' : ''}
            `}
            style={{
              lineHeight: '2.5',
              letterSpacing: '0.02em',
            }}
          >
            {renderInteractiveContent(currentContent, currentLanguage)}
          </div>
          
          {/* Usage Instructions */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Interactive Features:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Hover over text to highlight segments</li>
              <li>• Click highlighted text to play corresponding audio</li>
              <li>• Blue highlights indicate segments with audio mapping</li>
              <li>• Red highlights indicate segments without audio mapping</li>
              <li>• Green highlights show currently playing segment</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Segment Overview */}
      {hoveredSegmentId && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-sm">
              <strong>Segment:</strong> {
                chapter.segments.find(s => s.id === hoveredSegmentId)?.conceptualName
              }
              <br />
              <strong>Audio Mapping:</strong> {
                chapter.mappings.find(m => m.segmentId === hoveredSegmentId)
                  ? 'Available'
                  : 'Not mapped'
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}