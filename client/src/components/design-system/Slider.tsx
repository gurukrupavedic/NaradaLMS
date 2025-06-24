/**
 * Slider Component - Vedic LMS Design System
 * 
 * Range sliders for audio timeline controls and learning progress.
 * Perfect for audio-text synchronization and interactive controls.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React, { useState, useRef, useCallback } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number | number[];
  onChange?: (value: number) => void;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  label?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

export interface AudioSliderProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  showVolume?: boolean;
  className?: string;
}

export interface ProgressSliderProps {
  progress: number;
  total: number;
  onProgressChange?: (progress: number) => void;
  label?: string;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  showPercentage?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: {
    height: "h-1",
    thumb: "h-4 w-4",
    label: "text-sm"
  },
  md: {
    height: "h-2",
    thumb: "h-5 w-5",
    label: "text-base"
  },
  lg: {
    height: "h-3",
    thumb: "h-6 w-6",
    label: "text-lg"
  }
};

const variantClasses = {
  blue: {
    track: "bg-blue-200",
    fill: "bg-blue-600",
    thumb: "bg-blue-600 border-blue-600 ring-blue-500"
  },
  green: {
    track: "bg-green-200",
    fill: "bg-green-600",
    thumb: "bg-green-600 border-green-600 ring-green-500"
  },
  purple: {
    track: "bg-purple-200",
    fill: "bg-purple-600",
    thumb: "bg-purple-600 border-purple-600 ring-purple-500"
  },
  orange: {
    track: "bg-orange-200",
    fill: "bg-orange-600",
    thumb: "bg-orange-600 border-orange-600 ring-orange-500"
  },
  pink: {
    track: "bg-pink-200",
    fill: "bg-pink-600",
    thumb: "bg-pink-600 border-pink-600 ring-pink-500"
  },
  indigo: {
    track: "bg-indigo-200",
    fill: "bg-indigo-600",
    thumb: "bg-indigo-600 border-indigo-600 ring-indigo-500"
  },
  teal: {
    track: "bg-teal-200",
    fill: "bg-teal-600",
    thumb: "bg-teal-600 border-teal-600 ring-teal-500"
  },
  cyan: {
    track: "bg-cyan-200",
    fill: "bg-cyan-600",
    thumb: "bg-cyan-600 border-cyan-600 ring-cyan-500"
  },
  yellow: {
    track: "bg-yellow-200",
    fill: "bg-yellow-600",
    thumb: "bg-yellow-600 border-yellow-600 ring-yellow-500"
  },
  lime: {
    track: "bg-lime-200",
    fill: "bg-lime-600",
    thumb: "bg-lime-600 border-lime-600 ring-lime-500"
  },
  rose: {
    track: "bg-rose-200",
    fill: "bg-rose-600",
    thumb: "bg-rose-600 border-rose-600 ring-rose-500"
  },
  emerald: {
    track: "bg-emerald-200",
    fill: "bg-emerald-600",
    thumb: "bg-emerald-600 border-emerald-600 ring-emerald-500"
  }
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  onValueChange,
  disabled = false,
  variant = "blue",
  size = "md",
  showValue = false,
  label,
  formatValue = (val) => val.toString(),
  className = ""
}: SliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const variantStyle = variantClasses[variant];
  const sizeStyle = sizeClasses[size];

  // Handle both array and single value formats
  const currentValue = Array.isArray(value) ? value[0] : value;
  const percentage = ((currentValue - min) / (max - min)) * 100;
  
  const debouncedValueChange = useCallback(
    debounce((newValue: number) => {
      if (onValueChange) {
        onValueChange([newValue]);
      }
      if (onChange) {
        onChange(newValue);
      }
    }, 16), // ~60fps
    [onValueChange, onChange]
  );
  
  const handleValueChange = useCallback((newValue: number) => {
    debouncedValueChange(newValue);
  }, [debouncedValueChange]);

  // Simple debounce implementation
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || !sliderRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = sliderRef.current.getBoundingClientRect();
    const fillElement = sliderRef.current.querySelector('[data-fill]') as HTMLElement;
    const thumbElement = sliderRef.current.querySelector('[data-thumb]') as HTMLElement;
    
    const updateValue = (clientX: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percentage = (x / rect.width) * 100;
      const newValue = min + (percentage / 100) * (max - min);
      const steppedValue = step > 0 ? Math.round(newValue / step) * step : newValue;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));
      const finalPercentage = ((clampedValue - min) / (max - min)) * 100;
      
      // Immediate DOM updates for visual feedback
      if (fillElement) {
        fillElement.style.width = `${finalPercentage}%`;
      }
      if (thumbElement) {
        thumbElement.style.left = `${finalPercentage}%`;
      }
      
      // Debounced callback update
      handleValueChange(clampedValue);
    };

    updateValue(e.clientX);

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectstart', preventDefault);
      document.body.style.userSelect = '';
    };

    const preventDefault = (e: Event) => e.preventDefault();
    
    // Disable text selection during drag
    document.body.style.userSelect = 'none';
    document.addEventListener('selectstart', preventDefault);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, min, max, step, handleValueChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <label className={`font-medium text-gray-900 ${sizeStyle.label}`}>
              {label}
            </label>
          )}
          {showValue && (
            <span className={`text-gray-600 ${sizeStyle.label}`}>
              {formatValue(currentValue)}
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        <div
          ref={sliderRef}
          className={`
            relative w-full ${sizeStyle.height} rounded-full cursor-pointer
            ${variantStyle.track} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onMouseDown={handleMouseDown}
        >
          {/* Fill */}
          <div
            data-fill
            className={`absolute top-0 left-0 ${sizeStyle.height} rounded-full ${variantStyle.fill} will-change-[width]`}
            style={{ width: `${percentage}%` }}
          />
          
          {/* Thumb */}
          <div
            data-thumb
            className={`
              absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2
              ${sizeStyle.thumb} rounded-full border-2 shadow-sm
              ${variantStyle.thumb} ring-opacity-25
              focus:ring-4 ${variantStyle.thumb} will-change-[left]
              ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
            `}
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function AudioSlider({
  currentTime,
  duration,
  onSeek,
  isPlaying,
  onTogglePlay,
  volume = 1,
  onVolumeChange,
  variant = "orange",
  showVolume = true,
  className = ""
}: AudioSliderProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Play/Pause Button */}
      <button
        onClick={onTogglePlay}
        className={`
          p-2 rounded-full transition-colors
          ${variantClasses[variant].fill} text-white
          hover:opacity-90 focus:ring-4 ${variantClasses[variant].thumb}
        `}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>

      {/* Current Time */}
      <span className="text-sm text-gray-600 font-mono min-w-[40px]">
        {formatTime(currentTime)}
      </span>

      {/* Timeline Slider */}
      <div className="flex-1">
        <Slider
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={onSeek}
          variant={variant}
          size="sm"
        />
      </div>

      {/* Duration */}
      <span className="text-sm text-gray-600 font-mono min-w-[40px]">
        {formatTime(duration)}
      </span>

      {/* Volume Control */}
      {showVolume && onVolumeChange && (
        <>
          <Volume2 className="h-4 w-4 text-gray-600" />
          <div className="w-20">
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={onVolumeChange}
              variant={variant}
              size="sm"
            />
          </div>
        </>
      )}
    </div>
  );
}

export function ProgressSlider({
  progress,
  total,
  onProgressChange,
  label,
  variant = "green",
  showPercentage = true,
  className = ""
}: ProgressSliderProps) {
  const percentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-sm font-medium text-gray-900">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-600">
              {Math.round(percentage)}% ({progress}/{total})
            </span>
          )}
        </div>
      )}
      
      <Slider
        min={0}
        max={total}
        value={progress}
        onChange={onProgressChange || (() => {})}
        variant={variant}
        size="md"
        disabled={!onProgressChange}
      />
    </div>
  );
}

// Educational semantic variants for LMS contexts
export const SliderVariants = {
  // Audio controls
  audioTimeline: "orange" as const,
  audioVolume: "cyan" as const,
  
  // Learning progress
  chapterProgress: "green" as const,
  trackProgress: "emerald" as const,
  overallProgress: "blue" as const,
  
  // Settings
  difficulty: "purple" as const,
  speed: "indigo" as const,
  volume: "cyan" as const,
  
  // Interactive elements
  timeline: "orange" as const,
  scrubber: "teal" as const,
  selector: "pink" as const
};