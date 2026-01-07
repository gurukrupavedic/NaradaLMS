'use client';

import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, LayoutTemplate, Layers } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { ThemeToggle } from '@/components/ui/theme-toggle';

import { MOCK_TRACKS, type MockTrack, type MockChapter } from '../mock-tracks-data';
import { SortableTrackItem } from './SortableTrackItem';
import { SortableChapterItem } from './SortableChapterItem';

// Simple hook for local storage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    // Safe default for SSR (though this is a client component)
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
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

interface DialogState {
    isOpen: boolean;
    type: 'create' | 'edit' | 'move';
    itemType: 'track' | 'chapter';
    trackId?: number;
    item?: Partial<MockTrack> | Partial<MockChapter>;
}

export function TracksAndChaptersRefined() {
    // -- State --
    const [tracks, setTracks] = useState<MockTrack[]>(MOCK_TRACKS);
    const [selectedTrackId, setSelectedTrackId] = useLocalStorage<number | null>('content-studio-selected-track', tracks[0]?.id || null);
    const [columnSizes, setColumnSizes] = useLocalStorage<{ left: number; right: number }>('content-studio-column-sizes', { left: 40, right: 60 });
    const [searchQuery, setSearchQuery] = useState('');

    const [dialogState, setDialogState] = useState<DialogState>({
        isOpen: false,
        type: 'create',
        itemType: 'track',
    });
    const [deleteState, setDeleteState] = useState<{ isOpen: boolean; itemType: 'track' | 'chapter'; item?: any; trackId?: number }>({
        isOpen: false,
        itemType: 'track'
    });
    const [formData, setFormData] = useState<{ title: string; description: string; trackId?: number }>({ title: '', description: '', trackId: undefined });

    // -- Derived State --
    const filteredTracks = tracks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
    const selectedTrackChapters = selectedTrack
        ? selectedTrack.chapters.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    // -- DnD Sensors --
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require drag of 8px to start, preventing accidental drags on click
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // -- Handlers --

    // Layout Persistence
    const handleLayoutChange = (sizes: number[]) => {
        if (sizes.length === 2) {
            setColumnSizes({ left: sizes[0], right: sizes[1] });
        }
    };

    // Track CRUD
    const handleCreateTrack = () => {
        if (!formData.title.trim()) return;
        const newTrack: MockTrack = {
            id: Math.max(...tracks.map(t => t.id), 0) + 1,
            title: formData.title,
            description: formData.description,
            order: tracks.length + 1,
            chapters: [],
        };
        setTracks([...tracks, newTrack]);
        setSelectedTrackId(newTrack.id);
        closeDialog();
    };

    const handleEditTrack = (track: MockTrack) => {
        setTracks(tracks.map(t => t.id === track.id ? { ...t, ...formData } : t));
        closeDialog();
    };

    const handleDeleteTrack = (track: MockTrack) => {
        const remaining = tracks.filter(t => t.id !== track.id);
        setTracks(remaining);
        if (selectedTrackId === track.id) setSelectedTrackId(remaining[0]?.id || null);
        closeDeleteDialog();
    };

    // Chapter CRUD
    const handleCreateChapter = () => {
        if (!selectedTrackId || !formData.title.trim()) return;
        const track = tracks.find(t => t.id === selectedTrackId);
        if (!track) return;

        const newChapter: MockChapter = {
            id: Math.max(...tracks.flatMap(t => t.chapters).map(c => c.id), 0) + 1,
            trackId: selectedTrackId,
            title: formData.title,
            description: formData.description,
            status: 'draft',
            order: track.chapters.length + 1,
        };

        setTracks(tracks.map(t =>
            t.id === selectedTrackId
                ? { ...t, chapters: [...t.chapters, newChapter] }
                : t
        ));
        closeDialog();
    };

    const handleEditChapter = (chapter: MockChapter) => {
        setTracks(tracks.map(t =>
            t.id === chapter.trackId
                ? { ...t, chapters: t.chapters.map(c => c.id === chapter.id ? { ...c, ...formData } : c) }
                : t
        ));
        closeDialog();
    };

    const handleDeleteChapter = (chapter: MockChapter) => {
        setTracks(tracks.map(t =>
            t.id === chapter.trackId
                ? { ...t, chapters: t.chapters.filter(c => c.id !== chapter.id) }
                : t
        ));
        closeDeleteDialog();
    };

    const openCreateDialog = (type: 'track' | 'chapter') => {
        setFormData({ title: '', description: '' });
        setDialogState({ isOpen: true, type: 'create', itemType: type });
    };

    const openMoveDialog = (chapter: MockChapter) => {
        setFormData({ title: chapter.title, description: chapter.description, trackId: chapter.trackId });
        setDialogState({ isOpen: true, type: 'move', itemType: 'chapter', item: chapter, trackId: chapter.trackId });
    };

    const handleMoveChapter = () => {
        if (!dialogState.item || !formData.trackId) return;
        const currentChapter = dialogState.item as MockChapter;

        if (formData.trackId !== currentChapter.trackId) {
            setTracks(tracks.map(t => {
                if (t.id === currentChapter.trackId) {
                    return { ...t, chapters: t.chapters.filter(c => c.id !== currentChapter.id) };
                }
                if (t.id === formData.trackId) {
                    return { ...t, chapters: [...t.chapters, { ...currentChapter, trackId: formData.trackId! }] };
                }
                return t;
            }));
        }
        closeDialog();
    }

    const openEditDialog = (item: MockTrack | MockChapter, type: 'track' | 'chapter') => {
        setFormData({
            title: item.title,
            description: item.description,
            trackId: type === 'chapter' ? (item as MockChapter).trackId : undefined
        });
        setDialogState({ isOpen: true, type: 'edit', itemType: type, item, trackId: type === 'chapter' ? (item as MockChapter).trackId : undefined });
    };

    const closeDialog = () => setDialogState({ ...dialogState, isOpen: false });
    const closeDeleteDialog = () => setDeleteState({ ...deleteState, isOpen: false });

    // DnD Handlers
    const handleDragEndTrack = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setTracks((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleDragEndChapter = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!selectedTrack || active.id === over?.id) return;

        const oldIndex = selectedTrack.chapters.findIndex((c) => c.id === active.id);
        const newIndex = selectedTrack.chapters.findIndex((c) => c.id === over?.id);

        const newChapters = arrayMove(selectedTrack.chapters, oldIndex, newIndex);

        setTracks(tracks.map(t =>
            t.id === selectedTrack.id ? { ...t, chapters: newChapters } : t
        ));
    };


    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b bg-card px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Content Studio</h1>
                    <p className="text-sm text-muted-foreground">Manage tracks and chapters</p>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-6 max-w-7xl mx-auto w-full">
                <ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange} className="h-full">
                    {/* Tracks Column */}
                    <ResizablePanel defaultSize={columnSizes.left} minSize={25} maxSize={50} className="flex flex-col h-full bg-card/50 rounded-lg border shadow-sm mr-4">
                        <div className="p-4 border-b flex justify-between items-center bg-card rounded-t-lg">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold">Tracks</h2>
                                <Badge variant="secondary" className="ml-2">{tracks.length}</Badge>
                            </div>
                            <Button size="sm" onClick={() => openCreateDialog('track')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Track
                            </Button>
                        </div>
                        <ScrollArea className="flex-1 p-4" type="hover">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEndTrack}
                            >
                                <SortableContext
                                    items={filteredTracks.map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {filteredTracks.map((track, idx) => (
                                        <SortableTrackItem
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

                                {filteredTracks.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <p>No tracks found.</p>
                                        {searchQuery && <Button variant="link" onClick={() => setSearchQuery('')} className="h-auto p-0">Clear search</Button>}
                                    </div>
                                )}
                            </DndContext>
                        </ScrollArea>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Chapters Column */}
                    <ResizablePanel defaultSize={columnSizes.right} minSize={25} className="flex flex-col h-full bg-card/50 rounded-lg border shadow-sm ml-4">
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
                                    <Button size="sm" onClick={() => openCreateDialog('chapter')}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Chapter
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1 p-4" type="hover">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEndChapter}
                                    >
                                        <SortableContext
                                            items={selectedTrackChapters.map(c => c.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {selectedTrackChapters.map((chapter, idx) => (
                                                <SortableChapterItem
                                                    key={chapter.id}
                                                    chapter={chapter}
                                                    index={idx}
                                                    onEdit={(c) => openEditDialog(c, 'chapter')}
                                                    onMove={(c) => openMoveDialog(c)}
                                                    onDelete={(c) => setDeleteState({ isOpen: true, itemType: 'chapter', item: c, trackId: selectedTrack.id })}
                                                    onOpen={(c) => alert(`Opening content editor for: ${c.title}`)}
                                                />
                                            ))}
                                        </SortableContext>

                                        {selectedTrackChapters.length === 0 && (
                                            <div className="text-center py-10 text-muted-foreground">
                                                <p>No chapters in this track.</p>
                                            </div>
                                        )}
                                    </DndContext>
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

            {/* Dialogs */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogState.type === 'create' ? 'Create' : dialogState.type === 'edit' ? 'Edit' : 'Move'} {dialogState.itemType === 'track' ? 'Track' : 'Chapter'}
                        </DialogTitle>
                        <DialogDescription className="hidden">
                            {dialogState.type} {dialogState.itemType} dialog
                        </DialogDescription>
                    </DialogHeader>
                    {dialogState.type === 'move' ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Move chapter <span className="font-semibold text-foreground">{(dialogState.item as MockChapter)?.title}</span> to another track:
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Track</label>
                                <Select
                                    value={formData.trackId ? String(formData.trackId) : undefined}
                                    onValueChange={(val) => setFormData({ ...formData, trackId: parseInt(val) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a track" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tracks.map(t => (
                                            <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                                <Button onClick={handleMoveChapter}>Move Chapter</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Enter title" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Enter description" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                                <Button onClick={() => {
                                    if (dialogState.itemType === 'track') {
                                        dialogState.type === 'create' ? handleCreateTrack() : handleEditTrack(dialogState.item as MockTrack);
                                    } else {
                                        dialogState.type === 'create' ? handleCreateChapter() : handleEditChapter(dialogState.item as MockChapter);
                                    }
                                }}>
                                    {dialogState.type === 'create' ? 'Create' : 'Save'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteState.isOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
                <AlertDialogContent>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {deleteState.itemType === 'track'
                            ? "This action cannot be undone. This will permanently delete the track and all associated chapters."
                            : "This action cannot be undone. This will permanently delete the chapter."}
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => {
                            if (deleteState.itemType === 'track') handleDeleteTrack(deleteState.item);
                            else handleDeleteChapter(deleteState.item);
                        }}>Delete</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
