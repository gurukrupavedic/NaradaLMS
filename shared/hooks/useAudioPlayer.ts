/**
 * Audio Player Hook - Production Hook
 * 
 * Provides audio playback functionality with React state management
 * Handles audio events, seeking, and segment playback
 * 
 * Status: Production Ready
 * Migrated: January 2025
 */

import { useRef, useState, useEffect, useCallback } from 'react';

export const useAudioPlayer = (audioUrl: string) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Load the audio
    audio.src = audioUrl;
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const playSegment = useCallback((startTime: number, endTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = startTime;
    setCurrentTime(startTime);
    
    audio.play().catch(console.error);

    // Set up listener to stop at end time
    const handleTimeUpdate = () => {
      if (audio.currentTime >= endTime) {
        audio.pause();
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    seekTo,
    playSegment
  };
};