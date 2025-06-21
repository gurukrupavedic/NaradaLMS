import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrackCard, ConfirmationModal } from "@/components/content-management";

interface Track {
  id: number;
  title: string;
  description: string;
  order: number;
  status: string;
  totalChapters: number;
}

export default function ManageTrackList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [createTrackModalOpen, setCreateTrackModalOpen] = useState(false);
  const [newTrack, setNewTrack] = useState({ title: "", description: "" });
  
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<number | null>(null);

  // Fetch tracks
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["/api/admin/tracks"],
  });

  // Create track mutation
  const createTrackMutation = useMutation({
    mutationFn: (trackData: { title: string; description: string }) =>
      apiRequest("/api/admin/tracks", "POST", trackData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      setCreateTrackModalOpen(false);
      setNewTrack({ title: "", description: "" });
      toast({ title: "Track created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create track", variant: "destructive" });
    },
  });

  // Update track mutation
  const editTrackMutation = useMutation({
    mutationFn: (track: Track) =>
      apiRequest(`/api/admin/tracks/${track.id}`, "PUT", track),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      setEditingTrack(null);
      toast({ title: "Track updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update track", variant: "destructive" });
    },
  });

  // Delete track mutation
  const deleteTrackMutation = useMutation({
    mutationFn: (trackId: number) => apiRequest(`/api/admin/tracks/${trackId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      setDeleteTrackId(null);
      toast({ title: "Track deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete track", variant: "destructive" });
    },
  });

  // Move track mutation
  const moveTrackMutation = useMutation({
    mutationFn: ({ trackId, direction }: { trackId: number; direction: 'up' | 'down' }) =>
      apiRequest(`/api/admin/tracks/${trackId}/move`, "PUT", { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      toast({ title: "Track order updated" });
    },
    onError: () => {
      toast({ title: "Failed to update track order", variant: "destructive" });
    },
  });

  const sortedTracks = tracks.sort((a: Track, b: Track) => a.order - b.order);

  const handleTrackClick = (trackId: number) => {
    setLocation(`/manage/tracks/${trackId}`);
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack({ ...track });
  };

  const handleDeleteTrack = (trackId: number) => {
    setDeleteTrackId(trackId);
  };

  const handleCreateTrack = () => {
    if (!newTrack.title.trim()) {
      toast({ title: "Please enter a track title", variant: "destructive" });
      return;
    }
    if (!newTrack.description.trim()) {
      toast({ title: "Please enter a track description", variant: "destructive" });
      return;
    }
    createTrackMutation.mutate(newTrack);
  };

  const handleSaveEditTrack = () => {
    if (!editingTrack?.title?.trim()) {
      toast({ title: "Please enter a track title", variant: "destructive" });
      return;
    }
    if (!editingTrack?.description?.trim()) {
      toast({ title: "Please enter a track description", variant: "destructive" });
      return;
    }
    editTrackMutation.mutate(editingTrack);
  };

  const handleMoveTrack = (trackId: number, direction: 'up' | 'down') => {
    moveTrackMutation.mutate({ trackId, direction });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading tracks...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
        <div className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto">
          <div className="space-y-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-bold">Content Management</h1>
                <p className="text-muted-foreground">Manage learning tracks and chapters</p>
              </div>
              <Button onClick={() => setCreateTrackModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Track
              </Button>
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {sortedTracks.map((track: Track, index: number) => (
            <TrackCard
              key={track.id}
              track={track}
              index={index}
              totalTracks={sortedTracks.length}
              isMovePending={moveTrackMutation.isPending}
              onNavigate={handleTrackClick}
              onEdit={handleEditTrack}
              onDelete={handleDeleteTrack}
              onMove={handleMoveTrack}
            />
          ))}
        </div>

        {(tracks as any[]).length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No tracks yet</h3>
              <p className="text-muted-foreground mb-4">Create your first learning track to get started</p>
              <Button onClick={() => setCreateTrackModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Track
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Track Modal */}
        {createTrackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Create New Track</CardTitle>
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
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCreateTrack} 
                    disabled={createTrackMutation.isPending || !newTrack.title.trim() || !newTrack.description.trim()}
                  >
                    Create Track
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCreateTrackModalOpen(false);
                      setNewTrack({ title: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Track Modal */}
        {editingTrack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Edit Track</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-track-title">Track Title</Label>
                  <Input
                    id="edit-track-title"
                    value={editingTrack.title}
                    onChange={(e) => setEditingTrack({ ...editingTrack, title: e.target.value })}
                    placeholder="Enter track title"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-track-description">Description</Label>
                  <Textarea
                    id="edit-track-description"
                    value={editingTrack.description}
                    onChange={(e) => setEditingTrack({ ...editingTrack, description: e.target.value })}
                    placeholder="Enter track description"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSaveEditTrack}
                    disabled={editTrackMutation.isPending || !editingTrack.title.trim() || !editingTrack.description.trim()}
                  >
                    Save Changes
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
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTrackId && (
          <ConfirmationModal
            title="Delete Track"
            message="Are you sure you want to delete this track? This action cannot be undone and will also delete all chapters within this track."
            onConfirm={() => deleteTrackMutation.mutate(deleteTrackId)}
            onCancel={() => setDeleteTrackId(null)}
            isLoading={deleteTrackMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}