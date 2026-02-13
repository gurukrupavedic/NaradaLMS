import React, { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Slider,
    Input,
    Popover,
    PopoverContent,
    PopoverTrigger,
    CardHeader,
    CardTitle,
    CardDescription,
    Label,
    cn
} from '@narada/ui';
import { ChevronsUpDown, Check, Plus, ArrowRight } from 'lucide-react';
import type { TextSegment, AudioMapping, Script, ContentMap } from '@narada/types';
import { getSegmentText } from '@shared/utils/text-segmentation';

export interface SessionConfig {
    startSegmentId: number;
    startTimestamp: number;
}

interface FocusSessionSetupProps {
    audioFiles: Array<{ id: number; filename: string; displayName?: string }>;
    segments: TextSegment[];
    content: ContentMap;
    mappings: AudioMapping[];
    selectedAudioId: number | null;
    selectedScript: Script;
    onAudioChange: (id: number) => void;
    onScriptChange: (script: Script) => void;
    onAudioUpload: () => void;
    onStartSession: (config: SessionConfig) => void;
    onBack?: () => void;
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
    const [openSegmentCombo, setOpenSegmentCombo] = useState(false);
    const [segmentSearchTerm, setSegmentSearchTerm] = useState('');

    const filteredSegments = React.useMemo(() => {
        if (!segmentSearchTerm) return segments;
        const lowerTerm = segmentSearchTerm.toLowerCase();
        return segments.filter((segment, index) => {
            const txt = getSegmentText(segment, content, selectedScript).toLowerCase();
            const indexStr = (index + 1).toString();
            return txt.includes(lowerTerm) || indexStr.includes(lowerTerm);
        });
    }, [segments, segmentSearchTerm, content, selectedScript]);

    const getSmartStartSegmentId = React.useCallback((currentSegments: TextSegment[], currentMappings: AudioMapping[]) => {
        if (!currentSegments.length) return 0;
        const mappedIds = new Set(currentMappings.map(m => m.segmentId));
        const firstUnmapped = currentSegments.find(s => !mappedIds.has(s.id));
        return firstUnmapped ? firstUnmapped.id : currentSegments[0].id;
    }, []);

    const [startSegmentId, setStartSegmentId] = useState<number>(() =>
        getSmartStartSegmentId(segments, mappings)
    );

    useEffect(() => {
        setStartSegmentId(getSmartStartSegmentId(segments, mappings));
    }, [selectedAudioId, segments, mappings, getSmartStartSegmentId]);

    const [startTimestamp, setStartTimestamp] = useState<number>(0);

    useEffect(() => {
        if (segments.length > 0) {
            const isValid = segments.some(s => s.id === startSegmentId);
            if (!isValid) {
                setStartSegmentId(segments[0].id);
            }
        }
    }, [segments, startSegmentId]);

    useEffect(() => {
        if (!startSegmentId) return;
        const currentIndex = segments.findIndex(s => s.id === startSegmentId);

        if (currentIndex > 0) {
            const prevSegment = segments[currentIndex - 1];
            const prevMapping = mappings.find(m => m.segmentId === prevSegment.id);
            if (prevMapping) {
                setStartTimestamp(prevMapping.endTime);
            } else {
                setStartTimestamp(0);
            }
        } else {
            setStartTimestamp(0);
        }
    }, [startSegmentId, segments, mappings]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    };

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

    const canStart = selectedAudioId !== null && segments.length > 0;

    return (
        <div className="h-full flex flex-col p-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="h-full w-full border rounded-xl bg-card flex flex-col overflow-hidden">
                <CardHeader className="text-center space-y-2 shrink-0 border-b bg-muted py-4">
                    <CardTitle className="text-2xl font-semibold tracking-tight font-vedic-title text-foreground">Mapping presets</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">Verify or change the settings before the session starts</CardDescription>
                </CardHeader>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto max-w-3xl mx-auto w-full">
                    <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-bold text-vidyut-base/70 tracking-widest flex items-center gap-2">
                            <span className="flex items-center justify-center w-4 h-4 rounded bg-vidyut-base/10 text-[10px]">1</span>
                            Audio Source
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

                    <div className="space-y-3">
                        <Label className="uppercase text-[10px] font-bold text-vidyut-base/70 tracking-widest flex items-center gap-2">
                            <span className="flex items-center justify-center w-4 h-4 rounded bg-vidyut-base/10 text-[10px]">2</span>
                            Script Language
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

                    <div className="space-y-3">
                        <Label className="uppercase text-[10px] font-bold text-vidyut-base/70 tracking-widest flex items-center gap-2">
                            <span className="flex items-center justify-center w-4 h-4 rounded bg-vidyut-base/10 text-[10px]">3</span>
                            Start Segment
                        </Label>
                        <Popover open={openSegmentCombo} onOpenChange={setOpenSegmentCombo}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openSegmentCombo}
                                    className="w-full justify-between h-11 font-normal px-4 py-2 text-left transition-all"
                                >
                                    {startSegmentId
                                        ? (() => {
                                            const s = segments.find((segment) => segment.id === startSegmentId);
                                            if (!s) return "Select segment...";
                                            const txt = getSegmentText(s, content, selectedScript);
                                            const truncated = txt.length > 60 ? txt.substring(0, 60) + '...' : txt;
                                            const index = segments.indexOf(s);
                                            return (
                                                <span className="flex items-center gap-4">
                                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-mantra-base text-white shrink-0">#{index + 1}</span>
                                                    <span
                                                        className={cn(
                                                            "whitespace-normal leading-relaxed py-1 block",
                                                            selectedScript === 'en' ? 'text-sm' : 'text-xl'
                                                        )}
                                                        style={{
                                                            fontFamily: selectedScript === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
                                                                selectedScript === 'hi' ? "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif" :
                                                                    "'AdishilaSan', 'Noto Sans', sans-serif"
                                                        }}
                                                    >{truncated}</span>
                                                </span>
                                            );
                                        })()
                                        : <span className="text-muted-foreground">Select segment...</span>}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <div className="flex flex-col">
                                    <div className="p-2 border-b">
                                        <Input
                                            placeholder="Search segment..."
                                            className="h-9"
                                            value={segmentSearchTerm}
                                            onChange={(e) => setSegmentSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                        {filteredSegments.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                No segment found.
                                            </div>
                                        ) : (
                                            filteredSegments.map((segment, index) => {
                                                const txt = getSegmentText(segment, content, selectedScript);
                                                const truncated = txt.length > 60 ? txt.substring(0, 60) + '...' : txt;
                                                // Find original index
                                                const originalIndex = segments.findIndex(s => s.id === segment.id);

                                                return (
                                                    <div
                                                        key={segment.id}
                                                        className={cn(
                                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                                            startSegmentId === segment.id && "bg-accent text-accent-foreground"
                                                        )}
                                                        onClick={() => {
                                                            setStartSegmentId(segment.id);
                                                            setOpenSegmentCombo(false);
                                                            setSegmentSearchTerm('');
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                startSegmentId === segment.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-mantra-base text-white w-10 shrink-0 text-center mr-2">
                                                            #{originalIndex + 1}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "whitespace-normal leading-relaxed py-1.5 block flex-1",
                                                                selectedScript === 'en' ? 'text-base' : 'text-2xl'
                                                            )}
                                                            style={{
                                                                fontFamily: selectedScript === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
                                                                    selectedScript === 'hi' ? "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif" :
                                                                        "'AdishilaSan', 'Noto Sans', sans-serif"
                                                            }}
                                                        >{truncated}</span>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-3">
                        <Label className="uppercase text-[10px] font-bold text-vidyut-base/70 tracking-widest flex items-center gap-2">
                            <span className="flex items-center justify-center w-4 h-4 rounded bg-vidyut-base/10 text-[10px]">4</span>
                            Start Timestamp
                        </Label>

                        <div className="flex items-center gap-4">
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

                    <div className="pt-4 flex flex-col items-center gap-4">
                        <Button
                            size="lg"
                            className="w-full h-16 text-lg font-bold rounded-xl shadow-lg shadow-blue-900/10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all transform active:scale-[0.98] text-white group"
                            disabled={!canStart}
                            onClick={() => onStartSession({ startSegmentId, startTimestamp })}
                        >
                            START MAPPING SESSION
                            <ArrowRight className="ml-2 h-5 w-5 opacity-80 group-hover:translate-x-1 transition-transform" />
                        </Button>

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
