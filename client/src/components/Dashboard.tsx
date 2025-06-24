import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  description: string;
  order: number;
  status: string;
  chapterCount: number;
  completedChapters: number;
  currentLevel: number;
}

interface RecentActivity {
  id: string;
  type: 'completed' | 'started' | 'level_up';
  chapterTitle: string;
  trackTitle: string;
  timestamp: string;
  level?: number;
}

interface StudyStats {
  totalStudyTime: number;
  chaptersCompleted: number;
  currentStreak: number;
  highestLevel: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: tracks, isLoading: tracksLoading, error: tracksError } = useQuery<Track[]>({
    queryKey: ['/api/tracks'],
  });

  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useQuery<RecentActivity[]>({
    queryKey: ['/api/student-progress'],
  });

  const { data: studyStats, isLoading: statsLoading, error: statsError } = useQuery<StudyStats>({
    queryKey: ['/api/student-stats'],
  });

  useEffect(() => {
    const errors = [tracksError, activityError, statsError].filter(Boolean);
    errors.forEach(error => {
      if (error && isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    });
  }, [tracksError, activityError, statsError, toast]);

  const isLoading = tracksLoading || activityLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Learning Tracks</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const filteredTracks = tracks?.filter(track => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'in-progress') return track.completedChapters > 0 && track.completedChapters < track.chapterCount;
    if (filterStatus === 'completed') return track.completedChapters === track.chapterCount;
    return true;
  }) || [];

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 text-gray-800';
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-blue-100 text-blue-800';
      case 4: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 0: return 'Not Started';
      case 1: return 'Level 1';
      case 2: return 'Level 2';
      case 3: return 'Level 3';
      case 4: return 'Level 4';
      default: return 'Unknown';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'completed': return '✅';
      case 'started': return '📖';
      case 'level_up': return '⭐';
      default: return '📚';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'completed': return 'text-green-600';
      case 'started': return 'text-yellow-600';
      case 'level_up': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Learning Tracks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-2xl">Learning Tracks</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Filter:</span>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tracks</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTracks.length > 0 ? (
                  filteredTracks.map(track => (
                    <TrackCard 
                      key={track.id} 
                      track={track}
                      onContinue={() => setLocation(`/chapter/${track.id}`)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2">No learning tracks available</p>
                    <p className="text-sm">Contact your instructor to get started with Vedic learning.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map(activity => (
                    <div key={activity.id} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type).replace('text-', 'bg-')}`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {getActivityIcon(activity.type)} {activity.type === 'completed' ? 'Completed' : 
                           activity.type === 'started' ? 'Started' : 
                           activity.type === 'level_up' ? `Reached Level ${activity.level}` : 'Activity'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.chapterTitle} - {activity.trackTitle}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Study Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Study Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studyStats ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Study Time</span>
                      <span className="font-semibold text-primary">{studyStats.totalStudyTime} hours</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Chapters Completed</span>
                      <span className="font-semibold text-primary">{studyStats.chaptersCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current Streak</span>
                      <span className="font-semibold text-primary">{studyStats.currentStreak} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Highest Level</span>
                      <Badge className={getLevelColor(studyStats.highestLevel)}>
                        {getLevelLabel(studyStats.highestLevel)}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <p className="text-sm">Loading statistics...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
