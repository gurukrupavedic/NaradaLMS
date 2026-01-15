import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Music, FileText, StretchHorizontal, Zap, Clock3, Info } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";

import { SegmentedTextDisplay } from "@/components/common/SegmentedTextDisplay";
import { getProficiencyLabel } from "@/new-ui/batches/utils/matrix-utils";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AudioPlayerControls } from "@/components/common/AudioPlayerControls";

interface ChapterData {
  id: number;
  trackId: number;
  title: string;
  description?: string;
  status: "draft" | "published";
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  track?: {
    id: number;
    title: string;
    order?: number;
  };
  order?: number;
}

interface TextSegment {
  id: number;
  chapterId: number;
  script: string;
  startPosition: number;
  endPosition: number;
  order: number;
  createdBy: string;
  createdAt: string;
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

export function LearnChapterPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/learning/chapter/:chapterId");
  const chapterId = params?.chapterId;

  const [contentScript, setContentScript] = useState<"te" | "hi" | "en">("te");
  const [selectedAudioFileId, setSelectedAudioFileId] = useState<number | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);
  const [learnMode, setLearnMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("study-learn-mode");
    return stored ? JSON.parse(stored) : true;
  });
  const scriptOptions = useMemo(() => ([
    { value: "te" as const, label: "Telugu" },
    { value: "hi" as const, label: "Devanagari (Hindi)" },
    { value: "en" as const, label: "English (IAST)" },
  ]), []);

  const previewAudioRef = useRef<HTMLAudioElement>(new Audio());
  const timeUpdateCleanupRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    localStorage.setItem("study-learn-mode", JSON.stringify(learnMode));
  }, [learnMode]);

  const { data: chapter, isLoading: chapterLoading } = useQuery<ChapterData>({
    queryKey: [`/api/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  const { data: textSegments = [] } = useQuery<TextSegment[]>({
    queryKey: [`/api/segments/${chapterId}/${contentScript}`],
    enabled: !!chapterId && !!contentScript,
  });

  const { data: audioFiles = [] } = useQuery<AudioFile[]>({
    queryKey: [`/api/audio-files/${chapterId}`],
    enabled: !!chapterId,
  });

  const { data: mappings = [] } = useQuery<AudioTextMapping[]>({
    queryKey: [`/api/segment-mappings/${chapterId}`],
    enabled: !!chapterId,
  });

  // Fetch student's progress for this chapter (read-only view)
  const { data: progress = [] } = useQuery<StudentProgressDTO[]>({
    queryKey: [`/api/learning/progress?chapterId=${chapterId}`],
    enabled: !!chapterId,
  });

  // Track chapter access once on mount (auto-updates lastAccessed)
  const hasTrackedAccessRef = useRef(false);
  useEffect(() => {
    if (!chapterId || hasTrackedAccessRef.current) return;
    hasTrackedAccessRef.current = true;
    fetch(`/api/learning/chapters/${chapterId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {
      // swallow errors to avoid interrupting UX
    });
  }, [chapterId]);

  useEffect(() => {
    if (audioFiles.length > 0 && !selectedAudioFileId) {
      setSelectedAudioFileId(audioFiles[0].id);
      previewAudioRef.current.src = `/uploads/${audioFiles[0].filename}`;
    }
  }, [audioFiles, selectedAudioFileId]);

  useEffect(() => {
    const audio = previewAudioRef.current;

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

  const handleSegmentClick = useCallback((segmentId: number | undefined) => {
    if (!segmentId) {
      setSelectedSegmentId(undefined);
      if (timeUpdateCleanupRef.current) {
        timeUpdateCleanupRef.current();
        timeUpdateCleanupRef.current = null;
      }
      return;
    }

    setSelectedSegmentId(segmentId);

    // Priority: selected audio file first, then fallback to any other mapping
    const mapping = mappings.find((m) =>
      m.textSegmentId === segmentId && m.audioFileId === selectedAudioFileId
    ) || mappings.find((m) => m.textSegmentId === segmentId);

    if (!mapping) return;

    if (timeUpdateCleanupRef.current) {
      timeUpdateCleanupRef.current();
      timeUpdateCleanupRef.current = null;
    }

    const audio = previewAudioRef.current;

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
      if (audioFile) {
        audio.src = `/uploads/${audioFile.filename}`;
        setSelectedAudioFileId(mapping.audioFileId);
        audio.addEventListener("loadedmetadata", () => playSegment(), { once: true });
      }
    } else {
      playSegment();
    }
  }, [mappings, selectedAudioFileId, audioFiles]);

  const chapterContent = chapter?.content || {};
  const currentScriptSegments = textSegments.filter((s) => s.script === contentScript);
  const mappedSegments = currentScriptSegments.filter((segment) =>
    mappings.some(
      (m) => m.textSegmentId === segment.id && m.audioFileId === selectedAudioFileId
    )
  );

  const currentProgress = progress[0];
  const proficiencyLevel = currentProgress?.proficiencyLevel ?? null;
  const proficiencyLabel = getProficiencyLabel(proficiencyLevel);
  const lastAccessLabel = currentProgress?.lastAccessed
    ? new Date(currentProgress.lastAccessed).toLocaleDateString()
    : "Not visited yet";

  // Derive track and chapter info from fetched chapter data
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
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950 h-[calc(100dvh-4rem)]">
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-gray-200 dark:border-gray-800 shadow-sm flex-shrink-0">
        <div className="w-full mx-auto px-6 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                {trackName ? `Track ${chapter?.track?.order || chapter?.track?.id || '?'} - ${trackName}` : 'Learn Chapter'}
              </p>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight" data-testid="text-chapter-title">
                {chapterNumber ? `Chapter ${chapterNumber} - ${displayTitle}` : displayTitle}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                className={cn(
                  "text-xs font-medium border flex items-center gap-1.5",
                  proficiencyLevel === null || proficiencyLevel === 9 ? "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" :
                    proficiencyLevel === 8 ? "bg-gray-200 text-gray-700 border-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500" :
                      proficiencyLevel === 0 ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700" :
                        proficiencyLevel === 1 ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700" :
                          proficiencyLevel === 2 ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700" :
                            proficiencyLevel === 3 ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700" :
                              proficiencyLevel === 4 ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700" :
                                "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
                )}
              >
                <span>{proficiencyLabel}</span>
                {currentProgress && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-slate-900 text-slate-50 border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-300">
                        <div className="space-y-1">
                          <p className="text-xs">
                            <span className="font-semibold">Last Evaluated:</span>{" "}
                            {currentProgress.lastEvaluatedAt
                              ? new Date(currentProgress.lastEvaluatedAt).toLocaleDateString()
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
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto lg:overflow-hidden px-4 pt-4 pb-6 md:px-4">
        <div className="flex flex-col lg:grid lg:grid-cols-3 lg:h-full h-full gap-4">
          <div className="lg:col-span-2 flex-1 min-h-0 flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-black overflow-hidden">
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Script</span>
                  <Select
                    value={contentScript}
                    onValueChange={(value) => setContentScript(value as typeof contentScript)}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-sm">
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
                {learnMode && (
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <StretchHorizontal className="h-3 w-3 text-orange-500 fill-current" />
                      {currentScriptSegments.length} segments
                    </Badge>
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Zap className="h-3 w-3 text-blue-500 fill-current" />
                      {mappedSegments.length} mapped
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Learn Mode:</span>
                <Switch
                  checked={learnMode}
                  onCheckedChange={setLearnMode}
                  className="border border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700"
                  data-testid="toggle-learn-mode"
                />
              </div>
            </div>
            <div
              className="flex-1 min-h-0 overflow-auto p-6"
            >
              {chapterContent[contentScript] ? (
                learnMode ? (
                  <SegmentedTextDisplay
                    content={chapterContent}
                    currentScript={contentScript}
                    segments={textSegments}
                    selectedSegmentId={selectedSegmentId}
                    onSegmentClick={handleSegmentClick}
                    mode="preview"
                    className=""
                  />
                ) : (
                  <div
                    className={`prose max-w-none ${contentScript === "te"
                      ? "font-telugu"
                      : contentScript === "hi"
                        ? "font-devanagari"
                        : "font-iast"
                      }`}
                    style={{ lineHeight: "1.6" }}
                    dangerouslySetInnerHTML={{ __html: chapterContent[contentScript] || "" }}
                    data-testid="html-content-view"
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-4 opacity-50" />
                  <p>No content available for this script</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4 flex-shrink-0">
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-black p-3 lg:sticky lg:top-0">
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Audio File:</label>
                <Select
                  value={selectedAudioFileId?.toString() || ""}
                  onValueChange={(value) => {
                    const audioFileId = parseInt(value);
                    const audioFile = audioFiles.find((f) => f.id === audioFileId);
                    if (audioFile) {
                      previewAudioRef.current.src = `/uploads/${audioFile.filename}`;
                      setSelectedAudioFileId(audioFileId);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-sm" data-testid="select-audio-file">
                    <SelectValue placeholder="Select audio file" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioFiles.map((file) => (
                      <SelectItem key={file.id} value={file.id.toString()}>
                        {file.displayName || file.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAudioFileId ? (
                <AudioPlayerControls
                  title={
                    audioFiles.find((f) => f.id === selectedAudioFileId)?.displayName ||
                    audioFiles.find((f) => f.id === selectedAudioFileId)?.filename ||
                    "Audio File"
                  }
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  volume={volume}
                  isMuted={isMuted}
                  playbackRate={playbackRate}
                  onPlay={() => {
                    previewAudioRef.current.play().catch(console.error);
                    setIsPlaying(true);
                  }}
                  onPause={() => {
                    previewAudioRef.current.pause();
                    setIsPlaying(false);
                  }}
                  onSeek={(time) => {
                    previewAudioRef.current.currentTime = time;
                    setCurrentTime(time);
                  }}
                  onVolumeChange={(vol) => {
                    previewAudioRef.current.volume = vol / 100;
                    setVolume(vol);
                  }}
                  onMuteToggle={() => {
                    if (previewAudioRef.current) {
                      const newMutedState = !isMuted;
                      previewAudioRef.current.muted = newMutedState;
                      setIsMuted(newMutedState);
                    }
                  }}
                  onPlaybackRateChange={(rate) => {
                    previewAudioRef.current.playbackRate = rate;
                    setPlaybackRate(rate);
                  }}
                  onSkipForward={() => {
                    if (previewAudioRef.current) {
                      previewAudioRef.current.currentTime = Math.min(previewAudioRef.current.currentTime + 10, duration);
                    }
                  }}
                  onSkipBackward={() => {
                    if (previewAudioRef.current) {
                      previewAudioRef.current.currentTime = Math.max(previewAudioRef.current.currentTime - 10, 0);
                    }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                  <Music className="w-10 h-10 mb-3 opacity-60" />
                  <p className="text-sm">Select an audio file to begin studying</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
