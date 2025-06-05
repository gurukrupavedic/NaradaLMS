import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  Play, 
  Pause, 
  Eye, 
  FileText, 
  Music, 
  Link, 
  CheckCircle,
  Globe,
  Plus,
  Trash2,
  Clock,
  Edit
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
  const [, params] = useRoute("/chapter-editor/:chapterId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const chapterId = parseInt(params?.chapterId || "0");
  
  // State for text content
  const [textContent, setTextContent] = useState({
    te: "",
    hi: "",
    en: ""
  });
  
  // State for audio and segmentation
  const [selectedAudioFile, setSelectedAudioFile] = useState<number | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [segmentStart, setSegmentStart] = useState("");
  const [segmentEnd, setSegmentEnd] = useState("");
  const [segmentTextStart, setSegmentTextStart] = useState("");
  const [segmentTextEnd, setSegmentTextEnd] = useState("");
  const [segmentLanguage, setSegmentLanguage] = useState("te");
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editingFileName, setEditingFileName] = useState("");
  const [previewLanguage, setPreviewLanguage] = useState("te");
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number } | null>(null);

  // Fetch chapter details
  const { data: chapter = {}, isLoading: chapterLoading } = useQuery({
    queryKey: [`/api/admin/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  // Fetch audio files
  const { data: audioFiles = [] } = useQuery({
    queryKey: [`/api/admin/audio-files/${chapterId}`],
    enabled: !!chapterId,
  });

  // Fetch segments
  const { data: segments = [] } = useQuery({
    queryKey: [`/api/admin/segments/${chapterId}`],
    enabled: !!chapterId,
  });

  // Update text content when chapter data loads
  useEffect(() => {
    if (chapter?.content) {
      setTextContent({
        te: chapter.content.te || "",
        hi: chapter.content.hi || "",
        en: chapter.content.en || ""
      });
    }
  }, [chapter]);

  // Auto-select first audio file if available
  useEffect(() => {
    if (audioFiles.length > 0 && !selectedAudioFile) {
      setSelectedAudioFile(audioFiles[0].id);
    }
  }, [audioFiles, selectedAudioFile]);

  // Save text content mutation
  const saveContentMutation = useMutation({
    mutationFn: async (content: any) => {
      await apiRequest("PATCH", `/api/admin/chapters/${chapterId}`, {
        content
      });
    },
    onSuccess: () => {
      toast({ title: "Text content saved successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${chapterId}/details`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save text content", description: error.message, variant: "destructive" });
    },
  });

  // Upload audio file mutation
  const uploadAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('chapterId', chapterId.toString());
      
      const response = await fetch('/api/admin/audio-files', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload audio file');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Media file uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to upload media file", description: error.message, variant: "destructive" });
    },
  });

  // Update audio file mutation
  const updateAudioMutation = useMutation({
    mutationFn: async ({ id, filename }: { id: number; filename: string }) => {
      return await apiRequest("PATCH", `/api/admin/audio-files/${id}`, { filename });
    },
    onSuccess: () => {
      toast({ title: "File name updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
      setEditingFileId(null);
      setEditingFileName("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to update file name", description: error.message, variant: "destructive" });
    },
  });

  // Delete audio file mutation
  const deleteAudioMutation = useMutation({
    mutationFn: async (audioFileId: number) => {
      await apiRequest("DELETE", `/api/admin/audio-files/${audioFileId}`);
    },
    onSuccess: () => {
      toast({ title: "Media file deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
      // Clear selected audio file if it was deleted
      setSelectedAudioFile(null);
      setAudioPlayer(null);
      setIsPlaying(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete media file", description: error.message, variant: "destructive" });
    },
  });

  // Create segment mutation
  const createSegmentMutation = useMutation({
    mutationFn: async (segmentData: any) => {
      await apiRequest("POST", "/api/admin/segments", segmentData);
    },
    onSuccess: () => {
      toast({ title: "Segment created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/segments/${chapterId}`] });
      // Clear form
      setSegmentStart("");
      setSegmentEnd("");
      setSegmentTextStart("");
      setSegmentTextEnd("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to create segment", description: error.message, variant: "destructive" });
    },
  });

  // Publish/unpublish mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const newStatus = chapter?.status === "published" ? "draft" : "published";
      await apiRequest("PATCH", `/api/admin/chapters/${chapterId}`, {
        status: newStatus
      });
    },
    onSuccess: () => {
      toast({ title: "Chapter status updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${chapterId}/details`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update chapter status", description: error.message, variant: "destructive" });
    },
  });

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!validateFileType(file)) {
        toast({ 
          title: "Invalid file type", 
          description: "Please upload audio or video files only", 
          variant: "destructive" 
        });
        // Reset the input
        event.target.value = '';
        return;
      }
      uploadAudioMutation.mutate(file);
    }
  };

  const handleDeleteAudioFile = (audioFileId: number) => {
    if (confirm("Are you sure you want to delete this media file?")) {
      deleteAudioMutation.mutate(audioFileId);
    }
  };

  const validateFileType = (file: File) => {
    const allowedTypes = [
      // Audio types
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac',
      // Video types
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];
    
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'mp4', 'mpeg', 'mov', 'avi', 'webm'];
    
    return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension || '');
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(validateFileType);
    
    if (validFiles.length === 0) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload audio or video files only", 
        variant: "destructive" 
      });
      return;
    }
    
    if (validFiles.length > 1) {
      toast({ 
        title: "Multiple files not supported", 
        description: "Please upload one file at a time", 
        variant: "destructive" 
      });
      return;
    }
    
    uploadAudioMutation.mutate(validFiles[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const startEditing = (fileId: number, currentName: string) => {
    setEditingFileId(fileId);
    setEditingFileName(currentName);
  };

  const cancelEditing = () => {
    setEditingFileId(null);
    setEditingFileName("");
  };

  const saveFileName = () => {
    if (editingFileId && editingFileName.trim()) {
      updateAudioMutation.mutate({ id: editingFileId, filename: editingFileName.trim() });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveFileName();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handlePlayPause = async () => {
    if (audioPlayer) {
      try {
        if (isPlaying) {
          audioPlayer.pause();
          setIsPlaying(false);
        } else {
          // Check if audio is ready to play
          if (audioPlayer.readyState >= 2) { // HAVE_CURRENT_DATA
            await audioPlayer.play();
            setIsPlaying(true);
          } else {
            toast({
              title: "Audio Loading",
              description: "Please wait for the audio to load completely.",
              variant: "default",
            });
            // Wait for the audio to load
            audioPlayer.addEventListener('canplay', async () => {
              try {
                await audioPlayer.play();
                setIsPlaying(true);
              } catch (error) {
                console.error("Audio play error:", error);
                toast({
                  title: "Playback Error",
                  description: "Failed to play audio. Please check the file format.",
                  variant: "destructive",
                });
              }
            }, { once: true });
          }
        }
      } catch (error) {
        console.error("Audio play error:", error);
        setIsPlaying(false);
        toast({
          title: "Playback Error",
          description: "Failed to play audio. The file may be corrupted or in an unsupported format.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUseCurrentTime = () => {
    setSegmentStart(currentTime.toString());
  };

  const handleCreateAudioSegment = () => {
    if (!selectedAudioFile || !segmentStart || !segmentEnd) {
      toast({ title: "Please fill in start and end times", variant: "destructive" });
      return;
    }

    const segmentName = `Segment ${Math.floor(parseFloat(segmentStart))}s-${Math.floor(parseFloat(segmentEnd))}s`;
    
    createSegmentMutation.mutate({
      chapterId,
      conceptualName: segmentName,
      textReferences: {}
    });
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      
      // Calculate character positions within the text content
      const textContent = chapter?.content?.[previewLanguage as keyof typeof chapter.content] || '';
      const start = textContent.indexOf(text);
      const end = start + text.length;
      
      if (start !== -1) {
        setSelectedText({ text, start, end });
      }
    }
  };

  const handlePlaySegment = (segment: any) => {
    if (audioPlayer) {
      audioPlayer.currentTime = segment.startTime;
      audioPlayer.play();
      setIsPlaying(true);
      
      // Stop at end time
      const checkTime = () => {
        if (audioPlayer.currentTime >= segment.endTime) {
          audioPlayer.pause();
          setIsPlaying(false);
        } else {
          requestAnimationFrame(checkTime);
        }
      };
      requestAnimationFrame(checkTime);
    }
  };

  const mapSegmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/admin/segments/${selectedSegment.id}/map`, data);
    },
    onSuccess: () => {
      toast({ title: "Segment mapped to text successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/segments/${chapterId}`] });
      setSelectedText(null);
      setSelectedSegment(null);
    },
    onError: () => {
      toast({ title: "Failed to map segment", variant: "destructive" });
    },
  });

  const handleMapSegment = () => {
    if (!selectedSegment || !selectedText) return;
    
    mapSegmentMutation.mutate({
      textStart: selectedText.start,
      textEnd: selectedText.end,
      language: previewLanguage,
    });
  };

  const handleSaveTextContent = () => {
    saveContentMutation.mutate(textContent);
  };

  if (chapterLoading) {
    return <div className="p-6">Loading chapter...</div>;
  }

  if (!chapter?.id) {
    return <div className="p-6">Chapter not found</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/content-management")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Chapters
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{chapter?.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={chapter?.status === "published" ? "default" : "secondary"}>
              {chapter?.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => toggleStatusMutation.mutate()}
            variant={chapter?.status === "published" ? "outline" : "default"}
            disabled={toggleStatusMutation.isPending}
          >
            {chapter?.status === "published" ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {/* 4-Phase Workflow Tabs */}
      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Text Content
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Media Content
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Segmentation & Mapping
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Text Content Phase */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Multilingual Text Content
                </CardTitle>
                <Button onClick={handleSaveTextContent} disabled={saveContentMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Content
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Telugu Content */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Telugu Content
                </Label>
                <Textarea
                  placeholder="Enter Telugu content..."
                  value={textContent.te}
                  onChange={(e) => setTextContent(prev => ({ ...prev, te: e.target.value }))}
                  className="min-h-32 font-mono"
                />
              </div>

              {/* Hindi Content */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Hindi Content
                </Label>
                <Textarea
                  placeholder="Enter Hindi content..."
                  value={textContent.hi}
                  onChange={(e) => setTextContent(prev => ({ ...prev, hi: e.target.value }))}
                  className="min-h-32 font-mono"
                />
              </div>

              {/* English/IAST Content */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  English/IAST Content
                </Label>
                <Textarea
                  placeholder="Enter English/IAST content..."
                  value={textContent.en}
                  onChange={(e) => setTextContent(prev => ({ ...prev, en: e.target.value }))}
                  className="min-h-32 font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Content Phase */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="h-12 w-12 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium">Drop your media files here</h4>
                    <p className="text-sm text-muted-foreground">
                      Or click to browse and select files
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, AVI, WebM
                    </p>
                  </div>
                  <div>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAudioMutation.isPending}
                    >
                      Select Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </div>
                  {uploadAudioMutation.isPending && (
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Uploading and processing file...
                    </p>
                  )}
                </div>
              </div>

              {audioFiles.length > 0 && (
                <div className="grid gap-4">
                  {audioFiles.map((file: any) => (
                    <Card key={file.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {editingFileId === file.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editingFileName}
                                onChange={(e) => setEditingFileName(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="font-medium"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={saveFileName}
                                  disabled={updateAudioMutation.isPending || !editingFileName.trim()}
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={cancelEditing}
                                  disabled={updateAudioMutation.isPending}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{file.filename}</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(file.id, file.filename)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Duration: {Math.round(file.duration || 0)}s
                              </p>
                            </div>
                          )}
                        </div>
                        {editingFileId !== file.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAudioFile(file.id)}
                            disabled={deleteAudioMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {audioFiles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No media files uploaded yet. Upload media files to proceed with segmentation.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segmentation & Mapping Phase */}
        <TabsContent value="mapping" className="space-y-6">
          {audioFiles.length > 0 ? (
            <>
              {/* Audio Segment Creation */}
              <Card>
                <CardHeader>
                  <CardTitle>Audio Segment Creation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Audio File Selection */}
                  <div className="space-y-2">
                    <Label>Select Audio File</Label>
                    <Select value={selectedAudioFile?.toString() || ""} onValueChange={(value) => setSelectedAudioFile(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose audio file for segmentation" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioFiles.map((file: any) => (
                          <SelectItem key={file.id} value={file.id.toString()}>
                            {file.originalName || file.filename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAudioFile && audioFiles.find((f: any) => f.id === selectedAudioFile) && (
                    <>
                      {/* Audio Player */}
                      <div className="space-y-4">
                        <audio
                          ref={(audio) => setAudioPlayer(audio)}
                          src={`/uploads/${audioFiles.find((f: any) => f.id === selectedAudioFile)?.filename}`}
                          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
                          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
                          onError={(e) => {
                            console.error("Audio loading error:", e);
                            toast({
                              title: "Audio Error",
                              description: "Failed to load audio file. Please check the file format.",
                              variant: "destructive",
                            });
                          }}
                          preload="metadata"
                          className="hidden"
                        />
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-4">
                            <Button onClick={handlePlayPause} variant="outline" size="lg">
                              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </Button>
                            <div className="flex flex-col">
                              <span className="text-lg font-mono font-bold">
                                {currentTime.toFixed(2)}s
                              </span>
                              <span className="text-sm text-muted-foreground">
                                / {duration.toFixed(2)}s
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {audioFiles.find((f: any) => f.id === selectedAudioFile)?.originalName || audioFiles.find((f: any) => f.id === selectedAudioFile)?.filename}
                            </div>
                          </div>
                          
                          {/* Audio Progress Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0:00</span>
                              <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
                            </div>
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
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 
                                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                                         [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full 
                                         [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                              />
                              <div 
                                className="absolute top-0 left-0 h-2 bg-blue-500 rounded-lg pointer-events-none"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Audio Segment Timing */}
                      <div className="space-y-4 border-t pt-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          Audio Segment Timing
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <div className="flex gap-2">
                              <Input
                                value={segmentStart}
                                onChange={(e) => setSegmentStart(e.target.value)}
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleUseCurrentTime}
                                title="Use current playback time"
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>End Time</Label>
                            <div className="flex gap-2">
                              <Input
                                value={segmentEnd}
                                onChange={(e) => setSegmentEnd(e.target.value)}
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSegmentEnd(currentTime.toFixed(2))}
                                title="Use current playback time"
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleCreateAudioSegment}
                          disabled={createSegmentMutation.isPending}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Audio Segment
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Audio Segments & Text Mapping */}
              <Card>
                <CardHeader>
                  <CardTitle>Segment to Text Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Panel - Audio Segments */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Audio Segments</h4>
                        <Badge variant="secondary">{segments.length} segments</Badge>
                      </div>
                      
                      {segments.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {segments.map((segment: any) => (
                            <div 
                              key={segment.id} 
                              className={`p-3 border rounded cursor-pointer transition-colors ${
                                selectedSegment?.id === segment.id 
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                              onClick={() => setSelectedSegment(segment)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-mono">
                                  {segment.startTime.toFixed(2)}s - {segment.endTime.toFixed(2)}s
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaySegment(segment);
                                  }}
                                >
                                  <Play className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No audio segments created yet. Create segments above to begin mapping.
                        </p>
                      )}
                    </div>

                    {/* Right Panel - Text Content */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Text Content</h4>
                        <Select value={previewLanguage} onValueChange={setPreviewLanguage}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="te">Telugu</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="en">English/IAST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                        <div 
                          className="text-sm leading-relaxed select-text cursor-text"
                          onMouseUp={handleTextSelection}
                          style={{ userSelect: 'text' }}
                        >
                          {chapter?.content?.[previewLanguage as keyof typeof chapter.content] || 
                           'No content available for this language'}
                        </div>
                      </div>
                      
                      {selectedText && selectedSegment && (
                        <div className="space-y-2 p-3 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Selected text:</strong> "{selectedText.text}"
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300">
                            Characters {selectedText.start} - {selectedText.end}
                          </p>
                          <Button
                            onClick={handleMapSegment}
                            disabled={mapSegmentMutation.isPending}
                            className="w-full"
                            size="sm"
                          >
                            <Link className="w-4 h-4 mr-2" />
                            Map Segment to Text
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Media Files Available</h3>
                <p className="text-muted-foreground">
                  Go to Media Content tab to upload media files for segmentation.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preview Phase */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Chapter Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(textContent).map(([lang, content]) => {
                  if (!content) return null;
                  
                  const langName = lang === "te" ? "Telugu" : lang === "hi" ? "Hindi" : "English/IAST";
                  const langSegments = segments.filter((s: any) => s.language === lang);
                  
                  return (
                    <div key={lang} className="space-y-2">
                      <h3 className="text-lg font-semibold">{langName}</h3>
                      <div className="prose max-w-none">
                        {langSegments.length > 0 ? (
                          <div className="whitespace-pre-wrap">
                            {(() => {
                              let lastIndex = 0;
                              const elements: React.ReactNode[] = [];
                              
                              langSegments
                                .sort((a: any, b: any) => a.textStart - b.textStart)
                                .forEach((segment: any, index: number) => {
                                  if (segment.textStart > lastIndex) {
                                    elements.push(
                                      <span key={`text-${index}`}>
                                        {content.slice(lastIndex, segment.textStart)}
                                      </span>
                                    );
                                  }
                                  
                                  elements.push(
                                    <span
                                      key={`segment-${segment.id}`}
                                      className="bg-blue-100 hover:bg-blue-200 cursor-pointer px-1 rounded"
                                      onClick={() => {
                                        if (audioPlayer && selectedAudioFile) {
                                          audioPlayer.currentTime = segment.startTime;
                                          audioPlayer.play();
                                          setIsPlaying(true);
                                        }
                                      }}
                                    >
                                      {content.slice(segment.textStart, segment.textEnd)}
                                    </span>
                                  );
                                  
                                  lastIndex = segment.textEnd;
                                });
                              
                              if (lastIndex < content.length) {
                                elements.push(
                                  <span key="remaining">
                                    {content.slice(lastIndex)}
                                  </span>
                                );
                              }
                              
                              return elements;
                            })()}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{content}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {Object.values(textContent).every(content => !content) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No content available. Add text content in the Text Content tab.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}