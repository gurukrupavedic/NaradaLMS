'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/features/shared/hooks/use-toast';
import { useAuth } from '@/features/shared/hooks/useAuth';
import { TrackListItem, TrackRow } from '../components/TrackListItem';
import { ChapterListItem, ChapterRow } from '../components/ChapterListItem';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { handleJsonResponse } from '../utils/handleJsonResponse';
import { Plus, LibraryBig, BookText } from 'lucide-react';
import { useRoleGuard } from '@/features/shared/hooks/useRoleGuard';

interface DialogState {
  isOpen: boolean;
  type: 'create' | 'edit' | 'move';
  itemType: 'track' | 'chapter';
  item?: TrackRow | ChapterRow;
  trackId?: number;
}

interface DeleteState {
  isOpen: boolean;
  itemType: 'track' | 'chapter';
  item?: TrackRow | ChapterRow;
  trackId?: number;
}

export default function TracksAndChapters() {
  useRoleGuard(['content_manager']);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTrackId, setSelectedTrackId] = useLocalStorage<number | null>('content-studio-selected-track', null);
  const [columnSizes, setColumnSizes] = useLocalStorage<{ left: number; right: number }>('content-studio-column-sizes', { left: 40, right: 60 });
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, type: 'create', itemType: 'track' });
  const [deleteState, setDeleteState] = useState<DeleteState>({ isOpen: false, itemType: 'track' });
  const [formData, setFormData] = useState<{ title: string; description: string; trackId?: number }>({ title: '', description: '' });

  const isContentManager = user?.roles?.includes('content_manager');

  const tracksQuery = useQuery<TrackRow[]>({
    queryKey: ['content', 'tracks'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/content/tracks');
      return handleJsonResponse<TrackRow[]>(res, 'Failed to load tracks');
    },
  });

  const tracks = tracksQuery.data ?? [];

  useEffect(() => {
    if (!tracks.length) {
      setSelectedTrackId(null);
      return;
    }
    if (!selectedTrackId || !tracks.find((t) => t.id === selectedTrackId)) {
      setSelectedTrackId(tracks[0].id);
    }
  }, [tracks, selectedTrackId, setSelectedTrackId]);

  const chaptersQuery = useQuery<ChapterRow[]>({
    queryKey: ['content', 'tracks', selectedTrackId, 'chapters'],
    enabled: !!selectedTrackId,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/content/tracks/${selectedTrackId}/chapters`);
      return handleJsonResponse<ChapterRow[]>(res, 'Failed to load chapters');
    },
  });

  const selectedTrack = useMemo(() => tracks.find((t) => t.id === selectedTrackId) || null, [tracks, selectedTrackId]);
  const selectedTrackChapters = chaptersQuery.data ?? [];

  const handleLayoutChange = (sizes: number[]) => {
    if (sizes.length === 2) setColumnSizes({ left: sizes[0], right: sizes[1] });
  };

  const createTrackMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string }) => {
      const res = await apiRequest('POST', '/api/content/tracks', payload);
      return handleJsonResponse<TrackRow>(res, 'Failed to create track');
    },
    onSuccess: (track) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'tracks'] });
      setSelectedTrackId(track.id);
      toast({ title: 'Track created', description: track.title });
    },
    onError: (error) => {
      toast({ title: 'Could not create track', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const updateTrackMutation = useMutation({
    mutationFn: async ({ trackId, title, description }: { trackId: number; title: string; description: string }) => {
      const res = await apiRequest('PUT', `/api/content/tracks/${trackId}`, { title, description });
      return handleJsonResponse<TrackRow>(res, 'Failed to update track');
    },
    onSuccess: (track) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'tracks'] });
      toast({ title: 'Track updated', description: track.title });
    },
    onError: (error) => {
      toast({ title: 'Could not update track', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: number) => {
      const res = await apiRequest('DELETE', `/api/content/tracks/${trackId}`);
      return handleJsonResponse<{ message: string }>(res, 'Failed to delete track');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({ title: 'Track deleted' });
    },
    onError: (error) => {
      toast({ title: 'Could not delete track', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const moveTrackMutation = useMutation({
    mutationFn: async ({ trackId, direction, steps }: { trackId: number; direction: 'up' | 'down'; steps: number }) => {
      for (let i = 0; i < steps; i++) {
        const res = await apiRequest('POST', `/api/content/tracks/${trackId}/move`, { direction });
        await handleJsonResponse(res, 'Failed to reorder tracks');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['content', 'tracks'] });
    },
    onError: (error) => {
      toast({ title: 'Track reorder failed', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: async ({ trackId, title, description }: { trackId: number; title: string, description: string }) => {
      const res = await apiRequest('POST', `/api/content/tracks/${trackId}/chapters`, { title, description, content: {} });
      return handleJsonResponse<ChapterRow>(res, 'Failed to create chapter');
    },
    onSuccess: (chapter) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'tracks', chapter.trackId, 'chapters'] });
      queryClient.invalidateQueries({ queryKey: ['content', 'tracks'] });
      toast({ title: 'Chapter created', description: chapter.title });
    },
    onError: (error) => {
      toast({ title: 'Could not create chapter', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: async ({ chapterId, title, description }: { chapterId: number; title: string, description: string }) => {
      const res = await apiRequest('PUT', `/api/content/chapters/${chapterId}`, { title, description });
      return handleJsonResponse<ChapterRow>(res, 'Failed to update chapter');
    },
    onSuccess: (chapter) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'tracks', chapter.trackId, 'chapters'] });
      toast({ title: 'Chapter updated', description: chapter.title });
    },
    onError: (error) => {
      toast({ title: 'Could not update chapter', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async ({ chapterId }: { chapterId: number; trackId?: number }) => {
      const res = await apiRequest('DELETE', `/api/content/chapters/${chapterId}`);
      return handleJsonResponse<{ message: string }>(res, 'Failed to delete chapter');
    },
    onSuccess: (_data, variables) => {
      const trackId = (variables as { trackId?: number })?.trackId;
      if (trackId) {
        queryClient.invalidateQueries({ queryKey: ['content', 'tracks', trackId, 'chapters'] });
      }
      queryClient.invalidateQueries({ queryKey: ['content', 'tracks'] });
      toast({ title: 'Chapter deleted' });
    },
    onError: (error) => {
      toast({ title: 'Could not delete chapter', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const moveChapterMutation = useMutation({
    mutationFn: async ({ chapterId, toTrackId }: { chapterId: number; toTrackId: number }) => {
      const res = await apiRequest('POST', `/api/content/chapters/${chapterId}/move`, { toTrackId });
      return handleJsonResponse<{ message: string }>(res, 'Failed to move chapter');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      setSelectedTrackId(variables.toTrackId);
      toast({ title: 'Chapter moved' });
    },
    onError: (error) => {
      toast({ title: 'Could not move chapter', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const reorderChapterMutation = useMutation({
    mutationFn: async ({ chapterId, direction, steps }: { chapterId: number; direction: 'up' | 'down'; steps: number }) => {
      for (let i = 0; i < steps; i++) {
        const res = await apiRequest('POST', `/api/content/chapters/${chapterId}/move`, { direction });
        await handleJsonResponse(res, 'Failed to reorder chapters');
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables && selectedTrackId) {
        queryClient.invalidateQueries({ queryKey: ['content', 'tracks', selectedTrackId, 'chapters'] });
      }
    },
    onError: (error) => {
      toast({ title: 'Chapter reorder failed', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const openCreateDialog = (type: 'track' | 'chapter') => {
    setFormData({ title: '', description: '' });
    setDialogState({ isOpen: true, type: 'create', itemType: type });
  };

  const openEditDialog = (item: TrackRow | ChapterRow, type: 'track' | 'chapter') => {
    setFormData({ title: item.title, description: (item as any).description || '', trackId: type === 'chapter' ? (item as ChapterRow).trackId : undefined });
    setDialogState({ isOpen: true, type: 'edit', itemType: type, item, trackId: type === 'chapter' ? (item as ChapterRow).trackId : undefined });
  };

  const openMoveDialog = (chapter: ChapterRow) => {
    setFormData({ title: chapter.title, description: (chapter as any).description || '', trackId: chapter.trackId });
    setDialogState({ isOpen: true, type: 'move', itemType: 'chapter', item: chapter, trackId: chapter.trackId });
  };

  const closeDialog = () => setDialogState({ ...dialogState, isOpen: false });
  const closeDeleteDialog = () => setDeleteState({ ...deleteState, isOpen: false });

  const handleCreateTrack = () => {
    if (!formData.title.trim()) return;
    createTrackMutation.mutate({ title: formData.title, description: formData.description });
    closeDialog();
  };

  const handleEditTrack = () => {
    if (!formData.title.trim() || !dialogState.item) return;
    updateTrackMutation.mutate({ trackId: (dialogState.item as TrackRow).id, title: formData.title, description: formData.description });
    closeDialog();
  };

  const handleDeleteTrack = (track: TrackRow) => {
    if ((track.chapterCount ?? 0) > 0) {
      toast({
        title: 'Cannot delete track with chapters',
        description: 'Remove or move chapters before deleting this track.',
        variant: 'destructive',
      });
      closeDeleteDialog();
      return;
    }
    deleteTrackMutation.mutate(track.id);
    closeDeleteDialog();
  };

  const handleCreateChapter = () => {
    if (!selectedTrackId || !formData.title.trim()) return;
    createChapterMutation.mutate({ trackId: selectedTrackId, title: formData.title, description: formData.description });
    closeDialog();
  };

  const handleEditChapter = (chapter: ChapterRow) => {
    if (!formData.title.trim()) return;
    updateChapterMutation.mutate({ chapterId: chapter.id, title: formData.title, description: formData.description });
    closeDialog();
  };

  const handleDeleteChapter = (chapter: ChapterRow) => {
    deleteChapterMutation.mutate({ chapterId: chapter.id, trackId: chapter.trackId });
    closeDeleteDialog();
  };

  const handleMoveChapter = () => {
    if (!dialogState.item || !formData.trackId) return;
    const currentChapter = dialogState.item as ChapterRow;
    moveChapterMutation.mutate({ chapterId: currentChapter.id, toTrackId: formData.trackId });
    closeDialog();
  };

  const handleDragEndTrack = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = tracks;
    const oldIndex = current.findIndex((t) => t.id === active.id);
    const newIndex = current.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const updated = arrayMove(current, oldIndex, newIndex);
    queryClient.setQueryData<TrackRow[]>(['content', 'tracks'], updated);

    const direction: 'up' | 'down' = newIndex > oldIndex ? 'down' : 'up';
    const steps = Math.abs(newIndex - oldIndex);
    moveTrackMutation.mutate({ trackId: Number(active.id), direction, steps });
  };

  const handleDragEndChapter = (event: DragEndEvent) => {
    if (!selectedTrackId) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = selectedTrackChapters;
    const oldIndex = current.findIndex((c) => c.id === active.id);
    const newIndex = current.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const updated = arrayMove(current, oldIndex, newIndex);
    queryClient.setQueryData<ChapterRow[]>(['content', 'tracks', selectedTrackId, 'chapters'], updated);

    const direction: 'up' | 'down' = newIndex > oldIndex ? 'down' : 'up';
    const steps = Math.abs(newIndex - oldIndex);
    reorderChapterMutation.mutate({ chapterId: Number(active.id), direction, steps });
  };

  if (!isContentManager) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">You need the content_manager role to access Content Studio.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden p-4 w-full h-full">
        <ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange} className="h-full">
          <ResizablePanel
            defaultSize={columnSizes.left}
            minSize={25}
            maxSize={50}
            className="flex flex-col h-full bg-card/50 rounded-lg border shadow-sm mr-4"
          >
            <div className="px-4 py-2 border-b flex justify-between items-center bg-card rounded-t-lg">
              <div className="flex items-center gap-2">
                <LibraryBig className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Tracks</h2>
                <Badge variant="secondary" className="ml-2">
                  {tracksQuery.isLoading ? '…' : tracks.length}
                </Badge>
              </div>
              <Button size="sm" onClick={() => openCreateDialog('track')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Track
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4" type="hover">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTrack}>
                <SortableContext items={tracks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {tracks.map((track, idx) => (
                    <TrackListItem
                      key={track.id}
                      track={track}
                      index={idx}
                      isSelected={selectedTrackId === track.id}
                      onSelect={setSelectedTrackId}
                      onEdit={(t) => openEditDialog(t, 'track')}
                      onDelete={(t) => setDeleteState({ isOpen: true, itemType: 'track', item: t })}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {!tracks.length && !tracksQuery.isLoading && (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No tracks found.</p>
                </div>
              )}
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize={columnSizes.right}
            minSize={25}
            className="flex flex-col h-full bg-card/50 rounded-lg border shadow-sm ml-4"
          >
            {selectedTrack ? (
              <>
                <div className="px-4 py-2 border-b flex justify-between items-center bg-card rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <BookText className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="font-semibold">{selectedTrack.title}</h2>
                      <p className="text-xs text-muted-foreground">{selectedTrackChapters.length} chapters</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openCreateDialog('chapter')} disabled={!selectedTrackId}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chapter
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4" type="hover">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndChapter}>
                    <SortableContext items={selectedTrackChapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      {selectedTrackChapters.map((chapter, idx) => (
                        <ChapterListItem
                          key={chapter.id}
                          chapter={chapter}
                          index={idx}
                          onEdit={(c) => openEditDialog(c, 'chapter')}
                          onMove={(c) => openMoveDialog(c)}
                          onDelete={(c) => setDeleteState({ isOpen: true, itemType: 'chapter', item: c, trackId: selectedTrack.id })}
                          onOpen={(c) => {
                            navigate(`/app/content/tracks/${selectedTrack.id}/chapters/${c.id}`);
                          }}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {!selectedTrackChapters.length && !chaptersQuery.isLoading && (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No chapters in this track.</p>
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-2">
                <LibraryBig className="w-10 h-10 opacity-20" />
                <p>Select a track to manage chapters</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'create' ? 'Create' : dialogState.type === 'edit' ? 'Edit' : 'Move'}{' '}
              {dialogState.itemType === 'track' ? 'Track' : 'Chapter'}
            </DialogTitle>
            <DialogDescription className="hidden">{dialogState.type} {dialogState.itemType} dialog</DialogDescription>
          </DialogHeader>

          {dialogState.type === 'move' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Move chapter <span className="font-semibold text-foreground">{(dialogState.item as ChapterRow)?.title}</span> to another track:
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Track</label>
                <Select value={formData.trackId ? String(formData.trackId) : undefined} onValueChange={(val) => setFormData({ ...formData, trackId: parseInt(val) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a track" />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={handleMoveChapter}>Move Chapter</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter title" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (dialogState.itemType === 'track') {
                      dialogState.type === 'create' ? handleCreateTrack() : handleEditTrack();
                    } else if (dialogState.itemType === 'chapter') {
                      dialogState.type === 'create'
                        ? handleCreateChapter()
                        : handleEditChapter(dialogState.item as ChapterRow);
                    }
                  }}
                >
                  {dialogState.type === 'create' ? 'Create' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteState.isOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleteState.itemType === 'track' ? 'Track' : 'Chapter'}?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteState.itemType === 'track'
              ? 'This will delete the track. Tracks with chapters cannot be deleted.'
              : 'Deleting a chapter is permanent. Published chapters may require unpublishing first.'}
          </AlertDialogDescription>
          <Separator className="my-2" />
          {deleteState.itemType === 'chapter' && (deleteState.item as ChapterRow)?.status === 'published' && (
            <p className="text-sm text-amber-600">This chapter is published. Confirm to attempt deletion (may be blocked).</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteState.itemType === 'track' && deleteState.item) {
                  handleDeleteTrack(deleteState.item as TrackRow);
                } else if (deleteState.itemType === 'chapter' && deleteState.item) {
                  handleDeleteChapter(deleteState.item as ChapterRow);
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
