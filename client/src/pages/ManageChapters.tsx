import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { ArrowLeft, Plus, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChapterCard, ConfirmationModal } from "@/components/content-management";
import { LoadingSkeleton, LoadingSpinner } from "@/components/ui/loading";

interface Chapter {
  id: number;
  trackId: number;
  title: string;
  description: string;
  order: number;
  status: 'draft' | 'published';
}

export function ManageChapters() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/manage/tracks/:trackId");
  const { toast } = useToast();
  
  const [createChapterModalOpen, setCreateChapterModalOpen] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: "", description: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, chapter: Chapter | null}>({
    show: false,
    chapter: null
  });

  const trackId = params?.trackId;

  // Fetch track info
  const { data: tracks } = useQuery<any[]>({
    queryKey: ["/api/tracks"],
  });
  
  const track = tracks?.find(t => t.id.toString() === trackId);

  // Fetch chapters for this track
  const { data: chapters = [], isLoading: chaptersLoading } = useQuery<Chapter[]>({
    queryKey: [`/api/chapters/${trackId}`],
    enabled: !!trackId,
  });

  // Memoized sorted chapters for performance
  const sortedChapters = useMemo(() => 
    chapters.sort((a, b) => a.order - b.order), [chapters]
  );

  // Create chapter mutation
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: { title: string; description: string; trackId: number }) => {
      const response = await apiRequest("POST", "/api/chapters", chapterData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Chapter created successfully" });
      setCreateChapterModalOpen(false);
      setNewChapter({ title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${trackId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create chapter", description: error.message, variant: "destructive" });
    },
  });

  // Delete chapter mutation
  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      await apiRequest("DELETE", `/api/chapters/${chapterId}`);
    },
    onSuccess: () => {
      toast({ title: "Chapter deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${trackId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete chapter", description: error.message, variant: "destructive" });
    },
  });

  // Toggle chapter status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ chapterId, status }: { chapterId: number; status: 'draft' | 'published' }) => {
      await apiRequest("PATCH", `/api/chapters/${chapterId}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Chapter status updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${trackId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update chapter status", description: error.message, variant: "destructive" });
    },
  });

  // Move chapter mutation
  const moveChapterMutation = useMutation({
    mutationFn: async ({ chapterId, direction }: { chapterId: number; direction: 'up' | 'down' }) => {
      const response = await apiRequest("POST", `/api/chapters/${chapterId}/move`, { direction });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Chapter order updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${trackId}`] });
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
    queryClient.invalidateQueries({ queryKey: [`/api/chapters/${chapterId}/details`] });
    // Navigate to chapter editor
    setLocation(`/manage/tracks/${trackId}/chapters/${chapterId}`);
  };

  const handleDeleteChapter = (chapter: Chapter) => {
    setDeleteConfirm({ show: true, chapter });
  };

  const confirmDeleteChapter = () => {
    if (deleteConfirm.chapter) {
      deleteChapterMutation.mutate(deleteConfirm.chapter.id);
      setDeleteConfirm({ show: false, chapter: null });
    }
  };

  const handleMoveChapter = (chapterId: number, direction: 'up' | 'down') => {
    moveChapterMutation.mutate({ chapterId, direction });
  };

  if (chaptersLoading) {
    return <div className="flex items-center justify-center h-screen">Loading chapters...</div>;
  }

  if (!match || !track) {
    return <div className="flex items-center justify-center h-screen">Track not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
        {/* Header */}
        <div className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto">
          <div className="space-y-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/manage")}
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
        </div>

        {/* Chapter List */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {sortedChapters.map((chapter: Chapter, index: number) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              index={index}
              totalChapters={sortedChapters.length}
              isMovePending={moveChapterMutation.isPending}
              isTogglePending={toggleStatusMutation.isPending}
              onEdit={handleEditChapter}
              onDelete={handleDeleteChapter}
              onMove={handleMoveChapter}
              onToggleStatus={(chapterId) => {
                const chapter = sortedChapters.find(c => c.id === chapterId);
                if (chapter) {
                  const newStatus = chapter.status === "published" ? "draft" : "published";
                  toggleStatusMutation.mutate({ chapterId, status: newStatus });
                }
              }}
            />
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

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirm.show}
          onClose={() => setDeleteConfirm({ show: false, chapter: null })}
          onConfirm={confirmDeleteChapter}
          title="Delete Chapter"
          message={`Are you sure you want to delete "${deleteConfirm.chapter?.title}"? This action cannot be undone.`}
          confirmLabel="Delete Chapter"
          isLoading={deleteChapterMutation.isPending}
        />
      </div>
    </div>
  );
}