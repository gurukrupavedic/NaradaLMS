/**
 * Full Audio Controls Component - Vedic LMS Design System
 * 
 * Comprehensive audio player with timeline, play/pause, volume, speed controls.
 * Perfect for LMS audio content, chapter playback, and audio-text synchronization.
 * 
 * Features:
 * - Play/pause/stop controls with icons
 * - Interactive timeline with progress and buffering
 * - Volume control with mute toggle
 * - Playback speed selector (0.5x to 2x)
 * - Time display (current/total duration)
 * - 12 vibrant color variants
 * - Size variants and loading states
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward,
  Settings
} from "lucide-react";
import { Slider } from "./Slider";

const audioControlsVariants = cva(
  "bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3",
  {
    variants: {
      variant: {
        default: "border-gray-200",
        blue: "border-blue-200 bg-blue-50/30",
        green: "border-green-200 bg-green-50/30",
        purple: "border-purple-200 bg-purple-50/30",
        orange: "border-orange-200 bg-orange-50/30",
        pink: "border-pink-200 bg-pink-50/30",
        indigo: "border-indigo-200 bg-indigo-50/30",
        teal: "border-teal-200 bg-teal-50/30",
        cyan: "border-cyan-200 bg-cyan-50/30",
        yellow: "border-yellow-200 bg-yellow-50/30",
        lime: "border-lime-200 bg-lime-50/30",
        rose: "border-rose-200 bg-rose-50/30",
        emerald: "border-emerald-200 bg-emerald-50/30"
      },
      size: {
        sm: "p-3 space-y-2",
        md: "p-4 space-y-3",
        lg: "p-5 space-y-4"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        blue: "bg-blue-100 text-blue-900 hover:bg-blue-200",
        green: "bg-green-100 text-green-900 hover:bg-green-200",
        purple: "bg-purple-100 text-purple-900 hover:bg-purple-200",
        orange: "bg-orange-100 text-orange-900 hover:bg-orange-200",
        pink: "bg-pink-100 text-pink-900 hover:bg-pink-200",
        indigo: "bg-indigo-100 text-indigo-900 hover:bg-indigo-200",
        teal: "bg-teal-100 text-teal-900 hover:bg-teal-200",
        cyan: "bg-cyan-100 text-cyan-900 hover:bg-cyan-200",
        yellow: "bg-yellow-100 text-yellow-900 hover:bg-yellow-200",
        lime: "bg-lime-100 text-lime-900 hover:bg-lime-200",
        rose: "bg-rose-100 text-rose-900 hover:bg-rose-200",
        emerald: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
      },
      size: {
        sm: "h-8 w-8 text-sm",
        md: "h-10 w-10 text-base",
        lg: "h-12 w-12 text-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface AudioControlsProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof audioControlsVariants> {
  // Audio state
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  volume?: number;
  isMuted?: boolean;
  playbackRate?: number;
  bufferedProgress?: number;
  
  // Event handlers
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onMuteToggle?: () => void;
  onPlaybackRateChange?: (rate: number) => void;
  onSkipBackward?: () => void;
  onSkipForward?: () => void;
  
  // Customization
  showSkipButtons?: boolean;
  showPlaybackRate?: boolean;
  showVolumeControl?: boolean;
  title?: string;
  loading?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const wholeSecs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins}:${wholeSecs.toString().padStart(2, '0')}.${tenths}`;
}

const AudioControls = React.forwardRef<HTMLDivElement, AudioControlsProps>(
  ({ 
    className, 
    variant, 
    size, 
    isPlaying = false,
    currentTime = 0,
    duration = 100,
    volume = 80,
    isMuted = false,
    playbackRate = 1,
    bufferedProgress = 0,
    onPlay,
    onPause,
    onStop,
    onSeek,
    onVolumeChange,
    onMuteToggle,
    onPlaybackRateChange,
    onSkipBackward,
    onSkipForward,
    showSkipButtons = true,
    showPlaybackRate = true,
    showVolumeControl = true,
    title,
    loading = false,
    ...props 
  }, ref) => {
    const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
    const [showRateSelector, setShowRateSelector] = React.useState(false);
    
    const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    
    return (
      <div 
        ref={ref}
        className={cn(audioControlsVariants({ variant, size }), className)} 
        {...props}
      >
        {/* Title */}
        {title && (
          <div className="text-sm font-medium text-gray-900 mb-2">{title}</div>
        )}
        
        {/* Main Timeline */}
        <div className="space-y-2">
          {/* Interactive Timeline with Built-in Buffer Display */}
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            variant={variant}
            size={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"}
            onValueChange={(value) => onSeek?.(value[0])}
            disabled={loading}
          />
          
          {/* Time Display */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* Skip Backward */}
            {showSkipButtons && (
              <button
                onClick={onSkipBackward}
                disabled={loading}
                className={cn(buttonVariants({ variant, size }))}
                title="Skip backward 10s"
              >
                <SkipBack className={cn(
                  size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
                )} />
              </button>
            )}
            
            {/* Play/Pause */}
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={loading}
              className={cn(buttonVariants({ variant, size }))}
              title={isPlaying ? "Pause" : "Play"}
            >
              {loading ? (
                <div className={cn(
                  "animate-spin border-2 border-current border-t-transparent rounded-full",
                  size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
                )} />
              ) : isPlaying ? (
                <Pause className={cn(
                  size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
                )} />
              ) : (
                <Play className={cn(
                  size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
                )} />
              )}
            </button>
            
            {/* Stop */}
            <button
              onClick={onStop}
              disabled={loading}
              className={cn(buttonVariants({ variant, size }))}
              title="Stop"
            >
              <Square className={cn(
                size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
              )} />
            </button>
            
            {/* Skip Forward */}
            {showSkipButtons && (
              <button
                onClick={onSkipForward}
                disabled={loading}
                className={cn(buttonVariants({ variant, size }))}
                title="Skip forward 10s"
              >
                <SkipForward className={cn(
                  size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
                )} />
              </button>
            )}
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center space-x-1">
            {/* Volume Control */}
            {showVolumeControl && (
              <div className="relative">
                <button
                  onClick={onMuteToggle}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  className={cn(buttonVariants({ variant, size }))}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className={cn(
                      size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
                    )} />
                  ) : (
                    <Volume2 className={cn(
                      size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
                    )} />
                  )}
                </button>
                
                {/* Volume Slider */}
                {showVolumeSlider && (
                  <div 
                    className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg p-2 shadow-lg z-20 w-24"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={100}
                      step={1}
                      variant={variant}
                      size="sm"
                      onValueChange={(value) => onVolumeChange?.(value[0])}
                      orientation="vertical"
                      className="h-16"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Playback Rate */}
            {showPlaybackRate && (
              <div className="relative">
                <button
                  onClick={() => setShowRateSelector(!showRateSelector)}
                  className={cn(buttonVariants({ variant, size }), "min-w-fit px-2")}
                  title="Playback speed"
                >
                  <span className="text-xs font-medium">{playbackRate}x</span>
                </button>
                
                {/* Rate Selector */}
                {showRateSelector && (
                  <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg py-1 shadow-lg z-20 min-w-16">
                    {playbackRates.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          onPlaybackRateChange?.(rate);
                          setShowRateSelector(false);
                        }}
                        className={cn(
                          "block w-full px-3 py-1 text-xs text-left hover:bg-gray-100",
                          rate === playbackRate && "bg-gray-100 font-medium"
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

AudioControls.displayName = "AudioControls";

export { AudioControls, audioControlsVariants };