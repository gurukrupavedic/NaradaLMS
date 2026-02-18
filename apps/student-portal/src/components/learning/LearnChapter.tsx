"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
  Button,
  Badge,
  Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  LoadingSpinner,
  cn,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  TiptapEditor
} from "@narada/ui";
import { Music, Info, StretchHorizontal, Zap } from "lucide-react";
import { SelectableTextPanel } from "./text-segmentation/SelectableTextPanel";
import { getProficiencyLabel, getCellColor } from "@/lib/matrix-utils";
import { AudioPlayerControls } from "@/components/common/AudioPlayerControls";
import type { EnrichedTextSegment as TextSegment, ContentMap } from "@narada/types";
import { useAuth } from "@/hooks/useAuth";
import { useContentContextLabelSetter } from "@/lib/learning/ContentContextLabelContext";
import { formatDate } from "@shared/utils/date";

interface ChapterData {
  id: number;
  trackId: number;
  title: string;
  description?: string;
  status: "draft" | "published";
  content: ContentMap;
  track?: {
    id: number;
    title: string;
    order?: number;
  };
  order?: number;
}

interface AudioFile {
  id: number;
  chapterId: number;
  filename: string;
  displayName?: string;
  duration: number;
}

interface AudioTextMapping {
  mappingId: number;
  audioFileId: number;
  textSegmentId: number;
  startTime: number;
  endTime: number;
}

interface StudentProgressDTO {
  id: number;
  studentId: string;
  chapterId: number;
  batchId: number | null;
  proficiencyLevel: number | null;
  lastAccessed: string | null;
  lastEvaluatedAt: string | null;
  evaluatedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function LearnChapter({ chapterId }: { chapterId: number }) {
  const { user } = useAuth();
  const setContentContextLabel = useContentContextLabelSetter();

  const [contentScript, setContentScript] = useState<"te" | "hi" | "en">("te");
  const [selectedAudioFileId, setSelectedAudioFileId] = useState<number | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);
  const [learnMode, setLearnMode] = useState<boolean>(true);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const stored = localStorage.getItem("study-learn-mode");
    if (stored !== null) {
      setLearnMode(JSON.parse(stored));
    }
  }, []);

  const [isFullScreen, setIsFullScreen] = useState(false);

  const scriptOptions = useMemo(() => ([
    { value: "te" as const, label: "Telugu" },
    { value: "hi" as const, label: "Devanagari (Hindi)" },
    { value: "en" as const, label: "English (IAST)" },
  ]), []);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio on client mount
  useEffect(() => {
    previewAudioRef.current = new Audio();
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
        previewAudioRef.current = null;
      }
    };
  }, []);
  const timeUpdateCleanupRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    localStorage.setItem("study-learn-mode", JSON.stringify(learnMode));
  }, [learnMode]);

  const { data: chapter, isLoading: chapterLoading } = useQuery<ChapterData>({
    queryKey: [`/api/content/chapters/${chapterId}/details`],
    enabled: !!chapterId,
    queryFn: async () => {
      return apiRequest<ChapterData>(`/content/chapters/${chapterId}/details`);
    }
  });

  const { data: textSegments = [] } = useQuery<TextSegment[]>({
    queryKey: [`/api/content/segments/${chapterId}/${contentScript}`],
    enabled: !!chapterId && !!contentScript && learnMode,
    queryFn: async () => {
      return apiRequest<TextSegment[]>(`/content/segments/${chapterId}/${contentScript}`);
    }
  });

  const { data: audioFiles = [] } = useQuery<AudioFile[]>({
    queryKey: [`/api/audio-files/${chapterId}`],
    enabled: !!chapterId,
    queryFn: async () => {
      return apiRequest<AudioFile[]>(`/audio-files/${chapterId}`);
    }
  });

  const { data: mappings = [] } = useQuery<AudioTextMapping[]>({
    queryKey: [`/api/segment-mappings/${chapterId}`],
    enabled: !!chapterId && learnMode,
    queryFn: async () => {
      return apiRequest<AudioTextMapping[]>(`/segment-mappings/${chapterId}`);
    }
  });

  const { data: progress = [] } = useQuery<StudentProgressDTO[]>({
    queryKey: [`/api/learning/progress?chapterId=${chapterId}&studentId=${user?.id}`],
    enabled: !!chapterId && !!user,
    queryFn: async () => {
      return apiRequest<StudentProgressDTO[]>(`/learning/progress?chapterId=${chapterId}&studentId=${user?.id}`);
    }
  });

  // Track chapter access once on mount
  const hasTrackedAccessRef = useRef(false);
  useEffect(() => {
    if (!chapterId || hasTrackedAccessRef.current) return;
    hasTrackedAccessRef.current = true;

    // Pattern B
    apiRequest(`/learning/chapters/${chapterId}/access`, { method: 'POST' })
      .catch(() => { });
  }, [chapterId]);

  // Set sidebar/breadcrumb context label (same convention as ops portal chapter content page)
  useEffect(() => {
    if (chapter?.track?.order != null && chapter?.order != null) {
      const titlePart = chapter.title ? `: ${chapter.title}` : "";
      setContentContextLabel(`Track ${chapter.track!.order}. Chapter ${chapter.order}${titlePart}`);
    } else {
      setContentContextLabel(null);
    }
    return () => setContentContextLabel(null);
  }, [chapter?.track?.order, chapter?.order, chapter?.title, setContentContextLabel]);

  // Auto-select first audio file
  useEffect(() => {
    if (audioFiles.length > 0 && !selectedAudioFileId && previewAudioRef.current) {
      setSelectedAudioFileId(audioFiles[0].id);
      previewAudioRef.current.src = `/uploads/${audioFiles[0].filename}`;
    }
  }, [audioFiles, selectedAudioFileId]);

  // Audio event listeners
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Handle audio file change
  useEffect(() => {
    if (selectedAudioFileId && previewAudioRef.current) {
      const audioFile = audioFiles.find(f => f.id === selectedAudioFileId);
      if (audioFile) {
        previewAudioRef.current.src = `/uploads/${audioFile.filename}`;
      }
    }
  }, [selectedAudioFileId, audioFiles]);

  const handleSegmentClick = useCallback((segmentId: number | undefined) => {
    if (segmentId === undefined) {
      setSelectedSegmentId(undefined);
      if (timeUpdateCleanupRef.current) {
        timeUpdateCleanupRef.current();
        timeUpdateCleanupRef.current = null;
      }
      return;
    }

    setSelectedSegmentId(segmentId);

    const mapping = mappings.find((m) =>
      m.textSegmentId === segmentId && m.audioFileId === selectedAudioFileId
    ) || mappings.find((m) => m.textSegmentId === segmentId);

    if (!mapping) return;

    if (timeUpdateCleanupRef.current) {
      timeUpdateCleanupRef.current();
      timeUpdateCleanupRef.current = null;
    }

    const audio = previewAudioRef.current;
    if (!audio) return;

    const playSegment = () => {
      audio.currentTime = mapping.startTime;
      setCurrentTime(mapping.startTime);

      const handleTimeUpdate = () => {
        if (audio.currentTime >= mapping.endTime) {
          audio.pause();
          setIsPlaying(false);
          audio.removeEventListener("timeupdate", handleTimeUpdate);
          timeUpdateCleanupRef.current = null;
        }
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      timeUpdateCleanupRef.current = () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
      };

      audio.play().catch(console.error);
      setIsPlaying(true);
    };

    if (selectedAudioFileId !== mapping.audioFileId) {
      const audioFile = audioFiles.find((f) => f.id === mapping.audioFileId);
      if (audioFile && previewAudioRef.current) {
        previewAudioRef.current.src = `/uploads/${audioFile.filename}`;
        setSelectedAudioFileId(mapping.audioFileId);
        previewAudioRef.current.addEventListener("loadedmetadata", () => playSegment(), { once: true });
      }
    } else {
      playSegment();
    }
  }, [mappings, selectedAudioFileId, audioFiles]);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(prev => !prev);
  }, []);

  const currentProgress = progress[0];
  const proficiencyLevel = currentProgress?.proficiencyLevel ?? null;
  const proficiencyLabel = getProficiencyLabel((proficiencyLevel ?? 9) as any);

  // Calculate mapped count for current script
  const mappedCount = useMemo(() => {
    if (!selectedAudioFileId || !mappings.length) return 0;
    const currentAudioMappings = mappings.filter(m => m.audioFileId === selectedAudioFileId);
    return textSegments.filter(seg =>
      currentAudioMappings.some(m => m.textSegmentId === seg.id)
    ).length;
  }, [textSegments, mappings, selectedAudioFileId]);

  const displayTitle = chapter?.title || "Learn Chapter";
  const trackName = chapter?.track?.title || undefined;
  const chapterNumber = chapter?.order || undefined;

  if (chapterLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="px-6 py-3 flex items-start justify-between">
          {/* Left: Titles aligned with rows */}
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground h-7 flex items-center">
              {trackName ? `Track ${chapter?.track?.order || chapter?.track?.id || '?'} - ${trackName}` : 'Learn Chapter'}
            </p>
            <h1 className="text-lg font-bold text-foreground leading-tight h-7 flex items-center">
              {chapterNumber ? `Chapter ${chapterNumber} - ${displayTitle}` : displayTitle}
            </h1>
          </div>

          {/* Right: Grid Layout */}
          <div className="flex flex-col gap-3">
            {/* Row 1: Audio Selector + Proficiency */}
            <div className="flex items-center gap-4">
              <div className="w-72 flex justify-end">
                {audioFiles.length > 0 && (
                  <Select
                    value={selectedAudioFileId?.toString() || ''}
                    onValueChange={(value) => setSelectedAudioFileId(parseInt(value))}
                  >
                    <SelectTrigger className="h-7 w-full text-xs border-0 shadow-none bg-transparent hover:bg-accent focus:ring-2 focus:ring-ring px-2 gap-2 text-muted-foreground hover:text-foreground transition-colors justify-start">
                      <div className="flex items-center gap-2 truncate w-full">
                        <Music className="h-3.5 w-3.5 opacity-70 flex-shrink-0" />
                        <SelectValue placeholder="Select audio" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {audioFiles.map((file) => (
                        <SelectItem key={file.id} value={file.id.toString()}>
                          {file.displayName || file.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="w-40 flex justify-end">
                {(() => {
                  let status: 'practicing' | 'completed' | 'absent' | 'not_started' = 'not_started';

                  if (proficiencyLevel === null) {
                    status = 'not_started';
                  } else if (proficiencyLevel === 8) {
                    status = 'absent';
                  } else if (proficiencyLevel === 9) {
                    status = 'not_started';
                  } else if (proficiencyLevel >= 4) {
                    status = 'completed';
                  } else {
                    status = 'practicing';
                  }

                  const colors = getCellColor((proficiencyLevel ?? 9) as any, status);

                  return (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-7 w-full justify-between text-xs font-medium border flex items-center px-3",
                        colors.bgColor,
                        colors.textColor,
                        colors.borderColor,
                        colors.darkBgColor,
                        colors.darkTextColor,
                        colors.darkBorderColor
                      )}
                    >
                      <span className="truncate">{proficiencyLabel}</span>
                      {currentProgress && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className={cn("h-3 w-3 flex-shrink-0 ml-1 opacity-70", colors.textColor, colors.darkTextColor)} />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-slate-900 text-slate-50 border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-300">
                              <div className="space-y-1">
                                <p className="text-xs">
                                  <span className="font-semibold">Last Evaluated:</span>{" "}
                                  {currentProgress.lastEvaluatedAt
                                    ? formatDate(currentProgress.lastEvaluatedAt)
                                    : "Never"}
                                </p>
                                <p className="text-xs">
                                  <span className="font-semibold">Evaluated By:</span>{" "}
                                  {currentProgress.evaluatedBy || "—"}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </Badge>
                  );
                })()}
              </div>
            </div>

            {/* Row 2: Audio Player + Learn Mode */}
            <div className="flex items-center gap-4">
              <div className="w-72 flex justify-end">
                {selectedAudioFileId && (
                  <AudioPlayerControls
                    variant="minimal"
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onPlay={() => {
                      if (previewAudioRef.current) {
                        previewAudioRef.current.play().catch(console.error);
                        setIsPlaying(true);
                      }
                    }}
                    onPause={() => {
                      if (previewAudioRef.current) {
                        previewAudioRef.current.pause();
                        setIsPlaying(false);
                      }
                    }}
                    onSeek={(time) => {
                      if (previewAudioRef.current) {
                        previewAudioRef.current.currentTime = time;
                        setCurrentTime(time);
                      }
                    }}
                    showSkipButtons={false}
                    showPlaybackRate={true}
                    className="w-full border-0 shadow-none bg-transparent p-0 gap-2"
                  />
                )}
              </div>

              <div className="w-40 flex items-center justify-between h-7 px-1">
                <span className="text-xs font-medium text-muted-foreground">Learn Mode:</span>
                <Switch
                  checked={learnMode}
                  onCheckedChange={setLearnMode}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Content Area */}
      <div className={cn("flex-1 overflow-auto bg-background p-4", { "rte-editor--fullscreen": isFullScreen })}>
        {!learnMode ? (
          // Learn Mode OFF - Tiptap HTML view
          <div className="h-full flex flex-col">
            <TiptapEditor
              content={chapter?.content?.[contentScript] || ''}
              onChange={() => { }}
              disabled={true}
              output="html"
              language={contentScript}
              currentScript={contentScript}
              onScriptChange={setContentScript}
              className="h-full"
              maxHeight="100%"
              minHeight="100%"
            />
          </div>
        ) : (
          // Learn Mode ON - Segmented view
          <div className="h-full flex flex-col">
            {/* Script selector header with badges */}
            <div className="border border-border border-b-0 rounded-t-lg bg-muted h-11 flex items-center justify-center gap-6 px-4 py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Script:</span>
                <Select
                  value={contentScript}
                  onValueChange={(value) => setContentScript(value as typeof contentScript)}
                >
                  <SelectTrigger className="h-7 w-40 text-xs bg-background border border-border">
                    <SelectValue placeholder="Script" />
                  </SelectTrigger>
                  <SelectContent className="text-sm">
                    {scriptOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="flex items-center gap-1 h-6 bg-orange-50 text-orange-700 border-orange-100">
                  <StretchHorizontal className="h-3 w-3 fill-orange-500 text-orange-600" />
                  {textSegments.length} segments
                </Badge>
                {audioFiles.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1 h-6 bg-vidyut-base/10 text-vidyut-base border-vidyut-base/20">
                    <Zap className="h-3 w-3 fill-vidyut-base text-vidyut-base" />
                    {mappedCount} mapped
                  </Badge>
                )}
              </div>
            </div>

            {/* Segmented text view */}
            <div className="flex-1 min-h-0 border border-border border-b-0 bg-card overflow-hidden relative">
              {chapter?.content?.[contentScript] ? (
                <SelectableTextPanel
                  content={chapter.content}
                  script={contentScript}
                  segments={textSegments as any}
                  selectedSegmentId={selectedSegmentId}
                  onSegmentSelect={handleSegmentClick}
                  onCreateSegment={() => { }}
                  disabled={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No content available for this script</p>
                </div>
              )}
            </div>

            {/* StatusBar with fullscreen toggle for Segmented mode */}
            <div className="rte-status-bar border border-border rounded-b-lg h-11">
              <button
                onClick={toggleFullScreen}
                aria-label={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                className="rte-button rte-button--ghost rte-menu__button"
                title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="rte-button-icon"
                >
                  {isFullScreen ? (
                    <>
                      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                    </>
                  ) : (
                    <>
                      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                    </>
                  )}
                </svg>
                <span className="rte-button__text">Fullscreen</span>
              </button>
            </div>
          </div>
        )
        }
      </div >
    </div >
  );
}
