import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Save, Upload } from "lucide-react";

interface Track {
  id: number;
  title: string;
  description: string;
  order: number;
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
  
  const [activeTab, setActiveTab] = useState("content");
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"te" | "hi" | "en">("en");

  // Fetch data
  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["/api/admin/tracks"],
  });

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/admin/chapters", selectedTrack],
    queryFn: async () => {
      console.log('Fetching chapters for track:', selectedTrack);
      const response = await fetch(`/api/admin/chapters/${selectedTrack}`);
      const data = await response.json();
      console.log('Chapters data received:', data);
      return data;
    },
    enabled: !!selectedTrack,
  });

  const { data: segments = [] } = useQuery<TextSegment[]>({
    queryKey: ["/api/admin/segments", selectedChapter],
    queryFn: () => fetch(`/api/admin/segments/${selectedChapter}`).then(res => res.json()),
    enabled: !!selectedChapter,
  });

  const { data: audioFiles = [] } = useQuery<AudioFile[]>({
    queryKey: ["/api/admin/audio-files", selectedChapter],
    queryFn: () => fetch(`/api/admin/audio-files/${selectedChapter}`).then(res => res.json()),
    enabled: !!selectedChapter,
  });

  // State for new items
  const [newTrack, setNewTrack] = useState({ title: "", description: "" });
  const [newChapter, setNewChapter] = useState({ 
    title: "", 
    content: { te: "", hi: "", en: "" }
  });
  const [segmentName, setSegmentName] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  // Create track mutation
  const createTrackMutation = useMutation({
    mutationFn: async (trackData: Partial<Track>) => {
      return await apiRequest("/api/admin/tracks", "POST", trackData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      setNewTrack({ title: "", description: "" });
      toast({ title: "Track created successfully" });
    },
  });

  // Update track mutation
  const updateTrackMutation = useMutation({
    mutationFn: async (trackData: Track) => {
      return await apiRequest(`/api/admin/tracks/${trackData.id}`, "PUT", trackData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      setEditingTrack(null);
      toast({ title: "Track updated successfully" });
    },
  });

  // Delete track mutation
  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: number) => {
      return await apiRequest(`/api/admin/tracks/${trackId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      toast({ title: "Track deleted successfully" });
    },
  });

  // Move track mutation
  const moveTrackMutation = useMutation({
    mutationFn: async ({ trackId, direction }: { trackId: number; direction: 'up' | 'down' }) => {
      return await apiRequest(`/api/admin/tracks/${trackId}/move`, "POST", { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      toast({ title: "Track order updated" });
    },
  });

  // Create chapter mutation
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: any) => {
      return await apiRequest("/api/admin/chapters", "POST", chapterData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters", selectedTrack] });
      setNewChapter({ title: "", content: { te: "", hi: "", en: "" } });
      toast({ title: "Chapter created successfully" });
    },
  });

  // Delete chapter mutation
  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      return await apiRequest(`/api/admin/chapters/${chapterId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters", selectedTrack] });
      toast({ title: "Chapter deleted successfully" });
    },
  });

  // Create segment mutation
  const createSegmentMutation = useMutation({
    mutationFn: async (segmentData: any) => {
      return await apiRequest("/api/admin/segments", "POST", segmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segments", selectedChapter] });
      toast({ title: "Text segment created successfully" });
    },
  });

  // Event handlers
  const handleCreateTrack = () => {
    if (!newTrack.title.trim()) return;
    createTrackMutation.mutate(newTrack);
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
  };

  const handleUpdateTrack = () => {
    if (!editingTrack) return;
    updateTrackMutation.mutate(editingTrack);
  };

  const handleDeleteTrack = (trackId: number) => {
    if (confirm("Are you sure you want to delete this track?")) {
      deleteTrackMutation.mutate(trackId);
    }
  };

  const handleMoveTrack = (trackId: number, direction: 'up' | 'down') => {
    moveTrackMutation.mutate({ trackId, direction });
  };

  const handleCreateChapter = () => {
    if (!newChapter.title.trim() || !selectedTrack) return;
    createChapterMutation.mutate({
      ...newChapter,
      trackId: selectedTrack,
    });
  };

  const handleEditChapter = (chapter: Chapter) => {
    // Implementation for editing chapters
    console.log("Edit chapter:", chapter);
  };

  const handleDeleteChapter = (chapterId: number) => {
    if (confirm("Are you sure you want to delete this chapter?")) {
      deleteChapterMutation.mutate(chapterId);
    }
  };

  const handleCreateSegment = () => {
    if (!segmentName.trim() || !selectedText || !selectedChapter) return;

    const [text, startStr, endStr] = selectedText.split('|');
    const start = parseInt(startStr);
    const end = parseInt(endStr);

    const textReferences: any = {};
    textReferences[selectedLanguage] = { start, end };

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
        <h1 className="text-3xl font-bold">Content Management</h1>
        <p className="text-muted-foreground">Create and manage Vedic learning content</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Manage Content</TabsTrigger>
          <TabsTrigger value="segments">Text Segments</TabsTrigger>
          <TabsTrigger value="audio">Audio Management</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
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

              <Button onClick={handleCreateTrack} disabled={createTrackMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Create Track
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracks ({tracks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className={`p-3 border rounded ${
                      selectedTrack === track.id ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            disabled={track.order === 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveTrack(track.id, 'up');
                            }}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            disabled={track.order === tracks.length}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveTrack(track.id, 'down');
                            }}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => {
                          console.log('Track clicked:', track.id, track.title);
                          setSelectedTrack(track.id);
                        }}>
                          <h3 className="font-medium">Track {track.order}: {track.title}</h3>
                          <p className="text-sm text-muted-foreground">{track.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTrack(track);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrack(track.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Edit Track Dialog */}
          {editingTrack && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Edit Track</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingTrack.title}
                    onChange={(e) => setEditingTrack({ ...editingTrack, title: e.target.value })}
                    placeholder="Enter track title"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingTrack.description}
                    onChange={(e) => setEditingTrack({ ...editingTrack, description: e.target.value })}
                    placeholder="Enter track description"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUpdateTrack} disabled={updateTrackMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Update Track
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingTrack(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chapter Management Section */}
          {selectedTrack && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Create New Chapter</CardTitle>
                  <CardDescription>Add content to Track {tracks.find(t => t.id === selectedTrack)?.order}: {tracks.find(t => t.id === selectedTrack)?.title}</CardDescription>
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
                  <CardTitle>Chapters ({chapters.length})</CardTitle>
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
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium">Chapter {chapter.order}: {chapter.title}</h3>
                            <div className="text-sm text-muted-foreground mt-1">
                              <Badge variant="outline" className="mr-2">{chapter.status}</Badge>
                              Content in: {Object.keys(chapter.content).join(', ')}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditChapter(chapter);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChapter(chapter.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
                  <CardDescription>Create character-position based segments for chapter content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="segment-name">Conceptual Name</Label>
                    <Input
                      id="segment-name"
                      value={segmentName}
                      onChange={(e) => setSegmentName(e.target.value)}
                      placeholder="Enter segment name (e.g., verse 1, mantra 2)"
                    />
                  </div>
                  
                  <div>
                    <Label>Selected Text: {selectedText}</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedText ? `Characters ${selectedText.split('|')[1]} to ${selectedText.split('|')[2]}` : 'No text selected'}
                    </p>
                  </div>

                  <Button 
                    onClick={handleCreateSegment} 
                    disabled={createSegmentMutation.isPending || !segmentName || !selectedText}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Segment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Text Segments ({segments.length})</CardTitle>
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