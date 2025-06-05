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
  Clock
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
      uploadAudioMutation.mutate(file);
    }
  };

  const handleDeleteAudioFile = (audioFileId: number) => {
    if (confirm("Are you sure you want to delete this media file?")) {
      deleteAudioMutation.mutate(audioFileId);
    }
  };

  const handlePlayPause = () => {
    if (audioPlayer) {
      if (isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        audioPlayer.play();
        setIsPlaying(true);
      }
    }
  };

  const handleUseCurrentTime = () => {
    setSegmentStart(currentTime.toString());
  };

  const handleCreateSegment = () => {
    if (!selectedAudioFile || !segmentStart || !segmentEnd || !segmentTextStart || !segmentTextEnd) {
      toast({ title: "Please fill all segment fields", variant: "destructive" });
      return;
    }

    createSegmentMutation.mutate({
      chapterId,
      audioFileId: selectedAudioFile,
      startTime: parseFloat(segmentStart),
      endTime: parseFloat(segmentEnd),
      textStart: parseInt(segmentTextStart),
      textEnd: parseInt(segmentTextEnd),
      language: segmentLanguage
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/content-management")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chapters
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{chapter?.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={chapter?.status === "published" ? "default" : "secondary"}>
                {chapter?.status === "published" ? "Published" : "Draft"}
              </Badge>
            </div>
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
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAudioMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Media
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </div>

              {audioFiles.length > 0 && (
                <div className="grid gap-4">
                  {audioFiles.map((file: any) => (
                    <Card key={file.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{file.filename}</h4>
                          <p className="text-sm text-muted-foreground">
                            Duration: {Math.round(file.duration || 0)}s
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAudioFile(file.id)}
                          disabled={deleteAudioMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
              {/* Audio File Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Audio File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Choose audio file for segmentation</Label>
                    <Select value={selectedAudioFile?.toString() || ""} onValueChange={(value) => setSelectedAudioFile(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an audio file" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioFiles.map((file: any) => (
                          <SelectItem key={file.id} value={file.id.toString()}>
                            {file.filename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {selectedAudioFile && audioFiles.find((f: any) => f.id === selectedAudioFile) && (
                <>
                  {/* Audio Player Controls */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Audio Player & Segmentation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <audio
                        ref={(audio) => setAudioPlayer(audio)}
                        src={`/uploads/${audioFiles.find((f: any) => f.id === selectedAudioFile)?.filename}`}
                        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
                        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
                        className="hidden"
                      />
                      <div className="flex items-center gap-4">
                        <Button onClick={handlePlayPause} variant="outline">
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <span className="text-sm font-mono">
                          {currentTime.toFixed(2)}s
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Segment Start Time</Label>
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
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Segment End Time</Label>
                          <Input
                            value={segmentEnd}
                            onChange={(e) => setSegmentEnd(e.target.value)}
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Text Start Position</Label>
                          <Input
                            value={segmentTextStart}
                            onChange={(e) => setSegmentTextStart(e.target.value)}
                            placeholder="Character position"
                            type="number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Text End Position</Label>
                          <Input
                            value={segmentTextEnd}
                            onChange={(e) => setSegmentTextEnd(e.target.value)}
                            placeholder="Character position"
                            type="number"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Language</Label>
                        <Select value={segmentLanguage} onValueChange={setSegmentLanguage}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="te">Telugu</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="en">English/IAST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={handleCreateSegment}
                        disabled={createSegmentMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Segment
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Existing Segments */}
                  {segments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Existing Segments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {segments.map((segment: any) => (
                            <div key={segment.id} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex items-center gap-4">
                                <Badge variant="outline">{segment.language}</Badge>
                                <span className="text-sm font-mono">
                                  {segment.startTime.toFixed(2)}s - {segment.endTime.toFixed(2)}s
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  Chars {segment.textStart}-{segment.textEnd}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
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