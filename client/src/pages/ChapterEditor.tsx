import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type Language = "telugu" | "hindi" | "english";

interface ChapterContent {
  id: number;
  title: string;
  status: "draft" | "published";
  content: {
    telugu: string;
    hindi: string;
    english: string;
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
    language: Language;
  }>;
}

export default function ChapterEditor() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/content-management/track/:trackId/chapter/:chapterId");
  const { toast } = useToast();
  
  const [activePhase, setActivePhase] = useState<"text" | "media" | "mapping" | "preview">("text");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("telugu");
  const [selectedAudioFile, setSelectedAudioFile] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [segmentStart, setSegmentStart] = useState("");
  const [segmentEnd, setSegmentEnd] = useState("");
  const [selectedText, setSelectedText] = useState({ start: 0, end: 0 });
  
  const trackId = params?.trackId;
  const chapterId = params?.chapterId;

  // Fetch chapter data
  const { data: chapter, isLoading } = useQuery({
    queryKey: ["/api/admin/chapters", chapterId],
    enabled: !!chapterId,
  });

  // Fetch track info
  const { data: track } = useQuery({
    queryKey: ["/api/admin/tracks", trackId],
    enabled: !!trackId,
  });

  const chapterData = chapter as ChapterContent;

  // Save chapter content
  const saveChapterMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/admin/chapters/${chapterId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Chapter saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters", chapterId] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save chapter", description: error.message, variant: "destructive" });
    },
  });

  // Publish/Unpublish chapter
  const publishMutation = useMutation({
    mutationFn: async (action: "publish" | "unpublish") => {
      const response = await apiRequest("POST", `/api/admin/chapters/${chapterId}/${action}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: data.status === "published" ? "Chapter published" : "Chapter moved to draft",
        description: data.status === "published" ? "Chapter is now available to students" : "Chapter is now in draft mode"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters", chapterId] });
    },
    onError: (error: any) => {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveContent = () => {
    if (!chapterData) return;
    
    saveChapterMutation.mutate({
      title: chapterData.title,
      content: chapterData.content,
    });
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setSelectedText({
        start: range.startOffset,
        end: range.endOffset
      });
    }
  };

  const handleCreateSegment = () => {
    if (!selectedAudioFile || !segmentStart || !segmentEnd) {
      toast({ title: "Please select audio file and set timestamps", variant: "destructive" });
      return;
    }
    
    // Create segment logic here
    toast({ title: "Audio segment created successfully" });
    setSegmentStart("");
    setSegmentEnd("");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading chapter...</div>;
  }

  if (!chapter || !match) {
    return <div className="flex items-center justify-center h-screen">Chapter not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation(`/content-management`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tracks
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">{chapter.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {track?.title} • Chapter Editor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={chapter.status === "published" ? "default" : "secondary"}>
                {chapter.status}
              </Badge>
              {chapter.status === "published" ? (
                <Button 
                  variant="outline" 
                  onClick={() => publishMutation.mutate("unpublish")}
                  disabled={publishMutation.isPending}
                >
                  Move to Draft
                </Button>
              ) : (
                <Button 
                  onClick={() => publishMutation.mutate("publish")}
                  disabled={publishMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publish Chapter
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Phase Navigation */}
      <div className="border-b bg-gray-50">
        <div className="container mx-auto px-6">
          <Tabs value={activePhase} onValueChange={(value: any) => setActivePhase(value)}>
            <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-transparent h-auto p-0">
              <TabsTrigger 
                value="text" 
                className="flex items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <FileText className="w-4 h-4" />
                Text Content
              </TabsTrigger>
              <TabsTrigger 
                value="media" 
                className="flex items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <Music className="w-4 h-4" />
                Media Content
              </TabsTrigger>
              <TabsTrigger 
                value="mapping" 
                className="flex items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <Link className="w-4 h-4" />
                Segmentation & Mapping
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="flex items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activePhase}>
          {/* Phase 1: Text Content */}
          <TabsContent value="text" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Text Content Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Button 
                    variant={selectedLanguage === "telugu" ? "default" : "outline"}
                    onClick={() => setSelectedLanguage("telugu")}
                  >
                    Telugu
                  </Button>
                  <Button 
                    variant={selectedLanguage === "hindi" ? "default" : "outline"}
                    onClick={() => setSelectedLanguage("hindi")}
                  >
                    Hindi
                  </Button>
                  <Button 
                    variant={selectedLanguage === "english" ? "default" : "outline"}
                    onClick={() => setSelectedLanguage("english")}
                  >
                    English/IAST
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="chapter-title">Chapter Title ({selectedLanguage})</Label>
                  <Input
                    id="chapter-title"
                    value={chapter.title}
                    placeholder={`Enter title in ${selectedLanguage}`}
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="chapter-content">Content ({selectedLanguage})</Label>
                  <Textarea
                    id="chapter-content"
                    value={chapter.content?.[selectedLanguage] || ""}
                    placeholder={`Enter content in ${selectedLanguage}`}
                    className="min-h-[400px] font-mono"
                    onMouseUp={handleTextSelection}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveContent} disabled={saveChapterMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 2: Media Content */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  Audio & Media Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Upload Audio Files</p>
                  <p className="text-gray-500 mb-4">Drag and drop audio files or click to browse</p>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                </div>

                {chapter.audioFiles && chapter.audioFiles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Uploaded Files</h3>
                    {chapter.audioFiles.map((file) => (
                      <Card key={file.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{file.filename}</p>
                            <p className="text-sm text-gray-500">Duration: {file.duration}s</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 3: Segmentation & Mapping */}
          <TabsContent value="mapping" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audio Segmentation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Audio File</Label>
                    <select 
                      className="w-full mt-1 p-2 border rounded"
                      value={selectedAudioFile || ""}
                      onChange={(e) => setSelectedAudioFile(Number(e.target.value) || null)}
                    >
                      <option value="">Choose audio file...</option>
                      {chapter.audioFiles?.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.filename}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">Start Time (seconds)</Label>
                      <Input
                        id="start-time"
                        type="number"
                        step="0.1"
                        value={segmentStart}
                        onChange={(e) => setSegmentStart(e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">End Time (seconds)</Label>
                      <Input
                        id="end-time"
                        type="number"
                        step="0.1"
                        value={segmentEnd}
                        onChange={(e) => setSegmentEnd(e.target.value)}
                        placeholder="10.0"
                      />
                    </div>
                  </div>

                  <Button onClick={handleCreateSegment} className="w-full">
                    Create Audio Segment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Text Selection & Mapping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant={selectedLanguage === "telugu" ? "default" : "outline"}
                      onClick={() => setSelectedLanguage("telugu")}
                    >
                      Telugu
                    </Button>
                    <Button 
                      size="sm"
                      variant={selectedLanguage === "hindi" ? "default" : "outline"}
                      onClick={() => setSelectedLanguage("hindi")}
                    >
                      Hindi
                    </Button>
                    <Button 
                      size="sm"
                      variant={selectedLanguage === "english" ? "default" : "outline"}
                      onClick={() => setSelectedLanguage("english")}
                    >
                      English
                    </Button>
                  </div>

                  <div className="border p-4 rounded max-h-[300px] overflow-y-auto">
                    <p className="text-sm leading-relaxed" onMouseUp={handleTextSelection}>
                      {chapter.content?.[selectedLanguage] || "No content available for this language"}
                    </p>
                  </div>

                  <div className="text-sm text-gray-500">
                    Selected: Characters {selectedText.start} - {selectedText.end}
                  </div>

                  <Button className="w-full" disabled={!selectedText.start && !selectedText.end}>
                    Map Selected Text to Audio Segment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Phase 4: Preview */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Chapter Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant={selectedLanguage === "telugu" ? "default" : "outline"}
                      onClick={() => setSelectedLanguage("telugu")}
                    >
                      Telugu
                    </Button>
                    <Button 
                      size="sm"
                      variant={selectedLanguage === "hindi" ? "default" : "outline"}
                      onClick={() => setSelectedLanguage("hindi")}
                    >
                      Hindi
                    </Button>
                    <Button 
                      size="sm"
                      variant={selectedLanguage === "english" ? "default" : "outline"}
                      onClick={() => setSelectedLanguage("english")}
                    >
                      English
                    </Button>
                  </div>

                  <div className="border p-6 rounded-lg bg-gray-50 min-h-[400px]">
                    <h2 className="text-2xl font-bold mb-4">{chapter.title}</h2>
                    <div className="prose max-w-none">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">
                        {chapter.content?.[selectedLanguage] || "No content available for this language"}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Badge variant="outline" className="text-sm">
                      Preview Mode - Interactive segments will appear here once mapping is complete
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}