import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Play, Check, ChevronsUpDown, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TextSegment, AudioMapping, Script } from '@shared/types/text-segmentation';
import { getSegmentText } from '@shared/utils/text-segmentation';

// Define the shape of our session configuration
export interface SessionConfig {
    startSegmentId: number;
    startTimestamp: number;
}

interface FocusSessionSetupProps {
    // Data Sources
    audioFiles: Array<{ id: number; filename: string; displayName?: string }>;
    segments: TextSegment[];
    content: any; // ContentMap
    mappings: AudioMapping[];

    // Default Context
    selectedAudioId: number | null;
    selectedScript: Script;

    // Handlers
    onAudioChange: (id: number) => void;
    onScriptChange: (script: Script) => void;
    onAudioUpload: () => void;
    onStartSession: (config: SessionConfig) => void;
    onBack?: () => void; // Optional: Hidden if no audio files
}

export function FocusSessionSetup({
    audioFiles,
    segments,
    content,
    mappings,
    selectedAudioId,
    selectedScript,
    onAudioChange,
    onScriptChange,
    onAudioUpload,
    onStartSession,
    onBack,
}: FocusSessionSetupProps) {

    // --- Local State ---
    const [openSegmentCombo, setOpenSegmentCombo] = useState(false);

    // --- Helper: Smart Defaults ---
    const getSmartStartSegmentId = React.useCallback((currentSegments: TextSegment[], currentMappings: AudioMapping[]) => {
        if (!currentSegments.length) return 0;

        // Find the first unmapped segment
        const mappedIds = new Set(currentMappings.map(m => m.segmentId));
        const firstUnmapped = currentSegments.find(s => !mappedIds.has(s.id));

        return firstUnmapped ? firstUnmapped.id : currentSegments[0].id;
    }, []);

    // Configuration State
    const [startSegmentId, setStartSegmentId] = useState<number>(() =>
        getSmartStartSegmentId(segments, mappings)
    );

    // Reset smart default when audio or segments change completely
    useEffect(() => {
        setStartSegmentId(getSmartStartSegmentId(segments, mappings));
    }, [selectedAudioId, segments, mappings, getSmartStartSegmentId]);

    const [startTimestamp, setStartTimestamp] = useState<number>(0);

    // Audio Duration (Mock or passed? ideally we have it, but setup might not load audio yet. 
    // We'll trust user input or parent might strictly need to load audio first.
    // For now, let's assume parent loaded audio context if selectedAudioId is set.
    // If we don't have max duration, we can't clamp slider perfectly, but we can set a high max.)
    // *Correction*: We don't have duration passed in props. Let's add it or just handle it gracefully.
    // Ideally user selects segment -> we find previous mapping -> set timestamp.

    // --- Effects: Smart Defaults ---

    // 1. When Script changes, segments list changes. Reset startSegmentId to first one.
    useEffect(() => {
        if (segments.length > 0) {
            // Check if current startSegmentId is still valid in new list
            const isValid = segments.some(s => s.id === startSegmentId);
            if (!isValid) {
                setStartSegmentId(segments[0].id);
            }
        }
    }, [segments, startSegmentId]);

    // 2. When Start Segment changes, auto-fill Timestamp
    useEffect(() => {
        if (!startSegmentId) return;

        // Find index of this segment
        const currentIndex = segments.findIndex(s => s.id === startSegmentId);

        if (currentIndex > 0) {
            // Find END time of PREVIOUS segment
            const prevSegment = segments[currentIndex - 1];
            const prevMapping = mappings.find(m => m.segmentId === prevSegment.id);

            if (prevMapping) {
                setStartTimestamp(prevMapping.endTime);
            } else {
                // If previous segment not mapped, maybe fallback to 0 or keep current?
                // Let's fallback to 0 to be safe, or 0 if it's the very first one being mapped.
                setStartTimestamp(0);
            }
        } else {
            // First segment always starts at 0
            setStartTimestamp(0);
        }
    }, [startSegmentId, segments, mappings]);


    // --- Helpers ---
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10); // 1 decimal place
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    };

    // Parse MM:SS.s input
    const parseTimeInput = (val: string) => {
        const parts = val.split(':');
        if (parts.length === 2) {
            const m = parseFloat(parts[0]);
            const s = parseFloat(parts[1]);
            if (!isNaN(m) && !isNaN(s)) return (m * 60) + s;
        }
        const s = parseFloat(val);
        return isNaN(s) ? 0 : s;
    };

    const currentSegmentText = useMemo(() => {
        const seg = segments.find(s => s.id === startSegmentId);
        if (!seg) return '';
        const txt = getSegmentText(seg, content, selectedScript);
        return txt.length > 50 ? txt.substring(0, 50) + '...' : txt;
    }, [startSegmentId, segments, content, selectedScript]);

    // Derived: Can we start?
    const canStart = selectedAudioId !== null && segments.length > 0;

    return (
        <div className="h-full flex flex-col p-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Presets Container */}
            <div className="h-full w-full border rounded-xl bg-background shadow-sm flex flex-col overflow-hidden">
                {/* Header */}
                <div className="pt-6 px-6 text-center space-y-2 shrink-0 max-w-3xl mx-auto w-full">
                    <h1 className="text-2xl font-semibold tracking-tight">Mapping presets</h1>
                    <p className="text-muted-foreground">Verify or change the settings before the session starts</p>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 space-y-6 flex-1 overflow-y-auto max-w-3xl mx-auto w-full">

                    {/* 1. Audio Source */}
                    <div className="space-y-2">
                        <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wide">
                            1 Audio Source
                        </Label>
                        <div className="flex gap-3">
                            <Select
                                value={selectedAudioId?.toString() || ''}
                                onValueChange={(val) => onAudioChange(parseInt(val))}
                            >
                                <SelectTrigger className="flex-1 h-11">
                                    <SelectValue placeholder="Select audio file..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {audioFiles.map(file => (
                                        <SelectItem key={file.id} value={file.id.toString()}>
                                            {file.displayName || file.filename}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-11 w-11 shrink-0 border-dashed"
                                onClick={onAudioUpload}
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* 2. Script Language */}
                    <div className="space-y-3">
                        <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wide">
                            2 Script Language
                        </Label>
                        <Select
                            value={selectedScript}
                            onValueChange={(val) => onScriptChange(val as Script)}
                        >
                            <SelectTrigger className="h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="te">Telugu</SelectItem>
                                <SelectItem value="hi">Devanagari (Hindi)</SelectItem>
                                <SelectItem value="en">English (IAST)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 3. Start Segment */}
                    <div className="space-y-3">
                        <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wide">
                            3 Start Segment
                        </Label>
                        <Popover open={openSegmentCombo} onOpenChange={setOpenSegmentCombo}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openSegmentCombo}
                                    className="w-full justify-between h-11 font-normal px-4"
                                >
                                    {startSegmentId
                                        ? (() => {
                                            const s = segments.find((segment) => segment.id === startSegmentId);
                                            if (!s) return "Select segment...";
                                            const txt = getSegmentText(s, content, selectedScript);
                                            const truncated = txt.length > 60 ? txt.substring(0, 60) + '...' : txt;
                                            const index = segments.indexOf(s);
                                            return (
                                                <span className="flex items-center gap-3">
                                                    <span className="font-mono text-sm text-slate-400">#{index + 1}</span>
                                                    <span className={cn(
                                                        "truncate",
                                                        selectedScript === 'te' || selectedScript === 'hi' ? 'font-telugu text-lg' : ''
                                                    )}>{truncated}</span>
                                                </span>
                                            );
                                        })()
                                        : <span className="text-muted-foreground">Select segment...</span>}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[700px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search segment..." className="h-10" />
                                    <CommandList>
                                        <CommandEmpty>No segment found.</CommandEmpty>
                                        <CommandGroup>
                                            {segments.map((segment, index) => {
                                                const txt = getSegmentText(segment, content, selectedScript);
                                                const truncated = txt.length > 60 ? txt.substring(0, 60) + '...' : txt;
                                                return (
                                                    <CommandItem
                                                        key={segment.id}
                                                        value={`#${index + 1} ${txt}`}
                                                        onSelect={() => {
                                                            setStartSegmentId(segment.id);
                                                            setOpenSegmentCombo(false);
                                                        }}
                                                        className="py-2.5 px-3"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-3 h-4 w-4 text-primary",
                                                                startSegmentId === segment.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <span className="font-mono text-muted-foreground w-8 shrink-0">#{index + 1}</span>
                                                        <span className={cn(
                                                            "truncate",
                                                            selectedScript === 'te' || selectedScript === 'hi' ? 'font-telugu text-lg' : ''
                                                        )}>{truncated}</span>
                                                    </CommandItem>
                                                )
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* 4. Start Timestamp */}
                    <div className="space-y-3">
                        <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wide">
                            4 Start Timestamp
                        </Label>

                        <div className="flex items-center gap-4">
                            {/* Manual Input */}
                            <div className="w-24 shrink-0">
                                <Input
                                    className="h-9 font-mono text-center bg-background"
                                    value={formatTime(startTimestamp)}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const p = parseTimeInput(val);
                                        setStartTimestamp(p);
                                    }}
                                />
                            </div>

                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setStartTimestamp(Math.max(0, startTimestamp - 1))}
                            >
                                -
                            </Button>
                            <Slider
                                value={[startTimestamp]}
                                max={300}
                                step={0.1}
                                onValueChange={(val) => setStartTimestamp(val[0])}
                                className="flex-1 cursor-pointer"
                            />
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setStartTimestamp(startTimestamp + 1)}
                            >
                                +
                            </Button>
                        </div>
                    </div>

                    {/* Footer / Start Button */}
                    <div className="pt-4 flex flex-col items-center gap-4">
                        <Button
                            size="lg"
                            className="w-full h-20 text-xl font-bold rounded-xl shadow-lg shadow-blue-900/20 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all transform active:scale-95 text-white"
                            disabled={!canStart}
                            onClick={() => onStartSession({ startSegmentId, startTimestamp })}
                        >
                            START SESSION
                            <ArrowRight className="ml-2 h-6 w-6 opacity-80" />
                        </Button>

                        {/* Back Link */}
                        {audioFiles.length > 0 && onBack && (
                            <Button
                                variant="link"
                                size="sm"
                                className="text-muted-foreground h-auto p-0 text-xs"
                                onClick={onBack}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div >

    );
}
