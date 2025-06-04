import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AudioPlayer from "@/components/AudioPlayer";
import InteractiveSegment from "@/components/InteractiveSegment";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

interface ChapterData {
  id: string;
  title: string;
  trackTitle: string;
  order: number;
  status: string;
  texts: {
    te?: string;
    hi?: string;
    en?: string;
  };
  audioFiles: Array<{
    id: string;
    name: string;
    reciter: string;
    duration?: number;
  }>;
  segments: Array<{
    id: string;
    conceptualName: string;
    originalTextReferences: {
      te?: { start: number; end: number };
      hi?: { start: number; end: number };
      en?: { start: number; end: number };
    };
  }>;
  mappings: Array<{
    segmentId: string;
    audioFileId: string;
    startTime: number;
    endTime: number;
  }>;
  proficiencyLevel?: number;
}

export default function Chapter() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<'te' | 'hi' | 'en'>('te');
  const [selectedAudioFile, setSelectedAudioFile] = useState<string>('');
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [showSegmentHighlights, setShowSegmentHighlights] = useState(true);

  const { data: chapter, isLoading, error } = useQuery<ChapterData>({
    queryKey: ['/api/chapters', id],
    enabled: !!id,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [error, toast]);

  useEffect(() => {
    if (chapter?.audioFiles?.length && !selectedAudioFile) {
      setSelectedAudioFile(chapter.audioFiles[0].id);
    }
  }, [chapter, selectedAudioFile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🕉️</div>
          <p className="text-lg text-gray-600">Loading chapter content...</p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-lg text-gray-600">Chapter not found</p>
            <Button 
              onClick={() => setLocation('/')} 
              className="mt-4"
              variant="outline"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentText = chapter.texts[selectedLanguage] || '';
  const currentAudioFile = chapter.audioFiles.find(af => af.id === selectedAudioFile);
  
  const getSegmentMappings = (segmentId: string) => {
    return chapter.mappings.filter(m => m.segmentId === segmentId);
  };

  const renderInteractiveText = (text: string) => {
    if (!showSegmentHighlights || !chapter.segments.length) {
      return <div className="text-lg leading-relaxed">{text}</div>;
    }

    let lastIndex = 0;
    const elements: React.ReactNode[] = [];
    
    // Sort segments by start position
    const sortedSegments = chapter.segments
      .filter(segment => segment.originalTextReferences[selectedLanguage])
      .sort((a, b) => {
        const aStart = a.originalTextReferences[selectedLanguage]?.start || 0;
        const bStart = b.originalTextReferences[selectedLanguage]?.start || 0;
        return aStart - bStart;
      });

    sortedSegments.forEach((segment, index) => {
      const textRef = segment.originalTextReferences[selectedLanguage];
      if (!textRef) return;

      const { start, end } = textRef;
      
      // Add text before this segment
      if (start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, start)}
          </span>
        );
      }

      // Add the interactive segment
      const segmentText = text.substring(start, end);
      const mappings = getSegmentMappings(segment.id);
      const hasAudioMapping = mappings.some(m => m.audioFileId === selectedAudioFile);

      elements.push(
        <InteractiveSegment
          key={segment.id}
          segmentId={segment.id}
          text={segmentText}
          isActive={activeSegment === segment.id}
          hasAudioMapping={hasAudioMapping}
          onClick={() => setActiveSegment(segment.id)}
        />
      );

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <div className="text-lg leading-relaxed">{elements}</div>;
  };

  const getFontClass = () => {
    switch (selectedLanguage) {
      case 'te': return 'font-tiro-telugu';
      case 'hi': return 'font-tiro-devanagari-sanskrit';
      case 'en': return 'font-tiro-devanagari-sanskrit';
      default: return 'font-tiro-devanagari-sanskrit';
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 text-gray-800';
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-blue-100 text-blue-800';
      case 4: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 0: return 'Not Started';
      case 1: return 'Level 1';
      case 2: return 'Level 2';
      case 3: return 'Level 3';
      case 4: return 'Level 4';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLocation('/')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl mr-3">🕉️</span>
                <h1 className="text-xl font-bold text-primary">Vedic LMS</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher 
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Chapter Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-primary mb-2">
                  {chapter.title}
                </CardTitle>
                <p className="text-muted-foreground">
                  Chapter {chapter.order} of {chapter.trackTitle}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSegmentHighlights(!showSegmentHighlights)}
                  className="flex items-center gap-2"
                >
                  {showSegmentHighlights ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showSegmentHighlights ? 'Hide' : 'Show'} Segments
                </Button>
                
                {chapter.proficiencyLevel !== undefined && (
                  <Badge className={getLevelColor(chapter.proficiencyLevel)}>
                    {getLevelLabel(chapter.proficiencyLevel)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Audio Controls */}
            {chapter.audioFiles.length > 0 && (
              <div className="vedic-cream rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Reciter:</span>
                    <Select value={selectedAudioFile} onValueChange={setSelectedAudioFile}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chapter.audioFiles.map(audioFile => (
                          <SelectItem key={audioFile.id} value={audioFile.id}>
                            {audioFile.reciter} - {audioFile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <AudioPlayer
                  audioFile={currentAudioFile}
                  segments={chapter.segments}
                  mappings={chapter.mappings.filter(m => m.audioFileId === selectedAudioFile)}
                  activeSegment={activeSegment}
                  onSegmentChange={setActiveSegment}
                />
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Chapter Content */}
        <Card>
          <CardContent className="p-8">
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold text-primary mb-6">Chapter Content</h2>
              
              <div className={`${getFontClass()} ${selectedLanguage === 'en' ? 'text-base' : 'text-lg'}`}>
                {currentText ? (
                  renderInteractiveText(currentText)
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Content not available in the selected language.</p>
                    <p className="text-sm mt-2">
                      Try switching to a different script using the language selector above.
                    </p>
                  </div>
                )}
              </div>

              {chapter.segments.length > 0 && showSegmentHighlights && (
                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">Practice Guidelines:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                    <li>Click on highlighted segments to hear the corresponding audio</li>
                    <li>Listen to each segment carefully before attempting to recite</li>
                    <li>Pay attention to the proper pronunciation of each syllable</li>
                    <li>Practice with the audio controls to match the rhythm and intonation</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
