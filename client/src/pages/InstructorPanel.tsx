import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Upload, Play, Pause, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Track {
  id: number;
  title: string;
  description: string;
  order: number;
  status: string;
  estimatedHours: number;
  createdBy: string;
}

interface Chapter {
  id: number;
  trackId: number;
  title: string;
  order: number;
  status: string;
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
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
}

interface AudioFile {
  id: number;
  chapterId: number;
  filename: string;
  originalName: string;
  reciter: string;
  duration: number;
}

export default function InstructorPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("tracks");
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"te" | "hi" | "en">("en");

  // Fetch data
  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["/api/admin/tracks"],
  });

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/admin/chapters", selectedTrack],
    enabled: !!selectedTrack,
  });

  const { data: segments = [] } = useQuery<TextSegment[]>({
    queryKey: ["/api/admin/segments", selectedChapter],
    enabled: !!selectedChapter,
  });

  const { data: audioFiles = [] } = useQuery<AudioFile[]>({
    queryKey: ["/api/admin/audio-files", selectedChapter],
    enabled: !!selectedChapter,
  });

  // Create track mutation
  const createTrackMutation = useMutation({
    mutationFn: async (trackData: Partial<Track>) => {
      const response = await fetch("/api/admin/tracks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trackData),
      });
      if (!response.ok) throw new Error("Failed to create track");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      toast({ title: "Track created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create track", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Create chapter mutation
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: Partial<Chapter>) => {
      const response = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chapterData),
      });
      if (!response.ok) throw new Error("Failed to create chapter");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters"] });
      toast({ title: "Chapter created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create chapter", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Create segment mutation
  const createSegmentMutation = useMutation({
    mutationFn: async (segmentData: Partial<TextSegment>) => {
      const response = await fetch("/api/admin/segments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(segmentData),
      });
      if (!response.ok) throw new Error("Failed to create segment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segments"] });
      toast({ title: "Text segment created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create segment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Content editing functions
  const [newTrack, setNewTrack] = useState({ title: "", description: "", estimatedHours: 0 });
  const [newChapter, setNewChapter] = useState({ title: "", content: { te: "", hi: "", en: "" } });
  const [selectedText, setSelectedText] = useState("");
  const [segmentName, setSegmentName] = useState("");

  const handleCreateTrack = () => {
    if (!newTrack.title.trim()) {
      toast({ title: "Track title is required", variant: "destructive" });
      return;
    }
    
    createTrackMutation.mutate({
      ...newTrack,
      order: tracks.length + 1,
      status: "draft",
    });
    setNewTrack({ title: "", description: "", estimatedHours: 0 });
  };

  const handleCreateChapter = () => {
    if (!selectedTrack || !newChapter.title.trim()) {
      toast({ title: "Track selection and chapter title are required", variant: "destructive" });
      return;
    }
    
    createChapterMutation.mutate({
      ...newChapter,
      trackId: selectedTrack,
      order: chapters.length + 1,
      status: "draft",
    });
    setNewChapter({ title: "", content: { te: "", hi: "", en: "" } });
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      const range = selection.getRangeAt(0);
      
      // Get character positions relative to the content
      const container = range.commonAncestorContainer.parentElement;
      if (container?.getAttribute('data-language') === selectedLanguage) {
        const start = range.startOffset;
        const end = range.endOffset;
        
        setSelectedText(selectedText);
        console.log(`Selected text: "${selectedText}" at positions ${start}-${end} in ${selectedLanguage}`);
      }
    }
  };

  const handleCreateSegment = () => {
    if (!selectedChapter || !segmentName.trim() || !selectedText.trim()) {
      toast({ title: "Chapter, segment name, and text selection are required", variant: "destructive" });
      return;
    }

    // This is a simplified version - in a real implementation, you'd calculate exact character positions
    const textReferences = {
      [selectedLanguage]: { start: 0, end: selectedText.length }
    };

    createSegmentMutation.mutate({
      chapterId: selectedChapter,
      conceptualName: segmentName,
      textReferences,
    });
    
    setSegmentName("");
    setSelectedText("");
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Instructor Content Management</h1>
        <p className="text-muted-foreground">Create and manage Vedic learning content</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
          <TabsTrigger value="segments">Text Segments</TabsTrigger>
          <TabsTrigger value="audio">Audio Management</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Track</CardTitle>
              <CardDescription>Add a new learning track to the curriculum</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="track-title">Track Title</Label>
                <Input
                  id="track-title"
                  value={newTrack.title}
                  onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                  placeholder="Enter track title"
                />
              </div>
              <div>
                <Label htmlFor="track-description">Description</Label>
                <Textarea
                  id="track-description"
                  value={newTrack.description}
                  onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })}
                  placeholder="Enter track description"
                />
              </div>
              <div>
                <Label htmlFor="estimated-hours">Estimated Hours</Label>
                <Input
                  id="estimated-hours"
                  type="number"
                  value={newTrack.estimatedHours}
                  onChange={(e) => setNewTrack({ ...newTrack, estimatedHours: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <Button onClick={handleCreateTrack} disabled={createTrackMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Create Track
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Tracks ({tracks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedTrack === track.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedTrack(track.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{track.title}</h3>
                        <p className="text-sm text-muted-foreground">{track.description}</p>
                      </div>
                      <Badge variant={track.status === "published" ? "default" : "secondary"}>
                        {track.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chapters" className="space-y-4">
          {!selectedTrack ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Please select a track first</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Create New Chapter</CardTitle>
                  <CardDescription>Add content to the selected track</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="chapter-title">Chapter Title</Label>
                    <Input
                      id="chapter-title"
                      value={newChapter.title}
                      onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                      placeholder="Enter chapter title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Content Languages</Label>
                    <Tabs value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as "te" | "hi" | "en")}>
                      <TabsList>
                        <TabsTrigger value="te">Telugu</TabsTrigger>
                        <TabsTrigger value="hi">Devanagari</TabsTrigger>
                        <TabsTrigger value="en">English/IAST</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="te">
                        <Textarea
                          value={newChapter.content.te}
                          onChange={(e) => setNewChapter({ 
                            ...newChapter, 
                            content: { ...newChapter.content, te: e.target.value }
                          })}
                          placeholder="Enter Telugu content"
                          className="min-h-32"
                        />
                      </TabsContent>
                      
                      <TabsContent value="hi">
                        <Textarea
                          value={newChapter.content.hi}
                          onChange={(e) => setNewChapter({ 
                            ...newChapter, 
                            content: { ...newChapter.content, hi: e.target.value }
                          })}
                          placeholder="Enter Devanagari content"
                          className="min-h-32"
                        />
                      </TabsContent>
                      
                      <TabsContent value="en">
                        <Textarea
                          value={newChapter.content.en}
                          onChange={(e) => setNewChapter({ 
                            ...newChapter, 
                            content: { ...newChapter.content, en: e.target.value }
                          })}
                          placeholder="Enter English/IAST content"
                          className="min-h-32"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>

                  <Button onClick={handleCreateChapter} disabled={createChapterMutation.isPending}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Chapter
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chapters in Track ({chapters.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className={`p-3 border rounded cursor-pointer ${
                          selectedChapter === chapter.id ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => setSelectedChapter(chapter.id)}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{chapter.title}</h3>
                          <Badge variant={chapter.status === "published" ? "default" : "secondary"}>
                            {chapter.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          {!selectedChapter ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Please select a chapter first</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Create Text Segment</CardTitle>
                  <CardDescription>Select text portions and create interactive segments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Language</Label>
                    <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as "te" | "hi" | "en")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="te">Telugu</SelectItem>
                        <SelectItem value="hi">Devanagari</SelectItem>
                        <SelectItem value="en">English/IAST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="segment-name">Segment Name</Label>
                    <Input
                      id="segment-name"
                      value={segmentName}
                      onChange={(e) => setSegmentName(e.target.value)}
                      placeholder="Enter conceptual name for segment"
                    />
                  </div>

                  {selectedText && (
                    <div className="p-3 bg-muted rounded">
                      <Label className="text-sm font-medium">Selected Text:</Label>
                      <p className="mt-1">{selectedText}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button onClick={handleTextSelection} variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Capture Selection
                    </Button>
                    <Button 
                      onClick={handleCreateSegment} 
                      disabled={createSegmentMutation.isPending || !selectedText}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Create Segment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chapter Segments ({segments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {segments.map((segment) => (
                      <div key={segment.id} className="p-3 border rounded">
                        <h3 className="font-medium">{segment.conceptualName}</h3>
                        <div className="text-sm text-muted-foreground">
                          {Object.entries(segment.textReferences).map(([lang, ref]) => (
                            <span key={lang} className="mr-4">
                              {lang.toUpperCase()}: {ref.start}-{ref.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="audio" className="space-y-4">
          {!selectedChapter ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Please select a chapter first</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Upload Audio File</CardTitle>
                  <CardDescription>Add audio recordings for the selected chapter</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="audio-upload">Audio File</Label>
                    <Input id="audio-upload" type="file" accept="audio/*" />
                  </div>
                  <div>
                    <Label htmlFor="reciter-name">Reciter Name</Label>
                    <Input 
                      id="reciter-name" 
                      placeholder="Enter reciter name and style"
                    />
                  </div>
                  <Button disabled>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Audio
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Audio upload functionality will be implemented in the next phase
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audio Files ({audioFiles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {audioFiles.map((audio) => (
                      <div key={audio.id} className="p-3 border rounded">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{audio.originalName}</h3>
                            <p className="text-sm text-muted-foreground">{audio.reciter}</p>
                          </div>
                          <Badge variant="outline">
                            {Math.round(audio.duration)}s
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}