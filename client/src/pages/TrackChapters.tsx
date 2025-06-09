import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronRight, 
  FileText, 
  Music,
  Clock,
  CheckCircle 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TrackChapters() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/content-management/track/:trackId");
  const { toast } = useToast();
  
  const [createChapterModalOpen, setCreateChapterModalOpen] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: "", description: "" });

  const trackId = params?.trackId;

  // Fetch track info
  const { data: track } = useQuery<any>({
    queryKey: ["/api/admin/tracks", trackId],
    enabled: !!trackId,
  });

  // Fetch chapters for this track
  const { data: chapters = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/admin/chapters/${trackId}`],
    enabled: !!trackId,
  });

  // Create chapter mutation
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: { title: string; description: string; trackId: number }) => {
      const response = await apiRequest("POST", "/api/admin/chapters", chapterData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Chapter created successfully" });
      setCreateChapterModalOpen(false);
      setNewChapter({ title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${trackId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create chapter", description: error.message, variant: "destructive" });
    },
  });

  // Delete chapter mutation
  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      await apiRequest("DELETE", `/api/admin/chapters/${chapterId}`);
    },
    onSuccess: () => {
      toast({ title: "Chapter deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${trackId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete chapter", description: error.message, variant: "destructive" });
    },
  });

  // Toggle chapter status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ chapterId, status }: { chapterId: number; status: 'draft' | 'published' }) => {
      await apiRequest("PATCH", `/api/admin/chapters/${chapterId}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Chapter status updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${trackId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update chapter status", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateChapter = () => {
    if (!newChapter.title.trim()) {
      toast({ title: "Please enter a chapter title", variant: "destructive" });
      return;
    }
    if (!trackId) return;
    
    createChapterMutation.mutate({
      ...newChapter,
      trackId: parseInt(trackId),
    });
  };

  const handleEditChapter = (chapterId: number) => {
    // Invalidate chapter details query to ensure fresh data loads
    queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${chapterId}/details`] });
    // Navigate to chapter editor
    setLocation(`/chapter-editor/${chapterId}`);
  };

  const handleDeleteChapter = (chapterId: number) => {
    if (confirm("Are you sure you want to delete this chapter?")) {
      deleteChapterMutation.mutate(chapterId);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading chapters...</div>;
  }

  if (!match || !track) {
    return <div className="flex items-center justify-center h-screen">Track not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/content-management")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tracks
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{track?.title}</h1>
          <p className="text-muted-foreground">{track?.description}</p>
        </div>

        <div className="mb-6">
          <Button onClick={() => setCreateChapterModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Chapter
          </Button>
        </div>

        {/* Chapter List */}
        <div className="grid gap-4">
          {(chapters as any[]).map((chapter: any, index: number) => (
            <Card key={chapter.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {index + 1}
                        </span>
                      </div>
                      <Badge variant={chapter.status === "published" ? "default" : "secondary"} className="text-xs">
                        {chapter.status.charAt(0).toUpperCase() + chapter.status.slice(1)}
                      </Badge>
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold leading-tight pr-4">{chapter.title}</h3>
                      {chapter.description && (
                        <p className="text-sm text-muted-foreground leading-normal">{chapter.description}</p>
                      )}
                      
                      {/* Progress Indicators */}
                      <div className="flex items-center gap-6 pt-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <FileText className={`w-3.5 h-3.5 ${chapter.hasContent ? 'text-green-600' : 'text-orange-500'}`} />
                          <span className="text-xs">
                            <span className={`font-semibold text-foreground`}>
                              {chapter.hasContent ? "Content ready" : "No content"}
                            </span>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Music className="w-3.5 h-3.5" />
                          <span className="text-xs">
                            <span className="font-semibold text-foreground">{chapter.audioFileCount || 0}</span> audio
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">
                            <span className="font-semibold text-foreground">{chapter.segmentCount || 0}</span> segments
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2 min-w-[130px]">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditChapter(chapter.id)}
                      className="w-full justify-start text-xs h-8"
                    >
                      <Edit className="w-3 h-3 mr-2" />
                      Edit Content
                    </Button>
                    <Button 
                      variant={chapter.status === "published" ? "destructive" : "default"}
                      size="sm"
                      onClick={() => {
                        const newStatus = chapter.status === "published" ? "draft" : "published";
                        toggleStatusMutation.mutate({ chapterId: chapter.id, status: newStatus });
                      }}
                      disabled={toggleStatusMutation.isPending}
                      className="w-full justify-start text-xs h-8"
                    >
                      {chapter.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteChapter(chapter.id)}
                      disabled={deleteChapterMutation.isPending}
                      className="w-full justify-start text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(chapters as any[]).length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No chapters yet</h3>
              <p className="text-muted-foreground">
                Create your first chapter using the "Create Chapter" button above
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create Chapter Modal */}
        {createChapterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Create New Chapter</CardTitle>
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
                <div>
                  <Label htmlFor="chapter-description">Description</Label>
                  <Textarea
                    id="chapter-description"
                    value={newChapter.description}
                    onChange={(e) => setNewChapter({ ...newChapter, description: e.target.value })}
                    placeholder="Enter chapter description"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCreateChapter} 
                    disabled={createChapterMutation.isPending || !newChapter.title.trim()}
                  >
                    Create Chapter
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCreateChapterModalOpen(false);
                      setNewChapter({ title: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}