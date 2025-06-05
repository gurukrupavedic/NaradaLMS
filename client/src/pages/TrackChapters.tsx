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
  const { data: track } = useQuery({
    queryKey: ["/api/admin/tracks", trackId],
    enabled: !!trackId,
  });

  // Fetch chapters for this track
  const { data: chapters = [], isLoading } = useQuery({
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
    setLocation(`/content-management/track/${trackId}/chapter/${chapterId}`);
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
          <h1 className="text-3xl font-bold">{track.title}</h1>
          <p className="text-muted-foreground">{track.description}</p>
        </div>

        <div className="mb-6">
          <Button onClick={() => setCreateChapterModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Chapter
          </Button>
        </div>

        {/* Chapter List */}
        <div className="grid gap-4">
          {chapters.map((chapter: any, index: number) => (
            <Card key={chapter.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-muted-foreground font-medium">
                        Chapter {index + 1}
                      </span>
                      <Badge variant={chapter.status === "published" ? "default" : "secondary"}>
                        {chapter.status}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{chapter.title}</h3>
                    <p className="text-muted-foreground mb-3">{chapter.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {chapter.hasContent ? "Content added" : "No content"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Music className="w-4 h-4" />
                        {chapter.audioFileCount || 0} audio files
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {chapter.segmentCount || 0} segments
                      </span>
                      {chapter.status === "published" && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Published
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditChapter(chapter.id)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Chapter
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteChapter(chapter.id)}
                      disabled={deleteChapterMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {chapters.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No chapters yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first chapter to start building this track
              </p>
              <Button onClick={() => setCreateChapterModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Chapter
              </Button>
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