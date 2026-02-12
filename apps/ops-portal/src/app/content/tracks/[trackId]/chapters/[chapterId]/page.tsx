'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, Card, Skeleton, Button } from '@narada/ui';
import { ArrowLeft } from 'lucide-react';

import { useRoleGuard } from '@/hooks/useRoleGuard';
import { ChapterEditorProvider, useChapterEditor } from '@/lib/content/context/ChapterEditorContext';
import { AudioPlayerProvider } from '@/lib/content/context/AudioPlayerContext';
import { ChapterHeader } from '@/app/content/components/ChapterHeader/ChapterHeader';
import { TextSegmentationTab } from '@/app/content/components/TextSegmentationTab/TextSegmentationTab';
import { MappingTab } from '@/app/content/components/MappingTab/MappingTab';
import { PreviewTab } from '@/app/content/components/PreviewTab/PreviewTab';

export default function ChapterContentPage() {
    // Role guard - only content managers can access this page
    useRoleGuard(['content_manager']);

    const params = useParams();
    const chapterId = params?.chapterId as string;
    const trackId = params?.trackId as string;

    if (!chapterId || !trackId) return null;

    return (
        <ChapterEditorProvider chapterId={chapterId} trackId={trackId}>
            <ChapterContentPageContent />
        </ChapterEditorProvider>
    );
}

function ChapterContentPageContent() {
    const { isLoading, error } = useChapterEditor();
    const [activeTab, setActiveTab] = useState('text-segmentation');
    const [textSegMode, setTextSegMode] = useState<'editor' | 'segmentation'>('editor');
    const router = useRouter();

    // Preview tab state
    const [learnMode, setLearnMode] = useState(false);
    const [selectedAudioFileId, setSelectedAudioFileId] = useState<number | null>(null);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col h-[calc(100vh-4rem)] bg-background p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <div className="flex-1">
                    <Skeleton className="h-full w-full rounded-md" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col h-screen bg-background p-6">
                <Button variant="ghost" className="w-fit mb-4" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="bg-destructive/15 text-destructive p-4 rounded-md max-w-md">
                    <p className="font-semibold">Error</p>
                    <p>Failed to load chapter. Please try refreshing the page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
            <AudioPlayerProvider>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    {/* Header with Tabs and Actions */}
                    <ChapterHeader
                        activeTab={activeTab}
                        textSegMode={textSegMode}
                        onTextSegModeChange={setTextSegMode}
                        learnMode={learnMode}
                        onLearnModeChange={setLearnMode}
                        selectedAudioFileId={selectedAudioFileId}
                    />

                    {/* Tabs Content Area */}
                    <div className="flex-1 overflow-auto bg-muted/10 p-6">
                        <TabsContent value="text-segmentation" className="h-full m-0">
                            <TextSegmentationTab mode={textSegMode} />
                        </TabsContent>
                        <TabsContent value="mapping" className="h-full m-0">
                            <MappingTab
                                selectedAudioFileId={selectedAudioFileId}
                                setSelectedAudioFileId={setSelectedAudioFileId}
                            />
                        </TabsContent>
                        <TabsContent value="preview" className="h-full m-0">
                            <PreviewTab
                                learnMode={learnMode}
                                selectedAudioFileId={selectedAudioFileId}
                                onAudioFileChange={setSelectedAudioFileId}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </AudioPlayerProvider>
        </div>
    );
}
