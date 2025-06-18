/**
 * EXPERIMENT 1: Annotation Layer + Progressive Mapping Segmentation
 * 
 * Main page for the experimental segmentation studio that combines:
 * - Annotation layer approach for text segment creation
 * - Progressive mapping workflow for audio-text synchronization
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test complete segmentation workflow in isolated environment
 */

import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ArrowLeft, Download, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

import { Experiment1_AnnotationLayer } from '@/components/experiment1/Experiment1_AnnotationLayer';
import { Experiment1_ProgressiveMapper } from '@/components/experiment1/Experiment1_ProgressiveMapper';
import { Experiment1_SegmentPreview } from '@/components/experiment1/Experiment1_SegmentPreview';

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

interface AudioFile {
  id: number;
  filename: string;
  displayName: string;
  duration?: number;
}

export default function Experiment1_SegmentationStudio() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // EXPERIMENT1: Local state for experimental data
  const [experimentalSegments, setExperimentalSegments] = useState<TextSegment[]>([]);
  const [experimentalMappings, setExperimentalMappings] = useState<AudioMapping[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<'te' | 'hi' | 'en'>('en');
  const [selectedAudioFile, setSelectedAudioFile] = useState<AudioFile | null>(null);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | undefined>();

  // EXPERIMENT1: Fetch chapter data (read-only)
  const { data: chapter, isLoading: chapterLoading } = useQuery<any>({
    queryKey: [`/api/admin/chapters/${chapterId}/details`],
    enabled: !!chapterId
  });

  // EXPERIMENT1: Fetch audio files (read-only)
  const { data: audioFiles = [], isLoading: audioLoading } = useQuery<AudioFile[]>({
    queryKey: [`/api/admin/audio-files/${chapterId}`],
    enabled: !!chapterId
  });

  // EXPERIMENT1: Set default audio file when loaded
  useEffect(() => {
    if (audioFiles.length > 0 && !selectedAudioFile) {
      setSelectedAudioFile(audioFiles[0]);
    }
  }, [audioFiles, selectedAudioFile]);

  // EXPERIMENT1: Generate unique segment ID
  const generateSegmentId = () => `exp1_seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // EXPERIMENT1: Segment management functions
  const handleSegmentCreate = (segmentData: Omit<TextSegment, 'id' | 'order'>) => {
    const newSegment: TextSegment = {
      ...segmentData,
      id: generateSegmentId(),
      order: experimentalSegments.length + 1
    };
    
    setExperimentalSegments(prev => [...prev, newSegment]);
    toast({
      title: "Segment Created",
      description: `Created segment "${newSegment.conceptualName}"`
    });
  };

  const handleSegmentUpdate = (id: string, updates: Partial<TextSegment>) => {
    setExperimentalSegments(prev => 
      prev.map(segment => 
        segment.id === id ? { ...segment, ...updates } : segment
      )
    );
    toast({
      title: "Segment Updated",
      description: "Segment has been updated"
    });
  };

  const handleSegmentDelete = (id: string) => {
    setExperimentalSegments(prev => prev.filter(segment => segment.id !== id));
    setExperimentalMappings(prev => prev.filter(mapping => mapping.segmentId !== id));
    if (currentSegmentId === id) {
      setCurrentSegmentId(undefined);
    }
    toast({
      title: "Segment Deleted",
      description: "Segment and its mappings have been removed"
    });
  };

  // EXPERIMENT1: Mapping management functions
  const handleMappingCreate = (mapping: AudioMapping) => {
    setExperimentalMappings(prev => {
      // Remove any existing mapping for this segment
      const filtered = prev.filter(m => m.segmentId !== mapping.segmentId);
      return [...filtered, mapping];
    });
    toast({
      title: "Mapping Created",
      description: "Audio segment has been mapped to text"
    });
  };

  const handleMappingUpdate = (segmentId: string, updates: Partial<AudioMapping>) => {
    setExperimentalMappings(prev =>
      prev.map(mapping =>
        mapping.segmentId === segmentId ? { ...mapping, ...updates } : mapping
      )
    );
  };

  const handleMappingDelete = (segmentId: string) => {
    setExperimentalMappings(prev => prev.filter(mapping => mapping.segmentId !== segmentId));
    toast({
      title: "Mapping Removed",
      description: "Audio mapping has been removed"
    });
  };

  // EXPERIMENT1: Audio playback for mapped segments
  const handlePlayMapping = (mapping: AudioMapping) => {
    // This would integrate with the audio player to play specific segment
    toast({
      title: "Playing Segment",
      description: `Playing from ${mapping.startTime}s to ${mapping.endTime}s`
    });
  };

  // EXPERIMENT1: Export experimental data to production
  const handleExportToProduction = () => {
    // This would convert experimental segments to real segments
    toast({
      title: "Export Feature",
      description: "This will export segments to the production system (not implemented in experiment)"
    });
  };

  // EXPERIMENT1: Import production segments for comparison
  const handleImportFromProduction = () => {
    // This would load existing segments from the production system
    toast({
      title: "Import Feature", 
      description: "This will import existing segments (not implemented in experiment)"
    });
  };

  // EXPERIMENT1: Clear all experimental data
  const handleClearExperiment = () => {
    setExperimentalSegments([]);
    setExperimentalMappings([]);
    setCurrentSegmentId(undefined);
    toast({
      title: "Experiment Cleared",
      description: "All experimental data has been cleared"
    });
  };

  if (chapterLoading || audioLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Chapter not found or failed to load.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const audioUrl = selectedAudioFile ? `/uploads/${selectedAudioFile.filename}` : '';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* EXPERIMENT1: Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/content-management')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Content Management
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Segmentation Studio</h1>
            <p className="text-muted-foreground">Chapter: {chapter?.title || 'Loading...'}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          Experiment 1
        </Badge>
      </div>

      {/* EXPERIMENT1: Experiment controls */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Experimental Environment</h3>
              <p className="text-sm text-muted-foreground">
                {experimentalSegments.length} segments, {experimentalMappings.length} mappings created
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleImportFromProduction}>
                <Upload className="h-4 w-4 mr-2" />
                Import Production
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportToProduction}>
                <Download className="h-4 w-4 mr-2" />
                Export to Production
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearExperiment}>
                Clear Experiment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EXPERIMENT1: Language and audio file selection */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Language:</label>
          <Select value={currentLanguage} onValueChange={(value: 'te' | 'hi' | 'en') => setCurrentLanguage(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
              <SelectItem value="te">Telugu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {audioFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Audio File:</label>
            <Select 
              value={selectedAudioFile?.id.toString() || ''} 
              onValueChange={(value) => {
                const audioFile = audioFiles.find(f => f.id.toString() === value);
                setSelectedAudioFile(audioFile || null);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audioFiles.map(file => (
                  <SelectItem key={file.id} value={file.id.toString()}>
                    {file.displayName || file.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* EXPERIMENT1: Main interface */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column: Annotation and Mapping */}
        <div className="col-span-8">
          <Tabs defaultValue="annotation" className="space-y-6">
            <TabsList>
              <TabsTrigger value="annotation">Text Annotation</TabsTrigger>
              <TabsTrigger value="mapping" disabled={experimentalSegments.length === 0}>
                Audio Mapping
              </TabsTrigger>
            </TabsList>

            <TabsContent value="annotation" className="space-y-0">
              <Experiment1_AnnotationLayer
                content={chapter?.content || {}}
                currentLanguage={currentLanguage}
                segments={experimentalSegments}
                onSegmentCreate={handleSegmentCreate}
                onSegmentUpdate={handleSegmentUpdate}
                onSegmentDelete={handleSegmentDelete}
              />
            </TabsContent>

            <TabsContent value="mapping" className="space-y-0">
              {selectedAudioFile && audioUrl ? (
                <Experiment1_ProgressiveMapper
                  audioUrl={audioUrl}
                  segments={experimentalSegments}
                  currentLanguage={currentLanguage}
                  content={chapter?.content || {}}
                  mappings={experimentalMappings}
                  onMappingCreate={handleMappingCreate}
                  onMappingUpdate={handleMappingUpdate}
                  onMappingDelete={handleMappingDelete}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No audio file available. Upload an audio file to start mapping.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: Segment preview */}
        <div className="col-span-4">
          <Experiment1_SegmentPreview
            segments={experimentalSegments}
            mappings={experimentalMappings}
            currentLanguage={currentLanguage}
            content={chapter?.content || {}}
            currentSegmentId={currentSegmentId}
            onSegmentSelect={setCurrentSegmentId}

            onSegmentDelete={handleSegmentDelete}
            onPlayMapping={handlePlayMapping}
          />
        </div>
      </div>
    </div>
  );
}