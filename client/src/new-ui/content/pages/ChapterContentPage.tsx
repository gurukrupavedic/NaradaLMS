// React & Core
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Internal Libraries
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { isHtmlContent, plainTextToHtml } from "@/lib/html-utils";
import { htmlToPlainText } from "@shared/utils/text-segmentation";

// Phase 4A: Custom Hooks
import { useChapterData } from "@/features/learning/hooks/useChapterData";
import { useAudioPlayer } from "@/features/learning/hooks/useAudioPlayer";
import { useSegmentData } from "@/features/learning/hooks/useSegmentData";
import { useTextSegmentation } from "@/features/learning/hooks/useTextSegmentation";

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
import { Badge } from "@/components/design-system/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/design-system/Switch";

// Business Components
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// Phase 5A: Bundle Optimization - Use centralized icon imports
import {
  FileText, Upload, Music, Eye, ChevronLeft, Play, Pause, Square,
  MapPin, X, Trash2, Plus, ArrowRight, Save, Edit2, Link2, Link2Off, Clock,
  Timer, Ruler, Type, Settings, List, Zap,
} from "@/lib/icons";
import { useLocation } from "wouter";
import { ScriptSelector } from "@/components/common/ScriptSelector";
import { AnnotationLayer } from "@/components/text-segmentation/AnnotationLayer";
import { SegmentPanel } from "@/components/text-segmentation/SegmentPanel";
import { SegmentedTextDisplay } from "@/components/text-segmentation/SegmentedTextDisplay";
import { ProgressiveMapper } from "@/components/audio-mapping/ProgressiveMapper";
import { AudioPlayerPanel } from "@/components/audio-mapping/AudioPlayerPanel";
import { SegmentMappingGrid } from "@/components/audio-mapping/SegmentMappingGrid";
import { ConnectedCirclesIcon } from "@shared/components/icons";
import { LinkStatusIcon } from "@shared/components/LinkStatusIcon";
import { getMappingStatus } from "@shared/utils/mapping-status";
import { progressiveMappingApi } from "@/services/progressiveMappingApi";
import { MappingWithTimestamps, toSimplifiedMapping, SimplifiedMapping } from "@shared/types/text-segmentation";
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
    displayName?: string;
    duration: number;
    fileSize?: number;
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

import { TextSegment as SharedTextSegment, Script } from '@shared/types/text-segmentation';

type TextSegment = SharedTextSegment;

export default function ChapterContent() {
  const [, params] = useRoute("/app/content/tracks/:trackId/chapters/:chapterId");
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

  // Contextual nav is ephemeral - no persistence across sessions

  // Phase 4A: Initialize Custom Hooks (parallel to existing state)
  const chapterDataHook = USE_EXTRACTED_HOOKS ? useChapterData(chapterId) : null;
  const audioPlayerHook = USE_EXTRACTED_HOOKS ? useAudioPlayer(chapterId, audioRef) : null;
  const segmentDataHook = USE_EXTRACTED_HOOKS ? useSegmentData(chapterId, chapterDataHook?.contentScript || "te") : null;
  const textSegmentationHook = USE_EXTRACTED_HOOKS ? useTextSegmentation() : null;

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
  
  // Auto-save status state: dirty = unsaved changes, saving = in progress, saved = just saved, clean = no changes
  const [saveStatus, setSaveStatus] = useState<'clean' | 'dirty' | 'saving' | 'saved'>('clean');

  // Fetch chapter details first (needed for activeChapter calculation)
  const { data: chapter, isLoading: chapterLoading } = useQuery<ChapterData>({
    queryKey: ['content', 'chapters', chapterId, 'details'],
    enabled: !!chapterId,
  });

  // Segments query for database integration - script-specific (original - preserve until hooks validated)
  const { data: textSegments = [] as TextSegment[], refetch: refetchSegments, isLoading: segmentsLoading, error: segmentsError } = useQuery<TextSegment[]>({
    queryKey: ['content', 'chapters', chapterId, 'segments', contentScript || 'te'],
    enabled: !!chapterId && !!contentScript,
    staleTime: 0,
  });

  // Segment selection state
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);

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
  const previewTimeUpdateCleanupRef = useRef<(() => void) | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(80);
  const [previewPlaybackRate, setPreviewPlaybackRate] = useState(1);
  const [selectedAudioFilePreview, setSelectedAudioFilePreview] = useState<number | null | undefined>(null);
  const [learnMode, setLearnMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('preview-learn-mode');
    return stored ? JSON.parse(stored) : true;
  });

  // Sync learnMode to localStorage
  useEffect(() => {
    localStorage.setItem('preview-learn-mode', JSON.stringify(learnMode));
  }, [learnMode]);

  // === HELPER FUNCTIONS SECTION ===

  // Removed: updateMarkTimestamp, handleMarkTime, handleClearMark, handleClearAllMarks, handleCreateAudioSegments
  // These were part of the deprecated Media Segmentation panel
  const handleResetAudio = () => {
    if (!audioPlayer) return;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
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
      await apiRequest("PATCH", `/api/content/chapters/${chapterId}/status`, {
        status: newStatus,
      });
    },
    onSuccess: () => {
      toast({ title: "Chapter status updated successfully" });
      queryClient.invalidateQueries({
        queryKey: ['content', 'chapters', chapterId, 'details'],
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

  // Handle publish with force-save if there are unsaved changes
  const handlePublishToggle = () => {
    const newStatus = activeChapter?.status === "published" ? "draft" : "published";
    
    // If publishing and there are unsaved changes, save first
    if (newStatus === "published" && saveStatus === 'dirty' && activeChapter?.content) {
      setSaveStatus('saving');
      updateContentMutation.mutate(
        {
          ...activeChapter.content,
          [contentScript]: textContent[contentScript],
        },
        {
          onSuccess: () => {
            // After save completes, proceed with publish
            toggleStatusMutation.mutate(newStatus);
          },
          onError: () => {
            // Save failed - don't publish
            toast({
              title: "Save failed",
              description: "Could not save changes before publishing. Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      // No unsaved changes or unpublishing - proceed directly
      toggleStatusMutation.mutate(newStatus);
    }
  };

  // Update chapter metadata mutation
  const updateChapterMetadataMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      await apiRequest("PATCH", `/api/content/chapters/${chapterId}`, {
        title,
        description,
      });
    },
    onSuccess: () => {
      toast({ title: "Chapter updated successfully" });
      setIsEditingMetadata(false);
      queryClient.invalidateQueries({
        queryKey: ['content', 'chapters', chapterId, 'details'],
      });
      // Also invalidate the chapters list to update the display
      if (chapter?.trackId) {
        queryClient.invalidateQueries({
          queryKey: ['content', 'tracks', chapter.trackId, 'chapters'],
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
  const { data: audioFiles = [] } = useQuery<Array<{ id: number; filename: string; displayName?: string; duration: number; fileSize?: number; url: string }>>(
    { 
      queryKey: ['content', 'chapters', chapterId, 'audio'],
      enabled: !!chapterId,
    }
  );

  // All mappings for the chapter (for counting mapped segments)
  const { data: allChapterMappings = [] as SimplifiedMapping[] } = useQuery<SimplifiedMapping[]>({
    queryKey: ['content', 'chapters', chapterId, 'mappings'],
    enabled: !!chapterId
  });

  // Preview tab segment click handler - finds mapping and seeks to audio timestamp
  const handlePreviewSegmentClick = useCallback((segmentId: number | undefined) => {
    if (!segmentId) {
      setSelectedTextSegmentPreview(undefined);
      // Clean up any existing listener
      if (previewTimeUpdateCleanupRef.current) {
        previewTimeUpdateCleanupRef.current();
        previewTimeUpdateCleanupRef.current = null;
      }
      return;
    }

    // Highlight the selected segment
    setSelectedTextSegmentPreview(segmentId);

    // Find the audio mapping for this segment from all chapter mappings (backend data)
    // Priority: selected audio file first, then fallback to any other mapping
    const mapping = (allChapterMappings as SimplifiedMapping[]).find((m: SimplifiedMapping) =>
      m.textSegmentId === segmentId && m.audioFileId === selectedAudioFilePreview
    ) || (allChapterMappings as SimplifiedMapping[]).find((m: SimplifiedMapping) => m.textSegmentId === segmentId);
    
    if (!mapping) {
      console.log('No mapping found for segment:', segmentId);
      return;
    }

    // Clean up any existing timeupdate listener before setting up a new one
    if (previewTimeUpdateCleanupRef.current) {
      previewTimeUpdateCleanupRef.current();
      previewTimeUpdateCleanupRef.current = null;
    }

    // Helper function to start playback with auto-stop at endTime
    const playSegment = () => {
      // Seek to start time
      previewAudioRef.currentTime = mapping.startTime;
      setPreviewCurrentTime(mapping.startTime);
      
      // Set up timeupdate listener to auto-stop at endTime
      const handleTimeUpdate = () => {
        if (previewAudioRef.currentTime >= mapping.endTime) {
          previewAudioRef.pause();
          setIsPreviewPlaying(false);
          // Clean up this listener
          previewAudioRef.removeEventListener('timeupdate', handleTimeUpdate);
          previewTimeUpdateCleanupRef.current = null;
        }
      };
      
      previewAudioRef.addEventListener('timeupdate', handleTimeUpdate);
      
      // Store cleanup function
      previewTimeUpdateCleanupRef.current = () => {
        previewAudioRef.removeEventListener('timeupdate', handleTimeUpdate);
      };
      
      // Start playback
      previewAudioRef.play().catch((error) => {
        console.error('Failed to play audio:', error);
        setIsPreviewPlaying(false);
      });
      setIsPreviewPlaying(true);
    };

    // If the audio file is different from the currently loaded one, load it
    if (selectedAudioFilePreview !== mapping.audioFileId) {
      const audioFile = audioFiles?.find((f: any) => f.id === mapping.audioFileId);
      if (audioFile) {
        previewAudioRef.src = `/uploads/${audioFile.filename}`;
        setSelectedAudioFilePreview(mapping.audioFileId);
        
        // Wait for audio to load before playing segment
        previewAudioRef.addEventListener('loadedmetadata', () => {
          playSegment();
        }, { once: true });
      }
    } else {
      // Same audio file, just play the segment
      playSegment();
    }
  }, [(allChapterMappings as SimplifiedMapping[])?.length || 0, selectedAudioFilePreview, (audioFiles as any[])?.length || 0]);

  // Fetch mappings for the selected audio file
  const { data: audioFileMappings = [], refetch: refetchMappings } = useQuery<MappingWithTimestamps[]>({
    queryKey: ['content', 'chapters', chapterId, 'mappings', 'audio', selectedAudioFile?.id],
    enabled: !!selectedAudioFile?.id,
    queryFn: () => progressiveMappingApi.getMappingsByAudioFile(selectedAudioFile!.id)
  });

  // Note: Using audioFileMappings directly - no need for separate state



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
        `/api/content/chapters/${chapterId}/audio`,
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
        queryKey: ['content', 'chapters', chapterId, 'audio'],
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
      queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments', contentScript || 'te'] });
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
      queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments', contentScript || 'te'] });
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
      queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments', contentScript || 'te'] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['content', 'chapters', chapterId, 'segments', contentScript || 'te']
      });
    },
    onError: () => {
      toast({
        title: "Failed to reorder segments",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleSegmentReorder = (reorderedSegments: any[]) => {
    reorderSegmentsMutation.mutate(reorderedSegments);
  };

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
      const response = await apiRequest("PATCH", `/api/content/chapters/${chapterId}`, {
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
        queryKey: ['content', 'chapters', chapterId, 'details'],
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
        te: (activeChapter.content.te || "") as string,
        hi: (activeChapter.content.hi || "") as string,
        en: (activeChapter.content.en || "") as string,
      });
    }
  }, [activeChapter?.content, USE_EXTRACTED_HOOKS]);

  // Initialize chapterContent for segmentation display (original - preserve until hooks validated)
  useEffect(() => {
    if (activeChapter?.content && !USE_EXTRACTED_HOOKS) {
      // Only update if the actual content values have changed
      const newContent: { te?: string; hi?: string; en?: string } = {
        te: (activeChapter.content.te || "") as string,
        hi: (activeChapter.content.hi || "") as string,
        en: (activeChapter.content.en || "") as string,
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
      // No changes - ensure we're in clean state (unless saving/saved)
      if (saveStatus === 'dirty') {
        setSaveStatus('clean');
      }
      return;
    }

    // Mark as dirty immediately when changes are detected
    if (saveStatus !== 'saving' && saveStatus !== 'saved') {
      setSaveStatus('dirty');
    }

    const timeoutId = setTimeout(() => {
      updateContentMutation.mutate({
        ...activeChapter.content,
        [contentScript]: textContent[contentScript],
      });
    }, 15000); // Auto-save after 15 seconds of no typing

    return () => clearTimeout(timeoutId);
  }, [textContent, activeChapter?.content, isPublished, contentScript, USE_EXTRACTED_HOOKS]);

  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.removeEventListener("loadedmetadata", () => {});
        audioPlayer.removeEventListener("timeupdate", () => {});
        audioPlayer.removeEventListener("error", () => {});
      }
    };
  }, [audioPlayer]);

  // Create audio segments from marks mutation
  // Delete audio file mutation
  const deleteAudioMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/audio-files/${fileId}`);
      return fileId;
    },
    onSuccess: (deletedFileId) => {
      toast({ title: "Audio file deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: ['content', 'chapters', chapterId, 'audio'],
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
        queryKey: ['content', 'chapters', chapterId, 'audio'],
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
  const validateMapping = (mapping: { textSegmentId?: number; audioFileId?: number; startTime?: number; endTime?: number }) => {
    if (!mapping.textSegmentId || !mapping.audioFileId) {
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
    mutationFn: async (mappingData: { textSegmentId: number; audioFileId: number; startTime: number; endTime: number }) => {
      validateMapping(mappingData);
      return progressiveMappingApi.createMapping(mappingData);
    },
    onSuccess: () => {
      refetchMappings();
      queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'mappings'] });
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
      queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'mappings'] });
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
      queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'mappings'] });
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

  // Audio file selection and setup
  const handleAudioFileSelect = (fileId: number) => {
    setSelectedAudioFile(fileId);
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
    if (audioFiles && audioFiles.length > 0 && selectedAudioFilePreview === null) {
      const firstAudioFile = audioFiles[0];
      setSelectedAudioFilePreview(firstAudioFile.id);
      previewAudioRef.src = `/uploads/${firstAudioFile.filename}`;
    }
  }, [audioFiles?.length, selectedAudioFilePreview]);

  // Auto-select first audio file in Mapping tab when audioFiles load
  useEffect(() => {
    if (audioFiles && audioFiles.length > 0 && selectedAudioFile === null) {
      const firstAudioFile = audioFiles[0];
      setSelectedAudioFile(firstAudioFile);
    }
  }, [audioFiles?.length, selectedAudioFile]);

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
      ? htmlToPlainText(fullTextContent) 
      : fullTextContent;
    
    // For HTML content, we need to map the selection to plain text positions
    if (isHtmlContent(fullTextContent)) {
      // Get the plain text equivalent of the selection
      const plainTextSelection = htmlToPlainText(selectedText);
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
    const segments = (textSegments as TextSegment[]) || [];
    if (!segments || segments.length === 0) {
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

    const segmentsForLang = segments.filter(
      (seg: TextSegment) => seg.script === language,
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
      (a, b) => a.startPosition - b.startPosition,
    );

    const parts = [];
    let lastEnd = 0;

    sortedSegments.forEach((segment: TextSegment, index: number) => {
      // Add text before this segment
      if (segment.startPosition > lastEnd) {
        parts.push(
          <span key={`before-${index}`} className="cursor-text">
            {text.substring(lastEnd, segment.startPosition)}
          </span>,
        );
      }

      // Add the segmented text with highlighting
      const hasAudioMapping = allChapterMappings.some(m => m.textSegmentId === segment.id);
      parts.push(
        <span
          key={`segment-${segment.id}`}
          className={`px-1 py-0.5 rounded cursor-pointer transition-colors ${
            hasAudioMapping
              ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
              : "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
          } hover:opacity-80`}
          title={`Segment ${segment.id}${hasAudioMapping ? " (Audio Mapped)" : " (No Audio)"}`}
          onClick={() => {
            const mapping = allChapterMappings.find(m => m.textSegmentId === segment.id);
            if (mapping && audioPlayer) {
              audioPlayer.currentTime = mapping.startTime;
              audioPlayer.play();
              setIsPlaying(true);
            }
          }}
        >
          {text.substring(segment.startPosition, segment.endPosition)}
        </span>,
      );

      lastEnd = segment.endPosition;
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
                      queryKey: ['content', 'tracks', trackId, 'chapters'],
                    });
                    // Navigate back to content studio
                    setLocation(`/app/content`);
                  } else {
                    // Fallback to content studio home
                    setLocation("/app/content");
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
                  onClick={handlePublishToggle}
                  disabled={toggleStatusMutation.isPending || updateContentMutation.isPending}
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
              <Zap className="w-4 h-4" />
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
            <div className="relative h-full flex flex-col">
              {/* Script Selection & Status */}
              <div className="flex justify-between items-center mb-4 p-3 bg-white border rounded-lg">
                <ScriptSelector
                  currentScript={contentScript}
                  availableScripts={['te', 'hi', 'en']}
                  onScriptChange={setContentScript}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {saveStatus === 'dirty' && (
                    <>
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-amber-600">Unsaved changes</span>
                    </>
                  )}
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

              <div className="flex-1 min-h-0">
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
          <TabsContent value="media" className="h-[calc(100vh-200px)]">
            <Card className="h-full flex flex-col">
              <CardContent className="pt-6 flex-1 min-h-0 overflow-auto">
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
            <div className="relative h-full flex flex-col">
              {/* Language Selection & Stats */}
              <div className="flex justify-between items-center mb-4 p-3 bg-white border rounded-lg">
                <ScriptSelector
                  currentScript={contentScript}
                  availableScripts={['te', 'hi', 'en']}
                  onScriptChange={setContentScript}
                />
                <div className="flex gap-2">
                  <Badge variant="blue" badgeStyle="sharp" className="text-xs" icon={<List className="h-3 w-3" />}>
                    {textSegments.filter(s => s.script === contentScript).length} segments
                  </Badge>
                </div>
              </div>

              <PanelGroup id="text-segmentation-panels" direction="horizontal" className="flex-1 min-h-0">
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
                <PanelResizeHandle className="w-1 bg-gray-400 hover:bg-gray-600 transition-colors" />
                
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
                    onSegmentReorder={handleSegmentReorder}
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
            <div className="relative h-full flex flex-col">
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
                      <label className="text-xs font-medium">Audio File:</label>
                      <Select
                        value={selectedAudioFile?.id?.toString() || ''}
                        onValueChange={(value) => {
                          const file = audioFiles.find(f => f.id.toString() === value);
                          setSelectedAudioFile(file || null);
                        }}
                      >
                        <SelectTrigger className="w-80 h-7 text-xs">
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
                      <span className="text-xs text-gray-500">No audio files uploaded</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge variant="blue" badgeStyle="sharp" className="text-xs" icon={<List className="h-3 w-3" />}>
                    {textSegments.filter(s => s.script === contentScript).length} segments
                  </Badge>
                  <Badge variant="green" badgeStyle="sharp" className="text-xs" icon={<Zap className="h-3 w-3" />}>
                    {textSegments
                      .filter(s => s.script === contentScript)
                      .filter(segment => 
                        allChapterMappings.some(mapping => 
                          mapping.textSegmentId === segment.id && 
                          mapping.audioFileId === selectedAudioFile?.id
                        )
                      ).length} mapped
                  </Badge>
                </div>
              </div>

              {selectedAudioFile && textSegments.length > 0 ? (
                <ProgressiveMapper
                  audioUrl={`/uploads/${selectedAudioFile.filename}`}
                  segments={textSegments}
                  currentScript={contentScript}
                  content={chapterContent}
                  mappings={audioFileMappings.map(toSimplifiedMapping)}
                  selectedAudioFile={selectedAudioFile}
                  onMappingCreate={(mapping) => {
                    createMappingMutation.mutate({
                      textSegmentId: mapping.segmentId,
                      audioFileId: selectedAudioFile.id,
                      startTime: mapping.startTime,
                      endTime: mapping.endTime
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
                >
                  {(state) => (
                    <PanelGroup id="audio-mapping-panels" direction="horizontal" className="flex-1 min-h-0">
                      {isMappingLoading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">Loading mappings for audio file...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Left Panel: Audio Player */}
                      <Panel defaultSize={20} minSize={20}>
                        <AudioPlayerPanel
                          audioRef={state.audioRef}
                          audioUrl={state.audioUrl}
                          isPlaying={state.isPlaying}
                          currentTime={state.currentTime}
                          duration={state.duration}
                          mappingSession={state.mappingSession}
                          progressPercentage={state.progressPercentage}
                          mappedCount={state.mappedCount}
                          totalCount={state.totalCount}
                          togglePlayPause={state.togglePlayPause}
                          seekTo={state.seekTo}
                          startMappingSession={state.startMappingSession}
                          pauseMappingSession={state.pauseMappingSession}
                          stopMappingSession={state.stopMappingSession}
                          resetMappingSession={state.resetMappingSession}
                        />
                      </Panel>

                      <PanelResizeHandle className="w-1 bg-gray-400 hover:bg-gray-600 transition-colors" />

                      {/* Right Panel: Segment Mapping Grid */}
                      <Panel defaultSize={80} minSize={40}>
                        <SegmentMappingGrid
                          segments={state.segments}
                          currentScript={state.currentScript}
                          content={state.content}
                          mappings={state.mappings}
                          mappingSession={state.mappingSession}
                          activeSegmentId={state.activeSegmentId}
                          duration={state.duration}
                          onSegmentClick={state.handleSegmentClick}
                          onPlaySegment={state.handlePlaySegment}
                          onMappingUpdate={state.onMappingUpdate}
                          onMappingDelete={state.onMappingDelete}
                          onMappingCreate={state.onMappingCreate}
                          onEndSession={state.stopMappingSession}
                        />
                      </Panel>
                    </PanelGroup>
                  )}
                </ProgressiveMapper>
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
                <Badge variant="blue" badgeStyle="sharp" className="text-xs" icon={<List className="h-3 w-3" />}>
                  {textSegments.filter(s => s.script === contentScript).length} segments
                </Badge>
                <Badge variant="green" badgeStyle="sharp" className="text-xs" icon={<Zap className="h-3 w-3" />}>
                  {textSegments
                    .filter(s => s.script === contentScript)
                    .filter(segment => 
                      allChapterMappings.some(mapping => mapping.textSegmentId === segment.id)
                    ).length} mapped
                </Badge>
              </div>
            </div>

            {/* Single Panel Layout - Text Segmentation Only */}
            <div className="grid grid-cols-1 gap-6">
              {/* Text Segmentation & Mapping Panel */}
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
                                      status={getMappingStatus(segment.id, allChapterMappings as any)}
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
          <TabsContent value="preview" className="h-[calc(100vh-200px)]">
            <div className="relative h-full flex flex-col">
              {/* Header with Script Selector, Audio File, and Mapped Count */}
              <div className="flex justify-between items-center mb-4 p-3 bg-white border rounded-lg">
                <div className="flex items-center gap-4">
                  <ScriptSelector
                    currentScript={contentScript}
                    availableScripts={['te', 'hi', 'en']}
                    onScriptChange={setContentScript}
                  />
                  
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium">Audio File:</label>
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
                      <SelectTrigger className="w-80 h-7 text-xs">
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
                
                <div className="flex gap-2">
                  <Badge variant="blue" badgeStyle="sharp" className="text-xs" icon={<List className="h-3 w-3" />}>
                    {textSegments.filter(s => s.script === contentScript).length} segments
                  </Badge>
                  <Badge variant="green" badgeStyle="sharp" className="text-xs" icon={<Zap className="h-3 w-3" />}>
                    {textSegments
                      .filter(s => s.script === contentScript)
                      .filter(segment => 
                        allChapterMappings?.some(mapping => 
                          mapping.textSegmentId === segment.id && 
                          mapping.audioFileId === selectedAudioFilePreview
                        )
                      ).length} mapped
                  </Badge>
                </div>
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

              {/* Content Display */}
              <div className="flex-1 min-h-0 flex flex-col border rounded-lg bg-white overflow-hidden">
                <div className="flex-shrink-0 p-4 border-b bg-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {activeChapter?.title || 'Chapter'} ({contentScript === 'te' ? 'Telugu' : contentScript === 'hi' ? 'Hindi' : 'English'})
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">Learn Mode:</span>
                    <Switch
                      checked={learnMode}
                      onCheckedChange={setLearnMode}
                      variant="orange"
                      size="sm"
                      data-testid="toggle-learn-mode"
                    />
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto p-6">
                    {chapterContent[contentScript] ? (
                      learnMode ? (
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
                        <div 
                          className={`
                            prose max-w-none
                            ${contentScript === 'te' ? 'font-telugu' : contentScript === 'hi' ? 'font-devanagari' : 'font-iast'}
                          `}
                          style={{
                            lineHeight: '1.6'
                          }}
                          dangerouslySetInnerHTML={{ __html: chapterContent[contentScript] }}
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
