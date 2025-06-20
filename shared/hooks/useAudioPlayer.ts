/**
 * Audio Player Hook
 * 
 * Centralized audio control logic for audio playback functionality.
 * Provides play, pause, seek, and cleanup functionality with proper memory management.
 * 
 * Created: January 2025
 * Purpose: Eliminate duplicate audio control logic and improve performance
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  playSegment: (startTime: number, endTime: number) => void;
}

export const useAudioPlayer = (audioUrl: string): UseAudioPlayerReturn => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cleanup timeout ref for segment playback
  const segmentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const playSegment = useCallback((startTime: number, endTime: number) => {
    if (!audioRef.current) return;
    
    // Clear any existing timeout
    if (segmentTimeoutRef.current) {
      clearTimeout(segmentTimeoutRef.current);
    }
    
    // Seek to start time and play
    audioRef.current.currentTime = startTime;
    audioRef.current.play();
    setIsPlaying(true);
    
    // Calculate duration and set timeout to pause at end
    const duration = endTime - startTime;
    segmentTimeoutRef.current = setTimeout(() => {
      pause();
    }, duration * 1000);
  }, [pause]);

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(audio.duration || 0);
      setError(null);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load audio file');
      setIsPlaying(false);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  // Reset state when audio URL changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(null);
    
    // Clear any existing timeout
    if (segmentTimeoutRef.current) {
      clearTimeout(segmentTimeoutRef.current);
    }
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (segmentTimeoutRef.current) {
        clearTimeout(segmentTimeoutRef.current);
      }
    };
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    play,
    pause,
    togglePlayPause,
    seekTo,
    playSegment,
  };
};