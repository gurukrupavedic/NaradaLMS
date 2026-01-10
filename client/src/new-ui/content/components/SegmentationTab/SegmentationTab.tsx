import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Plus, Type, Ruler, FileText } from 'lucide-react';
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
import { AnnotationLayer } from '@/components/text-segmentation/AnnotationLayer';
import { useChapterEditor } from '@/new-ui/content/context/ChapterEditorContext';
import { useTextSegmentationEditor } from '@/new-ui/content/hooks/useTextSegmentationEditor';
import { useLocalStorage } from '@/new-ui/content/hooks/useLocalStorage';
import { useQueryClient } from '@tanstack/react-query';
import { SegmentList } from './SegmentList';

export function SegmentationTab() {
    const { chapter, isPublished, chapterId } = useChapterEditor();
    const queryClient = useQueryClient();

    const {
        selectedScript,
        setSelectedScript,
        currentSelection,
        hasSelection,
        handleTextSelection,
        textSegments,
        scriptSegments,
        allChapterMappings,
        selectedSegmentId,
        setSelectedSegmentId,
        createSegment,
        createSegmentFromSelection,
        deleteSegment,
        isCreating,
        getMappingStatus,
        reorderSegments,
    } = useTextSegmentationEditor();

    // Set up sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = scriptSegments.findIndex(s => s.id === active.id);
        const newIndex = scriptSegments.findIndex(s => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistic update
        const reordered = arrayMove(scriptSegments, oldIndex, newIndex);
        queryClient.setQueryData(
            ['content', 'chapters', chapterId, 'segments'],
            (old: any) => {
                if (!old) return old;
                // Remove segments of the current script and append the reordered ones
                const others = old.filter((seg: any) => seg.script !== selectedScript);
                return [...others, ...reordered];
            }
        );

        // Backend update
        reorderSegments(reordered);
    };

    // Panel size persistence (matching Tracks & Chapters pattern)
    const [panelSizes, setPanelSizes] = useLocalStorage('segmentation-panel-sizes-v2', {
        text: 50,
        segments: 50,
    });

    const handleLayoutChange = (sizes: number[]) => {
        if (sizes.length === 2) {
            setPanelSizes({ text: sizes[0], segments: sizes[1] });
        }
    };

    // Calculate segment counts per script
    const segmentCounts = useMemo(() => ({
        te: textSegments.filter(s => s.script === 'te').length,
        hi: textSegments.filter(s => s.script === 'hi').length,
        en: textSegments.filter(s => s.script === 'en').length,
    }), [textSegments]);

    // Calculate mapped count for current script
    const scriptMappings = useMemo(() => {
        return allChapterMappings.filter(mapping => {
            const segment = textSegments.find(s => s.id === mapping.textSegmentId);
            return segment?.script === selectedScript;
        }).length;
    }, [allChapterMappings, textSegments, selectedScript]);

    return (
        <div className="h-full">
            {/* Resizable Panel Group */}
            <ResizablePanelGroup
                direction="horizontal"
                onLayout={handleLayoutChange}
                className="h-full gap-4"
            >
                {/* Left Panel: Text Content */}
                <ResizablePanel
                    defaultSize={panelSizes.text}
                    minSize={40}
                    maxSize={80}
                >
                    <Card className="h-full flex flex-col overflow-hidden">
                        <div className="px-6 h-14 bg-gray-50 border-b flex-shrink-0 flex items-center">
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Text Content ({selectedScript.toUpperCase()})
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-700">Script</span>
                                    <Select
                                        value={selectedScript}
                                        onValueChange={(value) => setSelectedScript(value as 'te' | 'hi' | 'en')}
                                        disabled={isPublished}
                                    >
                                        <SelectTrigger className="h-8 w-48 text-xs bg-white border border-gray-200 shadow-sm">
                                            <SelectValue placeholder="Select script" />
                                        </SelectTrigger>
                                        <SelectContent className="text-sm">
                                            <SelectItem value="te">Telugu</SelectItem>
                                            <SelectItem value="hi">Devanagari (Hindi)</SelectItem>
                                            <SelectItem value="en">English (IAST)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            {isPublished && (
                                <Alert className="mb-4">
                                    <AlertDescription>
                                        This chapter is published. Text segmentation is disabled.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {hasSelection && !isPublished && (
                                <div className="p-3 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Text selected: "{currentSelection?.selectedText?.substring(0, 50)}
                                        {(currentSelection?.selectedText?.length || 0) > 50 ? '...' : ''}"
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                        Position: {currentSelection?.start} - {currentSelection?.end}
                                    </p>
                                </div>
                            )}

                            {/* Hide AnnotationLayer's internal header and remove redundant container styling */}
                            <div className="[&_.bg-white>div:first-child]:hidden [&_.bg-white]:!border-0 [&_.bg-white]:!rounded-none [&_.bg-white]:!shadow-none [&_.bg-white]:!bg-transparent">
                                <AnnotationLayer
                                    content={chapter?.content || { te: '', hi: '', en: '' }}
                                    currentScript={selectedScript}
                                    segments={scriptSegments}
                                    selectedSegmentId={selectedSegmentId}
                                    onSegmentSelect={setSelectedSegmentId}
                                    onSegmentCreate={createSegmentFromSelection}
                                    onSegmentUpdate={(id, updates) => {
                                        console.log('Segment update requested', id, updates);
                                    }}
                                    onSegmentDelete={(id) => {
                                        deleteSegment(id);
                                    }}
                                    onScriptChange={setSelectedScript}
                                    availableScripts={['te', 'hi', 'en']}
                                />
                            </div>

                            {!chapter?.content?.[selectedScript] && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">
                                        No content available for {selectedScript.toUpperCase()}
                                    </p>
                                    <p className="text-xs mt-1">
                                        Add content in the Content tab first
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel: Segments */}
                <ResizablePanel
                    defaultSize={panelSizes.segments}
                    minSize={20}
                    maxSize={60}
                >
                    <Card className="h-full flex flex-col overflow-hidden">
                        <div className="px-6 h-14 bg-gray-50 border-b flex-shrink-0 flex items-center">
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Text Segments ({scriptSegments.length})
                                </h2>
                                {hasSelection && !isPublished && (
                                    <Badge variant="secondary">
                                        Selection: {currentSelection?.start}-{currentSelection?.end}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <CardContent className="flex-1 overflow-auto p-4">
                            {!isPublished && hasSelection && (
                                <Button
                                    onClick={createSegment}
                                    disabled={!hasSelection || isCreating}
                                    className="w-full mb-4"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {isCreating ? 'Creating...' : 'Create Segment'}
                                </Button>
                            )}

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={scriptSegments.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <SegmentList
                                        segments={scriptSegments}
                                        mappings={allChapterMappings}
                                        onDelete={deleteSegment}
                                        getMappingStatus={getMappingStatus}
                                        isPublished={isPublished}
                                        selectedSegmentId={selectedSegmentId}
                                        onSelect={setSelectedSegmentId}
                                        content={chapter?.content}
                                        script={selectedScript}
                                    />
                                </SortableContext>
                            </DndContext>
                        </CardContent>
                    </Card>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div >
    );
}
