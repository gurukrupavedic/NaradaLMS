// React & Core
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Internal Libraries
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { extractPlainText, isHtmlContent, plainTextToHtml } from "@/lib/html-utils";

// Phase 4A: Custom Hooks
import { useChapterData } from "@/hooks/useChapterData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useSegmentData } from "@/hooks/useSegmentData";
import { useTextSegmentation } from "@/hooks/useTextSegmentation";

// Phase 4B: Tab Components
import { ContentTab } from "@/components/chapter-editor/ContentTab";
import { AudioMappingTab } from "@/components/chapter-editor/AudioMappingTab";
import { SegmentationTab } from "@/components/chapter-editor/SegmentationTab";
import { ChapterHeader } from "@/components/chapter-editor/ChapterHeader";

// Phase 4C: Context Integration
import { ChapterEditorProvider } from "@/contexts/ChapterEditorContext";
import { ContentTabWithContext } from "@/components/chapter-editor/ContentTabWithContext";

// Phase 5A: Performance Optimization
import { TabLoadingSkeleton } from "@/components/ui/tab-loading-skeleton";

// Phase 5C: Query Optimization
import { usePrefetchAdjacentChapters, usePrefetchAudioMetadata } from "@/lib/query-prefetch";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Business Components
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// Phase 5A: Bundle Optimization - Use centralized icon imports
import {
  FileText, Upload, Music, Eye, ChevronLeft, Play, Pause, Square,
  MapPin, X, Trash2, Plus, ArrowRight, Save, Edit2, Link2, Link2Off, Clock,
  Timer, Ruler, Type, Settings,
} from "@/lib/icons";
import { useLocation } from "wouter";
import { ScriptSelector } from "@/components/common/ScriptSelector";
import { AnnotationLayer } from "@/components/text-segmentation/AnnotationLayer";
import { SegmentPanel } from "@/components/text-segmentation/SegmentPanel";
import { SegmentedTextDisplay } from "@/components/text-segmentation/SegmentedTextDisplay";
import { ProgressiveMapper } from "@/components/audio-mapping/ProgressiveMapper";
import { ConnectedCirclesIcon } from "@shared/components/icons";
import { LinkStatusIcon } from "@shared/components/LinkStatusIcon";
import { getMappingStatus } from "@shared/utils/mapping-status";
import { progressiveMappingApi } from "@/services/progressiveMappingApi";
import { AudioMappingDatabase, convertDatabaseMapping, convertToDatabase } from "@shared/types/text-segmentation";
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { AudioControls } from "@/components/design-system/AudioControls";

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
  audioFiles?: Array<{
    id: number;
    filename: string;
    duration: number;
    url: string;
  }>;
  segments?: Array<{
    id: number;
    audioFileId: number;
    startTime: number;
    endTime: number;
    textStart: number;
    textEnd: number;
    language: string;
  }>;
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
  startTime?: number;
  endTime?: number;
  audioFileId?: number;
}

export function ChapterEditor() {
  const [, params] = useRoute("/manage/tracks/:trackId/chapters/:chapterId");
  const chapterId = params?.chapterId || "";
  const trackId = params?.trackId || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentBoundaryListenerRef = useRef<(() => void) | null>(null);

  // Phase 4A: Hook Integration (Feature Flag) - Set to false to preserve original functionality
  const USE_EXTRACTED_HOOKS = false; // Toggle to test hooks
  
  // Phase 4B: Component Integration (Feature Flag) - Set to true to test tab components
  const USE_EXTRACTED_COMPONENTS = true; // Toggle to test components
  
  // Phase 4C: Context Integration (Feature Flag) - Set to true to test context providers
  const USE_CONTEXT_INTEGRATION = true; // Toggle to test context
  
  // Phase 5: Performance Optimization (Feature Flag) - Set to true to enable optimizations
  const USE_PERFORMANCE_OPTIMIZATIONS = true; // Toggle to test performance improvements

  // Phase 5C: Query prefetching for better performance
  if (USE_PERFORMANCE_OPTIMIZATIONS) {
    usePrefetchAdjacentChapters(trackId, chapterId);
    usePrefetchAudioMetadata(chapterId);
  }

  // Phase 4A: Initialize Custom Hooks (parallel to existing state)
  const chapterDataHook = USE_EXTRACTED_HOOKS ? useChapterData(chapterId) : null;
  const audioPlayerHook = USE_EXTRACTED_HOOKS ? useAudioPlayer(chapterId, audioRef) : null;
  const segmentDataHook = USE_EXTRACTED_HOOKS ? useSegmentData(chapterId, chapterDataHook?.contentScript || "te") : null;
  const textSegmentationHook = USE_EXTRACTED_HOOKS ? useTextSegmentation() : null;

  // Shradha Suktam content in all three languages
const SHRADHA_SUKTAM_CONTENT = {
  te: `శ్ర॒ద్ధాయా॒ఽగ్నిః సమి॑ధ్యతే । శ్ర॒ద్ధయా॑ విందతే హ॒విః ।
శ్ర॒ద్ధాం భగ॑స్య మూ॒ర్ధని॑ । వచ॒సాఽఽవే॑దయామసి ।
ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దద॑తః । ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దిదా॑సతః ।
ప్రి॒యం భో॒జేషు॒ యజ్వ॑సు ॥
ఇ॒దం మ॑ ఉది॒తం కృ॑ధి । యథా॑ దే॒వా అసు॑రేషు ।
శ్ర॒ద్ధాము॒గ్రేషు॑ చక్రి॒రే । ఏ॒వం భో॒జేషు॒ యజ్వ॑సు ।
అ॒స్మాక॑ముది॒తం కృ॑ధి । శ్ర॒ద్ధాం దే॑వా॒ యజ॑మానాః ।
వా॒యుగో॑పా॒ ఉపా॑సతే । శ్ర॒ద్ధాగ్ం హృ॑ద॒య్య॑యాఽఽకూ᳚త్యా ।
శ్ర॒ద్ధయా॑ హూయతే హ॒విః । శ్ర॒ద్ధాం ప్రా॒తర్హ॑వామహే ॥
శ్ర॒ద్ధాం మ॒ధ్యంది॑నం॒ పరి॑ । శ్ర॒ద్ధాగ్ం సూర్య॑స్య ని॒మృచి॑ ।
శ్రద్ధే॒ శ్రద్ధా॑పయే॒హ మా᳚ । శ్ర॒ద్ధా దే॒వానధి॑వస్తే ।
శ్ర॒ద్ధా విశ్వ॑మి॒దం జగ॑త్ । శ్ర॒ద్ధాం కామ॑స్య మా॒తరం᳚ ।
హ॒విషా॑ వర్ధయామసి । ఓం శాంతిః॒ శాంతిః॒ శాంతిః॑ ॥`,
  hi: `श्र॒द्धाया॒-ऽग्नि-स्समि॑ध्यते । श्र॒द्धया॑ विन्दते ह॒विः ।
श्र॒द्धा-म्भग॑स्य मू॒र्धनि॑ । वच॒सा-ऽऽवे॑दयामसि ।
प्रि॒यग्ग् श्र॑द्धे॒ दद॑तः । प्रि॒यग्ग् श्र॑द्धे॒ दिदा॑सतः ।
प्रि॒य-म्भो॒जेषु॒ यज्व॑सु ॥
इ॒द-म्म॑ उदि॒त-ङ्कृ॑धि । यथा॑ दे॒वा असु॑रेषु ।
श्र॒द्धामु॒ग्रेषु॑ चक्रि॒रे । ए॒व-म्भो॒जेषु॒ यज्व॑सु ।
अ॒स्माक॑मुदि॒त-ङ्कृ॑धि । श्र॒द्धा-न्दे॑वा॒ यज॑मानाः ।
वा॒युगो॑पा॒ उपा॑सते । श्र॒द्धाग्ं हृ॑द॒य्य॑या-ऽऽकू᳚त्या ।
श्र॒द्धया॑ हूयते ह॒विः । श्र॒द्धा-म्प्रा॒तर्ह॑वामहे ॥
श्र॒द्धा-म्म॒ध्यन्दि॑न॒-म्परि॑ ।श्र॒द्धाग्ं सूर्य॑स्य नि॒मृचि॑ ।
श्रद्धे॒ श्रद्धा॑पये॒ह मा᳚ । श्र॒द्धा दे॒वानधि॑वस्ते ।
श्र॒द्धा विश्व॑मि॒द-ञ्जग॑त् । श्र॒द्धा-ङ्काम॑स्य मा॒तरम्᳚ ।
ह॒विषा॑ वर्धयामसि । ॐ शान्ति॒-श्शान्ति॒-श्शान्तिः॑ ॥`,
  en: `śra̠ddhāyā̠-'gni-ssami̍dhyatē । śra̠ddhayā̍ vindatē ha̠viḥ ।
śra̠ddhā-mbhaga̍sya mū̠rdhani̍ । vacha̠sā-''vē̍dayāmasi ।
pri̠yagg śra̍ddhē̠ dada̍taḥ । pri̠yagg śra̍ddhē̠ didā̍sataḥ ।
pri̠ya-mbhō̠jēṣu̠ yajva̍su ॥
i̠da-mma̍ udi̠ta-ṅkṛ̍dhi । yathā̍ dē̠vā asu̍rēṣu ।
śra̠ddhāmu̠grēṣu̍ chakri̠rē । ē̠va-mbhō̠jēṣu̠ yajva̍su ।
a̠smāka̍mudi̠ta-ṅkṛ̍dhi । śra̠ddhā-ndē̍vā̠ yaja̍mānāḥ ।
vā̠yugō̍pā̠ upā̍satē । śra̠ddhāgṃ hṛ̍da̠yya̍yā-''kū̎tyā ।
śra̠ddhayā̍ hūyatē ha̠viḥ । śra̠ddhā-mprā̠tarha̍vāmahē ॥
śra̠ddhā-mma̠dhyandi̍na̠-mpari̍ । śra̠ddhāgṃ sūrya̍sya ni̠mṛchi̍ ।
śraddhē̠ śraddhā̍payē̠ha mā̎ । śra̠ddhā dē̠vānadhi̍vastē ।
śra̠ddhā viśva̍mi̠da-ñjaga̍t । śra̠ddhā-ṅkāma̍sya mā̠taram̎ ।
ha̠viṣā̍ vardhayāmasi । ōṃ śānti̠-śśānti̠-śśānti̍ḥ ॥`
};

// Safe time formatting function
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds < 0 || !isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Safe audio playback function for segments with boundary enforcement
  const playAudioSegment = (segment: any) => {
    if (!audioPlayer) {
      toast({
        title: "Audio Not Ready",
        description: "Please wait for audio to load",
        variant: "destructive",
      });
      return;
    }

    const startTime = segment.startTimestamp || segment.startTime || 0;
    const endTime = segment.endTimestamp || segment.endTime || 0;

    // Validate timestamps
    if (
      typeof startTime !== "number" ||
      !isFinite(startTime) ||
      startTime < 0
    ) {
      console.warn("Invalid start time for segment:", segment);
      toast({
        title: "Invalid Timestamp",
        description: "This segment has an invalid start time",
        variant: "destructive",
      });
      return;
    }

    if (
      typeof endTime !== "number" ||
      !isFinite(endTime) ||
      endTime <= startTime
    ) {
      console.warn("Invalid end time for segment:", segment);
      toast({
        title: "Invalid Timestamp",
        description: "This segment has an invalid end time",
        variant: "destructive",
      });
      return;
    }

    try {
      // Remove any existing segment boundary listener
      if (segmentBoundaryListenerRef.current) {
        audioPlayer.removeEventListener(
          "timeupdate",
          segmentBoundaryListenerRef.current,
        );
        segmentBoundaryListenerRef.current = null;
      }

      // Create new boundary enforcement listener
      const boundaryListener = () => {
        if (audioPlayer.currentTime >= endTime) {
          audioPlayer.pause();
          setIsPlaying(false);
          // Clean up listener
          audioPlayer.removeEventListener("timeupdate", boundaryListener);
          segmentBoundaryListenerRef.current = null;
        }
      };

      // Store listener reference and add it
      segmentBoundaryListenerRef.current = boundaryListener;
      audioPlayer.addEventListener("timeupdate", boundaryListener);

      // Set playback position and start playing
      audioPlayer.currentTime = startTime;
      setCurrentTime(startTime);
      audioPlayer.play();
      setIsPlaying(true);

      toast({
        title: "Playing Segment",
        description: `${formatTime(startTime)} - ${formatTime(endTime)} (${Math.round(endTime - startTime)}s)`,
      });
    } catch (error) {
      console.error("Error playing segment:", error);
      toast({
        title: "Playback Error",
        description: "Failed to play audio segment",
        variant: "destructive",
      });
    }
  };

  // State management (original - preserve until hooks validated)
  const [textContent, setTextContent] = useState({
    te: "",
    hi: "",
    en: "",
  });

  // Content editor script state (moved here to be available for queries)
  const [contentScript, setContentScript] = useState<"te" | "hi" | "en">("te");
  
  // Auto-save status state
  const [saveStatus, setSaveStatus] = useState<'clean' | 'saving' | 'saved'>('clean');

  // Fetch chapter details first (needed for activeChapter calculation)
  const { data: chapter, isLoading: chapterLoading } = useQuery<ChapterData>({
    queryKey: [`/api/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  // Segments query for database integration - script-specific (original - preserve until hooks validated)
  const { data: textSegments = [], refetch: refetchSegments, isLoading: segmentsLoading, error: segmentsError } = useQuery({
    queryKey: [`/api/segments/${chapterId}/${contentScript || 'te'}`],
    enabled: !!chapterId && !!contentScript
  });

  // Segment selection state
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);

  // Mapping state for progressive mapping
  const [mappings, setMappings] = useState<AudioMappingDatabase[]>([]);

  // Content state for chapter content
  const [chapterContent, setChapterContent] = useState<{
    te?: string;
    hi?: string;
    en?: string;
  }>({});

  // Chapter metadata editing state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // Audio and segmentation state
  const [selectedAudioFile, setSelectedAudioFile] = useState<any | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeMarks, setTimeMarks] = useState<number[]>([]);
  const [selectedMark, setSelectedMark] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingTimestamp, setEditingTimestamp] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const timelineRef = useRef<HTMLInputElement>(null);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);

  // Audio segment editing state
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editingSegmentData, setEditingSegmentData] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);
  const [editingFileName, setEditingFileName] = useState("");

  // Media segmentation state
  const [selectedMediaSegment, setSelectedMediaSegment] = useState<any>(null);
  const [selectedTextSegment, setSelectedTextSegment] = useState<any>(null);
  const [mediaSegmentName, setMediaSegmentName] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Text segmentation state
  const [selectedScript, setSelectedScript] = useState<"te" | "hi" | "en">(
    "te",
  );
  const [textSelection, setTextSelection] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [segmentName, setSegmentName] = useState("");

  // Script state already declared above before segments query

  // Active tab state for proper tab management
  const [activeTab, setActiveTab] = useState<string>("content");
  
  // Preview tab state variables
  const [selectedTextSegmentPreview, setSelectedTextSegmentPreview] = useState<number | undefined>(undefined);
  const [previewAudioRef] = useState<HTMLAudioElement>(() => new Audio());
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(80);
  const [previewPlaybackRate, setPreviewPlaybackRate] = useState(1);
  const [selectedAudioFilePreview, setSelectedAudioFilePreview] = useState<number | null>(null);

  // === HELPER FUNCTIONS SECTION ===

  // Helper functions for drag operations
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !selectedMark || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * duration;

      setTimeMarks((prev) =>
        prev
          .map((mark) => (mark === selectedMark ? newTime : mark))
          .sort((a, b) => a - b),
      );
      setSelectedMark(newTime);
    },
    [isDragging, selectedMark, duration],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const updateMarkTimestamp = (oldMark: number, newTimestamp: string) => {
    const [minutes, seconds] = newTimestamp.split(":").map(Number);
    if (
      isNaN(minutes) ||
      isNaN(seconds) ||
      minutes < 0 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      toast({
        title: "Invalid Timestamp",
        description: "Please enter a valid timestamp in MM:SS format",
        variant: "destructive",
      });
      return;
    }

    const newTime = minutes * 60 + seconds;
    if (newTime > duration) {
      toast({
        title: "Timestamp Too Large",
        description: "Timestamp cannot exceed audio duration",
        variant: "destructive",
      });
      return;
    }

    setTimeMarks((prev) =>
      prev
        .map((mark) => (mark === oldMark ? newTime : mark))
        .sort((a, b) => a - b),
    );
    setSelectedMark(newTime);
    setEditingTimestamp(null);

    toast({
      title: "Timestamp Updated",
      description: `Mark updated to ${Math.floor(newTime / 60)}:${Math.floor(
        newTime % 60,
      )
        .toString()
        .padStart(2, "0")}`,
    });
  };

  // Helper functions for segment editing
  const startEditingSegment = (segment: any) => {
    const startTime = segment.startTimestamp || segment.startTime || 0;
    const endTime = segment.endTimestamp || segment.endTime || 0;

    setEditingSegmentId(segment.id);
    setEditingSegmentData({
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
    });
  };

  const cancelEditingSegment = () => {
    setEditingSegmentId(null);
    setEditingSegmentData(null);
  };

  const saveSegmentEdit = () => {
    if (!editingSegmentData || editingSegmentId === null) return;

    // Parse start time
    const [startMin, startSec] = editingSegmentData.startTime
      .split(":")
      .map(Number);
    if (isNaN(startMin) || isNaN(startSec)) {
      toast({
        title: "Invalid Start Time",
        description: "Please enter a valid start time in MM:SS format",
        variant: "destructive",
      });
      return;
    }
    const startTime = startMin * 60 + startSec;

    // Parse end time
    const [endMin, endSec] = editingSegmentData.endTime.split(":").map(Number);
    if (isNaN(endMin) || isNaN(endSec)) {
      toast({
        title: "Invalid End Time",
        description: "Please enter a valid end time in MM:SS format",
        variant: "destructive",
      });
      return;
    }
    const endTime = endMin * 60 + endSec;

    // Validate times
    if (startTime >= endTime) {
      toast({
        title: "Invalid Time Range",
        description: "Start time must be before end time",
        variant: "destructive",
      });
      return;
    }

    if (endTime > duration) {
      toast({
        title: "Time Exceeds Duration",
        description: "End time cannot exceed audio duration",
        variant: "destructive",
      });
      return;
    }

    updateMediaSegmentMutation.mutate({
      id: editingSegmentId,
      startTime,
      endTime,
    });
  };

  const deleteSegment = (segmentId: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this segment? This action cannot be undone.",
      )
    ) {
      deleteMediaSegmentMutation.mutate(segmentId);
    }
  };

  // Chapter status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: "draft" | "published") => {
      await apiRequest("PATCH", `/api/chapters/${chapterId}/status`, {
        status: newStatus,
      });
    },
    onSuccess: () => {
      toast({ title: "Chapter status updated successfully" });
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/details`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update chapter status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update chapter metadata mutation
  const updateChapterMetadataMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      await apiRequest("PATCH", `/api/chapters/${chapterId}`, {
        title,
        description,
      });
    },
    onSuccess: () => {
      toast({ title: "Chapter updated successfully" });
      setIsEditingMetadata(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/details`],
      });
      // Also invalidate the chapters list to update the display
      if (chapter?.trackId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/chapters/${chapter.trackId}`],
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update chapter",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // === DATA FETCHING SECTION ===

  // Phase 4A: Hook state integration (side-by-side comparison)
  const hookData = USE_EXTRACTED_HOOKS ? {
    chapter: chapterDataHook?.chapter,
    chapterLoading: chapterDataHook?.chapterLoading,
    textContent: chapterDataHook?.textContent,
    contentScript: chapterDataHook?.contentScript,
    isPublished: chapterDataHook?.isPublished,
    audioPlayer: audioPlayerHook?.audioPlayer,
    isPlaying: audioPlayerHook?.isPlaying,
    currentTime: audioPlayerHook?.currentTime,
    duration: audioPlayerHook?.duration,
    textSegments: segmentDataHook?.textSegments || [],
    allChapterMappings: segmentDataHook?.allChapterMappings || [],
    // Audio player state
    selectedAudioFile: audioPlayerHook?.selectedAudioFile,
    timeMarks: audioPlayerHook?.timeMarks || [],
    selectedMark: audioPlayerHook?.selectedMark,
    // Text segmentation
    currentSelection: textSegmentationHook?.currentSelection,
    hasSelection: textSegmentationHook?.hasSelection,
  } : null;

  // Phase 4A: Use hook state when feature flag enabled (after hookData is defined)
  const activeTextContent = USE_EXTRACTED_HOOKS ? hookData?.textContent || textContent : textContent;
  const activeContentScript = USE_EXTRACTED_HOOKS ? hookData?.contentScript || contentScript : contentScript;
  const activeChapter = USE_EXTRACTED_HOOKS ? hookData?.chapter || chapter : chapter;
  const activeChapterLoading = USE_EXTRACTED_HOOKS ? hookData?.chapterLoading || chapterLoading : chapterLoading;
  const activeTextSegments = USE_EXTRACTED_HOOKS ? hookData?.textSegments || [] : textSegments;

  // Fetch audio files
  const { data: audioFiles, refetch: refetchAudioFiles } = useQuery<any[]>({
    queryKey: [`/api/audio-files/${chapterId}`],
    enabled: !!chapterId,
  });

  // All mappings for the chapter (for counting mapped segments)
  const { data: allChapterMappings = [] } = useQuery({
    queryKey: [`/api/mappings/chapter/${chapterId}`],
    enabled: !!chapterId
  });

  // Preview tab segment click handler - finds mapping and seeks to audio timestamp
  const handlePreviewSegmentClick = useCallback((segmentId: number | undefined) => {
    if (!segmentId) {
      setSelectedTextSegmentPreview(undefined);
      return;
    }

    // Highlight the selected segment
    setSelectedTextSegmentPreview(segmentId);

    // Find the audio mapping for this segment from all chapter mappings (backend data)
    const mapping = allChapterMappings.find(m => m.segmentId === segmentId);
    
    if (!mapping) {
      console.log('No mapping found for segment:', segmentId);
      return;
    }

    // If the audio file is different from the currently loaded one, load it
    if (selectedAudioFilePreview !== mapping.audioFileId) {
      const audioFile = audioFiles?.find((f: any) => f.id === mapping.audioFileId);
      if (audioFile) {
        previewAudioRef.src = `/uploads/${audioFile.filename}`;
        setSelectedAudioFilePreview(mapping.audioFileId);
        
        // Wait for audio to load before seeking
        previewAudioRef.addEventListener('loadedmetadata', () => {
          previewAudioRef.currentTime = mapping.startTime;
          setPreviewCurrentTime(mapping.startTime);
        }, { once: true });
      }
    } else {
      // Same audio file, just seek
      previewAudioRef.currentTime = mapping.startTime;
      setPreviewCurrentTime(mapping.startTime);
    }
  }, [allChapterMappings, selectedAudioFilePreview, audioFiles]);

  // Fetch mappings for the selected audio file
  const { data: audioFileMappings = [], refetch: refetchMappings } = useQuery<AudioMappingDatabase[]>({
    queryKey: [`/api/mappings/audio/${selectedAudioFile?.id}`],
    enabled: !!selectedAudioFile?.id,
    queryFn: () => progressiveMappingApi.getMappingsByAudioFile(selectedAudioFile!.id)
  });

  // Update mappings state when data changes
  useEffect(() => {
    setMappings(audioFileMappings);
  }, [audioFileMappings]);



  // Fetch media segments for selected audio file
  const selectedAudioFileId =
    typeof selectedAudioFile === "object"
      ? selectedAudioFile?.id
      : selectedAudioFile;
  const { data: mediaSegments = [] } = useQuery({
    queryKey: [`/api/media-segments/${selectedAudioFileId}`],
    enabled: !!selectedAudioFileId,
  });

  const isPublished = activeChapter?.status === "published";

  // === MUTATIONS SECTION ===

  // Audio file upload mutation
  const audioUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("audio", file);

      const response = await fetch(
        `/api/audio-files/${chapterId}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Audio file uploaded successfully" });
      queryClient.invalidateQueries({
        queryKey: [`/api/audio-files/${chapterId}`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to upload audio file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update media segment mutation
  const updateMediaSegmentMutation = useMutation({
    mutationFn: async ({
      id,
      startTime,
      endTime,
    }: {
      id: number;
      startTime: number;
      endTime: number;
    }) => {
      await apiRequest("PATCH", `/api/media-segments/${id}`, {
        startTimestamp: startTime,
        endTimestamp: endTime,
      });
    },
    onSuccess: () => {
      toast({ title: "Segment updated successfully" });
      setEditingSegmentId(null);
      setEditingSegmentData(null);
      if (selectedAudioFile?.id) {
        queryClient.invalidateQueries({
          queryKey: [`/api/media-segments/${selectedAudioFile.id}`],
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update segment",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete media segment mutation
  const deleteMediaSegmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/media-segments/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Segment deleted successfully" });
      if (selectedAudioFile?.id) {
        queryClient.invalidateQueries({
          queryKey: [`/api/media-segments/${selectedAudioFile.id}`],
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete segment",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Standardized segment creation mutation - new format only
  const createSegmentMutation = useMutation({
    mutationFn: async (segmentData: { 
      chapterId: number; 
      script: string; 
      startPosition: number; 
      endPosition: number; 
    }) => {
      // Validate required fields before API call
      if (!segmentData.chapterId || !segmentData.script || 
          segmentData.startPosition === undefined || segmentData.endPosition === undefined) {
        throw new Error("Missing required segment data");
      }
      
      return apiRequest("POST", `/api/segments`, segmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/segments/${chapterId}/${contentScript || 'te'}`] });
      toast({ title: "Segment created successfully" });
    },
    onError: (error: any) => {
      let userMessage = "Unable to create segment. Please try again.";
      let actionMessage = "";
      let showRetry = false;

      if (error.isClientError) {
        if (error.status === 400) {
          userMessage = "Invalid text selection. Please select a different text range.";
          actionMessage = "Try selecting text without overlapping existing segments.";
        } else if (error.status === 409) {
          userMessage = "This text range overlaps with an existing segment.";
          actionMessage = "Please select a different text range or remove the conflicting segment.";
        } else if (error.status === 422) {
          userMessage = "Selected text is too short or contains invalid characters.";
          actionMessage = "Please select at least 10 characters of valid text.";
        }
      } else if (error.isServerError || error.isNetworkError) {
        userMessage = error.isNetworkError 
          ? "Network connection lost. Your work is saved locally." 
          : "Server temporarily unavailable. Your work is saved locally.";
        actionMessage = "Please try again in a few moments.";
        showRetry = true;
      }

      toast({
        title: "Failed to create segment",
        description: `${userMessage} ${actionMessage}`,
        variant: "destructive"
      });
    }
  });

  // Direct alias for compatibility
  const createTextSegmentMutation = createSegmentMutation;

  const updateSegmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return apiRequest("PATCH", `/api/segments/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/segments/${chapterId}/${contentScript || 'te'}`] });
      toast({ title: "Segment updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update segment", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/segments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/segments/${chapterId}/${contentScript || 'te'}`] });
      toast({ title: "Segment deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete segment",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const reorderSegmentsMutation = useMutation({
    mutationFn: async (reorderedSegments: any[]) => {
      const segmentOrders = reorderedSegments.map(segment => ({
        id: segment.id,
        order: segment.order
      }));
      
      return apiRequest("PATCH", `/api/segments/${chapterId}/reorder`, {
        segmentOrders
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/segments/${chapterId}`],
        exact: false
      });
    }
  });

  const handleCreateSegment = useCallback((segment: any) => {
    // Handle both new format (from AnnotationLayer) and legacy format
    let segmentData: { chapterId: number; script: string; startPosition: number; endPosition: number; };
    
    if (segment.script && segment.startPosition !== undefined && segment.endPosition !== undefined) {
      // New format from AnnotationLayer: { script, startPosition, endPosition }
      segmentData = {
        chapterId: parseInt(chapterId!),
        script: segment.script,
        startPosition: segment.startPosition,
        endPosition: segment.endPosition
      };
    } else if (segment.textReferences && typeof segment.textReferences === 'object') {
      // Legacy format: { textReferences: { [script]: { start, end } } }
      const firstScript = Object.keys(segment.textReferences)[0];
      const range = segment.textReferences[firstScript];
      
      if (!firstScript || !range || range.start === undefined || range.end === undefined) {
        toast({
          title: "Invalid text selection",
          description: "Please select valid text before creating a segment",
          variant: "destructive"
        });
        return;
      }
      
      segmentData = {
        chapterId: parseInt(chapterId!),
        script: firstScript,
        startPosition: range.start,
        endPosition: range.end
      };
    } else {
      toast({
        title: "Invalid segment data",
        description: "Unable to process segment information",
        variant: "destructive"
      });
      return;
    }
    
    // Validate the final data before API call
    if (!segmentData.chapterId || !segmentData.script || 
        segmentData.startPosition === undefined || segmentData.endPosition === undefined) {
      toast({
        title: "Missing segment data",
        description: "Required segment information is missing",
        variant: "destructive"
      });
      return;
    }
    
    createSegmentMutation.mutate(segmentData);
  }, [createSegmentMutation, chapterId]);

  const handleUpdateSegment = useCallback((id: number, updates: any) => {
    updateSegmentMutation.mutate({ id, updates });
  }, [updateSegmentMutation]);

  const handleDeleteSegment = useCallback((id: number) => {
    deleteSegmentMutation.mutate(id);
  }, [deleteSegmentMutation]);

  // Content update mutation
  const updateContentMutation = useMutation({
    mutationFn: async (content: any) => {
      setSaveStatus('saving');
      const response = await apiRequest("PATCH", `/api/chapters/${chapterId}`, {
        content,
      });
      return await response.json();
    },
    onSuccess: (savedChapter) => {
      console.log('Content save success - server response:', savedChapter);
      setSaveStatus('saved');
      toast({ title: "Content saved" });
      
      // Auto-hide success status after 3 seconds
      setTimeout(() => {
        setSaveStatus('clean');
      }, 3000);
      
      // Don't sync local state here - let cache invalidation handle it
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/details`],
      });
    },
    onError: (error: any) => {
      setSaveStatus('clean');
      toast({
        title: "Failed to save content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // === CUSTOM HOOKS SECTION ===

  // Initialize text content when chapter loads (original - preserve until hooks validated)
  useEffect(() => {
    if (activeChapter?.content && !USE_EXTRACTED_HOOKS) {
      setTextContent({
        te: activeChapter.content.te || "",
        hi: activeChapter.content.hi || "",
        en: activeChapter.content.en || "",
      });
    }
  }, [activeChapter?.content, USE_EXTRACTED_HOOKS]);

  // Initialize chapterContent for segmentation display (original - preserve until hooks validated)
  useEffect(() => {
    if (activeChapter?.content && !USE_EXTRACTED_HOOKS) {
      // Only update if the actual content values have changed
      const newContent = {
        te: activeChapter.content.te || "",
        hi: activeChapter.content.hi || "",
        en: activeChapter.content.en || "",
      };
      
      setChapterContent(prev => {
        // Check if content actually changed
        if (prev.te === newContent.te && prev.hi === newContent.hi && prev.en === newContent.en) {
          return prev; // Return same reference to prevent re-render
        }
        return newContent;
      });
    }
  }, [activeChapter?.content?.te, activeChapter?.content?.hi, activeChapter?.content?.en, USE_EXTRACTED_HOOKS]);

  // Auto-save functionality with debounce (original - preserve until hooks validated)
  useEffect(() => {
    if (!activeChapter?.content || isPublished || USE_EXTRACTED_HOOKS) {
      return;
    }

    // Only check the currently active script for changes
    const hasChanges = textContent[contentScript] !== (activeChapter.content?.[contentScript] || "");

    if (!hasChanges) {
      return;
    }

    const timeoutId = setTimeout(() => {
      updateContentMutation.mutate({
        ...activeChapter.content,
        [contentScript]: textContent[contentScript],
      });
    }, 2000); // Auto-save after 2 seconds of no typing

    return () => clearTimeout(timeoutId);
  }, [textContent, activeChapter?.content, isPublished, contentScript, USE_EXTRACTED_HOOKS]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.removeEventListener("loadedmetadata", () => {});
        audioPlayer.removeEventListener("timeupdate", () => {});
        audioPlayer.removeEventListener("error", () => {});
        setAudioPlayer(null);
      }
    };
  }, [audioPlayer]);

  // Create audio segments from marks mutation
  const createAudioSegmentsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAudioFile || timeMarks.length === 0) {
        throw new Error("No audio file selected or no time marks");
      }

      const scriptSegments = [];
      const sortedMarks = [...timeMarks].sort((a, b) => a - b);

      // Create segments from start to each mark, and between marks
      for (let i = 0; i <= sortedMarks.length; i++) {
        const startTime = i === 0 ? 0 : sortedMarks[i - 1];
        const endTime = i === sortedMarks.length ? duration : sortedMarks[i];

        scriptSegments.push({
          audioFileId:
            typeof selectedAudioFile === "object"
              ? selectedAudioFile.id
              : selectedAudioFile,
          startTime,
          endTime,
          name: `Segment ${i + 1}`,
        });
      }

      const response = await apiRequest(
        "POST",
        "/api/media-segments/bulk",
        { segments: scriptSegments },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/media-segments/${selectedAudioFileId}`],
      });
      setTimeMarks([]);
      setSelectedMark(null);
      toast({
        title: "Audio Segments Created",
        description: `Successfully created ${timeMarks.length + 1} audio segments`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Segments",
        description: error.message || "Failed to create audio segments",
        variant: "destructive",
      });
    },
  });

  // Delete audio file mutation
  const deleteAudioMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/audio-files/${fileId}`);
      return fileId;
    },
    onSuccess: (deletedFileId) => {
      toast({ title: "Audio file deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: [`/api/audio-files/${chapterId}`],
      });
      if (selectedAudioFile === deletedFileId) {
        setSelectedAudioFile(null);
        setAudioPlayer(null);
        setIsPlaying(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete audio file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update filename mutation
  const updateFileNameMutation = useMutation({
    mutationFn: async ({
      fileId,
      newName,
    }: {
      fileId: number;
      newName: string;
    }) => {
      await apiRequest("PATCH", `/api/audio-files/${fileId}`, {
        displayName: newName,
      });
    },
    onSuccess: () => {
      toast({ title: "Filename updated successfully" });
      queryClient.invalidateQueries({
        queryKey: [`/api/audio-files/${chapterId}`],
      });
      setEditingFileId(null);
      setEditingFileName("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update filename",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // === MAPPING OPERATIONS SECTION ===

  // Mapping validation utility
  const validateMapping = (mapping: Partial<AudioMappingDatabase>) => {
    if (!mapping.segmentId || !mapping.audioFileId) {
      throw new Error("Missing required mapping data");
    }
    if (mapping.startTime !== undefined && mapping.endTime !== undefined) {
      if (mapping.startTime < 0 || mapping.endTime <= mapping.startTime) {
        throw new Error("Invalid timestamp range");
      }
    }
  };

  // Create mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async (mappingData: Omit<AudioMappingDatabase, 'id' | 'createdBy' | 'createdAt'>) => {
      validateMapping(mappingData);
      return progressiveMappingApi.createMapping(mappingData);
    },
    onSuccess: () => {
      refetchMappings();
      toast({ title: "Mapping created successfully" });
    },
    onError: (error: any) => {
      console.error('Mapping creation failed:', error);
      toast({
        title: "Failed to create mapping",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });

  // Update mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async ({ segmentId, updates }: { segmentId: number; updates: { startTime?: number; endTime?: number } }) => {
      if (updates.startTime !== undefined && updates.endTime !== undefined) {
        if (updates.startTime < 0 || updates.endTime <= updates.startTime) {
          throw new Error("Invalid timestamp range");
        }
      }
      return progressiveMappingApi.updateMapping(segmentId, updates);
    },
    onSuccess: () => {
      refetchMappings();
      toast({ title: "Mapping updated successfully" });
    },
    onError: (error: any) => {
      console.error('Mapping update failed:', error);
      toast({
        title: "Failed to update mapping",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async ({ audioFileId, segmentId }: { audioFileId: number; segmentId: number }) => {
      return progressiveMappingApi.deleteMapping(audioFileId, segmentId);
    },
    onSuccess: () => {
      refetchMappings();
      toast({ title: "Mapping deleted successfully" });
    },
    onError: (error: any) => {
      console.error('Mapping deletion failed:', error);
      toast({
        title: "Failed to delete mapping",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });

  // Loading state for mapping operations
  const isMappingLoading = createMappingMutation.isPending || 
                          updateMappingMutation.isPending || 
                          deleteMappingMutation.isPending;

  // Audio control functions
  const handlePlayPause = async () => {
    if (!audioPlayer) return;

    try {
      if (isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        await audioPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Audio play error:", error);
      setIsPlaying(false);
      toast({
        title: "Playback Error",
        description: "Failed to play audio. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleStop = () => {
    if (!audioPlayer) return;

    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleMarkTime = () => {
    if (!audioPlayer) return;

    const markTime = audioPlayer.currentTime;
    setTimeMarks((prev) => [...prev, markTime].sort((a, b) => a - b));
    toast({ title: `Time mark added at ${formatTime(markTime)}` });
  };

  const handleClearMark = () => {
    if (selectedMark === null) return;

    setTimeMarks((prev) => prev.filter((mark) => mark !== selectedMark));
    setSelectedMark(null);
    toast({ title: "Time mark cleared" });
  };

  const handleClearAllMarks = () => {
    setTimeMarks([]);
    setSelectedMark(null);
    toast({ title: "All time marks cleared" });
  };

  const handleCreateAudioSegments = () => {
    if (timeMarks.length === 0) {
      toast({
        title: "No Time Marks",
        description: "Please add time marks to create segments",
        variant: "destructive",
      });
      return;
    }
    createAudioSegmentsMutation.mutate();
  };

  // Audio file selection and setup
  const handleAudioFileSelect = (fileId: number) => {
    setSelectedAudioFile(fileId);
    setTimeMarks([]);
    setSelectedMark(null);
    setCurrentTime(0);
    setIsPlaying(false);

    const file = (audioFiles as any)?.find((f: any) => f.id === fileId);
    if (file && audioRef.current) {
      audioRef.current.src = file.url;
      audioRef.current.load();
      setAudioPlayer(audioRef.current);
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setAudioPlayer(audio);
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [selectedAudioFile]);

  // Preview audio event handlers
  useEffect(() => {
    const audio = previewAudioRef;
    if (!audio) return;

    const handleTimeUpdate = () => setPreviewCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setPreviewDuration(audio.duration);
    };
    const handleEnded = () => setIsPreviewPlaying(false);
    const handlePlay = () => setIsPreviewPlaying(true);
    const handlePause = () => setIsPreviewPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [selectedAudioFilePreview]);

  // Auto-select first audio file in Preview tab when audioFiles load
  useEffect(() => {
    if (audioFiles && audioFiles.length > 0 && !selectedAudioFilePreview) {
      const firstAudioFile = audioFiles[0];
      setSelectedAudioFilePreview(firstAudioFile.id);
      previewAudioRef.src = `/uploads/${firstAudioFile.filename}`;
    }
  }, [audioFiles, selectedAudioFilePreview]);

  // Auto-select first audio file in Mapping tab when audioFiles load
  useEffect(() => {
    if (audioFiles && audioFiles.length > 0 && !selectedAudioFile) {
      const firstAudioFile = audioFiles[0];
      setSelectedAudioFile(firstAudioFile);
    }
  }, [audioFiles, selectedAudioFile]);

  const validateFileType = (file: File) => {
    const allowedTypes = ["audio/", "video/"];
    if (!allowedTypes.some((type) => file.type.startsWith(type))) {
      toast({
        title: "Invalid file type",
        description: "Please upload audio or video files only",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && validateFileType(file)) {
      audioUploadMutation.mutate(file);
    }
  };

  const startEditing = (fileId: number, currentName: string) => {
    setEditingFileId(fileId);
    setEditingFileName(currentName);
  };

  const cancelEditing = () => {
    setEditingFileId(null);
    setEditingFileName("");
  };

  const handleSaveFileName = (fileId: number) => {
    if (editingFileName.trim()) {
      updateFileNameMutation.mutate({
        fileId,
        newName: editingFileName.trim(),
      });
    }
  };

  const handleContentSave = (language: string) => {
    updateContentMutation.mutate({
      ...chapter?.content,
      [language]: textContent[language as keyof typeof textContent],
    });
  };

  // Chapter metadata editing handlers
  const handleEditMetadata = () => {
    setEditingTitle(chapter?.title || "");
    setEditingDescription(chapter?.description || "");
    setIsEditingMetadata(true);
  };

  const handleSaveMetadata = () => {
    if (!editingTitle.trim()) {
      toast({
        title: "Title required",
        description: "Chapter title cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    updateChapterMetadataMutation.mutate({
      title: editingTitle.trim(),
      description: editingDescription.trim(),
    });
  };

  const handleCancelMetadataEdit = () => {
    setIsEditingMetadata(false);
    setEditingTitle("");
    setEditingDescription("");
  };

  // Text segmentation functions
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    let element: Element | null = null;

    if (container.nodeType === Node.TEXT_NODE) {
      element = container.parentElement;
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      element = container as Element;
    }

    if (!element?.closest("[data-segmentable]")) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Calculate character positions within the full text (extract plain text from HTML for position calculation)
    const fullTextContent = textContent[selectedScript] || "";
    const fullText = isHtmlContent(fullTextContent) 
      ? extractPlainText(fullTextContent) 
      : fullTextContent;
    
    // For HTML content, we need to map the selection to plain text positions
    if (isHtmlContent(fullTextContent)) {
      // Get the plain text equivalent of the selection
      const plainTextSelection = extractPlainText(selectedText);
      const startPos = fullText.indexOf(plainTextSelection);
      const endPos = startPos + plainTextSelection.length;
      
      setTextSelection({
        start: startPos >= 0 ? startPos : 0,
        end: startPos >= 0 ? endPos : plainTextSelection.length,
        text: plainTextSelection,
      });
      
      setSegmentName(
        `${plainTextSelection.substring(0, 30)}${plainTextSelection.length > 30 ? "..." : ""}`,
      );
    } else {
      // Plain text logic (existing)
      const beforeText =
        range.startContainer.textContent?.substring(0, range.startOffset) || "";
      const startPos = fullText.indexOf(beforeText + selectedText.charAt(0));
      const endPos = startPos + selectedText.length;
      
      setTextSelection({
        start: startPos,
        end: endPos,
        text: selectedText,
      });
      
      setSegmentName(
        `${selectedText.substring(0, 30)}${selectedText.length > 30 ? "..." : ""}`,
      );
    }
  };

  // Note: createTextSegmentMutation is already defined above as alias to createSegmentMutation

  const handleCreateTextSegment = () => {
    // Validate inputs before processing
    if (!textSelection || !segmentName.trim()) {
      toast({
        title: "Please select text and provide a segment name",
        variant: "destructive",
      });
      return;
    }
    
    if (!contentScript) {
      toast({
        title: "Script not selected",
        description: "Please ensure a script is selected before creating segments",
        variant: "destructive",
      });
      return;
    }
    
    if (!chapterId) {
      toast({
        title: "Chapter not loaded",
        description: "Please wait for chapter to load completely",
        variant: "destructive",
      });
      return;
    }

    // Use direct new format
    createTextSegmentMutation.mutate({
      chapterId: parseInt(chapterId),
      script: contentScript,
      startPosition: textSelection.start,
      endPosition: textSelection.end,
    });
  };



  const createAudioMappingMutation = useMutation({
    mutationFn: async (mappingData: {
      audioFileId: number;
      segmentId: number;
      startTime: number;
      endTime: number;
    }) => {
      return await apiRequest("POST", "/api/mappings", mappingData);
    },
    onSuccess: () => {
      toast({ title: "Audio mapping created successfully" });
      queryClient.invalidateQueries({
        queryKey: [`/api/segments/${chapterId}`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create audio mapping",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create media segment mutation
  const createMediaSegmentMutation = useMutation({
    mutationFn: async (segment: any) => {
      const response = await fetch("/api/media-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(segment),
      });
      if (!response.ok) throw new Error("Failed to create media segment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/media-segments"],
      });
      toast({ title: "Media segment created successfully" });
      setMediaSegmentName("");
      setStartTime(0);
      setEndTime(0);
    },
  });

  // Enhanced segment rendering with text highlighting
  const renderTextWithSegments = (
    text: string,
    language: "te" | "hi" | "en",
  ) => {
    if (!textSegments || textSegments.length === 0) {
      return (
        <div
          data-segmentable
          className="whitespace-pre-wrap cursor-text"
          onMouseUp={handleTextSelection}
        >
          {text}
        </div>
      );
    }

    const segmentsForLang = textSegments.filter(
      (seg) => seg.script === language,
    );
    if (segmentsForLang.length === 0) {
      return (
        <div
          data-segmentable
          className="whitespace-pre-wrap cursor-text"
          onMouseUp={handleTextSelection}
        >
          {text}
        </div>
      );
    }

    // Sort segments by start position
    const sortedSegments = segmentsForLang.sort(
      (a, b) =>
        (a.textReferences[language]?.start || 0) -
        (b.textReferences[language]?.start || 0),
    );

    const parts = [];
    let lastEnd = 0;

    sortedSegments.forEach((segment, index) => {
      const ref = segment.textReferences[language];
      if (!ref) return;

      // Add text before this segment
      if (ref.start > lastEnd) {
        parts.push(
          <span key={`before-${index}`} className="cursor-text">
            {text.substring(lastEnd, ref.start)}
          </span>,
        );
      }

      // Add the segmented text with highlighting
      const hasAudioMapping =
        segment.audioFileId && segment.startTime !== undefined;
      parts.push(
        <span
          key={`segment-${segment.id}`}
          className={`px-1 py-0.5 rounded cursor-pointer transition-colors ${
            hasAudioMapping
              ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
              : "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
          } hover:opacity-80`}
          title={`${segment.conceptualName}${hasAudioMapping ? " (Audio Mapped)" : " (No Audio)"}`}
          onClick={() => {
            if (
              hasAudioMapping &&
              audioPlayer &&
              segment.startTime !== undefined
            ) {
              audioPlayer.currentTime = segment.startTime;
              audioPlayer.play();
              setIsPlaying(true);
            }
          }}
        >
          {text.substring(ref.start, ref.end)}
        </span>,
      );

      lastEnd = ref.end;
    });

    // Add remaining text
    if (lastEnd < text.length) {
      parts.push(
        <span key="after" className="cursor-text">
          {text.substring(lastEnd)}
        </span>,
      );
    }

    return (
      <div
        data-segmentable
        className="whitespace-pre-wrap"
        onMouseUp={handleTextSelection}
      >
        {parts}
      </div>
    );
  };

  // === RENDER LOGIC SECTION ===

  if (chapterLoading) {
    return <div className="p-6">Loading chapter...</div>;
  }

  // Phase 4C: Wrap entire component in context provider when enabled
  const renderContent = () => (
    <div className="min-h-screen bg-background">
      <audio ref={audioRef} preload="metadata" />

      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Get the track ID from the chapter data
                  if (trackId) {
                    // Invalidate chapters query to refresh data
                    queryClient.invalidateQueries({
                      queryKey: [`/api/chapters/${trackId}`],
                    });
                    // Navigate to management track page
                    setLocation(`/manage/tracks/${trackId}`);
                  } else {
                    // Fallback to management dashboard if no track ID
                    setLocation("/manage");
                  }
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              
              <div className="h-5 w-px bg-border"></div>
              {isEditingMetadata ? (
                <div className="flex-1 flex items-center gap-3">
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    placeholder="Enter chapter title"
                    className="text-lg font-semibold h-8 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveMetadata();
                      } else if (e.key === "Escape") {
                        handleCancelMetadataEdit();
                      }
                    }}
                    autoFocus
                  />
                  <Button 
                    onClick={handleSaveMetadata}
                    disabled={updateChapterMetadataMutation.isPending || !editingTitle.trim()}
                    size="sm"
                    className="h-8"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancelMetadataEdit}
                    disabled={updateChapterMetadataMutation.isPending}
                    size="sm"
                    className="h-8"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-foreground">{chapter?.title}</h1>
                  {chapter?.status !== "published" && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleEditMetadata}
                      className="h-6 w-6 p-0 opacity-50 hover:opacity-100 transition-opacity"
                      title="Edit chapter title"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      chapter?.status === "published"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {chapter?.status === "published" ? "Published" : "Draft"}
                  </span>
                  {chapter?.description && (
                    <span className="text-muted-foreground text-sm">•</span>
                  )}
                  {chapter?.description && (
                    <span className="text-muted-foreground text-sm">{chapter.description}</span>
                  )}
                </div>
              )}
            </div>
            
            {!isEditingMetadata && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={chapter?.status === "published" ? "destructive" : "default"}
                  onClick={() => {
                    const newStatus = chapter?.status === "published" ? "draft" : "published";
                    toggleStatusMutation.mutate(newStatus);
                  }}
                  disabled={toggleStatusMutation.isPending}
                  className="h-8"
                >
                  {chapter?.status === "published" ? "Unpublish" : "Publish"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-transparent p-1 h-auto flex items-center">
            <TabsTrigger 
              value="content" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-all"
            >
              <FileText className="w-4 h-4" />
              Chapter Text
            </TabsTrigger>
            <div className="flex items-center px-2 text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <TabsTrigger 
              value="media" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-all"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z"/>
              </svg>
              Chapter Audio
            </TabsTrigger>
            <div className="flex items-center px-2 text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <TabsTrigger 
              value="text-segmentation" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-all"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M760-120 480-400l-94 94q8 15 11 32t3 34q0 66-47 113T240-80q-66 0-113-47T80-240q0-66 47-113t113-47q17 0 34 3t32 11l94-94-94-94q-15 8-32 11t-34 3q-66 0-113-47T80-720q0-66 47-113t113-47q66 0 113 47t47 113q0 17-3 34t-11 32l494 494v40H760ZM600-520l-80-80 240-240h120v40L600-520ZM240-640q33 0 56.5-23.5T320-720q0-33-23.5-56.5T240-800q-33 0-56.5 23.5T160-720q0 33 23.5 56.5T240-640Zm240 180q8 0 14-6t6-14q0-8-6-14t-14-6q-8 0-14 6t-6 14q0 8 6 14t14 6ZM240-160q33 0 56.5-23.5T320-240q0-33-23.5-56.5T240-320q-33 0-56.5 23.5T160-240q0 33 23.5 56.5T240-160Z"/>
              </svg>
              Segmentation
            </TabsTrigger>
            <div className="flex items-center px-2 text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <TabsTrigger 
              value="audio-mapping" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-all"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M320-200q-117 0-198.5-81.5T40-480q0-117 81.5-198.5T320-760q27 0 52.5 5t49.5 14q-17 14-32 30.5T362-676q-10-2-20.5-3t-21.5-1q-83 0-141.5 58.5T120-480q0 83 58.5 141.5T320-280q11 0 21.5-1t20.5-3q13 18 28 34.5t32 30.5q-24 9-49.5 14t-52.5 5Zm320 0q-27 0-52.5-5T538-219q17-14 32-30.5t28-34.5q11 2 21 3t21 1q83 0 141.5-58.5T840-480q0-83-58.5-141.5T640-680q-11 0-21 1t-21 3q-13-18-28-34.5T538-741q24-9 49.5-14t52.5-5q117 0 198.5 81.5T920-480q0 117-81.5 198.5T640-200Zm-160-50q-57-39-88.5-100T360-480q0-69 31.5-130T480-710q57 39 88.5 100T600-480q0 69-31.5 130T480-250Z"/>
              </svg>
              Mapping
            </TabsTrigger>
            <div className="flex items-center px-2 text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <TabsTrigger 
              value="preview" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-all"
            >
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Text Content Tab */}
          <TabsContent value="content" className="h-[calc(100vh-200px)]">
            <div className="relative h-full">
              {/* Script Selection & Status */}
              <div className="flex justify-between items-center mb-4 p-3 bg-white border rounded-lg">
                <ScriptSelector
                  currentScript={contentScript}
                  availableScripts={['te', 'hi', 'en']}
                  onScriptChange={setContentScript}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {saveStatus === 'saving' && (
                    <>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      Saving...
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Auto-saved
                    </>
                  )}
                  {/* saveStatus === 'clean' shows nothing */}
                </div>
              </div>

              <div className="h-[calc(100vh-300px)]">
                <RichTextEditor
                  value={textContent[contentScript] || ''}
                  onChange={(html) => {
                    console.log('ChapterEditor onChange - received HTML:', html);
                    console.log('ChapterEditor onChange - contentScript:', contentScript);
                    console.log('ChapterEditor onChange - updating textContent state');
                    setTextContent((prev) => {
                      const newState = {
                        ...prev,
                        [contentScript]: html,
                      };
                      console.log('ChapterEditor onChange - new textContent state:', newState);
                      return newState;
                    });
                  }}
                  disabled={isPublished}
                  placeholder={`Enter ${contentScript === "te" ? "Telugu" : contentScript === "hi" ? "Devanagari" : "IAST"} content...`}
                  language={contentScript}
                />
              </div>

              {/* Blocking Overlay for Published Chapters */}
              {isPublished && (
                <div 
                  className="absolute inset-0 bg-transparent z-10 cursor-not-allowed"
                  onClick={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onKeyDown={(e) => e.preventDefault()}
                />
              )}
            </div>
          </TabsContent>

          {/* Media Content Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4 relative">
                  {/* Upload Controls - Always Show */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragOver
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isPublished) setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (!isPublished) {
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          const file = files[0];
                          if (validateFileType(file)) {
                            audioUploadMutation.mutate(file);
                          }
                        }
                      }
                    }}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Upload Audio Files
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Drag and drop files here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports: MP3, WAV, M4A, MP4, and other audio/video
                        formats
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        if (!isPublished) {
                          document.getElementById("audio-upload-input")?.click();
                        }
                      }}
                      disabled={audioUploadMutation.isPending || isPublished}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                    </Button>
                    <input
                      id="audio-upload-input"
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={audioUploadMutation.isPending || isPublished}
                    />
                  </div>
                  
                  {/* Blocking Overlay for Published Chapters */}
                  {isPublished && (
                    <div 
                      className="absolute inset-0 bg-transparent z-10 cursor-not-allowed"
                      onClick={(e) => e.preventDefault()}
                      onMouseDown={(e) => e.preventDefault()}
                      onKeyDown={(e) => e.preventDefault()}
                    />
                  )}

                  {audioFiles &&
                  Array.isArray(audioFiles) &&
                  audioFiles.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Uploaded Files ({audioFiles.length})
                      </h4>

                      {(audioFiles as any).map((file: any) => (
                        <div
                          key={file.id}
                          className="group border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {editingFileId === file.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingFileName}
                                    onChange={(e) =>
                                      setEditingFileName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveFileName(file.id);
                                      } else if (e.key === "Escape") {
                                        cancelEditing();
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleSaveFileName(file.id)
                                      }
                                      disabled={
                                        updateFileNameMutation.isPending
                                      }
                                    >
                                      <Save className="w-3 h-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditing}
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Music className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <p className="font-medium text-sm truncate">
                                      {file.displayName || file.filename}
                                    </p>
                                  </div>
                                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>
                                      Duration:{" "}
                                      {file.duration
                                        ? `${file.duration.toFixed(2)}s`
                                        : "Unknown"}
                                    </span>
                                    <span>
                                      Size:{" "}
                                      {file.fileSize
                                        ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                        : "Unknown"}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {!isPublished && editingFileId !== file.id && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    startEditing(
                                      file.id,
                                      file.displayName || file.filename,
                                    )
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    deleteAudioMutation.mutate(file.id)
                                  }
                                  disabled={deleteAudioMutation.isPending}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">
                          No Audio Files
                        </h3>
                        <p className="text-muted-foreground">
                          Upload audio files to start creating segments for this
                          chapter.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Text Segmentation Tab */}
          <TabsContent value="text-segmentation" className="h-[calc(100vh-200px)]">
            <div className="relative h-full">
              {/* Language Selection & Stats */}
              <div className="flex justify-between items-center mb-4 p-3 bg-white border rounded-lg">
                <ScriptSelector
                  currentScript={contentScript}
                  availableScripts={['te', 'hi', 'en']}
                  onScriptChange={setContentScript}
                />
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {textSegments.filter(s => s.script === contentScript).length} segments
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {textSegments
                      .filter(s => s.script === contentScript)
                      .filter(segment => 
                        allChapterMappings.some(mapping => mapping.segmentId === segment.id)
                      ).length} mapped
                  </Badge>
                </div>
              </div>

              <PanelGroup direction="horizontal" className="h-[calc(100vh-300px)]">
                {/* Left Panel: Content Area */}
                <Panel defaultSize={50} minSize={30}>
                  <AnnotationLayer
                    content={chapterContent}
                    currentScript={contentScript}
                    segments={textSegments}
                    selectedSegmentId={selectedSegmentId}
                    onSegmentCreate={handleCreateSegment}
                    onSegmentUpdate={handleUpdateSegment}
                    onSegmentDelete={handleDeleteSegment}
                    onSegmentSelect={setSelectedSegmentId}
                    onScriptChange={setContentScript}
                    availableScripts={['te', 'hi', 'en']}
                  />
                </Panel>
                
                {/* Resize Handle */}
                <PanelResizeHandle className="w-1 bg-transparent relative">
                  <div className="absolute left-0 top-0 w-1 h-[600px] bg-gray-300 hover:bg-gray-400 transition-colors pointer-events-none"></div>
                </PanelResizeHandle>
                
                {/* Right Panel: Segment Management */}
                <Panel defaultSize={50} minSize={30}>
                  <SegmentPanel
                    segments={textSegments}
                    mappings={allChapterMappings}
                    currentScript={contentScript}
                    content={chapterContent}
                    currentSegmentId={selectedSegmentId}
                    onSegmentSelect={(segmentId) => {
                      setSelectedSegmentId(segmentId);
                    }}
                    onSegmentDelete={handleDeleteSegment}
                    onSegmentUpdate={handleUpdateSegment}
                    onPlayMapping={() => {}}
                    onSegmentReorder={(reorderedSegments) => {
                      reorderSegmentsMutation.mutate(reorderedSegments);
                    }}
                  />
                </Panel>
              </PanelGroup>

              {/* Blocking Overlay for Published Chapters */}
              {isPublished && (
                <div 
                  className="absolute inset-0 bg-transparent z-10 cursor-not-allowed"
                  onClick={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onKeyDown={(e) => e.preventDefault()}
                />
              )}
            </div>
          </TabsContent>

          {/* Mapping Tab */}
          <TabsContent value="audio-mapping" className="h-[calc(100vh-200px)]">
            <div className="relative h-full">
              {/* Audio Controls */}
              <div className="flex justify-between items-center mb-4 p-3 bg-white border rounded-lg">
                <div className="flex gap-4">
                  <ScriptSelector
                    currentScript={contentScript}
                    availableScripts={['te', 'hi', 'en']}
                    onScriptChange={setContentScript}
                  />
                  {audioFiles && audioFiles.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Audio File:</label>
                      <Select
                        value={selectedAudioFile?.id?.toString() || ''}
                        onValueChange={(value) => {
                          const file = audioFiles.find(f => f.id.toString() === value);
                          setSelectedAudioFile(file || null);
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select audio file" />
                        </SelectTrigger>
                        <SelectContent>
                          {audioFiles.map(file => (
                            <SelectItem key={file.id} value={file.id.toString()}>
                              {file.displayName || file.filename}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">No audio files uploaded</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <label htmlFor="audio-upload-mapping" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0">
                        <span title="Upload Audio">
                          <Upload className="h-4 w-4" />
                        </span>
                      </Button>
                    </label>
                    <Input
                      id="audio-upload-mapping"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          audioUploadMutation.mutate(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {textSegments
                    .filter(s => s.script === contentScript)
                    .filter(segment => 
                      allChapterMappings.some(mapping => mapping.segmentId === segment.id)
                    ).length} mapped
                </Badge>
              </div>

              {selectedAudioFile && textSegments.length > 0 ? (
                <div className="h-full">
                  {isMappingLoading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading mappings for audio file...</p>
                      </div>
                    </div>
                  )}
                  <ProgressiveMapper
                    audioUrl={`/uploads/${selectedAudioFile.filename}`}
                    segments={textSegments}
                    currentScript={contentScript}
                    content={chapterContent}
                    mappings={mappings.map(convertDatabaseMapping)}
                    selectedAudioFile={selectedAudioFile}
                    onMappingCreate={(mapping) => {
                      createMappingMutation.mutate({
                        segmentId: mapping.segmentId,
                        audioFileId: selectedAudioFile.id,
                        startTime: mapping.startTime,
                        endTime: mapping.endTime,
                        createdBy: "system"
                      });
                    }}
                    onMappingUpdate={(segmentId, updates) => {
                      updateMappingMutation.mutate({
                        segmentId: segmentId,
                        updates: {
                          startTime: updates.startTime,
                          endTime: updates.endTime
                        }
                      });
                    }}
                    onMappingDelete={(segmentId) => {
                      deleteMappingMutation.mutate({
                        audioFileId: selectedAudioFile.id,
                        segmentId: segmentId
                      });
                    }}
                  />
                </div>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent>
                    <p className="text-center text-muted-foreground">
                      No audio file available. Upload an audio file to start mapping.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Blocking Overlay for Published Chapters */}
              {isPublished && (
                <div 
                  className="absolute inset-0 bg-transparent z-10 cursor-not-allowed"
                  onClick={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onKeyDown={(e) => e.preventDefault()}
                />
              )}
            </div>
          </TabsContent>

          {/* Segmentation & Mapping Tab */}
          <TabsContent value="segmentation" className="space-y-6">
            {/* Language Selection & Stats */}
            <div className="flex justify-between items-center p-4 bg-gray-50 border rounded-lg">
              <ScriptSelector
                currentScript={contentScript}
                availableScripts={['te', 'hi', 'en']}
                onScriptChange={setContentScript}
              />
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  {textSegments.filter(s => s.script === contentScript).length} segments
                </Badge>
              </div>
            </div>

            {/* Two-Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT PANEL: Audio Operations */}
              <div className="space-y-6">
                {/* Consolidated Audio Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Media Segmentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Audio File Selection Section */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Select Media
                      </Label>
                      <Select
                        value={selectedAudioFile?.id?.toString() || ""}
                        onValueChange={(value) => {
                          const file =
                            audioFiles && Array.isArray(audioFiles)
                              ? audioFiles.find(
                                  (f: any) => f.id.toString() === value,
                                )
                              : null;
                          setSelectedAudioFile(file);

                          // Load the audio file for playback
                          if (file && file.filename) {
                            // Clean up existing audio player
                            if (audioPlayer) {
                              audioPlayer.pause();
                              audioPlayer.removeEventListener(
                                "loadedmetadata",
                                () => {},
                              );
                              audioPlayer.removeEventListener(
                                "timeupdate",
                                () => {},
                              );
                            }

                            const audio = new Audio(
                              `/uploads/${file.filename}`,
                            );
                            audio.addEventListener("loadedmetadata", () => {
                              setDuration(audio.duration);
                              setCurrentTime(0);
                              setIsPlaying(false);
                              console.log("Audio loaded successfully");
                            });
                            audio.addEventListener("error", (e) => {
                              console.error("Audio loading error:", e);
                              toast({
                                title: "Audio Load Error",
                                description: "Failed to load audio file",
                                variant: "destructive",
                              });
                            });
                            setAudioPlayer(audio);
                          }

                          // Refresh media segments for the selected audio file
                          if (file?.id) {
                            queryClient.invalidateQueries({
                              queryKey: [
                                `/api/media-segments/${file.id}`,
                              ],
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an audio file" />
                        </SelectTrigger>
                        <SelectContent>
                          {audioFiles &&
                            Array.isArray(audioFiles) &&
                            audioFiles.map((file: any) => (
                              <SelectItem
                                key={file.id}
                                value={file.id.toString()}
                              >
                                <div className="flex items-center gap-2">
                                  <Music className="h-4 w-4" />
                                  {file.displayName || file.filename}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Audio Segmentation Section */}
                    {selectedAudioFile && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <Label className="text-sm font-medium">
                            Media Controls
                          </Label>
                        </div>
                        <audio
                          ref={audioRef}
                          src={`/uploads/${selectedAudioFile.hashedFilename || selectedAudioFile.filename}`}
                          onError={(e) => {
                            console.error(
                              "Audio play error:",
                              e,
                              "Trying path:",
                              `/uploads/${selectedAudioFile.hashedFilename || selectedAudioFile.filename}`,
                            );
                            toast({
                              title: "Audio Playback Error",
                              description:
                                "Failed to play audio. Please check the file format and path.",
                              variant: "destructive",
                            });
                          }}
                          onCanPlayThrough={() => {
                            console.log("Audio loaded successfully");
                          }}
                          crossOrigin="anonymous"
                          preload="metadata"
                        />

                        {/* Time Display */}
                        <div className="text-center">
                          <span className="text-sm font-mono">
                            {Math.floor(currentTime / 60)}:
                            {Math.floor(currentTime % 60)
                              .toString()
                              .padStart(2, "0")}{" "}
                            /{Math.floor(duration / 60)}:
                            {Math.floor(duration % 60)
                              .toString()
                              .padStart(2, "0")}
                          </span>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-2">
                          <div className="relative mb-8">
                            <input
                              ref={timelineRef}
                              type="range"
                              min="0"
                              max={duration || 0}
                              value={currentTime}
                              onChange={(e) => {
                                if (audioRef.current) {
                                  audioRef.current.currentTime = parseFloat(
                                    e.target.value,
                                  );
                                  setCurrentTime(parseFloat(e.target.value));
                                }
                              }}
                              className="w-full"
                            />
                            {/* Time Mark Triangles */}
                            {timeMarks.map((mark, index) => {
                              const position = (mark / duration) * 100;
                              const timestamp = `${Math.floor(mark / 60)}:${Math.floor(
                                mark % 60,
                              )
                                .toString()
                                .padStart(2, "0")}`;
                              return (
                                <div
                                  key={index}
                                  className="absolute top-full flex flex-col items-center"
                                  style={{
                                    left: `${position}%`,
                                    transform: "translateX(-50%)",
                                  }}
                                >
                                  {/* Triangle pointing up */}
                                  <div
                                    className={`w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] cursor-pointer ${
                                      selectedMark === mark
                                        ? "border-l-transparent border-r-transparent border-b-red-500 hover:border-b-red-600"
                                        : "border-l-transparent border-r-transparent border-b-green-500 hover:border-b-green-600"
                                    } transition-colors ${isDragging && selectedMark === mark ? "cursor-grabbing" : "cursor-grab"}`}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedMark(mark);
                                      setIsDragging(true);
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDragging) {
                                        setSelectedMark(
                                          selectedMark === mark ? null : mark,
                                        );
                                        if (audioRef.current) {
                                          audioRef.current.currentTime = mark;
                                          setCurrentTime(mark);
                                        }
                                      }
                                    }}
                                    title={`Mark at ${timestamp} - Click to select, drag to move`}
                                  />
                                  {/* Editable Timestamp label */}
                                  {editingTimestamp === mark ? (
                                    <input
                                      type="text"
                                      defaultValue={timestamp}
                                      className="text-xs mt-1 font-mono w-12 text-center border rounded px-1"
                                      autoFocus
                                      onBlur={(e) => {
                                        updateMarkTimestamp(
                                          mark,
                                          e.target.value,
                                        );
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          updateMarkTimestamp(
                                            mark,
                                            e.currentTarget.value,
                                          );
                                        } else if (e.key === "Escape") {
                                          setEditingTimestamp(null);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <div
                                      className={`text-xs mt-1 font-mono cursor-pointer hover:underline ${
                                        selectedMark === mark
                                          ? "text-red-600 font-semibold"
                                          : "text-green-600"
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTimestamp(mark);
                                      }}
                                      title="Click to edit timestamp"
                                    >
                                      {timestamp}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Player Controls */}
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => {
                              if (audioRef.current) {
                                if (isPlaying) {
                                  audioRef.current.pause();
                                  setIsPlaying(false);
                                } else {
                                  audioRef.current.play();
                                  setIsPlaying(true);
                                }
                              }
                            }}
                            size="sm"
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.pause();
                                audioRef.current.currentTime = 0;
                                setIsPlaying(false);
                                setCurrentTime(0);
                              }
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (audioRef.current) {
                                const newMark = audioRef.current.currentTime;
                                setTimeMarks((prev) =>
                                  [...prev, newMark].sort((a, b) => a - b),
                                );
                                toast({
                                  title: "Time Mark Added",
                                  description: `Mark added at ${Math.floor(newMark / 60)}:${Math.floor(
                                    newMark % 60,
                                  )
                                    .toString()
                                    .padStart(2, "0")}`,
                                });
                              }
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (selectedMark !== null) {
                                setTimeMarks((prev) =>
                                  prev.filter((mark) => mark !== selectedMark),
                                );
                                setSelectedMark(null);
                                toast({
                                  title: "Time Mark Cleared",
                                  description: "Selected mark has been removed",
                                });
                              } else {
                                toast({
                                  title: "No Mark Selected",
                                  description:
                                    "Please select a mark on the timeline first",
                                  variant: "destructive",
                                });
                              }
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setTimeMarks([]);
                              setSelectedMark(null);
                              toast({
                                title: "All Marks Cleared",
                                description: "All time marks have been removed",
                              });
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Create Segments Button */}
                        {timeMarks.length > 0 && (
                          <div className="mt-4 flex justify-center">
                            <Button
                              onClick={handleCreateAudioSegments}
                              disabled={
                                createAudioSegmentsMutation.isPending ||
                                isPublished
                              }
                              className="flex items-center gap-2"
                            >
                              <Clock className="h-4 w-4" />
                              {createAudioSegmentsMutation.isPending
                                ? "Creating..."
                                : "Create Audio Segments"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Audio Segments Section */}
                    {selectedAudioFile && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <Label className="text-sm font-medium">
                            Media Segments (
                            {Array.isArray(mediaSegments)
                              ? mediaSegments.length
                              : 0}
                            )
                          </Label>
                        </div>
                        {/* Segments List */}
                        <div className="space-y-2">
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {Array.isArray(mediaSegments) &&
                            mediaSegments.length > 0 ? (
                              (mediaSegments as any[]).map((segment, index) => (
                                <div
                                  key={segment.id}
                                  className="p-2 border rounded-lg bg-white dark:bg-gray-800"
                                >
                                  {editingSegmentId === segment.id ? (
                                    // Edit mode
                                    <div className="space-y-3">
                                      <div className="font-medium text-sm">
                                        {segment.segmentName || segment.name}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-xs">
                                            Start Time (MM:SS)
                                          </Label>
                                          <Input
                                            type="text"
                                            value={
                                              editingSegmentData?.startTime ||
                                              ""
                                            }
                                            onChange={(e) =>
                                              setEditingSegmentData((prev) =>
                                                prev
                                                  ? {
                                                      ...prev,
                                                      startTime: e.target.value,
                                                    }
                                                  : null,
                                              )
                                            }
                                            placeholder="0:00"
                                            className="text-sm h-8"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">
                                            End Time (MM:SS)
                                          </Label>
                                          <Input
                                            type="text"
                                            value={
                                              editingSegmentData?.endTime || ""
                                            }
                                            onChange={(e) =>
                                              setEditingSegmentData((prev) =>
                                                prev
                                                  ? {
                                                      ...prev,
                                                      endTime: e.target.value,
                                                    }
                                                  : null,
                                              )
                                            }
                                            placeholder="0:00"
                                            className="text-sm h-8"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2 justify-end">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={cancelEditingSegment}
                                          className="h-7 px-2 text-xs"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={saveSegmentEdit}
                                          disabled={
                                            updateMediaSegmentMutation.isPending
                                          }
                                          className="h-7 px-2 text-xs"
                                        >
                                          {updateMediaSegmentMutation.isPending
                                            ? "Saving..."
                                            : "Save"}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View mode - compact single row layout
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                          {segment.segmentName || segment.name}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Timer className="w-3 h-3" />
                                            {formatTime(
                                              segment.startTimestamp ||
                                                segment.startTime ||
                                                0,
                                            )}{" "}
                                            -{" "}
                                            {formatTime(
                                              segment.endTimestamp ||
                                                segment.endTime ||
                                                0,
                                            )}
                                          </span>
                                          <span className="text-blue-600 flex items-center gap-1">
                                            <Ruler className="w-3 h-3" />
                                            {(() => {
                                              const start =
                                                segment.startTimestamp ||
                                                segment.startTime ||
                                                0;
                                              const end =
                                                segment.endTimestamp ||
                                                segment.endTime ||
                                                0;
                                              const length = Math.max(
                                                0,
                                                end - start,
                                              );
                                              return Math.round(length) + "s";
                                            })()}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-1 ml-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            // Ensure audio player is set up
                                            if (
                                              !audioPlayer &&
                                              audioRef.current
                                            ) {
                                              setAudioPlayer(audioRef.current);
                                            }

                                            // Use audioRef.current directly if audioPlayer state is not ready
                                            const audio =
                                              audioPlayer || audioRef.current;
                                            if (audio) {
                                              // Update playAudioSegment to use the audio element directly
                                              const startTime =
                                                segment.startTimestamp ||
                                                segment.startTime ||
                                                0;
                                              const endTime =
                                                segment.endTimestamp ||
                                                segment.endTime ||
                                                0;

                                              if (endTime <= startTime) {
                                                toast({
                                                  title: "Invalid Segment",
                                                  description:
                                                    "This segment has invalid timestamps",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }

                                              // Remove any existing boundary listener
                                              if (
                                                segmentBoundaryListenerRef.current
                                              ) {
                                                audio.removeEventListener(
                                                  "timeupdate",
                                                  segmentBoundaryListenerRef.current,
                                                );
                                              }

                                              // Create boundary listener
                                              const boundaryListener = () => {
                                                if (
                                                  audio.currentTime >= endTime
                                                ) {
                                                  audio.pause();
                                                  setIsPlaying(false);
                                                  audio.removeEventListener(
                                                    "timeupdate",
                                                    boundaryListener,
                                                  );
                                                  segmentBoundaryListenerRef.current =
                                                    null;
                                                }
                                              };

                                              segmentBoundaryListenerRef.current =
                                                boundaryListener;
                                              audio.addEventListener(
                                                "timeupdate",
                                                boundaryListener,
                                              );

                                              // Set position and play
                                              audio.currentTime = startTime;
                                              setCurrentTime(startTime);
                                              audio.play();
                                              setIsPlaying(true);

                                              toast({
                                                title: "Playing Segment",
                                                description: `${formatTime(startTime)} - ${formatTime(endTime)} (${Math.round(endTime - startTime)}s)`,
                                              });
                                            } else {
                                              toast({
                                                title: "Audio Not Ready",
                                                description:
                                                  "Please select an audio file first",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                          title="Play segment"
                                        >
                                          <Play className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            startEditingSegment(segment)
                                          }
                                          disabled={isPublished}
                                          className="h-7 w-7 p-0 text-gray-600 hover:text-gray-700"
                                          title="Edit segment"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            deleteSegment(segment.id)
                                          }
                                          disabled={
                                            isPublished ||
                                            deleteMediaSegmentMutation.isPending
                                          }
                                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                          title="Delete segment"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">
                                  No audio segments created yet
                                </p>
                                <p className="text-xs">
                                  Add time marks and create segments
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT PANEL: Text Segmentation & Mapping */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      Text Segmentation & Mapping
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Language Selection */}
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select
                        value={selectedScript}
                        onValueChange={(value: "te" | "hi" | "en") =>
                          setSelectedScript(value)
                        }
                        disabled={isPublished}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="te">Telugu</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                          <SelectItem value="en">English/IAST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Text Content with Segmentation */}
                    <div className="space-y-3">
                      <Label>Text Content (Click and drag to select)</Label>
                      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                        <div
                          className={`text-sm leading-relaxed ${
                            selectedScript === "te"
                              ? "font-telugu"
                              : selectedScript === "hi"
                                ? "font-devanagari"
                                : "font-mono"
                          }`}
                        >
                          {textContent[selectedScript] ? (
                            isHtmlContent(textContent[selectedScript]) ? (
                              <div
                                data-segmentable
                                className="whitespace-pre-wrap cursor-text prose prose-sm max-w-none"
                                onMouseUp={handleTextSelection}
                                dangerouslySetInnerHTML={{ __html: textContent[selectedScript] }}
                              />
                            ) : (
                              renderTextWithSegments(
                                textContent[selectedScript],
                                selectedScript,
                              )
                            )
                          ) : (
                            <div className="text-muted-foreground italic">
                              No content available for this language
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Text Selection Info */}
                    {textSelection && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <Label className="text-sm font-medium">
                          Selected Text
                        </Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          Characters {textSelection.start}-{textSelection.end}
                        </div>
                        <div className="text-sm mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                          "{textSelection.text}"
                        </div>
                      </div>
                    )}

                    {/* Segment Creation */}
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Segment Name</Label>
                        <input
                          type="text"
                          value={segmentName}
                          onChange={(e) => setSegmentName(e.target.value)}
                          placeholder="Enter segment name..."
                          disabled={isPublished}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>

                      <Button
                        onClick={handleCreateTextSegment}
                        disabled={
                          !textSelection ||
                          !segmentName.trim() ||
                          createSegmentMutation.isPending ||
                          isPublished
                        }
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Text Segment
                      </Button>
                    </div>

                    {/* Segment List */}
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Text Segments ({textSegments?.length || 0})
                      </Label>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {textSegments && textSegments.length > 0 ? (
                          textSegments.map((segment) => (
                            <div
                              key={segment.id}
                              className="p-3 border rounded-lg bg-white dark:bg-gray-800"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">
                                      Segment {segment.id}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {segment.script === selectedScript
                                        ? `${segment.script.toUpperCase()}: ${segment.startPosition}-${segment.endPosition}`
                                        : `Script: ${segment.script} (${segment.startPosition}-${segment.endPosition})`}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <LinkStatusIcon 
                                      status={getMappingStatus(segment.id, allChapterMappings)}
                                      size="md"
                                    />
                                  </div>
                                </div>
                                {!isPublished && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      deleteSegmentMutation.mutate(segment.id)
                                    }
                                    disabled={deleteSegmentMutation.isPending}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                              No text segments created yet
                            </p>
                            <p className="text-xs">
                              Select text above to create segments
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <div className="relative">
              {/* Header with Script Selector, Audio File, and Mapped Count */}
              <div className="flex justify-between items-center mb-4 p-3 bg-white border rounded-lg">
                <div className="flex items-center gap-4">
                  <ScriptSelector
                    currentScript={contentScript}
                    availableScripts={['te', 'hi', 'en']}
                    onScriptChange={setContentScript}
                  />
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Audio File:</label>
                    <Select
                      value={selectedAudioFilePreview?.toString() || ""}
                      onValueChange={(value) => {
                        const audioFileId = parseInt(value);
                        const audioFile = audioFiles?.find((f: any) => f.id === audioFileId);
                        if (audioFile) {
                          previewAudioRef.src = `/uploads/${audioFile.filename}`;
                          setSelectedAudioFilePreview(audioFileId);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select audio file" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioFiles && Array.isArray(audioFiles) && audioFiles.map((file: any) => (
                          <SelectItem key={file.id} value={file.id.toString()}>
                            {file.displayName || file.filename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Badge variant="secondary" className="text-xs">
                  {textSegments
                    .filter(s => s.script === contentScript)
                    .filter(segment => 
                      allChapterMappings?.some(mapping => 
                        mapping.segmentId === segment.id && 
                        (!selectedAudioFilePreview || mapping.audioFileId === selectedAudioFilePreview)
                      )
                    ).length} mapped
                </Badge>
              </div>

              {/* Audio Controls */}
              <div className="mb-4">
                {selectedAudioFilePreview ? (
                  <AudioControls
                    title={audioFiles?.find((f: any) => f.id === selectedAudioFilePreview)?.displayName || 
                           audioFiles?.find((f: any) => f.id === selectedAudioFilePreview)?.filename || 
                           'Audio File'}
                    currentTime={previewCurrentTime}
                    duration={previewDuration}
                    isPlaying={isPreviewPlaying}
                    volume={previewVolume}
                    playbackRate={previewPlaybackRate}
                    onPlay={() => {
                      previewAudioRef.play().catch((error) => {
                        console.error('Failed to play audio:', error);
                        setIsPreviewPlaying(false);
                      });
                      setIsPreviewPlaying(true);
                    }}
                    onPause={() => {
                      previewAudioRef.pause();
                      setIsPreviewPlaying(false);
                    }}
                    onStop={() => {
                      previewAudioRef.pause();
                      previewAudioRef.currentTime = 0;
                      setIsPreviewPlaying(false);
                      setPreviewCurrentTime(0);
                    }}
                    onSeek={(time) => {
                      previewAudioRef.currentTime = time;
                      setPreviewCurrentTime(time);
                    }}
                    onVolumeUpdate={(vol) => {
                      previewAudioRef.volume = vol / 100;
                      setPreviewVolume(vol);
                    }}
                    onPlaybackRateChange={(rate) => {
                      previewAudioRef.playbackRate = rate;
                      setPreviewPlaybackRate(rate);
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg bg-white">
                    <Music className="w-12 h-12 mb-4 opacity-50" />
                    <p>Select an audio file to preview</p>
                  </div>
                )}
              </div>

              {/* Content Display Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Content ({contentScript === 'te' ? 'Telugu' : contentScript === 'hi' ? 'Hindi' : 'English'})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-auto">
                    {chapterContent[contentScript] ? (
                      <SegmentedTextDisplay
                        content={chapterContent}
                        currentScript={contentScript}
                        segments={textSegments}
                        selectedSegmentId={selectedTextSegmentPreview}
                        onSegmentClick={handlePreviewSegmentClick}
                        mode="preview"
                        className=""
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                        <p>No content available for this script</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Blocking Overlay for Published Chapters */}
              {isPublished && (
                <div 
                  className="absolute inset-0 bg-transparent z-10 cursor-not-allowed"
                  onClick={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onKeyDown={(e) => e.preventDefault()}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  // Phase 4C: Return with or without context provider
  return USE_CONTEXT_INTEGRATION ? (
    <ChapterEditorProvider chapterId={chapterId} trackId={trackId}>
      {renderContent()}
    </ChapterEditorProvider>
  ) : (
    renderContent()
  );
}
