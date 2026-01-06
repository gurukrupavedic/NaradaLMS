/**
 * Accordion Style - Tracks & Chapters Prototype
 * Track cards expand/collapse to show inline chapters
 */

'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

export function TracksAndChaptersAccordion() {
  const [tracks, setTracks] = useState<MockTrack[]>(MOCK_TRACKS);
  const [expandedTrackId, setExpandedTrackId] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'create',
    itemType: 'track',
  });
  const [deleteState, setDeleteState] = useState<DeleteState>({ isOpen: false, itemType: 'track' });
  const [formData, setFormData] = useState({ title: '', description: '' });

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
    setTracks([...tracks, newTrack].sort((a, b) => a.order - b.order));
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
    setTracks(tracks.filter((t) => t.id !== track.id));
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
  const handleCreateChapter = (trackId: number) => {
    if (!formData.title.trim()) return;
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const newChapter: MockChapter = {
      id: Math.max(...track.chapters.map((c) => c.id), 0) + 1,
      trackId,
      title: formData.title,
      description: formData.description,
      status: 'draft',
      order: track.chapters.length + 1,
    };
    setTracks(
      tracks.map((t) =>
        t.id === trackId ? { ...t, chapters: [...t.chapters, newChapter].sort((a, b) => a.order - b.order) } : t
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

  const handleDeleteChapter = (chapter: MockChapter, trackId: number) => {
    setTracks(tracks.map((t) => (t.id === trackId ? { ...t, chapters: t.chapters.filter((c) => c.id !== chapter.id) } : t)));
    setDeleteState({ isOpen: false, itemType: 'chapter' });
  };

  const handleMoveChapter = (chapter: MockChapter, trackId: number, direction: 'up' | 'down') => {
    setTracks(
      tracks.map((t) => {
        if (t.id !== trackId) return t;
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold">Content Studio</h1>
            <p className="text-muted-foreground mt-2">Accordion Layout - Manage tracks and chapters</p>
          </div>
          <Dialog open={dialogState.isOpen && dialogState.itemType === 'track'} onOpenChange={(open) => {
            if (!open) setFormData({ title: '', description: '' });
            setDialogState({ ...dialogState, isOpen: open });
          }}>
            <DialogTrigger asChild>
              <Button
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
                  <Button variant="outline" onClick={() => setDialogState({ ...dialogState, isOpen: false })}>
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
        <div className="space-y-3">
          {tracks.map((track, index) => (
            <div key={track.id}>
              {/* Track Card */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setExpandedTrackId(expandedTrackId === track.id ? null : track.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 flex items-start gap-4">
                      <div
                        className={`mt-1 transition-transform ${expandedTrackId === track.id ? 'rotate-180' : ''}`}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{track.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{track.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">{track.chapters.length} chapters</p>
                      </div>
                    </div>

                    {/* Track Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
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
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveTrack(track, 'up');
                        }}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveTrack(track, 'down');
                        }}
                        disabled={index === tracks.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteState({ isOpen: true, itemType: 'track', item: track });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Content - Chapters */}
                {expandedTrackId === track.id && (
                  <CardContent className="border-t pt-4 space-y-3">
                    {/* Add Chapter Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Chapter
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Chapter</DialogTitle>
                          <DialogDescription>in {track.title}</DialogDescription>
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
                              onClick={() => setFormData({ title: '', description: '' })}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                handleCreateChapter(track.id);
                                setFormData({ title: '', description: '' });
                              }}
                            >
                              Create
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Chapters List */}
                    <div className="space-y-2">
                      {track.chapters.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No chapters yet</p>
                      ) : (
                        track.chapters.map((chapter, chIdx) => (
                          <Card key={chapter.id} className="bg-muted/50">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm truncate">{chapter.title}</h4>
                                    <Badge
                                      variant={chapter.status === 'published' ? 'default' : 'secondary'}
                                      className="flex-shrink-0"
                                    >
                                      {chapter.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {chapter.description}
                                  </p>
                                </div>

                                {/* Chapter Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setFormData({
                                        title: chapter.title,
                                        description: chapter.description,
                                      });
                                      setDialogState({
                                        isOpen: true,
                                        type: 'edit',
                                        itemType: 'chapter',
                                        trackId: track.id,
                                        item: chapter,
                                      });
                                    }}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleMoveChapter(chapter, track.id, 'up')}
                                    disabled={chIdx === 0}
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleMoveChapter(chapter, track.id, 'down')}
                                    disabled={chIdx === track.chapters.length - 1}
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    onClick={() =>
                                      setDeleteState({
                                        isOpen: true,
                                        itemType: 'chapter',
                                        item: chapter,
                                        trackId: track.id,
                                      })
                                    }
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="ml-2"
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
                  </CardContent>
                )}
              </Card>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {tracks.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No tracks yet. Create one to get started.</p>
            </CardContent>
          </Card>
        )}
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
                } else if (deleteState.itemType === 'chapter' && deleteState.item && deleteState.trackId) {
                  handleDeleteChapter(deleteState.item as MockChapter, deleteState.trackId);
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
