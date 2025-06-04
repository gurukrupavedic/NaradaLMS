import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Save, Upload, Music, FileText, Scissors, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Track {
  id: string;
  title: string;
  description: string;
  order: number;
  status: string;
  chapterCount: number;
  lastModified: string;
}

interface Chapter {
  id: string;
  trackId: string;
  title: string;
  order: number;
  status: string;
  texts: {
    te?: string;
    hi?: string;
    en?: string;
  };
  completeness: {
    text: boolean;
    audio: boolean;
    segments: boolean;
    mapping: boolean;
  };
}

export default function ContentManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<'te' | 'hi' | 'en'>('te');
  const [showCreateTrackModal, setShowCreateTrackModal] = useState(false);
  const [showCreateChapterModal, setShowCreateChapterModal] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const { data: tracks, isLoading: tracksLoading, error: tracksError } = useQuery<Track[]>({
    queryKey: ['/api/content/tracks'],
  });

  const { data: chapters, isLoading: chaptersLoading, error: chaptersError } = useQuery<Chapter[]>({
    queryKey: ['/api/content/chapters', selectedTrack],
    enabled: !!selectedTrack,
  });

  const { data: chapterContent, isLoading: contentLoading, error: contentError } = useQuery<Chapter>({
    queryKey: ['/api/content/chapter', selectedChapter],
    enabled: !!selectedChapter,
  });

  useEffect(() => {
    const errors = [tracksError, chaptersError, contentError].filter(Boolean);
    errors.forEach(error => {
      if (error && isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    });
  }, [tracksError, chaptersError, contentError, toast]);

  const createTrackMutation = useMutation({
    mutationFn: async (trackData: { title: string; description: string; order: number }) => {
      return apiRequest('POST', '/api/content/tracks', trackData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Track created successfully" });
      setShowCreateTrackModal(false);
      queryClient.invalidateQueries({ queryKey: ['/api/content/tracks'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create track", variant: "destructive" });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      return apiRequest('DELETE', `/api/content/tracks/${trackId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Track deleted successfully" });
      setSelectedTrack(null);
      queryClient.invalidateQueries({ queryKey: ['/api/content/tracks'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to delete track", variant: "destructive" });
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: async (chapterData: { id: string; texts: any; status: string }) => {
      return apiRequest('PUT', `/api/content/chapters/${chapterData.id}`, chapterData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Chapter saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/content/chapter', selectedChapter] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to save chapter", variant: "destructive" });
    },
  });

  const handleCreateTrack = (formData: FormData) => {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const order = parseInt(formData.get('order') as string) || (tracks?.length || 0) + 1;

    if (!title.trim()) {
      toast({ title: "Error", description: "Track title is required", variant: "destructive" });
      return;
    }

    createTrackMutation.mutate({ title, description, order });
  };

  const handleDeleteTrack = (trackId: string, trackTitle: string) => {
    if (confirm(`Are you sure you want to delete track "${trackTitle}"? This action cannot be undone.`)) {
      deleteTrackMutation.mutate(trackId);
    }
  };

  const handleSaveChapter = () => {
    if (!chapterContent) return;
    
    updateChapterMutation.mutate({
      id: chapterContent.id,
      texts: chapterContent.texts,
      status: chapterContent.status,
    });
  };

  const getCompletenessIndicator = (isComplete: boolean, label: string) => {
    return (
      <div className="flex items-center text-xs" title={`${label}: ${isComplete ? 'Complete' : 'Incomplete'}`}>
        {isComplete ? (
          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500 mr-1" />
        )}
        <span className="hidden sm:inline">{label}</span>
      </div>
    );
  };

  const getFontClass = () => {
    switch (activeLanguage) {
      case 'te': return 'font-tiro-telugu';
      case 'hi': return 'font-tiro-devanagari-sanskrit';
      case 'en': return 'font-tiro-devanagari-sanskrit';
      default: return 'font-tiro-devanagari-sanskrit';
    }
  };

  if (tracksLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Content Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Content Dashboard View
  if (!selectedTrack) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Content Management</CardTitle>
              <Dialog open={showCreateTrackModal} onOpenChange={setShowCreateTrackModal}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Track
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Track</DialogTitle>
                  </DialogHeader>
                  <form action={handleCreateTrack} className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium mb-1">Track Title</label>
                      <Input name="title" required placeholder="Enter track title" />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                      <Textarea name="description" placeholder="Enter track description" />
                    </div>
                    <div>
                      <label htmlFor="order" className="block text-sm font-medium mb-1">Order</label>
                      <Input name="order" type="number" defaultValue={(tracks?.length || 0) + 1} min="1" />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateTrackModal(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTrackMutation.isPending}>
                        Create Track
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Track Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Chapters</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Last Modified</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {tracks && tracks.length > 0 ? (
                    tracks.sort((a, b) => a.order - b.order).map(track => (
                      <tr key={track.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{track.order}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button 
                            onClick={() => setSelectedTrack(track.id)}
                            className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                          >
                            {track.title}
                          </button>
                          <div className="text-sm text-muted-foreground">{track.description}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground hidden sm:table-cell">
                          {track.chapterCount}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={track.status === 'published' ? 'default' : 'secondary'}>
                            {track.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground hidden sm:table-cell">
                          {track.lastModified}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedTrack(track.id)}
                              title="Manage Chapters"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteTrack(track.id, track.title)}
                              title="Delete Track"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No tracks created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chapter Editor View
  if (selectedChapter && chapterContent) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => setSelectedChapter(null)}>
                  ← Back to Chapters
                </Button>
                <div>
                  <CardTitle className="text-xl">{chapterContent.title}</CardTitle>
                  <p className="text-muted-foreground">Chapter Editor</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {previewMode ? 'Edit' : 'Preview'}
                </Button>
                <Button onClick={handleSaveChapter} disabled={updateChapterMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="content" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="media" className="flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Media
                    </TabsTrigger>
                    <TabsTrigger value="segments" className="flex items-center gap-2">
                      <Scissors className="h-4 w-4" />
                      Segments
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Script</label>
                      <Select value={activeLanguage} onValueChange={(value: 'te' | 'hi' | 'en') => setActiveLanguage(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                          <SelectItem value="hi">देवनागरी (Devanagari)</SelectItem>
                          <SelectItem value="en">English (IAST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Chapter Content</label>
                      <Textarea
                        value={chapterContent.texts[activeLanguage] || ''}
                        onChange={(e) => {
                          // In real implementation, this would update the chapter content
                          console.log('Content updated:', e.target.value);
                        }}
                        className={`min-h-96 ${getFontClass()}`}
                        placeholder={`Enter content in ${activeLanguage === 'te' ? 'Telugu' : activeLanguage === 'hi' ? 'Devanagari' : 'English (IAST)'}`}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="media" className="space-y-4">
                    <div className="text-center py-8">
                      <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Audio file management</p>
                      <Button className="mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Audio
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="segments" className="space-y-4">
                    <div className="text-center py-8">
                      <Scissors className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Segment definition and audio mapping</p>
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Segment
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Completeness Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getCompletenessIndicator(chapterContent.completeness.text, 'Text')}
                  {getCompletenessIndicator(chapterContent.completeness.audio, 'Audio')}
                  {getCompletenessIndicator(chapterContent.completeness.segments, 'Segments')}
                  {getCompletenessIndicator(chapterContent.completeness.mapping, 'Mapping')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Chapter Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={chapterContent.status} onValueChange={(value) => {
                  // Update chapter status
                  console.log('Status updated:', value);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Track Chapters View
  const selectedTrackData = tracks?.find(t => t.id === selectedTrack);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setSelectedTrack(null)}>
                ← Back to Tracks
              </Button>
              <div>
                <CardTitle className="text-xl">{selectedTrackData?.title}</CardTitle>
                <p className="text-muted-foreground">Manage Chapters</p>
              </div>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Chapter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chapters && chapters.length > 0 ? (
              chapters.map(chapter => (
                <Card key={chapter.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary mb-1">{chapter.title}</h3>
                        <p className="text-sm text-muted-foreground">Chapter {chapter.order}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          {getCompletenessIndicator(chapter.completeness.text, 'Text')}
                          {getCompletenessIndicator(chapter.completeness.audio, 'Audio')}
                          {getCompletenessIndicator(chapter.completeness.segments, 'Segments')}
                          {getCompletenessIndicator(chapter.completeness.mapping, 'Mapping')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={chapter.status === 'published' ? 'default' : 'secondary'}>
                          {chapter.status}
                        </Badge>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedChapter(chapter.id)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-2">No chapters created yet</p>
                <p className="text-sm">Create your first chapter to start building content.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
