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
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  FileText, 
  Upload, 
  AudioLines, 
  Eye, 
  ArrowLeft, 
  Save,
  Play,
  Pause
} from "lucide-react";

interface Track {
  id: number;
  title: string;
  description: string;
  order: number;
}

interface Chapter {
  id: number;
  trackId: number;
  title: string;
  order: number;
  status: 'draft' | 'published';
  content: {
    te?: string;
    hi?: string;
    en?: string;
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

interface AudioSegment {
  id: number;
  audioFileId: number;
  startTime: number;
  endTime: number;
  textSegmentId: number;
}

export default function ContentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [editMode, setEditMode] = useState<'list' | 'edit'>('list');
  const [activePhase, setActivePhase] = useState<'text' | 'media' | 'segments' | 'preview'>('text');

  // Fetch data
  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["/api/admin/tracks"],
  });

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/admin/chapters", selectedTrack],
    queryFn: () => fetch(`/api/admin/chapters/${selectedTrack}`).then(res => res.json()),
    enabled: !!selectedTrack,
  });

  const { data: audioFiles = [] } = useQuery<AudioFile[]>({
    queryKey: ["/api/admin/audio-files", selectedChapter?.id],
    queryFn: () => fetch(`/api/admin/audio-files/${selectedChapter?.id}`).then(res => res.json()),
    enabled: !!selectedChapter,
  });

  // State for editing
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'te' | 'hi' | 'en'>('en');

  // Mutations
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: any) => {
      return await apiRequest("/api/admin/chapters", "POST", chapterData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters", selectedTrack] });
      toast({ title: "Chapter created successfully" });
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: async (chapterData: Chapter) => {
      return await apiRequest(`/api/admin/chapters/${chapterData.id}`, "PUT", chapterData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters", selectedTrack] });
      toast({ title: "Chapter updated successfully" });
    },
  });

  const publishChapterMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      return await apiRequest(`/api/admin/chapters/${chapterId}/publish`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters", selectedTrack] });
      toast({ title: "Chapter published successfully" });
    },
  });

  const unpublishChapterMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      return await apiRequest(`/api/admin/chapters/${chapterId}/unpublish`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chapters", selectedTrack] });
      toast({ title: "Chapter unpublished and moved to draft" });
    },
  });

  // Event handlers
  const handleCreateChapter = () => {
    if (!selectedTrack) return;
    
    const newChapter = {
      trackId: selectedTrack,
      title: "New Chapter",
      content: { te: "", hi: "", en: "" }
    };
    
    createChapterMutation.mutate(newChapter);
  };

  const handleEditChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setEditingChapter({ ...chapter });
    setEditMode('edit');
  };

  const handleSaveChapter = () => {
    if (!editingChapter) return;
    updateChapterMutation.mutate(editingChapter);
  };

  const handleBackToList = () => {
    setEditMode('list');
    setSelectedChapter(null);
    setEditingChapter(null);
    setActivePhase('text');
  };

  const handlePublishChapter = (chapterId: number) => {
    publishChapterMutation.mutate(chapterId);
  };

  const handleUnpublishChapter = (chapterId: number) => {
    unpublishChapterMutation.mutate(chapterId);
  };

  // Render track selection
  if (!selectedTrack) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">Select a track to manage its chapters</p>
        </div>

        <div className="grid gap-4">
          {tracks.map((track) => (
            <Card 
              key={track.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTrack(track.id)}
            >
              <CardHeader>
                <CardTitle>Track {track.order}: {track.title}</CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render chapter list
  if (editMode === 'list') {
    const selectedTrackData = tracks.find(t => t.id === selectedTrack);
    
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedTrack(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tracks
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Track {selectedTrackData?.order}: {selectedTrackData?.title}</h1>
            <p className="text-muted-foreground">Manage chapters in this track</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Chapter</CardTitle>
            <CardDescription>Add a new chapter to this track</CardDescription>
          </CardHeader>
          <CardContent>
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
            <div className="space-y-3">
              {chapters.map((chapter) => (
                <div key={chapter.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">Chapter {chapter.order}: {chapter.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={chapter.status === 'published' ? 'default' : 'secondary'}>
                        {chapter.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Content in: {Object.keys(chapter.content).filter(lang => chapter.content[lang as keyof typeof chapter.content]).join(', ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleEditChapter(chapter)}
                      disabled={chapter.status === 'published'}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    
                    {chapter.status === 'draft' ? (
                      <Button
                        onClick={() => handlePublishChapter(chapter.id)}
                        disabled={publishChapterMutation.isPending}
                      >
                        Publish
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleUnpublishChapter(chapter.id)}
                        disabled={unpublishChapterMutation.isPending}
                      >
                        Unpublish
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render chapter editor
  if (editMode === 'edit' && editingChapter) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chapters
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Chapter: {editingChapter.title}</h1>
              <Badge variant={editingChapter.status === 'published' ? 'default' : 'secondary'}>
                {editingChapter.status}
              </Badge>
            </div>
          </div>
          
          <Button onClick={handleSaveChapter} disabled={updateChapterMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <Tabs value={activePhase} onValueChange={(value) => setActivePhase(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Text Content
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Media Content
            </TabsTrigger>
            <TabsTrigger value="segments" className="flex items-center gap-2">
              <AudioLines className="w-4 h-4" />
              Segmentation & Mapping
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chapter Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="chapter-title">Chapter Title</Label>
                  <Input
                    id="chapter-title"
                    value={editingChapter.title}
                    onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                    placeholder="Enter chapter title"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Text Content</CardTitle>
                <CardDescription>Add the full text content for each language</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as any)}>
                  <TabsList>
                    <TabsTrigger value="te">Telugu</TabsTrigger>
                    <TabsTrigger value="hi">Devanagari</TabsTrigger>
                    <TabsTrigger value="en">English/IAST</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="te" className="mt-4">
                    <Textarea
                      value={editingChapter.content.te || ''}
                      onChange={(e) => setEditingChapter({
                        ...editingChapter,
                        content: { ...editingChapter.content, te: e.target.value }
                      })}
                      placeholder="Enter Telugu content"
                      className="min-h-96 font-mono"
                    />
                  </TabsContent>
                  
                  <TabsContent value="hi" className="mt-4">
                    <Textarea
                      value={editingChapter.content.hi || ''}
                      onChange={(e) => setEditingChapter({
                        ...editingChapter,
                        content: { ...editingChapter.content, hi: e.target.value }
                      })}
                      placeholder="Enter Devanagari content"
                      className="min-h-96 font-mono"
                    />
                  </TabsContent>
                  
                  <TabsContent value="en" className="mt-4">
                    <Textarea
                      value={editingChapter.content.en || ''}
                      onChange={(e) => setEditingChapter({
                        ...editingChapter,
                        content: { ...editingChapter.content, en: e.target.value }
                      })}
                      placeholder="Enter English/IAST content"
                      className="min-h-96 font-mono"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Audio Files</CardTitle>
                <CardDescription>Add audio recordings for this chapter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="audio-upload">Audio File</Label>
                  <Input id="audio-upload" type="file" accept="audio/*" />
                </div>
                <div>
                  <Label htmlFor="reciter-name">Reciter Name & Style</Label>
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
                <div className="space-y-3">
                  {audioFiles.map((audio) => (
                    <div key={audio.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{audio.originalName}</h4>
                        <p className="text-sm text-muted-foreground">{audio.reciter}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{Math.round(audio.duration)}s</Badge>
                        <Button size="sm" variant="outline">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audio Segmentation & Text Mapping</CardTitle>
                <CardDescription>
                  Create audio segments and map them to text portions for interactive learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <AudioLines className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Segmentation & Mapping functionality will be implemented in the next phase</p>
                  <p className="text-sm mt-2">
                    This will allow you to create audio segments with timestamps and map them to text selections
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chapter Preview</CardTitle>
                <CardDescription>Preview how this chapter will appear to students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Preview functionality will be implemented in the next phase</p>
                  <p className="text-sm mt-2">
                    This will show the interactive chapter view with highlighted text segments and audio playback
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return null;
}