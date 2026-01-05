import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User } from 'lucide-react';

import { MOCK_STUDENT_PROGRESS } from './mock-data';
import { TrackList } from './TrackList';
import { StudentProgressData } from './types';

export default function StudentProgressTracker() {
    const [data, setData] = useState<StudentProgressData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Simulate API fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            setData(MOCK_STUDENT_PROGRESS);
            setIsLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="container mx-auto p-4 max-w-5xl space-y-6 animate-in fade-in duration-500">
            {/* Prototype Banner */}
            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 px-4 py-2 rounded-md text-xs font-mono border border-amber-200 dark:border-amber-800 mb-4">
                🚧 PROTOTYPE MODE: Showing mock data for UI visualization
            </div>


            {/* Track List */}
            <div className="space-y-4">
                <TrackList tracks={data.trackProgress} />
            </div>
        </div>
    );
}
