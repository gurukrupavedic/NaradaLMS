import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import AudioPlayer from "@/components/audio-player";
import InteractiveText from "@/components/interactive-text";
import type { ChapterWithDetails } from "@/types/vedic";

export default function ChapterView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedScript, setSelectedScript] = useState<'te' | 'hi' | 'en'>('te');
  const [selectedAudioId, setSelectedAudioId] = useState<number | null>(null);

  const { data: chapter, isLoading, error } = useQuery<ChapterWithDetails>({
    queryKey: [`/api/chapters/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vedic-brown"></div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chapter Not Found</h2>
          <p className="text-gray-600 mb-4">The requested chapter could not be loaded.</p>
          <Button onClick={() => setLocation("/")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const scripts = [
    { id: 'te', name: 'తెలుగు', fullName: 'Telugu' },
    { id: 'hi', name: 'देवनागरी', fullName: 'Devanagari' },
    { id: 'en', name: 'English (IAST)', fullName: 'English (IAST)' },
  ];

  const selectedAudio = selectedAudioId 
    ? chapter.audioFiles.find(a => a.id === selectedAudioId)
    : chapter.audioFiles[0];

  const audioMappings = chapter.audioMappings.find(
    am => am.audioFileId === selectedAudio?.id
  )?.mappings || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/")}
                className="mr-4"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-shrink-0 flex items-center">
                <svg className="h-8 w-8 text-vedic-brown mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z"/>
                </svg>
                <h1 className="text-xl font-bold text-vedic-brown">Vedic LMS</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user?.profileImageUrl && (
                <img 
                  src={user.profileImageUrl} 
                  alt="User Avatar" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <span className="text-sm font-medium text-gray-700">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Chapter Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Chapter Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{chapter.title}</h1>
                <p className="text-gray-600">Chapter {chapter.order}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Script:</span>
                  <Select value={selectedScript} onValueChange={setSelectedScript}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scripts.map((script) => (
                        <SelectItem key={script.id} value={script.id}>
                          {script.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Audio Controls */}
            {chapter.audioFiles.length > 0 && (
              <div className="bg-vedic-cream rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <AudioPlayer 
                      audioFile={selectedAudio}
                      mappings={audioMappings}
                    />
                  </div>
                  
                  {chapter.audioFiles.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Reciter:</span>
                      <Select 
                        value={selectedAudioId?.toString() || chapter.audioFiles[0]?.id.toString()} 
                        onValueChange={(value) => setSelectedAudioId(parseInt(value))}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {chapter.audioFiles.map((audio) => (
                            <SelectItem key={audio.id} value={audio.id.toString()}>
                              {audio.reciter || audio.originalName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chapter Content */}
        <Card>
          <CardContent className="p-8">
            <div className="prose max-w-none">
              <InteractiveText
                content={chapter.content[selectedScript] || ''}
                segments={chapter.segments}
                selectedScript={selectedScript}
                audioFile={selectedAudio}
                mappings={audioMappings}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
