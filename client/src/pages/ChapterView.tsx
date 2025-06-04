import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { AudioPlayer } from '@/components/AudioPlayer';
import { InteractiveSegments } from '@/components/InteractiveSegments';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { languageOptions } from '@/components/ui/fonts';
import type { ChapterWithDetails, AudioFile } from '@shared/schema';

interface ChapterViewProps {
  chapterId: number;
  onBack: () => void;
}

export default function ChapterView({ chapterId, onBack }: ChapterViewProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('te');
  const [selectedAudioFile, setSelectedAudioFile] = useState<AudioFile | undefined>();
  const [activeSegment, setActiveSegment] = useState<number | undefined>();

  const { data: chapter, isLoading, error } = useQuery<ChapterWithDetails>({
    queryKey: [`/api/chapters/${chapterId}`],
  });

  // Set default audio file when chapter loads
  useEffect(() => {
    if (chapter?.audioFiles.length && !selectedAudioFile) {
      setSelectedAudioFile(chapter.audioFiles[0]);
    }
  }, [chapter, selectedAudioFile]);

  const handleSegmentClick = (segmentId: number) => {
    setActiveSegment(segmentId);
    // The AudioPlayer component will handle playing the segment
  };

  const handleAudioFileChange = (audioFile: AudioFile) => {
    setSelectedAudioFile(audioFile);
    setActiveSegment(undefined); // Clear active segment when changing audio
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Failed to load chapter</p>
              <Button onClick={onBack}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedLanguageOption = languageOptions.find(opt => opt.id === selectedLanguage);
  const content = chapter.content[selectedLanguage as keyof typeof chapter.content] || '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Chapter Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={onBack}
                className="p-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{chapter.title}</h1>
                <p className="text-gray-600">
                  Chapter {chapter.order} of {chapter.track.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
              />
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Level 2
              </Badge>
            </div>
          </div>

          {/* Audio Controls */}
          <AudioPlayer
            audioFiles={chapter.audioFiles}
            mappings={chapter.segments.flatMap(segment => segment.mappings)}
            selectedAudioFile={selectedAudioFile}
            onAudioFileChange={handleAudioFileChange}
            activeSegment={activeSegment}
            onSegmentPlay={setActiveSegment}
          />
        </CardHeader>
      </Card>

      {/* Chapter Content */}
      <Card>
        <CardContent className="p-8">
          {content ? (
            <InteractiveSegments
              content={content}
              segments={chapter.segments}
              selectedLanguage={selectedLanguage}
              selectedAudioFile={selectedAudioFile}
              onSegmentClick={handleSegmentClick}
              activeSegment={activeSegment}
              fontClass={selectedLanguageOption?.fontClass || ''}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No content available in {selectedLanguageOption?.fullName || selectedLanguage}</p>
              <p className="text-sm mt-2">Try switching to a different language</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chapter Information */}
      {chapter.segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Practice Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Listen to each segment carefully before attempting to recite</li>
                <li>Pay attention to the proper pronunciation of each syllable</li>
                <li>Practice with the audio controls to match the rhythm and intonation</li>
                <li>Focus on understanding the meaning while reciting</li>
                <li>Click on highlighted segments to hear their pronunciation</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
