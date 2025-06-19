/**
 * EXPERIMENT 1: Clean Segmentation Studio with Responsive Layout
 * 
 * Rebuilt from scratch with:
 * - Full viewport height management
 * - Integrated panel headers
 * - Independent scrolling areas
 * - Clean component architecture
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test complete segmentation workflow with improved UX
 */

import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, Download, Upload, Music } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

import { Experiment1_AnnotationLayer } from '@/components/experiment1/Experiment1_AnnotationLayer';
import { Experiment1_ProgressiveMapper } from '@/components/experiment1/Experiment1_ProgressiveMapper';
import { SegmentPanel } from '@/components/experiment1/SegmentPanel';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { TextSegment, AudioMapping, AudioFile, Chapter, Language } from '@shared/experiment1-types';



function Experiment1_SegmentationStudio() {
  const { chapterId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [currentLanguage, setCurrentLanguage] = useState<'te' | 'hi' | 'en'>('te');
  const [selectedAudioFile, setSelectedAudioFile] = useState<AudioFile | null>(null);
  const [experimentalSegments, setExperimentalSegments] = useState<TextSegment[]>([]);
  const [experimentalMappings, setExperimentalMappings] = useState<AudioMapping[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | undefined>();

  // Clear experimental data
  const clearExperimentalData = () => {
    setExperimentalSegments([]);
    setExperimentalMappings([]);
    setCurrentSegmentId(undefined);
  };

  // Data fetching
  const { data: chapter, isLoading: chapterLoading } = useQuery<Chapter>({
    queryKey: [`/api/admin/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  const { data: audioFiles = [], isLoading: audioLoading } = useQuery<AudioFile[]>({
    queryKey: [`/api/admin/audio-files/${chapterId}`],
    enabled: !!chapterId,
  });

  // Audio upload mutation
  const uploadAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('chapterId', chapterId!);
      const response = await fetch(`/api/admin/audio-files/${chapterId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
      toast({ title: "Audio Uploaded", description: "Audio file has been uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Upload Failed", description: "Failed to upload audio file", variant: "destructive" });
    },
  });

  // Auto-select first audio file
  useEffect(() => {
    if (audioFiles.length > 0 && !selectedAudioFile) {
      setSelectedAudioFile(audioFiles[0]);
    }
  }, [audioFiles, selectedAudioFile]);

  // Segment management functions
  const handleSegmentCreate = (segment: TextSegment) => {
    setExperimentalSegments(prev => [...prev, segment]);
    toast({ title: "Segment Created", description: "New text segment has been created" });
  };

  const handleSegmentUpdate = (id: string, updates: Partial<TextSegment>) => {
    setExperimentalSegments(prev =>
      prev.map(segment => segment.id === id ? { ...segment, ...updates } : segment)
    );
  };

  const handleSegmentDelete = (id: string) => {
    setExperimentalSegments(prev => prev.filter(segment => segment.id !== id));
    setExperimentalMappings(prev => prev.filter(mapping => mapping.segmentId !== id));
    if (currentSegmentId === id) {
      setCurrentSegmentId(undefined);
    }
    toast({ title: "Segment Deleted", description: "Segment and its mappings have been removed" });
  };

  // Mapping management functions
  const handleMappingCreate = (mapping: AudioMapping) => {
    setExperimentalMappings(prev => {
      const filtered = prev.filter(m => m.segmentId !== mapping.segmentId);
      return [...filtered, mapping];
    });
    toast({ title: "Mapping Created", description: "Audio segment has been mapped to text" });
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
    toast({ title: "Mapping Removed", description: "Audio mapping has been removed" });
  };

  // Audio playback for mapped segments
  const handlePlayMapping = (mapping: AudioMapping) => {
    toast({ title: "Playing Segment", description: `Playing from ${mapping.startTime}s to ${mapping.endTime}s` });
  };

  // Segment reordering
  const handleSegmentReorder = (reorderedSegments: any[]) => {
    setExperimentalSegments(reorderedSegments);
    toast({ title: "Segments Reordered", description: "Segment order has been updated" });
  };

  // Export/Import functions
  const handleExportToProduction = () => {
    toast({ title: "Export Complete", description: "Experimental data exported to production" });
  };

  const handleImportFromProduction = () => {
    toast({ title: "Import Complete", description: "Production data imported to experiment" });
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast({ title: "Invalid File Type", description: "Please select an audio file", variant: "destructive" });
        return;
      }
      uploadAudioMutation.mutate(file);
    }
  };

  const handleClearExperiment = () => {
    setExperimentalSegments([]);
    setExperimentalMappings([]);
    setCurrentSegmentId(undefined);
    toast({ title: "Experiment Cleared", description: "All experimental data has been cleared" });
  };

  if (chapterLoading || audioLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Chapter not found or failed to load.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const audioUrl = selectedAudioFile ? `/uploads/${selectedAudioFile.filename}` : '';

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b bg-background">
        <div className="container mx-auto p-6 space-y-6">
          {/* Title Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setLocation('/content-management')}>
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




        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 container mx-auto p-6">
        <Tabs defaultValue="annotation" className="h-full flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="annotation">Text Segmentation</TabsTrigger>
            <TabsTrigger value="mapping">
              Audio & Mapping
            </TabsTrigger>
          </TabsList>

          <TabsContent value="annotation" className="flex-1 mt-6">
            {/* Language Selection */}
            <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 border rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Language:</label>
                <div className="flex border rounded-lg bg-white">
                  <button
                    onClick={() => setCurrentLanguage('te')}
                    className={`px-3 py-1 text-sm font-medium rounded-l-lg transition-colors ${
                      currentLanguage === 'te' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    TE
                  </button>
                  <button
                    onClick={() => setCurrentLanguage('hi')}
                    className={`px-3 py-1 text-sm font-medium border-l transition-colors ${
                      currentLanguage === 'hi' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    HI
                  </button>
                  <button
                    onClick={() => setCurrentLanguage('en')}
                    className={`px-3 py-1 text-sm font-medium rounded-r-lg border-l transition-colors ${
                      currentLanguage === 'en' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    EN-IAST
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  {experimentalSegments.filter(s => s.textReferences[currentLanguage]).length} segments
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {experimentalMappings.length} mapped
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearExperimentalData}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-6"
                >
                  Clear Data
                </Button>
              </div>
            </div>

            <PanelGroup direction="horizontal" className="h-[calc(100vh-260px)]">
              {/* Left Panel: Content Area */}
              <Panel defaultSize={50} minSize={30}>
                <Experiment1_AnnotationLayer
                  content={chapter?.content || {}}
                  currentLanguage={currentLanguage}
                  segments={experimentalSegments}
                  selectedSegmentId={currentSegmentId}
                  onSegmentCreate={handleSegmentCreate}
                  onSegmentUpdate={handleSegmentUpdate}
                  onSegmentDelete={handleSegmentDelete}
                />
              </Panel>
              
              {/* Resize Handle */}
              <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-gray-400 transition-colors">
              </PanelResizeHandle>
              
              {/* Right Panel: Segment Management */}
              <Panel defaultSize={50} minSize={30}>
                <SegmentPanel
                  segments={experimentalSegments}
                  mappings={experimentalMappings}
                  currentLanguage={currentLanguage}
                  content={chapter?.content || {}}
                  currentSegmentId={currentSegmentId}
                  onSegmentSelect={setCurrentSegmentId}
                  onSegmentDelete={handleSegmentDelete}
                  onSegmentUpdate={handleSegmentUpdate}
                  onPlayMapping={handlePlayMapping}
                  onSegmentReorder={handleSegmentReorder}
                />
              </Panel>
            </PanelGroup>
          </TabsContent>

          <TabsContent value="mapping" className="flex-1 mt-6">
            {/* Audio Controls */}
            <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 border rounded-lg">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Language:</label>
                  <div className="flex border rounded-lg bg-white">
                    <button
                      onClick={() => setCurrentLanguage('te')}
                      className={`px-3 py-1 text-sm font-medium rounded-l-lg transition-colors ${
                        currentLanguage === 'te' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      TE
                    </button>
                    <button
                      onClick={() => setCurrentLanguage('hi')}
                      className={`px-3 py-1 text-sm font-medium border-l transition-colors ${
                        currentLanguage === 'hi' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      HI
                    </button>
                    <button
                      onClick={() => setCurrentLanguage('en')}
                      className={`px-3 py-1 text-sm font-medium rounded-r-lg border-l transition-colors ${
                        currentLanguage === 'en' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      EN-IAST
                    </button>
                  </div>
                </div>
                {audioFiles.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Audio File:</label>
                    <Select
                      value={selectedAudioFile?.id.toString() || ''}
                      onValueChange={(value) => {
                        const file = audioFiles.find(f => f.id.toString() === value);
                        setSelectedAudioFile(file || null);
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select audio file" />
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
                ) : (
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">No audio files uploaded</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <label htmlFor="audio-upload-mapping" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild disabled={uploadAudioMutation.isPending} className="h-8 w-8 p-0">
                      <span title={uploadAudioMutation.isPending ? 'Uploading...' : 'Upload Audio'}>
                        <Upload className="h-4 w-4" />
                      </span>
                    </Button>
                  </label>
                  <Input
                    id="audio-upload-mapping"
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {experimentalMappings.length} mapped
              </Badge>
            </div>

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
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <p className="text-center text-muted-foreground">
                    No audio file available. Upload an audio file to start mapping.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Experiment1_SegmentationStudio;

