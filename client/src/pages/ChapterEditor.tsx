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
  const [, params] = useRoute("/chapter/:chapterId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const chapterId = parseInt(params?.chapterId || "0");
  
  // State for current editing phase
  const [currentPhase, setCurrentPhase] = useState("text");
  
  // State for text content
  const [textContent, setTextContent] = useState({
    te: "",
    hi: "",
    en: ""
  });
  
  // State for audio files and segments
  const [selectedAudioFile, setSelectedAudioFile] = useState<number | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [segmentStart, setSegmentStart] = useState("");
  const [segmentEnd, setSegmentEnd] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("te");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch chapter data
  const { data: chapter, isLoading } = useQuery({
    queryKey: [`/api/admin/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  // Fetch audio files for this chapter
  const { data: audioFiles = [] } = useQuery({
    queryKey: [`/api/admin/audio-files/${chapterId}`],
    enabled: !!chapterId,
  });

  // Fetch segments for this chapter
  const { data: segments = [] } = useQuery({
    queryKey: [`/api/admin/segments/${chapterId}`],
    enabled: !!chapterId,
  });

  // Initialize text content when chapter data loads
  useEffect(() => {
    if (chapter?.content) {
      setTextContent({
        te: chapter.content.te || "",
        hi: chapter.content.hi || "",
        en: chapter.content.en || ""
      });
    }
  }, [chapter]);

  // Audio player setup
  useEffect(() => {
    if (selectedAudioFile && audioFiles.length > 0) {
      const audioFile = audioFiles.find((f: any) => f.id === selectedAudioFile);
      if (audioFile && audioFile.url) {
        try {
          const audio = new Audio(audioFile.url);
          
          const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
          };
          
          const handleEnded = () => {
            setIsPlaying(false);
          };
          
          const handleError = (e: any) => {
            console.error('Audio loading error:', e);
            toast({ 
              title: "Audio Error", 
              description: "Failed to load audio file",
              variant: "destructive" 
            });
          };
          
          audio.addEventListener('timeupdate', handleTimeUpdate);
          audio.addEventListener('ended', handleEnded);
          audio.addEventListener('error', handleError);
          
          setAudioPlayer(audio);
          
          return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
          };
        } catch (error) {
          console.error('Audio setup error:', error);
          toast({ 
            title: "Audio Error", 
            description: "Failed to initialize audio player",
            variant: "destructive" 
          });
        }
      }
    }
  }, [selectedAudioFile, audioFiles, toast]);

  // Save text content mutation
  const saveTextMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/chapters/${chapterId}`, {
        content: textContent
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
      toast({ title: "Audio file uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to upload audio file", description: error.message, variant: "destructive" });
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
      // Reset form
      setSegmentStart("");
      setSegmentEnd("");
      setSelectedText("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to create segment", description: error.message, variant: "destructive" });
    },
  });

  // Publish/Unpublish chapter mutation
  const publishMutation = useMutation({
    mutationFn: async (action: "publish" | "unpublish") => {
      await apiRequest("PATCH", `/api/admin/chapters/${chapterId}/${action}`);
    },
    onSuccess: (_, action) => {
      toast({ 
        title: action === "publish" ? "Chapter published successfully" : "Chapter unpublished successfully" 
      });
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

  const setCurrentTimeAsStart = () => {
    setSegmentStart(currentTime.toFixed(2));
  };

  const setCurrentTimeAsEnd = () => {
    setSegmentEnd(currentTime.toFixed(2));
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const createSegment = () => {
    if (!selectedAudioFile || !segmentStart || !segmentEnd || !selectedText) {
      toast({ title: "Please fill all segment details", variant: "destructive" });
      return;
    }

    const textArea = document.getElementById(`text-${selectedLanguage}`) as HTMLTextAreaElement;
    if (!textArea) return;

    const fullText = textContent[selectedLanguage as keyof typeof textContent];
    const textStart = fullText.indexOf(selectedText);
    const textEnd = textStart + selectedText.length;

    if (textStart === -1) {
      toast({ title: "Selected text not found in content", variant: "destructive" });
      return;
    }

    createSegmentMutation.mutate({
      chapterId,
      audioFileId: selectedAudioFile,
      startTime: parseFloat(segmentStart),
      endTime: parseFloat(segmentEnd),
      textStart,
      textEnd,
      language: selectedLanguage,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading chapter...</div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Chapter not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/content-management")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tracks
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{chapter.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={chapter.status === "published" ? "default" : "secondary"}>
                {chapter.status}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {chapter.status === "draft" ? (
            <Button 
              onClick={() => publishMutation.mutate("publish")}
              disabled={publishMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Publish Chapter
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={() => publishMutation.mutate("unpublish")}
              disabled={publishMutation.isPending}
            >
              Unpublish Chapter
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={currentPhase} onValueChange={setCurrentPhase}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="text" className="flex items-center gap-2">
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
        <TabsContent value="text" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Multilingual Text Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Telugu Content */}
              <div className="space-y-2">
                <Label htmlFor="text-te">Telugu Content</Label>
                <Textarea
                  id="text-te"
                  value={textContent.te}
                  onChange={(e) => setTextContent(prev => ({ ...prev, te: e.target.value }))}
                  placeholder="Enter Telugu text content..."
                  className="min-h-[200px]"
                />
              </div>

              {/* Hindi Content */}
              <div className="space-y-2">
                <Label htmlFor="text-hi">Hindi Content</Label>
                <Textarea
                  id="text-hi"
                  value={textContent.hi}
                  onChange={(e) => setTextContent(prev => ({ ...prev, hi: e.target.value }))}
                  placeholder="Enter Hindi text content..."
                  className="min-h-[200px]"
                />
              </div>

              {/* English Content */}
              <div className="space-y-2">
                <Label htmlFor="text-en">English/IAST Content</Label>
                <Textarea
                  id="text-en"
                  value={textContent.en}
                  onChange={(e) => setTextContent(prev => ({ ...prev, en: e.target.value }))}
                  placeholder="Enter English/IAST text content..."
                  className="min-h-[200px]"
                />
              </div>

              <Button 
                onClick={() => saveTextMutation.mutate()}
                disabled={saveTextMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Text Content
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Content Phase */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Audio Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAudioMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Audio File
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
                          onClick={() => setSelectedAudioFile(file.id)}
                        >
                          Select for Mapping
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {audioFiles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No audio files uploaded yet. Upload audio files to proceed with segmentation.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segmentation & Mapping Phase */}
        <TabsContent value="mapping" className="space-y-6">
          {selectedAudioFile && audioFiles.find(f => f.id === selectedAudioFile) ? (
            <>
              {/* Audio Player Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Audio Player & Segmentation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        />
                        <Button onClick={setCurrentTimeAsStart} variant="outline" size="sm">
                          Use Current
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Segment End Time</Label>
                      <div className="flex gap-2">
                        <Input
                          value={segmentEnd}
                          onChange={(e) => setSegmentEnd(e.target.value)}
                          placeholder="5.00"
                        />
                        <Button onClick={setCurrentTimeAsEnd} variant="outline" size="sm">
                          Use Current
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Text Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Text Selection & Mapping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Language</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
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

                  <div className="space-y-2">
                    <Label>Select text to map to audio segment</Label>
                    <Textarea
                      value={textContent[selectedLanguage as keyof typeof textContent]}
                      readOnly
                      onMouseUp={handleTextSelection}
                      className="min-h-[200px] cursor-pointer"
                      placeholder="No text content available for this language"
                    />
                  </div>

                  {selectedText && (
                    <div className="p-3 bg-muted rounded">
                      <Label className="text-sm font-medium">Selected Text:</Label>
                      <p className="text-sm mt-1">{selectedText}</p>
                    </div>
                  )}

                  <Button
                    onClick={createSegment}
                    disabled={!segmentStart || !segmentEnd || !selectedText || createSegmentMutation.isPending}
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
                    <CardTitle>Created Segments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {segments.map((segment: any) => (
                        <div key={segment.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {segment.startTime}s - {segment.endTime}s
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {segment.language} • {segment.textEnd - segment.textStart} chars
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Audio File Selected</h3>
                <p className="text-muted-foreground">
                  Go to Media Content tab to upload and select an audio file for segmentation.
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
                          // Render text with interactive segments
                          <div className="whitespace-pre-wrap">
                            {(() => {
                              let lastIndex = 0;
                              const elements = [];
                              
                              langSegments
                                .sort((a: any, b: any) => a.textStart - b.textStart)
                                .forEach((segment: any, index: number) => {
                                  // Add text before segment
                                  if (segment.textStart > lastIndex) {
                                    elements.push(
                                      <span key={`text-${index}`}>
                                        {content.slice(lastIndex, segment.textStart)}
                                      </span>
                                    );
                                  }
                                  
                                  // Add interactive segment
                                  elements.push(
                                    <span
                                      key={`segment-${index}`}
                                      className="bg-blue-100 hover:bg-blue-200 cursor-pointer px-1 rounded"
                                      title={`Audio: ${segment.startTime}s - ${segment.endTime}s`}
                                    >
                                      {content.slice(segment.textStart, segment.textEnd)}
                                    </span>
                                  );
                                  
                                  lastIndex = segment.textEnd;
                                });
                              
                              // Add remaining text
                              if (lastIndex < content.length) {
                                elements.push(
                                  <span key="text-end">
                                    {content.slice(lastIndex)}
                                  </span>
                                );
                              }
                              
                              return elements;
                            })()}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {Object.values(textContent).every(content => !content) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No text content available for preview.
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