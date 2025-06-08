import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, Plus, Upload, Music, FileText, Save, Eye, Trash2, Play, Pause, Waveform, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface ChapterData {
  id: number;
  title: string;
  status: "draft" | "published";
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  audioFiles?: Array<{
    id: number;
    filename: string;
    duration: number;
    url: string;
  }>;
  segments?: Array<{
    id: number;
    audioFileId: number;
    startTime: number;
    endTime: number;
    textStart: number;
    textEnd: number;
    language: string;
  }>;
}

interface AudioFile {
  id: number;
  filename: string;
  hashedFilename?: string;
  duration: number;
  chapterId: number;
}

interface TextSegment {
  id: number;
  chapterId: number;
  conceptualName: string;
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
  startTime?: number;
  endTime?: number;
  audioFileId?: number;
}

interface TextSelection {
  start: number;
  end: number;
  text: string;
}

export default function ChapterEditor() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract chapter ID from URL
  const chapterId = location.split('/').pop();
  
  // Audio player state
  const [selectedAudioFile, setSelectedAudioFile] = useState<AudioFile | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<HTMLInputElement>(null);
  
  // Segmentation state
  const [selectedLanguage, setSelectedLanguage] = useState<'te' | 'hi' | 'en'>('te');
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null);
  const [segmentName, setSegmentName] = useState('');
  const [showTextSegmentation, setShowTextSegmentation] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState({
    te: '',
    hi: '',
    en: ''
  });
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Fetch chapter data
  const { data: chapter, isLoading: chapterLoading } = useQuery({
    queryKey: ['/api/chapters', chapterId],
    enabled: !!chapterId
  });

  // Fetch audio files for this chapter
  const { data: audioFiles } = useQuery({
    queryKey: ['/api/audio-files', chapterId],
    enabled: !!chapterId
  });

  // Fetch text segments for this chapter
  const { data: segments } = useQuery({
    queryKey: ['/api/text-segments', chapterId],
    enabled: !!chapterId
  });

  // Fetch media segments for selected audio file
  const { data: mediaSegments } = useQuery({
    queryKey: ['/api/media-segments', selectedAudioFile?.id],
    enabled: !!selectedAudioFile?.id
  });

  const isPublished = chapter?.status === 'published';

  // Initialize form data when chapter loads
  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title || '');
      setContent(chapter.content || { te: '', hi: '', en: '' });
      setStatus(chapter.status || 'draft');
    }
  }, [chapter]);

  // Audio player setup
  useEffect(() => {
    if (selectedAudioFile) {
      const audio = new Audio(`/uploads/${selectedAudioFile.hashedFilename || selectedAudioFile.filename}`);
      audio.preload = 'metadata';
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setCurrentTime(0);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio load error:', e);
        toast({
          title: "Audio Load Error",
          description: "Failed to load audio file. Please check the file format.",
          variant: "destructive"
        });
      });
      
      setAudioPlayer(audio);
      
      return () => {
        audio.pause();
        audio.remove();
      };
    }
  }, [selectedAudioFile, toast]);

  // Save chapter mutation
  const saveChapterMutation = useMutation({
    mutationFn: async (chapterData: any) => {
      return apiRequest(`/api/chapters/${chapterId}`, {
        method: 'PATCH',
        body: JSON.stringify(chapterData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chapters', chapterId] });
      toast({
        title: "Chapter Saved",
        description: "Chapter has been saved successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save chapter.",
        variant: "destructive"
      });
    }
  });

  // Create text segment mutation
  const createTextSegmentMutation = useMutation({
    mutationFn: async (segmentData: any) => {
      return apiRequest('/api/text-segments', {
        method: 'POST',
        body: JSON.stringify(segmentData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/text-segments', chapterId] });
      setTextSelection(null);
      setSegmentName('');
      toast({
        title: "Text Segment Created",
        description: "Text segment has been created successfully."
      });
    }
  });

  // Delete segment mutation
  const deleteSegmentMutation = useMutation({
    mutationFn: async (segmentId: number) => {
      return apiRequest(`/api/text-segments/${segmentId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/text-segments', chapterId] });
      toast({
        title: "Segment Deleted",
        description: "Text segment has been deleted successfully."
      });
    }
  });

  // Upload audio file mutation
  const uploadAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('chapterId', chapterId!);
      
      return apiRequest('/api/audio-upload', {
        method: 'POST',
        body: formData,
        headers: {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audio-files', chapterId] });
      toast({
        title: "Audio Uploaded",
        description: "Audio file has been uploaded successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload audio file.",
        variant: "destructive"
      });
    }
  });

  const validateFileType = (file: File) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4'];
    return allowedTypes.includes(file.type) || file.name.toLowerCase().match(/\.(mp3|wav|m4a|mp4)$/);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFileType(file)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an audio file (MP3, WAV, M4A, MP4).",
        variant: "destructive"
      });
      return;
    }

    uploadAudioMutation.mutate(file);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a chapter title.",
        variant: "destructive"
      });
      return;
    }

    saveChapterMutation.mutate({
      title: title.trim(),
      content,
      status
    });
  };

  const handlePlayPause = () => {
    if (!audioPlayer) return;
    
    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      audioPlayer.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const textContent = content[selectedLanguage] || '';
      const start = range.startOffset;
      const end = range.endOffset;
      
      setTextSelection({
        start,
        end,
        text: selection.toString()
      });
    }
  };

  const handleCreateTextSegment = () => {
    if (!textSelection || !segmentName.trim()) return;
    
    createTextSegmentMutation.mutate({
      chapterId: parseInt(chapterId!),
      conceptualName: segmentName.trim(),
      textReferences: {
        [selectedLanguage]: {
          start: textSelection.start,
          end: textSelection.end
        }
      }
    });
  };

  const renderTextWithSegments = (text: string, language: string) => {
    if (!segments || segments.length === 0) return text;
    
    const relevantSegments = segments.filter((segment: any) => 
      segment.textReferences?.[language]
    ).sort((a: any, b: any) => 
      a.textReferences[language].start - b.textReferences[language].start
    );
    
    if (relevantSegments.length === 0) return text;
    
    let result = [];
    let lastIndex = 0;
    
    relevantSegments.forEach((segment: any, index: number) => {
      const ref = segment.textReferences[language];
      
      // Add text before segment
      if (ref.start > lastIndex) {
        result.push(text.slice(lastIndex, ref.start));
      }
      
      // Add highlighted segment
      result.push(
        <span 
          key={segment.id} 
          className="bg-yellow-200 cursor-pointer hover:bg-yellow-300 rounded px-1"
          title={segment.conceptualName}
        >
          {text.slice(ref.start, ref.end)}
        </span>
      );
      
      lastIndex = ref.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }
    
    return result;
  };

  if (chapterLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Chapter Not Found</h2>
          <p className="text-gray-600 mb-4">The requested chapter could not be found.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const textContent = content;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{chapter.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status === 'published' ? 'default' : 'secondary'}>
                {status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saveChapterMutation.isPending || isPublished}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveChapterMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentation & Mapping</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chapter Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter chapter title"
                  disabled={isPublished}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: 'draft' | 'published') => setStatus(value)} disabled={isPublished}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content (Multiple Languages)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="content-te">Telugu Content</Label>
                <Textarea
                  id="content-te"
                  value={content.te}
                  onChange={(e) => setContent(prev => ({ ...prev, te: e.target.value }))}
                  placeholder="Enter Telugu content"
                  className="min-h-[200px] font-telugu"
                  disabled={isPublished}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content-hi">Hindi Content</Label>
                <Textarea
                  id="content-hi"
                  value={content.hi}
                  onChange={(e) => setContent(prev => ({ ...prev, hi: e.target.value }))}
                  placeholder="Enter Hindi content"
                  className="min-h-[200px] font-hindi"
                  disabled={isPublished}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content-en">English Content</Label>
                <Textarea
                  id="content-en"
                  value={content.en}
                  onChange={(e) => setContent(prev => ({ ...prev, en: e.target.value }))}
                  placeholder="Enter English content"
                  className="min-h-[200px]"
                  disabled={isPublished}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audio Tab */}
        <TabsContent value="audio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Audio Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPublished && (
                <div className="space-y-2">
                  <Label htmlFor="audio-upload">Upload Audio File</Label>
                  <Input
                    id="audio-upload"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    disabled={uploadAudioMutation.isPending}
                  />
                  {uploadAudioMutation.isPending && (
                    <p className="text-sm text-gray-600">Uploading...</p>
                  )}
                </div>
              )}
              
              {audioFiles && audioFiles.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium">Uploaded Files</h4>
                  {audioFiles.map((file: AudioFile) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{file.filename}</div>
                        <div className="text-sm text-gray-500">
                          Duration: {formatTime(file.duration || 0)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAudioFile(file)}
                      >
                        <Music className="w-4 h-4 mr-2" />
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No audio files uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segmentation & Mapping Tab */}
        <TabsContent value="segmentation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Audio Controls */}
            <div className="space-y-4">
              {/* Audio File Selection */}
              {!selectedAudioFile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Select Audio File
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {audioFiles && audioFiles.length > 0 ? (
                      <div className="space-y-3">
                        {audioFiles.map((file: AudioFile) => (
                          <div 
                            key={file.id} 
                            className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              setSelectedAudioFile(file);
                              toast({
                                title: "Audio File Selected",
                                description: `Selected: ${file.filename}`,
                              });
                            }}
                          >
                            <div>
                              <div className="font-medium">{file.filename}</div>
                              <div className="text-sm text-gray-500">
                                Duration: {formatTime(file.duration || 0)}
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Select
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No audio files uploaded yet</p>
                        <p className="text-sm">Please upload audio files first in the Audio tab</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Audio Player */}
              {selectedAudioFile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Audio Player
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selected File Info */}
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="font-medium text-sm">{selectedAudioFile.filename}</div>
                      <div className="text-xs text-gray-500">
                        Duration: {formatTime(selectedAudioFile.duration || 0)}
                      </div>
                    </div>

                    {/* Audio Element */}
                    <audio
                      ref={audioRef}
                      src={`/uploads/${selectedAudioFile.hashedFilename || selectedAudioFile.filename}`}
                      onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                      onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                      onEnded={() => setIsPlaying(false)}
                      crossOrigin="anonymous"
                      preload="metadata"
                    />

                    {/* Play/Pause Button */}
                    <Button
                      onClick={handlePlayPause}
                      className="w-full"
                      size="lg"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>

                    {/* Time Display */}
                    <div className="text-center">
                      <span className="text-lg font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-2">
                      <input
                        ref={timelineRef}
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={(e) => {
                          const newTime = parseFloat(e.target.value);
                          if (audioRef.current) {
                            audioRef.current.currentTime = newTime;
                            setCurrentTime(newTime);
                          }
                        }}
                        className="w-full"
                      />
                    </div>

                    {/* Change Audio File Button */}
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAudioFile(null)}
                      className="w-full"
                    >
                      Change Audio File
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Text Segmentation */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Text Segmentation & Mapping
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Language Selection */}
                  <div className="space-y-2">
                    <Label>Select Language for Text Mapping</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isPublished}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="te">Telugu</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Text Content Display */}
                  {selectedLanguage && (
                    <div className="space-y-4">
                      <h5 className="font-medium">
                        {selectedLanguage === 'te' ? 'Telugu Text' : 
                         selectedLanguage === 'hi' ? 'Hindi Text' : 'English Text'}
                      </h5>
                      <div 
                        className="text-content bg-white p-3 border rounded cursor-text min-h-[200px] whitespace-pre-wrap"
                        onMouseUp={handleTextSelection}
                      >
                        {textContent?.[selectedLanguage] ? 
                          renderTextWithSegments(textContent[selectedLanguage], selectedLanguage) : 
                          `No ${selectedLanguage} content available`
                        }
                      </div>
                      
                      {/* Text Selection Info */}
                      {textSelection && (
                        <div className="p-3 bg-blue-50 rounded border">
                          <p className="text-sm text-blue-700">
                            Selected: "{textSelection.text}" (positions {textSelection.start}-{textSelection.end})
                          </p>
                        </div>
                      )}
                      
                      {/* Create Text Segment */}
                      <div className="space-y-2">
                        <Label>Segment Name</Label>
                        <Input
                          placeholder="Enter segment name..."
                          value={segmentName}
                          onChange={(e) => setSegmentName(e.target.value)}
                          disabled={isPublished}
                        />
                      </div>
                      
                      <Button
                        onClick={handleCreateTextSegment}
                        disabled={createTextSegmentMutation.isPending || !segmentName.trim() || !textSelection || isPublished}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {createTextSegmentMutation.isPending ? 'Creating...' : 'Create Text Segment'}
                      </Button>

                      {/* Existing Text Segments */}
                      {segments && segments.length > 0 && (
                        <div className="space-y-2">
                          <h6 className="font-medium">Existing Text Segments</h6>
                          {segments.map((segment: any) => {
                            const textRef = segment.textReferences?.[selectedLanguage];
                            if (!textRef) return null;
                            
                            return (
                              <div key={segment.id} className="flex items-center justify-between p-2 border rounded bg-white">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{segment.conceptualName}</div>
                                  <div className="text-xs text-gray-500">
                                    Positions: {textRef.start}-{textRef.end} | 
                                    Audio: {segment.startTime ? formatTime(segment.startTime) : 'Not mapped'} - {segment.endTime ? formatTime(segment.endTime) : 'Not mapped'}
                                  </div>
                                </div>
                                {!isPublished && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteSegmentMutation.mutate(segment.id)}
                                    disabled={deleteSegmentMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <div className="text-center py-12 text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Chapter Preview</h3>
            <p>Preview functionality coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}