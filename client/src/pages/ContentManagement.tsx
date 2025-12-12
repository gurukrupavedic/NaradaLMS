import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from "@/components/design-system";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrackCard, ConfirmationModal } from "@/components/content-management";

import type { Track } from '@shared/schema';

export function ContentManagement() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [createTrackModalOpen, setCreateTrackModalOpen] = useState(false);
  const [editTrackModalOpen, setEditTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [newTrack, setNewTrack] = useState({ title: "", description: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, track: Track | null}>({
    show: false,
    track: null
  });

  // Fetch tracks
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  // Memoized sorted tracks for performance
  const sortedTracks = useMemo(() => 
    tracks.sort((a, b) => a.order - b.order), [tracks]
  );

  // Create track mutation
  const createTrackMutation = useMutation({
    mutationFn: async (trackData: { title: string; description: string }) => {
      const response = await apiRequest("POST", "/api/tracks", trackData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Track created successfully" });
      setCreateTrackModalOpen(false);
      setNewTrack({ title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
    },
    onError: (error: any) => {
      let userMessage = "Failed to create track.";
      
      if (error.isClientError) {
        if (error.status === 400) {
          userMessage = "Invalid track data. Please check your inputs.";
        } else if (error.status === 409) {
          userMessage = "A track with this title already exists.";
        } else if (error.status === 422) {
          userMessage = "Please provide a valid title and description.";
        }
      } else if (error.isServerError || error.isNetworkError) {
        userMessage = error.isNetworkError 
          ? "Network connection lost. Please check your connection and try again."
          : "Server temporarily unavailable. Please try again in a few moments.";
      }

      toast({ 
        title: "Failed to create track", 
        description: userMessage, 
        variant: "destructive" 
      });
    },
  });

  // Edit track mutation
  const editTrackMutation = useMutation({
    mutationFn: async (trackData: { id: number; title: string; description: string }) => {
      const response = await apiRequest("PUT", `/api/tracks/${trackData.id}`, {
        title: trackData.title,
        description: trackData.description
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Track updated successfully" });
      setEditTrackModalOpen(false);
      setEditingTrack(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update track", description: error.message, variant: "destructive" });
    },
  });

  // Delete track mutation
  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: number) => {
      await apiRequest("DELETE", `/api/tracks/${trackId}`);
    },
    onSuccess: () => {
      toast({ title: "Track deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete track", description: error.message, variant: "destructive" });
    },
  });

  // Move track mutation
  const moveTrackMutation = useMutation({
    mutationFn: async ({ trackId, direction }: { trackId: number; direction: 'up' | 'down' }) => {
      const response = await apiRequest("POST", `/api/tracks/${trackId}/move`, { direction });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Track order updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update track order", description: error.message, variant: "destructive" });
    },
  });

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

  const handleTrackClick = (trackId: number) => {
    setLocation(`/manage/tracks/${trackId}`);
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
    setEditTrackModalOpen(true);
  };

  const handleDeleteTrack = (track: Track) => {
    setDeleteConfirm({ show: true, track });
  };

  const confirmDeleteTrack = () => {
    if (deleteConfirm.track) {
      deleteTrackMutation.mutate(deleteConfirm.track.id);
      setDeleteConfirm({ show: false, track: null });
    }
  };

  const handleUpdateTrack = () => {
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
        {editTrackModalOpen && editingTrack && (
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
                    onClick={handleUpdateTrack} 
                    disabled={editTrackMutation.isPending || !editingTrack.title?.trim() || !editingTrack.description?.trim()}
                  >
                    Update Track
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditTrackModalOpen(false);
                      setEditingTrack(null);
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
          onClose={() => setDeleteConfirm({ show: false, track: null })}
          onConfirm={confirmDeleteTrack}
          title="Delete Track"
          message={`Are you sure you want to delete "${deleteConfirm.track?.title}"? This will also delete all its chapters and cannot be undone.`}
          confirmLabel="Delete Track"
          isLoading={deleteTrackMutation.isPending}
        />
      </div>
    </div>
  );
}