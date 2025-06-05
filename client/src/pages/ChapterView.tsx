import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, Play, Pause, Square, Volume2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface AudioFile {
  id: number;
  chapterId: number;
  filename: string;
  reciter: string;
  duration: number;
  uploadedAt: string;
  fileSize: number;
}

interface TextSegment {
  id: number;
  chapterId: number;
  text: {
    te: string;
    hi: string;
    en: string;
  };
  order: number;
}

interface AudioMapping {
  audioFileId: number;
  segmentId: number;
  startTime: number;
  endTime: number;
}

interface Chapter {
  id: string;
  title: string;
  trackId: string;
  order: number;
  proficiencyLevel: number;
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  segments: TextSegment[];
  audioFiles: AudioFile[];
  mappings: AudioMapping[];
}

interface StudentProgress {
  proficiencyLevel: number;
}

export default function ChapterView() {
  const [, setLocation] = useLocation();
  const { trackId, chapterId } = useParams();
  
  // Audio player state
  const [selectedLanguage, setSelectedLanguage] = useState<'te' | 'hi' | 'en'>('te');
  const [selectedAudioFile, setSelectedAudioFile] = useState<AudioFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [segmentPlayback, setSegmentPlayback] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch chapter data
  const { data: chapter, isLoading, error } = useQuery<Chapter>({
    queryKey: [`/api/chapters/${chapterId}`],
    enabled: !!chapterId
  });

  // Student progress is included in chapter data

  // Initialize audio file selection
  useEffect(() => {
    if (chapter?.audioFiles?.length && !selectedAudioFile) {
      setSelectedAudioFile(chapter.audioFiles[0]);
    }
  }, [chapter, selectedAudioFile]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      setCurrentTime(currentTime);
      checkActiveSegment(currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveSegment(null);
      setSegmentPlayback(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [chapter, selectedAudioFile, segmentPlayback, isPlaying]);

  // Update audio source when selection changes
  useEffect(() => {
    if (selectedAudioFile && audioRef.current) {
      // Using your authentic Śraddhā Sūktam audio file
      audioRef.current.src = `/audio/${selectedAudioFile.filename}`;
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [selectedAudioFile, playbackSpeed]);

  const checkActiveSegment = useCallback((time: number) => {
    if (!chapter?.mappings || !selectedAudioFile) return;

    const mapping = chapter.mappings.find(m => 
      m.audioFileId === selectedAudioFile.id &&
      time >= m.startTime && 
      time <= m.endTime
    );

    // Auto-pause at segment end if currently playing a specific segment
    if (segmentPlayback && isPlaying) {
      const currentMapping = chapter.mappings.find(m => 
        m.segmentId === segmentPlayback && m.audioFileId === selectedAudioFile.id
      );
      
      if (currentMapping && time >= currentMapping.endTime && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        setSegmentPlayback(null);
        setActiveSegment(null);
        return;
      }
    }

    setActiveSegment(mapping ? mapping.segmentId : null);
  }, [chapter?.mappings, selectedAudioFile, segmentPlayback, isPlaying]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveSegment(null);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSegmentClick = (segmentId: number) => {
    if (!chapter?.mappings || !selectedAudioFile || !audioRef.current) {
      console.log('Missing required data for segment click:', {
        mappings: !!chapter?.mappings,
        audioFile: !!selectedAudioFile,
        audioRef: !!audioRef.current
      });
      return;
    }

    const mapping = chapter.mappings.find(m => 
      m.segmentId === segmentId && 
      m.audioFileId === selectedAudioFile.id
    );

    if (mapping) {
      try {

        audioRef.current.currentTime = mapping.startTime;
        setCurrentTime(mapping.startTime);
        setSegmentPlayback(segmentId); // Enable auto-pause for this segment
        
        if (!isPlaying) {
          audioRef.current.play().catch(err => {
            console.error('Audio play failed:', err);
          });
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error in handleSegmentClick:', error);
      }
    } else {
      console.log('No mapping found for segment:', segmentId, 'with audio file:', selectedAudioFile.id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProficiencyColor = (level: number) => {
    const colors = {
      0: 'bg-gray-100 text-gray-800',
      1: 'bg-red-100 text-red-800',
      2: 'bg-yellow-100 text-yellow-800', 
      3: 'bg-blue-100 text-blue-800',
      4: 'bg-green-100 text-green-800'
    };
    return colors[level as keyof typeof colors] || colors[0];
  };

  const getProficiencyLabel = (level: number) => {
    const labels = {
      0: 'Not Started',
      1: 'Level 1',
      2: 'Level 2', 
      3: 'Level 3',
      4: 'Level 4'
    };
    return labels[level as keyof typeof labels] || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Chapter not found</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation(`/tracks/${trackId}`)}
            >
              Back to Track
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setLocation(`/tracks/${trackId}`)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Track
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Track {trackId}</span>
            <span>•</span>
            <span>Chapter {chapter.order}</span>
          </div>
          <h1 className="text-2xl font-bold break-words">{chapter.title}</h1>
        </div>

        {chapter && (
          <Badge className={getProficiencyColor(chapter.proficiencyLevel)}>
            {getProficiencyLabel(chapter.proficiencyLevel)}
          </Badge>
        )}
      </div>

      {/* Language Switcher */}
      <div className="flex justify-center">
        <LanguageSwitcher 
          selectedLanguage={selectedLanguage}
          onLanguageChange={(lang) => setSelectedLanguage(lang as 'te' | 'hi' | 'en')}
        />
      </div>

      {/* Media Controls */}
      {chapter.audioFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Audio Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recitation Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recitation</label>
                <Select 
                  value={selectedAudioFile?.id.toString() || ''} 
                  onValueChange={(value) => {
                    const audioFile = chapter.audioFiles.find(f => f.id.toString() === value);
                    setSelectedAudioFile(audioFile || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recitation" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapter.audioFiles.map((file) => (
                      <SelectItem key={file.id} value={file.id.toString()}>
                        {file.reciter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Speed</label>
                <Select 
                  value={playbackSpeed.toString()} 
                  onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="0.75">0.75x</SelectItem>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.25">1.25x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePlayPause}
                disabled={!selectedAudioFile}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleStop}
                disabled={!selectedAudioFile}
              >
                <Square className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 text-sm">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Timeline */}
            {duration > 0 && (
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Chapter Content</CardTitle>
        </CardHeader>
        <CardContent>
          {chapter.segments.length > 0 ? (
            <div className="space-y-4">
              <div className="text-right text-sm text-gray-500 mb-4">
                Click any text segment to jump to its audio position
              </div>
              <div className="space-y-3">
                {chapter.segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      activeSegment === segment.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                    onClick={() => handleSegmentClick(segment.id)}
                  >
                    <div className="text-lg leading-relaxed font-['Tiro_Telugu','Tiro_Devanagari_Sanskrit',serif]">
                      {segment.text[selectedLanguage]}
                    </div>
                    {selectedLanguage !== 'en' && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-mono">
                        {segment.text.en}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-lg leading-relaxed font-['Tiro_Telugu','Tiro_Devanagari_Sanskrit',serif]">
              {chapter.content?.[selectedLanguage] || 'No content available'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}