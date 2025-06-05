import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ChevronRight, FileText, Music } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ContentManagement() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [createTrackModalOpen, setCreateTrackModalOpen] = useState(false);
  const [editTrackModalOpen, setEditTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [newTrack, setNewTrack] = useState({ title: "", description: "" });

  // Fetch tracks
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["/api/admin/tracks"],
  });

  // Create track mutation
  const createTrackMutation = useMutation({
    mutationFn: async (trackData: { title: string; description: string }) => {
      const response = await apiRequest("POST", "/api/admin/tracks", trackData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Track created successfully" });
      setCreateTrackModalOpen(false);
      setNewTrack({ title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create track", description: error.message, variant: "destructive" });
    },
  });

  // Edit track mutation
  const editTrackMutation = useMutation({
    mutationFn: async (trackData: { id: number; title: string; description: string }) => {
      const response = await apiRequest("PUT", `/api/admin/tracks/${trackData.id}`, {
        title: trackData.title,
        description: trackData.description
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Track updated successfully" });
      setEditTrackModalOpen(false);
      setEditingTrack(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update track", description: error.message, variant: "destructive" });
    },
  });

  // Delete track mutation
  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: number) => {
      await apiRequest("DELETE", `/api/admin/tracks/${trackId}`);
    },
    onSuccess: () => {
      toast({ title: "Track deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete track", description: error.message, variant: "destructive" });
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
    setLocation(`/content-management/track/${trackId}`);
  };

  const handleEditTrack = (track: any) => {
    setEditingTrack(track);
    setEditTrackModalOpen(true);
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

  const handleDeleteTrack = (trackId: number) => {
    if (confirm("Are you sure you want to delete this track? This will also delete all its chapters.")) {
      deleteTrackMutation.mutate(trackId);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading tracks...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">Manage learning tracks and chapters</p>
        </div>

        <div className="mb-6">
          <Button onClick={() => setCreateTrackModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Track
          </Button>
        </div>

        {/* Track List */}
        <div className="grid gap-4">
          {tracks.map((track: any, index: number) => (
            <Card key={track.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-muted-foreground font-medium">
                        Track {track.order || index + 1} • {track.chapterCount || 0} chapters
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{track.title}</h3>
                    <p className="text-muted-foreground mb-3">{track.description}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTrack(track)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteTrack(track.id)}
                        disabled={deleteTrackMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleTrackClick(track.id)}
                      className="w-full"
                    >
                      Manage Chapters
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {tracks.length === 0 && (
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
      </div>
    </div>
  );
}