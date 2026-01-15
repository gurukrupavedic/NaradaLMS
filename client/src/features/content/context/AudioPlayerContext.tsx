import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

interface AudioPlayerContextValue {
    // The Player
    playerRef: React.RefObject<HTMLAudioElement>;

    // State
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    playbackRate: number;
    isMuted: boolean;
    currentSrc: string | null;

    // Actions
    play: () => Promise<void>;
    pause: () => void;
    stop: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    setPlaybackRate: (rate: number) => void;
    toggleMute: () => void;
    setAudioSource: (src: string) => Promise<void>;

    // Segment Playback (for Mapping/Preview)
    playSegment: (startTime: number, endTime: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
    const context = useContext(AudioPlayerContext);
    if (!context) {
        throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
    }
    return context;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const timeUpdateCleanupRef = useRef<(() => void) | null>(null);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(80);
    const [playbackRate, setPlaybackRateState] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentSrc, setCurrentSrc] = useState<string | null>(null);

    // --- Event Handlers that sync state with Audio element ---
    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    }, []);

    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        // Cleanup any segment boundaries if they exist
        if (timeUpdateCleanupRef.current) {
            timeUpdateCleanupRef.current();
            timeUpdateCleanupRef.current = null;
        }
    }, []);

    const handlePlay = useCallback(() => setIsPlaying(true), []);
    const handlePause = useCallback(() => setIsPlaying(false), []);

    // --- Effect: Attach Listeners ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, [handleTimeUpdate, handleLoadedMetadata, handleEnded, handlePlay, handlePause]);

    // --- Actions ---

    const play = async () => {
        if (audioRef.current) {
            try {
                await audioRef.current.play();
            } catch (err) {
                console.error("Context: Play failed", err);
            }
        }
    };

    const pause = () => {
        if (audioRef.current) audioRef.current.pause();
    };

    const stop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const seek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time); // Optimistic update
        }
    };

    const setVolume = (newVolume: number) => {
        if (audioRef.current) {
            audioRef.current.volume = newVolume / 100;
            setVolumeState(newVolume);
        }
    };

    const setPlaybackRate = (rate: number) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = rate;
            setPlaybackRateState(rate);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            const nextMute = !isMuted;
            audioRef.current.muted = nextMute;
            setIsMuted(nextMute);
        }
    };

    const setAudioSource = async (src: string) => {
        if (!audioRef.current) return;

        // Check if source actually changed to prevent reload
        const absoluteSrc = new URL(src, window.location.href).href;
        if (audioRef.current.src === absoluteSrc) return;

        // Reset cleanup
        if (timeUpdateCleanupRef.current) {
            timeUpdateCleanupRef.current();
            timeUpdateCleanupRef.current = null;
        }

        setCurrentSrc(src);
        audioRef.current.src = src;

        // Wait for metadata? Or just let listeners handle it.
        // Audio element auto-resets playing state to false on src change usually.
    };

    const playSegment = (startTime: number, endTime: number) => {
        if (!audioRef.current) return;

        // 1. Cleanup old segment listener
        if (timeUpdateCleanupRef.current) {
            timeUpdateCleanupRef.current();
            timeUpdateCleanupRef.current = null;
        }

        const audio = audioRef.current;

        // 2. Seek & Play
        audio.currentTime = startTime;
        setCurrentTime(startTime);

        // 3. Set up boundary check
        const checkBoundary = () => {
            if (audio.currentTime >= endTime) {
                audio.pause();
                // Remove listener immediately
                audio.removeEventListener('timeupdate', checkBoundary);
                timeUpdateCleanupRef.current = null;
            }
        };

        audio.addEventListener('timeupdate', checkBoundary);
        timeUpdateCleanupRef.current = () => {
            audio.removeEventListener('timeupdate', checkBoundary);
        };

        audio.play().catch(err => console.error("Context: playSegment failed", err));
    };

    return (
        <AudioPlayerContext.Provider
            value={{
                playerRef: audioRef,
                isPlaying,
                currentTime,
                duration,
                volume,
                playbackRate,
                isMuted,
                currentSrc,
                play,
                pause,
                stop,
                seek,
                setVolume,
                setPlaybackRate,
                toggleMute,
                setAudioSource,
                playSegment
            }}
        >
            {/* Hidden Audio Element */}
            <audio ref={audioRef} />
            {children}
        </AudioPlayerContext.Provider>
    );
}
