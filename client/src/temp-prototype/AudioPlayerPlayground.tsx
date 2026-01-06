import React, { useState, useRef, useEffect } from "react";
import { AudioControls } from "@/components/design-system/AudioControls";
import { AudioPlayerControls } from "./AudioPlayerControls";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export function AudioPlayerPlayground() {
    // Shared State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(180); // 3 minutes dummy duration
    const [volume, setVolume] = useState(80);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    // Simulation Interval
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setCurrentTime((prev) => {
                    if (prev >= duration) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return Math.min(prev + 0.1 * playbackRate, duration);
                });
            }, 100);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying, duration, playbackRate]);

    const handleSeek = (time: number) => {
        setCurrentTime(time);
    };

    const handleStop = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const skipForward = () => {
        setCurrentTime((t) => Math.min(t + 10, duration));
    };

    const skipBackward = () => {
        setCurrentTime((t) => Math.max(t - 10, 0));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 space-y-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Audio Player Replacement</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Comparing the legacy <code>AudioControls</code> component with the new Shadcn-based <code>AudioPlayerControls</code>.
                    </p>
                </div>

                {/* Comparison Grid */}
                <div className="grid lg:grid-cols-2 gap-8">

                    {/* Legacy Component */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Legacy Implementation</h2>
                            <span className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-1 rounded">@/components/design-system/AudioControls</span>
                        </div>

                        <Card>
                            <CardContent className="p-6">
                                <AudioControls
                                    title="Legacy Audio Player (Design System v1)"
                                    isPlaying={isPlaying}
                                    currentTime={currentTime}
                                    duration={duration}
                                    volume={volume}
                                    playbackRate={playbackRate}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onStop={handleStop}
                                    onSeek={handleSeek}
                                    onVolumeUpdate={setVolume}
                                    onPlaybackRateChange={setPlaybackRate}
                                    onSkipForward={skipForward}
                                    onSkipBackward={skipBackward}
                                    showSkipButtons={true}
                                    showVolumeControl={true}
                                    showPlaybackRate={true}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    {/* New Component Info */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">New Shadcn Implementation</h2>
                            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">@/temp-prototype/AudioPlayerControls</span>
                        </div>

                        <Card className="bg-slate-100/50 border-dashed dark:bg-slate-900/50">
                            <CardHeader>
                                <CardTitle className="text-sm">Architecture Notes</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>• Uses <code>@/components/ui/slider</code> for progress and volume.</p>
                                <p>• Uses <code>@/components/ui/button</code> with <code>ghost</code> and <code>icon</code> variants.</p>
                                <p>• Uses <code>lucide-react</code> icons exclusively.</p>
                                <p>• Fully controlled component, drop-in replacement for logic in <code>LearnChapterPage</code>.</p>
                            </CardContent>
                        </Card>
                    </section>
                </div>

                <Separator className="my-8" />

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Theme Preview</h2>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Light Theme Preview */}
                        <div className="space-y-4 rounded-xl border bg-slate-50 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-4 w-4 rounded-full bg-slate-900" />
                                <span className="text-sm font-medium text-slate-900">Light Mode</span>
                            </div>

                            <AudioPlayerControls
                                title="Introduction to Vedic Chanting"
                                isPlaying={isPlaying}
                                currentTime={currentTime}
                                duration={duration}
                                volume={volume}
                                isMuted={isMuted}
                                playbackRate={playbackRate}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onStop={handleStop}
                                onSeek={handleSeek}
                                onVolumeChange={setVolume}
                                onMuteToggle={() => setIsMuted(!isMuted)}
                                onPlaybackRateChange={setPlaybackRate}
                                onSkipForward={skipForward}
                                onSkipBackward={skipBackward}
                            />
                        </div>

                        {/* Dark Theme Preview */}
                        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6 dark text-white">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-4 w-4 rounded-full bg-slate-100" />
                                <span className="text-sm font-medium text-slate-100">Dark Mode</span>
                            </div>

                            <AudioPlayerControls
                                title="Introduction to Vedic Chanting"
                                isPlaying={isPlaying}
                                currentTime={currentTime}
                                duration={duration}
                                volume={volume}
                                isMuted={isMuted}
                                playbackRate={playbackRate}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onStop={handleStop}
                                onSeek={handleSeek}
                                onVolumeChange={setVolume}
                                onMuteToggle={() => setIsMuted(!isMuted)}
                                onPlaybackRateChange={setPlaybackRate}
                                onSkipForward={skipForward}
                                onSkipBackward={skipBackward}
                                className="bg-slate-900 border-slate-800"
                            />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default AudioPlayerPlayground;
