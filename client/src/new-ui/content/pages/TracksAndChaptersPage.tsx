'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { useToast } from '@/features/shared-features/hooks/use-toast';
import { useAuth } from '@/features/shared-features/hooks/useAuth';
import { Track, Chapter } from '@shared/types';
import { GripVertical, Plus, Edit2, Trash2, ArrowRight, ExternalLink, Layers, LayoutTemplate } from 'lucide-react';

type TrackRow = Track & { chapterCount?: number };
type ChapterRow = Chapter & { description?: string; hasContent?: boolean; audioFileCount?: number; segmentCount?: number };

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

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setStoredValue(JSON.parse(item));
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

async function handleJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  try {
    const errorBody = await response.json();
    throw new Error(errorBody.error?.message || errorBody.error || fallbackMessage);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(fallbackMessage);
  }
}

function TrackListItem({
  track,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  track: TrackRow;
  index: number;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onEdit: (track: TrackRow) => void;
  onDelete: (track: TrackRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || undefined,
      }}
      className={`mb-3 group relative ${isDragging ? 'opacity-80 z-20' : 'opacity-100 z-auto'}`}
    >
      <Card
        className={`relative overflow-hidden cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'border-y border-r border-l-[6px] border-l-primary border-y-border border-r-border shadow-md bg-slate-100 dark:bg-slate-800'
            : 'border hover:border-primary/50 hover:shadow-sm bg-card'
        }`}
        onClick={() => onSelect(track.id)}
      >
        <CardContent className="p-3 pl-3 flex items-stretch gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center -mr-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors px-1"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 py-1 flex flex-col justify-between gap-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-semibold text-sm leading-tight truncate ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                <span className="text-muted-foreground font-mono mr-2 font-normal opacity-70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {track.title}
              </h3>
            </div>

            {track.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{track.description}</p>
            )}

            <div className="flex items-center gap-3 pt-1 mt-auto">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>{track.chapterCount ?? 0} chapters</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-1 border-l pl-2 ml-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(track);
              }}
              title="Edit Track"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(track);
              }}
              title="Delete Track"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChapterListItem({
  chapter,
  index,
  onEdit,
  onMove,
  onDelete,
  onOpen,
}: {
  chapter: ChapterRow;
  index: number;
  onEdit: (chapter: ChapterRow) => void;
  onMove: (chapter: ChapterRow) => void;
  onDelete: (chapter: ChapterRow) => void;
  onOpen: (chapter: ChapterRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });

  const isPublished = chapter.status === 'published';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`mb-3 group relative ${isDragging ? 'opacity-80 z-20' : 'opacity-100 z-auto'}`}
    >
      <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 border hover:border-border/80">
        <div className="absolute left-0 top-0 bottom-0 w-1 transition-colors bg-transparent group-hover:bg-primary/50" />

        <CardContent className="p-4 pl-4 flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors px-1"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-sm leading-snug pt-0.5">
                <span className="text-muted-foreground font-mono mr-2 font-normal opacity-70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {chapter.title}
              </h3>
              <Badge
                variant="secondary"
                className={`flex-shrink-0 text-[10px] uppercase tracking-wider font-bold h-5 px-2 text-white ${
                  isPublished ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {chapter.status}
              </Badge>
            </div>

            {chapter.hasContent && (
              <p className="text-xs text-muted-foreground">
                {chapter.audioFileCount ?? 0} audio · {chapter.segmentCount ?? 0} mappings
              </p>
            )}

            <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border/40">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={() => onEdit(chapter)}
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={() => onMove(chapter)}
                >
                  <ArrowRight className="w-3 h-3" />
                  Move
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                  onClick={() => onDelete(chapter)}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
              </div>

              <div className="flex-1" />

              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 shadow-sm" onClick={() => onOpen(chapter)}>
                <span>Open</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TracksAndChapters() {
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
      const res = await fetch('/api/content/tracks', { credentials: 'include' });
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
      const res = await fetch(`/api/content/tracks/${selectedTrackId}/chapters`, { credentials: 'include' });
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
      const res = await fetch('/api/content/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
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
      const res = await fetch(`/api/content/tracks/${trackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description }),
      });
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
      const res = await fetch(`/api/content/tracks/${trackId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
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
        const res = await fetch(`/api/content/tracks/${trackId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ direction }),
        });
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
    mutationFn: async ({ trackId, title }: { trackId: number; title: string }) => {
      const res = await fetch(`/api/content/tracks/${trackId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, content: {} }),
      });
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
    mutationFn: async ({ chapterId, title }: { chapterId: number; title: string }) => {
      const res = await fetch(`/api/content/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
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
      const res = await fetch(`/api/content/chapters/${chapterId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
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
      const res = await fetch(`/api/content/chapters/${chapterId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toTrackId }),
      });
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
        const res = await fetch(`/api/content/chapters/${chapterId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ direction }),
        });
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
    createChapterMutation.mutate({ trackId: selectedTrackId, title: formData.title });
    closeDialog();
  };

  const handleEditChapter = (chapter: ChapterRow) => {
    if (!formData.title.trim()) return;
    updateChapterMutation.mutate({ chapterId: chapter.id, title: formData.title });
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden p-6 max-w-7xl mx-auto w-full">
        <ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange} className="h-full">
          <ResizablePanel
            defaultSize={columnSizes.left}
            minSize={25}
            maxSize={50}
            className="flex flex-col h-full bg-card/50 rounded-lg border shadow-sm mr-4"
          >
            <div className="p-4 border-b flex justify-between items-center bg-card rounded-t-lg">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
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
                <div className="p-4 border-b flex justify-between items-center bg-card rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-primary" />
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
                          onOpen={(c) => navigate(`/app/content/tracks/${selectedTrack.id}/chapters/${c.id}`)}
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
                <Layers className="w-10 h-10 opacity-20" />
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
              {dialogState.itemType === 'track' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (dialogState.itemType === 'track') {
                      dialogState.type === 'create' ? handleCreateTrack() : handleEditTrack();
                    } else if (dialogState.itemType === 'chapter' && dialogState.item) {
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
