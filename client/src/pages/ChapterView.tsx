import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, Play, Pause, Square, Volume2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InteractiveText } from "@/components/InteractiveText";

interface AudioFile {
  id: string;
  name: string;
  reciter: string;
  url: string;
  duration?: number;
}

interface TextSegment {
  id: number;
  conceptualName: string;
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
}

interface AudioMapping {
  segmentId: number;
  audioFileId: string;
  startTime: number;
  endTime: number;
}

interface Chapter {
  id: string;
  title: string;
  trackId: string;
  order: number;
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  status: string;
  audioFiles: AudioFile[];
  segments: TextSegment[];
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
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch chapter data
  const { data: chapter, isLoading } = useQuery<Chapter>({
    queryKey: ['/api/chapters', chapterId],
    enabled: !!chapterId
  });

  // Fetch student progress
  const { data: progress } = useQuery<StudentProgress>({
    queryKey: ['/api/student-progress', chapterId],
    enabled: !!chapterId
  });

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
      setCurrentTime(audio.currentTime);
      checkActiveSegment(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveSegment(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Update audio source when selection changes
  useEffect(() => {
    if (selectedAudioFile && audioRef.current) {
      audioRef.current.src = selectedAudioFile.url;
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [selectedAudioFile, playbackSpeed]);

  const checkActiveSegment = (time: number) => {
    if (!chapter?.mappings || !selectedAudioFile) return;

    const mapping = chapter.mappings.find(m => 
      m.audioFileId === selectedAudioFile.id &&
      time >= m.startTime && 
      time <= m.endTime
    );

    setActiveSegment(mapping ? mapping.segmentId : null);
  };

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
    if (!chapter?.mappings || !selectedAudioFile || !audioRef.current) return;

    const mapping = chapter.mappings.find(m => 
      m.segmentId === segmentId && 
      m.audioFileId === selectedAudioFile.id
    );

    if (mapping) {
      audioRef.current.currentTime = mapping.startTime;
      setCurrentTime(mapping.startTime);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
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

        {progress && (
          <Badge className={getProficiencyColor(progress.proficiencyLevel)}>
            {getProficiencyLabel(progress.proficiencyLevel)}
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
                  value={selectedAudioFile?.id || ''} 
                  onValueChange={(value) => {
                    const audioFile = chapter.audioFiles.find(f => f.id === value);
                    setSelectedAudioFile(audioFile || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recitation" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapter.audioFiles.map((file) => (
                      <SelectItem key={file.id} value={file.id}>
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
          {chapter.content && (
            <InteractiveText
              content={chapter.content[selectedLanguage] || ''}
              segments={chapter.segments}
              selectedScript={selectedLanguage}
              audioFile={selectedAudioFile}
              mappings={chapter.mappings}
              activeSegment={activeSegment}
              onSegmentClick={handleSegmentClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}