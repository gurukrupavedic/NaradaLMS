import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Upload, Music, Eye, ChevronLeft, Play, Pause, Square, 
  MapPin, X, Trash2, Plus, ArrowRight, Save, Edit2
} from "lucide-react";

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

export default function ChapterEditor() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement>(null);

  // State management
  const [textContent, setTextContent] = useState({
    te: "",
    hi: "",
    en: ""
  });
  
  // Audio and segmentation state
  const [selectedAudioFile, setSelectedAudioFile] = useState<number | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeMarks, setTimeMarks] = useState<number[]>([]);
  const [selectedMark, setSelectedMark] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editingFileName, setEditingFileName] = useState("");

  // Fetch chapter details
  const { data: chapter, isLoading: chapterLoading } = useQuery({
    queryKey: [`/api/admin/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  // Fetch audio files
  const { data: audioFiles } = useQuery({
    queryKey: [`/api/admin/audio-files/${chapterId}`],
    enabled: !!chapterId,
  });

  // Fetch segments
  const { data: segments } = useQuery({
    queryKey: [`/api/admin/segments/${chapterId}`],
    enabled: !!chapterId,
  });

  const isPublished = chapter?.status === "published";

  // Initialize text content when chapter loads
  useEffect(() => {
    if (chapter?.content) {
      setTextContent({
        te: chapter.content.te || "",
        hi: chapter.content.hi || "",
        en: chapter.content.en || ""
      });
    }
  }, [chapter]);

  // Audio file upload mutation
  const audioUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chapterId", chapterId!);
      await apiRequest("POST", "/api/admin/audio-files", formData);
    },
    onSuccess: () => {
      toast({ title: "Audio file uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to upload audio file", description: error.message, variant: "destructive" });
    },
  });

  // Content update mutation
  const updateContentMutation = useMutation({
    mutationFn: async (content: any) => {
      await apiRequest("PATCH", `/api/admin/chapters/${chapterId}`, { content });
    },
    onSuccess: () => {
      toast({ title: "Content updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${chapterId}/details`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update content", description: error.message, variant: "destructive" });
    },
  });

  // Create audio segments from marks mutation
  const createAudioSegmentsMutation = useMutation({
    mutationFn: async (segments: any[]) => {
      const promises = segments.map(segment => 
        apiRequest("POST", "/api/admin/segments", segment)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({ title: "Audio segments created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/segments/${chapterId}`] });
      setTimeMarks([]);
      setSelectedMark(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create audio segments", description: error.message, variant: "destructive" });
    },
  });

  // Delete audio file mutation
  const deleteAudioMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/admin/audio-files/${fileId}`);
      return fileId;
    },
    onSuccess: (deletedFileId) => {
      toast({ title: "Audio file deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
      if (selectedAudioFile === deletedFileId) {
        setSelectedAudioFile(null);
        setAudioPlayer(null);
        setIsPlaying(false);
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete audio file", description: error.message, variant: "destructive" });
    },
  });

  // Update filename mutation
  const updateFileNameMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: number; newName: string }) => {
      await apiRequest("PATCH", `/api/admin/audio-files/${fileId}`, { originalName: newName });
    },
    onSuccess: () => {
      toast({ title: "Filename updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
      setEditingFileId(null);
      setEditingFileName("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to update filename", description: error.message, variant: "destructive" });
    },
  });

  // Audio control functions
  const handlePlayPause = async () => {
    if (!audioPlayer) return;
    
    try {
      if (isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        await audioPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Audio play error:", error);
      setIsPlaying(false);
      toast({
        title: "Playback Error",
        description: "Failed to play audio. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleStop = () => {
    if (!audioPlayer) return;
    
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleMarkTime = () => {
    if (!audioPlayer) return;
    
    const markTime = audioPlayer.currentTime;
    setTimeMarks(prev => [...prev, markTime].sort((a, b) => a - b));
    toast({ title: `Time mark added at ${formatTime(markTime)}` });
  };

  const handleClearMark = () => {
    if (selectedMark === null) return;
    
    setTimeMarks(prev => prev.filter(mark => mark !== selectedMark));
    setSelectedMark(null);
    toast({ title: "Time mark cleared" });
  };

  const handleClearAllMarks = () => {
    setTimeMarks([]);
    setSelectedMark(null);
    toast({ title: "All time marks cleared" });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const handleCreateAudioSegments = () => {
    if (!selectedAudioFile || timeMarks.length === 0) {
      toast({ title: "Please mark time points on the audio track", variant: "destructive" });
      return;
    }

    // Create segments based on marks
    const segments = [];
    const marks = [0, ...timeMarks, duration].sort((a, b) => a - b);
    
    for (let i = 0; i < marks.length - 1; i++) {
      const startTime = marks[i];
      const endTime = marks[i + 1];
      const segmentName = `Segment ${i + 1} (${formatTime(startTime)} - ${formatTime(endTime)})`;
      
      segments.push({
        chapterId: parseInt(chapterId!),
        conceptualName: segmentName,
        textReferences: {}
      });
    }

    createAudioSegmentsMutation.mutate(segments);
  };

  // Audio file selection and setup
  const handleAudioFileSelect = (fileId: number) => {
    setSelectedAudioFile(fileId);
    setTimeMarks([]);
    setSelectedMark(null);
    setCurrentTime(0);
    setIsPlaying(false);
    
    const file = (audioFiles as any)?.find((f: any) => f.id === fileId);
    if (file && audioRef.current) {
      audioRef.current.src = file.url;
      audioRef.current.load();
      setAudioPlayer(audioRef.current);
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const validateFileType = (file: File) => {
    const allowedTypes = ['audio/', 'video/'];
    if (!allowedTypes.some(type => file.type.startsWith(type))) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload audio or video files only", 
        variant: "destructive" 
      });
      return false;
    }
    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && validateFileType(file)) {
      audioUploadMutation.mutate(file);
    }
  };

  const startEditing = (fileId: number, currentName: string) => {
    setEditingFileId(fileId);
    setEditingFileName(currentName);
  };

  const cancelEditing = () => {
    setEditingFileId(null);
    setEditingFileName("");
  };

  const handleSaveFileName = (fileId: number) => {
    if (editingFileName.trim()) {
      updateFileNameMutation.mutate({ fileId, newName: editingFileName.trim() });
    }
  };

  const handleContentSave = (language: string) => {
    updateContentMutation.mutate({
      ...chapter?.content,
      [language]: textContent[language as keyof typeof textContent]
    });
  };

  if (chapterLoading) {
    return <div className="p-6">Loading chapter...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <audio ref={audioRef} preload="metadata" />
      
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Chapters
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{chapter?.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Status: <span className={`capitalize ${chapter?.status === 'published' ? 'text-green-600' : 'text-orange-600'}`}>
                    {chapter?.status}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Text Content
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Media Content
            </TabsTrigger>
            <TabsTrigger value="segmentation" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Segmentation & Mapping
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Text Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {['te', 'hi', 'en'].map((lang) => (
              <Card key={lang}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {lang === 'te' ? 'Telugu' : lang === 'hi' ? 'Hindi' : 'English/IAST'}
                    <Button
                      onClick={() => handleContentSave(lang)}
                      disabled={updateContentMutation.isPending || isPublished}
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={textContent[lang as keyof typeof textContent]}
                    onChange={(e) => setTextContent(prev => ({ ...prev, [lang]: e.target.value }))}
                    disabled={isPublished}
                    placeholder={`Enter ${lang === 'te' ? 'Telugu' : lang === 'hi' ? 'Hindi' : 'English/IAST'} content...`}
                    className="min-h-[200px]"
                  />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Media Content Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audio Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!isPublished && (
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          const file = files[0];
                          if (validateFileType(file)) {
                            audioUploadMutation.mutate(file);
                          }
                        }
                      }}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Upload Audio Files</p>
                        <p className="text-xs text-muted-foreground">
                          Drag and drop files here, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports: MP3, WAV, M4A, MP4, and other audio/video formats
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="audio/*,video/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={audioUploadMutation.isPending}
                      />
                    </div>
                  )}

                  {audioFiles && (audioFiles as any).length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Uploaded Files ({(audioFiles as any).length})
                      </h4>
                      
                      {(audioFiles as any).map((file: any) => (
                        <div key={file.id} className="group border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {editingFileId === file.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingFileName}
                                    onChange={(e) => setEditingFileName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveFileName(file.id);
                                      } else if (e.key === 'Escape') {
                                        cancelEditing();
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleSaveFileName(file.id)}
                                      disabled={updateFileNameMutation.isPending}
                                    >
                                      <Save className="w-3 h-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={cancelEditing}
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Music className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <p className="font-medium text-sm truncate">
                                      {file.originalName || file.filename}
                                    </p>
                                  </div>
                                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>Duration: {file.duration ? `${file.duration.toFixed(2)}s` : 'Unknown'}</span>
                                    <span>Size: {file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Unknown'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {!isPublished && editingFileId !== file.id && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(file.id, file.originalName || file.filename)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteAudioMutation.mutate(file.id)}
                                  disabled={deleteAudioMutation.isPending}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">No Audio Files</h3>
                        <p className="text-muted-foreground">
                          Upload audio files to start creating segments for this chapter.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segmentation & Mapping Tab */}
          <TabsContent value="segmentation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Audio Player and Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Audio Segmentation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Audio File Selection */}
                  <div className="space-y-2">
                    <Label>Select Audio File</Label>
                    <Select 
                      value={selectedAudioFile?.toString() || ""} 
                      onValueChange={(value) => handleAudioFileSelect(parseInt(value))}
                      disabled={isPublished}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an audio file..." />
                      </SelectTrigger>
                      <SelectContent>
                        {audioFiles && (audioFiles as any).map((file: any) => (
                          <SelectItem key={file.id} value={file.id.toString()}>
                            {file.originalName || file.filename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAudioFile && (
                    <>
                      {/* Audio Player Display */}
                      <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-lg font-mono font-bold">
                              {formatTime(currentTime)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              / {formatTime(duration)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Audio Progress Bar */}
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type="range"
                              min="0"
                              max={duration || 0}
                              value={currentTime}
                              onChange={(e) => {
                                const newTime = parseFloat(e.target.value);
                                if (audioPlayer) {
                                  audioPlayer.currentTime = newTime;
                                  setCurrentTime(newTime);
                                }
                              }}
                              disabled={isPublished}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            {/* Time marks on progress bar */}
                            {timeMarks.map((mark, index) => (
                              <div
                                key={index}
                                className="absolute top-0 w-1 h-2 bg-red-500 rounded cursor-pointer"
                                style={{ left: `${duration > 0 ? (mark / duration) * 100 : 0}%` }}
                                onClick={() => setSelectedMark(mark)}
                                title={`Mark ${index + 1}: ${formatTime(mark)}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Audio Controls */}
                      <div className="space-y-4 border-t pt-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          Audio Controls
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={handlePlayPause}
                            disabled={isPublished}
                            variant="outline"
                            size="sm"
                          >
                            {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            {isPlaying ? "Pause" : "Play"}
                          </Button>
                          
                          <Button
                            onClick={handleStop}
                            disabled={isPublished}
                            variant="outline"
                            size="sm"
                          >
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                          </Button>
                          
                          <Button
                            onClick={handleMarkTime}
                            disabled={isPublished}
                            variant="outline"
                            size="sm"
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Mark Time
                          </Button>
                          
                          <Button
                            onClick={handleClearMark}
                            disabled={isPublished || selectedMark === null}
                            variant="outline"
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Clear Mark
                          </Button>
                        </div>
                        
                        <Button
                          onClick={handleClearAllMarks}
                          disabled={isPublished || timeMarks.length === 0}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear All Marks
                        </Button>
                        
                        {/* Time Marks Display */}
                        {timeMarks.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs">Time Marks ({timeMarks.length})</Label>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {timeMarks.map((mark, index) => (
                                <div 
                                  key={index}
                                  className={`text-xs p-2 rounded cursor-pointer flex justify-between items-center ${
                                    selectedMark === mark ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'
                                  }`}
                                  onClick={() => setSelectedMark(mark)}
                                >
                                  <span>Mark {index + 1}: {formatTime(mark)}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (audioPlayer) {
                                        audioPlayer.currentTime = mark;
                                      }
                                    }}
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <Button 
                          onClick={handleCreateAudioSegments}
                          disabled={createAudioSegmentsMutation.isPending || isPublished || timeMarks.length === 0}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Audio Segments ({timeMarks.length > 0 ? timeMarks.length + 1 : 0})
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Audio Segments */}
              <Card>
                <CardHeader>
                  <CardTitle>Audio Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  {segments && (segments as any).length > 0 ? (
                    <div className="space-y-2">
                      {(segments as any).map((segment: any) => (
                        <div key={segment.id} className="p-3 border rounded">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{segment.conceptualName}</span>
                              {segment.startTime !== undefined && segment.endTime !== undefined && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (audioPlayer) {
                                      audioPlayer.currentTime = segment.startTime;
                                      audioPlayer.play();
                                      setIsPlaying(true);
                                    }
                                  }}
                                >
                                  <Play className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            {segment.startTime !== undefined && segment.endTime !== undefined && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No audio segments created yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chapter Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(textContent).map(([lang, content]) => {
                    if (!content) return null;
                    
                    const langName = lang === "te" ? "Telugu" : lang === "hi" ? "Hindi" : "English/IAST";
                    
                    return (
                      <div key={lang} className="space-y-2">
                        <h3 className="text-lg font-semibold">{langName}</h3>
                        <div className="prose max-w-none">
                          <div className="whitespace-pre-wrap">{content}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}