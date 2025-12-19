import React, { createContext, useContext, useReducer, useMemo, ReactNode } from "react";
import { useToast } from "@/features/shared-features/hooks/use-toast";

// Types
interface ChapterData {
  id: number;
  trackId: number;
  title: string;
  description: string;
  status: "draft" | "published";
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
}

interface ChapterEditorState {
  // Core data
  chapterId: string;
  trackId: string;
  chapter: ChapterData | null;
  chapterLoading: boolean;
  
  // Content state
  textContent: { te: string; hi: string; en: string };
  contentScript: "te" | "hi" | "en";
  chapterContent: { te?: string; hi?: string; en?: string };
  
  // Metadata editing
  isEditingMetadata: boolean;
  editingTitle: string;
  editingDescription: string;
  
  // Audio state
  selectedAudioFile: any;
  audioFiles: any[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  timeMarks: number[];
  selectedMark: number | null;
  
  // Segmentation state
  selectedScript: "te" | "hi" | "en";
  segmentName: string;
  textSegments: any[];
  allChapterMappings: any[];
  
  // UI state
  isDragOver: boolean;
  editingFileId: number | null;
  editingFileName: string;
}

type ChapterEditorAction =
  | { type: "SET_CHAPTER_DATA"; payload: { chapter: ChapterData; chapterLoading: boolean } }
  | { type: "SET_TEXT_CONTENT"; payload: { script: string; content: string } }
  | { type: "SET_CONTENT_SCRIPT"; payload: "te" | "hi" | "en" }
  | { type: "SET_METADATA_EDITING"; payload: { isEditing: boolean; title?: string; description?: string } }
  | { type: "SET_AUDIO_STATE"; payload: Partial<Pick<ChapterEditorState, "selectedAudioFile" | "audioFiles" | "isPlaying" | "currentTime" | "duration">> }
  | { type: "SET_TIME_MARKS"; payload: number[] }
  | { type: "SET_SELECTED_MARK"; payload: number | null }
  | { type: "SET_SEGMENTATION_STATE"; payload: Partial<Pick<ChapterEditorState, "selectedScript" | "segmentName" | "textSegments" | "allChapterMappings">> }
  | { type: "SET_UI_STATE"; payload: Partial<Pick<ChapterEditorState, "isDragOver" | "editingFileId" | "editingFileName">> };

interface ChapterEditorContextValue {
  // State
  state: ChapterEditorState;
  
  // Computed values
  isPublished: boolean;
  
  // Actions
  setChapterData: (chapter: ChapterData, loading: boolean) => void;
  updateTextContent: (script: string, content: string) => void;
  setContentScript: (script: "te" | "hi" | "en") => void;
  startEditingMetadata: (title: string, description: string) => void;
  stopEditingMetadata: () => void;
  updateAudioState: (audioState: Partial<Pick<ChapterEditorState, "selectedAudioFile" | "audioFiles" | "isPlaying" | "currentTime" | "duration">>) => void;
  setTimeMarks: (marks: number[]) => void;
  setSelectedMark: (mark: number | null) => void;
  updateSegmentationState: (segmentState: Partial<Pick<ChapterEditorState, "selectedScript" | "segmentName" | "textSegments" | "allChapterMappings">>) => void;
  updateUIState: (uiState: Partial<Pick<ChapterEditorState, "isDragOver" | "editingFileId" | "editingFileName">>) => void;
}

// Initial state
const initialState: ChapterEditorState = {
  chapterId: "",
  trackId: "",
  chapter: null,
  chapterLoading: false,
  textContent: { te: "", hi: "", en: "" },
  contentScript: "te",
  chapterContent: {},
  isEditingMetadata: false,
  editingTitle: "",
  editingDescription: "",
  selectedAudioFile: null,
  audioFiles: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  timeMarks: [],
  selectedMark: null,
  selectedScript: "te",
  segmentName: "",
  textSegments: [],
  allChapterMappings: [],
  isDragOver: false,
  editingFileId: null,
  editingFileName: "",
};

// Reducer
function chapterEditorReducer(state: ChapterEditorState, action: ChapterEditorAction): ChapterEditorState {
  switch (action.type) {
    case "SET_CHAPTER_DATA":
      return {
        ...state,
        chapter: action.payload.chapter,
        chapterLoading: action.payload.chapterLoading,
        chapterContent: action.payload.chapter?.content || {},
      };
    
    case "SET_TEXT_CONTENT":
      return {
        ...state,
        textContent: {
          ...state.textContent,
          [action.payload.script]: action.payload.content,
        },
      };
    
    case "SET_CONTENT_SCRIPT":
      return {
        ...state,
        contentScript: action.payload,
      };
    
    case "SET_METADATA_EDITING":
      return {
        ...state,
        isEditingMetadata: action.payload.isEditing,
        editingTitle: action.payload.title || "",
        editingDescription: action.payload.description || "",
      };
    
    case "SET_AUDIO_STATE":
      return {
        ...state,
        ...action.payload,
      };
    
    case "SET_TIME_MARKS":
      return {
        ...state,
        timeMarks: action.payload,
      };
    
    case "SET_SELECTED_MARK":
      return {
        ...state,
        selectedMark: action.payload,
      };
    
    case "SET_SEGMENTATION_STATE":
      return {
        ...state,
        ...action.payload,
      };
    
    case "SET_UI_STATE":
      return {
        ...state,
        ...action.payload,
      };
    
    default:
      return state;
  }
}

// Context
const ChapterEditorContext = createContext<ChapterEditorContextValue | null>(null);

// Provider component
interface ChapterEditorProviderProps {
  children: ReactNode;
  chapterId: string;
  trackId: string;
}

export function ChapterEditorProvider({ children, chapterId, trackId }: ChapterEditorProviderProps) {
  const [state, dispatch] = useReducer(chapterEditorReducer, {
    ...initialState,
    chapterId,
    trackId,
  });

  // Computed values
  const isPublished = useMemo(() => state.chapter?.status === "published", [state.chapter?.status]);

  // Action creators
  const setChapterData = useMemo(
    () => (chapter: ChapterData, loading: boolean) => {
      dispatch({ type: "SET_CHAPTER_DATA", payload: { chapter, chapterLoading: loading } });
    },
    []
  );

  const updateTextContent = useMemo(
    () => (script: string, content: string) => {
      dispatch({ type: "SET_TEXT_CONTENT", payload: { script, content } });
    },
    []
  );

  const setContentScript = useMemo(
    () => (script: "te" | "hi" | "en") => {
      dispatch({ type: "SET_CONTENT_SCRIPT", payload: script });
    },
    []
  );

  const startEditingMetadata = useMemo(
    () => (title: string, description: string) => {
      dispatch({ type: "SET_METADATA_EDITING", payload: { isEditing: true, title, description } });
    },
    []
  );

  const stopEditingMetadata = useMemo(
    () => () => {
      dispatch({ type: "SET_METADATA_EDITING", payload: { isEditing: false } });
    },
    []
  );

  const updateAudioState = useMemo(
    () => (audioState: Partial<Pick<ChapterEditorState, "selectedAudioFile" | "audioFiles" | "isPlaying" | "currentTime" | "duration">>) => {
      dispatch({ type: "SET_AUDIO_STATE", payload: audioState });
    },
    []
  );

  const setTimeMarks = useMemo(
    () => (marks: number[]) => {
      dispatch({ type: "SET_TIME_MARKS", payload: marks });
    },
    []
  );

  const setSelectedMark = useMemo(
    () => (mark: number | null) => {
      dispatch({ type: "SET_SELECTED_MARK", payload: mark });
    },
    []
  );

  const updateSegmentationState = useMemo(
    () => (segmentState: Partial<Pick<ChapterEditorState, "selectedScript" | "segmentName" | "textSegments" | "allChapterMappings">>) => {
      dispatch({ type: "SET_SEGMENTATION_STATE", payload: segmentState });
    },
    []
  );

  const updateUIState = useMemo(
    () => (uiState: Partial<Pick<ChapterEditorState, "isDragOver" | "editingFileId" | "editingFileName">>) => {
      dispatch({ type: "SET_UI_STATE", payload: uiState });
    },
    []
  );

  // Context value
  const contextValue = useMemo<ChapterEditorContextValue>(
    () => ({
      state,
      isPublished,
      setChapterData,
      updateTextContent,
      setContentScript,
      startEditingMetadata,
      stopEditingMetadata,
      updateAudioState,
      setTimeMarks,
      setSelectedMark,
      updateSegmentationState,
      updateUIState,
    }),
    [
      state,
      isPublished,
      setChapterData,
      updateTextContent,
      setContentScript,
      startEditingMetadata,
      stopEditingMetadata,
      updateAudioState,
      setTimeMarks,
      setSelectedMark,
      updateSegmentationState,
      updateUIState,
    ]
  );

  return (
    <ChapterEditorContext.Provider value={contextValue}>
      {children}
    </ChapterEditorContext.Provider>
  );
}

// Custom hook to use the context
export function useChapterEditor() {
  const context = useContext(ChapterEditorContext);
  if (!context) {
    throw new Error("useChapterEditor must be used within a ChapterEditorProvider");
  }
  return context;
}

// Individual context hooks for selective subscriptions
export function useChapterData() {
  const { state, isPublished } = useChapterEditor();
  return {
    chapter: state.chapter,
    chapterLoading: state.chapterLoading,
    textContent: state.textContent,
    contentScript: state.contentScript,
    chapterContent: state.chapterContent,
    isPublished,
  };
}

export function useMetadataEditing() {
  const { state, startEditingMetadata, stopEditingMetadata } = useChapterEditor();
  return {
    isEditingMetadata: state.isEditingMetadata,
    editingTitle: state.editingTitle,
    editingDescription: state.editingDescription,
    startEditingMetadata,
    stopEditingMetadata,
  };
}

export function useAudioPlayerContext() {
  const { state, updateAudioState, setTimeMarks, setSelectedMark } = useChapterEditor();
  return {
    selectedAudioFile: state.selectedAudioFile,
    audioFiles: state.audioFiles,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    duration: state.duration,
    timeMarks: state.timeMarks,
    selectedMark: state.selectedMark,
    updateAudioState,
    setTimeMarks,
    setSelectedMark,
  };
}

export function useSegmentationContext() {
  const { state, updateSegmentationState } = useChapterEditor();
  return {
    selectedScript: state.selectedScript,
    segmentName: state.segmentName,
    textSegments: state.textSegments,
    allChapterMappings: state.allChapterMappings,
    updateSegmentationState,
  };
}