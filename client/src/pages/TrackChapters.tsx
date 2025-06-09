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
  ChevronUp,
  ChevronDown, 
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
  const { data: tracks } = useQuery<any[]>({
    queryKey: ["/api/admin/tracks"],
  });
  
  const track = tracks?.find(t => t.id.toString() === trackId);

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

  // Move chapter mutation
  const moveChapterMutation = useMutation({
    mutationFn: async ({ chapterId, direction }: { chapterId: number; direction: 'up' | 'down' }) => {
      const response = await apiRequest("POST", `/api/admin/chapters/${chapterId}/move`, { direction });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Chapter order updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${trackId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update chapter order", description: error.message, variant: "destructive" });
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

  const handleMoveChapter = (chapterId: number, direction: 'up' | 'down') => {
    moveChapterMutation.mutate({ chapterId, direction });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading chapters...</div>;
  }

  if (!match || !track) {
    return <div className="flex items-center justify-center h-screen">Track not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
        {/* Header */}
        <div className="space-y-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/content-management")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tracks
          </Button>
          
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold">{track?.title}</h1>
              <p className="text-muted-foreground">{track?.description}</p>
            </div>
            <Button onClick={() => setCreateChapterModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Chapter
            </Button>
          </div>
        </div>

        {/* Chapter List */}
        <div className="grid gap-4">
          {(chapters as any[]).sort((a, b) => a.order - b.order).map((chapter: any, index: number) => (
            <Card key={chapter.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Chapter Ordering Controls */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        disabled={chapter.order === 1 || moveChapterMutation.isPending}
                        onClick={() => handleMoveChapter(chapter.id, 'up')}
                        title="Move chapter up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        disabled={chapter.order === (chapters as any[]).length || moveChapterMutation.isPending}
                        onClick={() => handleMoveChapter(chapter.id, 'down')}
                        title="Move chapter down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm text-muted-foreground font-medium">
                          Chapter {chapter.order}
                        </span>
                        <h3 className="text-xl font-semibold">{chapter.title}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            chapter.status === "published"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          }`}
                        >
                          {chapter.status.charAt(0).toUpperCase() + chapter.status.slice(1)}
                        </span>
                      </div>
                      {chapter.description && (
                        <p className="text-muted-foreground mb-2">{chapter.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditChapter(chapter.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteChapter(chapter.id)}
                        disabled={deleteChapterMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    <Button 
                      variant={chapter.status === "published" ? "destructive" : "default"}
                      size="sm"
                      onClick={() => {
                        const newStatus = chapter.status === "published" ? "draft" : "published";
                        toggleStatusMutation.mutate({ chapterId: chapter.id, status: newStatus });
                      }}
                      disabled={toggleStatusMutation.isPending}
                      className="w-full"
                    >
                      {chapter.status === "published" ? "Unpublish" : "Publish"}
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