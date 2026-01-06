/**
 * Column Style - Tracks & Chapters Prototype
 * Master/detail layout with tracks on left, chapters on right
 */

'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { MOCK_TRACKS, type MockTrack, type MockChapter } from './mock-tracks-data';

interface DialogState {
  isOpen: boolean;
  type: 'create' | 'edit';
  itemType: 'track' | 'chapter';
  trackId?: number;
  item?: Partial<MockTrack> | Partial<MockChapter>;
}

interface DeleteState {
  isOpen: boolean;
  itemType: 'track' | 'chapter';
  item?: MockTrack | MockChapter;
  trackId?: number;
}

export function TracksAndChaptersColumn() {
  const [tracks, setTracks] = useState<MockTrack[]>(MOCK_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(tracks[0]?.id || null);
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'create',
    itemType: 'track',
  });
  const [deleteState, setDeleteState] = useState<DeleteState>({ isOpen: false, itemType: 'track' });
  const [formData, setFormData] = useState({ title: '', description: '' });

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  // Track operations
  const handleCreateTrack = () => {
    if (!formData.title.trim()) return;
    const newTrack: MockTrack = {
      id: Math.max(...tracks.map((t) => t.id)) + 1,
      title: formData.title,
      description: formData.description,
      order: tracks.length + 1,
      chapters: [],
    };
    const updated = [...tracks, newTrack].sort((a, b) => a.order - b.order);
    setTracks(updated);
    setSelectedTrackId(newTrack.id);
    setFormData({ title: '', description: '' });
    setDialogState({ isOpen: false, type: 'create', itemType: 'track' });
  };

  const handleEditTrack = (track: MockTrack) => {
    if (!formData.title.trim()) return;
    setTracks(
      tracks.map((t) =>
        t.id === track.id ? { ...t, title: formData.title, description: formData.description } : t
      )
    );
    setFormData({ title: '', description: '' });
    setDialogState({ isOpen: false, type: 'create', itemType: 'track' });
  };

  const handleDeleteTrack = (track: MockTrack) => {
    const remaining = tracks.filter((t) => t.id !== track.id);
    setTracks(remaining);
    if (selectedTrackId === track.id) {
      setSelectedTrackId(remaining[0]?.id || null);
    }
    setDeleteState({ isOpen: false, itemType: 'track' });
  };

  const handleMoveTrack = (track: MockTrack, direction: 'up' | 'down') => {
    const currentIndex = tracks.findIndex((t) => t.id === track.id);
    if ((direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === tracks.length - 1)) {
      return;
    }
    const newTracks = [...tracks];
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newTracks[currentIndex], newTracks[swapIndex]] = [newTracks[swapIndex], newTracks[currentIndex]];
    newTracks.forEach((t, i) => (t.order = i + 1));
    setTracks(newTracks);
  };

  // Chapter operations
  const handleCreateChapter = () => {
    if (!selectedTrackId || !formData.title.trim()) return;
    const track = tracks.find((t) => t.id === selectedTrackId);
    if (!track) return;
    const newChapter: MockChapter = {
      id: Math.max(...track.chapters.map((c) => c.id), 0) + 1,
      trackId: selectedTrackId,
      title: formData.title,
      description: formData.description,
      status: 'draft',
      order: track.chapters.length + 1,
    };
    setTracks(
      tracks.map((t) =>
        t.id === selectedTrackId
          ? { ...t, chapters: [...t.chapters, newChapter].sort((a, b) => a.order - b.order) }
          : t
      )
    );
    setFormData({ title: '', description: '' });
    setDialogState({ isOpen: false, type: 'create', itemType: 'track' });
  };

  const handleEditChapter = (chapter: MockChapter) => {
    if (!formData.title.trim()) return;
    setTracks(
      tracks.map((t) =>
        t.id === chapter.trackId
          ? {
              ...t,
              chapters: t.chapters.map((c) =>
                c.id === chapter.id ? { ...c, title: formData.title, description: formData.description } : c
              ),
            }
          : t
      )
    );
    setFormData({ title: '', description: '' });
    setDialogState({ isOpen: false, type: 'create', itemType: 'track' });
  };

  const handleDeleteChapter = (chapter: MockChapter) => {
    setTracks(
      tracks.map((t) =>
        t.id === chapter.trackId ? { ...t, chapters: t.chapters.filter((c) => c.id !== chapter.id) } : t
      )
    );
    setDeleteState({ isOpen: false, itemType: 'chapter' });
  };

  const handleMoveChapter = (chapter: MockChapter, direction: 'up' | 'down') => {
    if (!selectedTrack) return;
    setTracks(
      tracks.map((t) => {
        if (t.id !== selectedTrackId) return t;
        const currentIndex = t.chapters.findIndex((c) => c.id === chapter.id);
        if ((direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === t.chapters.length - 1)) {
          return t;
        }
        const newChapters = [...t.chapters];
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        [newChapters[currentIndex], newChapters[swapIndex]] = [newChapters[swapIndex], newChapters[currentIndex]];
        newChapters.forEach((c, i) => (c.order = i + 1));
        return { ...t, chapters: newChapters };
      })
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold">Content Studio</h1>
            <p className="text-muted-foreground mt-2">Column Layout - Manage tracks and chapters</p>
          </div>
        </div>

        {/* Two-Column Layout with Resizable */}
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={40} minSize={25} maxSize={75}>
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Tracks</h2>
                <Dialog open={dialogState.isOpen && dialogState.itemType === 'track'} onOpenChange={(open) => {
                  if (!open) setFormData({ title: '', description: '' });
                  setDialogState({ ...dialogState, isOpen: open });
                }}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFormData({ title: '', description: '' });
                        setDialogState({ isOpen: true, type: 'create', itemType: 'track' });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Track
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {dialogState.type === 'create' ? 'Create New Track' : 'Edit Track'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Track title"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Track description"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setDialogState({ ...dialogState, isOpen: false })}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (dialogState.type === 'create') {
                              handleCreateTrack();
                            } else if (dialogState.item) {
                              handleEditTrack(dialogState.item as MockTrack);
                            }
                          }}
                        >
                          {dialogState.type === 'create' ? 'Create' : 'Update'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Tracks List */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                {tracks.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      No tracks yet
                    </CardContent>
                  </Card>
                ) : (
                  tracks.map((track, index) => (
                    <Card
                      key={track.id}
                      className={`cursor-pointer transition-all ${
                        selectedTrackId === track.id
                          ? 'ring-2 ring-blue-500 shadow-md'
                          : 'hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedTrackId(track.id)}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">{track.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{track.description}</p>
                          <p className="text-xs text-muted-foreground">{track.chapters.length} chapters</p>

                          {/* Track Actions */}
                          <div className="flex items-center gap-1 pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ title: track.title, description: track.description });
                                setDialogState({
                                  isOpen: true,
                                  type: 'edit',
                                  itemType: 'track',
                                  item: track,
                                });
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveTrack(track, 'up');
                              }}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveTrack(track, 'down');
                              }}
                              disabled={index === tracks.length - 1}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteState({ isOpen: true, itemType: 'track', item: track });
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-4" />

          <ResizablePanel defaultSize={60} minSize={25} maxSize={75}>
            <div className="space-y-4 h-full flex flex-col">
              {selectedTrack ? (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedTrack.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{selectedTrack.chapters.length} chapters</p>
                    </div>
                    <Dialog open={dialogState.isOpen && dialogState.itemType === 'chapter'} onOpenChange={(open) => {
                      if (!open) setFormData({ title: '', description: '' });
                      setDialogState({ ...dialogState, isOpen: open });
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setFormData({ title: '', description: '' });
                            setDialogState({ isOpen: true, type: 'create', itemType: 'chapter', trackId: selectedTrackId || undefined });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Chapter
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Chapter</DialogTitle>
                          <DialogDescription>in {selectedTrack?.title}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Title</label>
                            <Input
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              placeholder="Chapter title"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Chapter description"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setFormData({ title: '', description: '' });
                                setDialogState({ ...dialogState, isOpen: false });
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                handleCreateChapter();
                              }}
                            >
                              Create
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Chapters List */}
                  <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                    {selectedTrack.chapters.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          No chapters yet
                        </CardContent>
                      </Card>
                    ) : (
                      selectedTrack.chapters.map((chapter, chIdx) => (
                        <Card key={chapter.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-medium text-sm flex-1">{chapter.title}</h3>
                                <Badge
                                  variant={chapter.status === 'published' ? 'default' : 'secondary'}
                                  className="flex-shrink-0 text-xs"
                                >
                                  {chapter.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{chapter.description}</p>

                              {/* Chapter Actions */}
                              <div className="flex items-center gap-1 pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setFormData({
                                      title: chapter.title,
                                      description: chapter.description,
                                    });
                                    setDialogState({
                                      isOpen: true,
                                      type: 'edit',
                                      itemType: 'chapter',
                                      trackId: selectedTrack.id,
                                      item: chapter,
                                    });
                                  }}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleMoveChapter(chapter, 'up')}
                                  disabled={chIdx === 0}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleMoveChapter(chapter, 'down')}
                                  disabled={chIdx === selectedTrack.chapters.length - 1}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    setDeleteState({
                                      isOpen: true,
                                      itemType: 'chapter',
                                      item: chapter,
                                      trackId: selectedTrack.id,
                                    })
                                  }
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="ml-auto text-xs h-7"
                                  onClick={() => alert(`Opening ${chapter.title} in Chapter Content Editor...`)}
                                >
                                  Open
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <Card className="flex items-center justify-center h-64">
                  <CardContent className="text-center text-muted-foreground">
                    Select a track to manage chapters
                  </CardContent>
                </Card>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteState.isOpen} onOpenChange={(open) => {
        if (!open) setDeleteState({ isOpen: false, itemType: 'track' });
      }}>
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete {deleteState.itemType === 'track' ? 'Track' : 'Chapter'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteState.itemType === 'track'
              ? 'This will delete the track and all its chapters. This action cannot be undone.'
              : 'This chapter will be permanently deleted. This action cannot be undone.'}
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteState.itemType === 'track' && deleteState.item) {
                  handleDeleteTrack(deleteState.item as MockTrack);
                } else if (deleteState.itemType === 'chapter' && deleteState.item) {
                  handleDeleteChapter(deleteState.item as MockChapter);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
