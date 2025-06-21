import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResponsiveTitle } from "@/components/ResponsiveTitle";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChapterCard, ConfirmationModal } from "@/components/content-management";

interface Chapter {
  id: number;
  trackId: number;
  title: string;
  order: number;
  status: string;
}

interface Track {
  id: number;
  title: string;
  description: string;
}

export default function ManageChapterList() {
  const [, setLocation] = useLocation();
  const { trackId } = useParams<{ trackId: string }>();
  
  const [createChapterModalOpen, setCreateChapterModalOpen] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: "", description: "" });
  const [deleteChapterId, setDeleteChapterId] = useState<number | null>(null);

  // Fetch track details
  const { data: track } = useQuery<Track>({
    queryKey: [`/api/admin/tracks/${trackId}`],
    enabled: !!trackId,
  });

  // Fetch chapters for this track
  const { data: chapters = [], isLoading } = useQuery({
    queryKey: [`/api/admin/chapters/${trackId}`],
    enabled: !!trackId,
  });

  // Create chapter mutation
  const createChapterMutation = useMutation({
    mutationFn: (chapterData: { title: string; description: string }) =>
      apiRequest(`/api/admin/chapters`, "POST", { 
        ...chapterData, 
        trackId: parseInt(trackId!) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${trackId}`] });
      setCreateChapterModalOpen(false);
      setNewChapter({ title: "", description: "" });
    },
    onError: (error) => {
      console.error("Failed to create chapter:", error);
    },
  });

  // Delete chapter mutation
  const deleteChapterMutation = useMutation({
    mutationFn: (chapterId: number) => apiRequest(`/api/admin/chapters/${chapterId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${trackId}`] });
      setDeleteChapterId(null);
    },
    onError: (error) => {
      console.error("Failed to delete chapter:", error);
    },
  });

  // Move chapter mutation
  const moveChapterMutation = useMutation({
    mutationFn: ({ chapterId, direction }: { chapterId: number; direction: 'up' | 'down' }) =>
      apiRequest(`/api/admin/chapters/${chapterId}/move`, "PUT", { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${trackId}`] });
    },
    onError: (error) => {
      console.error("Failed to move chapter:", error);
    },
  });

  // Toggle chapter status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ chapterId, status }: { chapterId: number; status: string }) =>
      apiRequest(`/api/admin/chapters/${chapterId}/status`, "PUT", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${trackId}`] });
    },
    onError: (error) => {
      console.error("Failed to toggle chapter status:", error);
    },
  });

  const sortedChapters = chapters.sort((a: Chapter, b: Chapter) => a.order - b.order);

  const handleChapterClick = (chapterId: number) => {
    setLocation(`/manage/tracks/${trackId}/chapters/${chapterId}`);
  };

  const handleDeleteChapter = (chapterId: number) => {
    setDeleteChapterId(chapterId);
  };

  const handleMoveChapter = (chapterId: number, direction: 'up' | 'down') => {
    moveChapterMutation.mutate({ chapterId, direction });
  };

  const handleCreateChapter = () => {
    if (!newChapter.title.trim()) return;
    createChapterMutation.mutate(newChapter);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading chapters...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
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
                <ResponsiveTitle title={track?.title || "Track"} />
                <p className="text-muted-foreground mt-2">{track?.description}</p>
              </div>
              <Button onClick={() => setCreateChapterModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Chapter
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
              onNavigate={() => handleChapterClick(chapter.id)}
              onDelete={() => handleDeleteChapter(chapter.id)}
              onMove={(direction) => handleMoveChapter(chapter.id, direction)}
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
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Create New Chapter</h2>
                <div className="space-y-4">
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
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteChapterId && (
          <ConfirmationModal
            title="Delete Chapter"
            message="Are you sure you want to delete this chapter? This action cannot be undone."
            onConfirm={() => deleteChapterMutation.mutate(deleteChapterId)}
            onCancel={() => setDeleteChapterId(null)}
            isLoading={deleteChapterMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}