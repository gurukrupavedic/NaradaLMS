import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, BookOpen, TrendingUp, Target } from 'lucide-react';
import type { TrackWithChapters } from '@shared/schema';

interface DashboardProps {
  onTrackSelect: (trackId: number) => void;
  onChapterSelect: (chapterId: number) => void;
}

export function Dashboard({ onTrackSelect, onChapterSelect }: DashboardProps) {
  const { data: tracks, isLoading } = useQuery<TrackWithChapters[]>({
    queryKey: ['/api/tracks'],
  });

  const getLevelColor = (level: number) => {
    const colors = ['bg-gray-200', 'bg-red-200', 'bg-yellow-200', 'bg-blue-200', 'bg-green-200'];
    return colors[level] || 'bg-gray-200';
  };

  const getLevelLabel = (level: number) => {
    if (level === 0) return 'Not Started';
    return `Level ${level}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const publishedTracks = tracks?.filter(track => track.status === 'published') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Learning</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <select className="text-sm border border-gray-300 rounded-md px-3 py-2">
            <option>All Tracks</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Learning Tracks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-amber-600" />
                <span>Learning Tracks</span>
              </CardTitle>
              <CardDescription>
                Your journey through Vedic wisdom
              </CardDescription>
            </CardHeader>
            <CardContent>
              {publishedTracks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No published tracks available yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {publishedTracks.map((track) => (
                    <div
                      key={track.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-2">
                            {track.title}
                          </h3>
                          {track.description && (
                            <p className="text-gray-600 text-sm mb-3">{track.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 mb-3">
                            <span className="text-sm text-gray-500 flex items-center">
                              <BookOpen className="h-4 w-4 mr-1" />
                              {track.chapterCount} Chapters
                            </span>
                            <span className="text-sm text-gray-500 flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              ~{Math.ceil(track.chapterCount * 0.5)} hours
                            </span>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Level 2
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <Progress value={65} className="h-2" />
                            <span className="text-xs text-gray-500">
                              3 of {track.chapterCount} chapters completed
                            </span>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => onTrackSelect(track.id)}
                          className="ml-4 bg-amber-700 hover:bg-amber-800 text-white"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { action: 'Completed Chapter 3', track: 'Vaidika Nithya Karma', time: '2 days ago', type: 'complete' },
                  { action: 'Started Chapter 4', track: 'Vaidika Nithya Karma', time: '1 week ago', type: 'start' },
                  { action: 'Reached Level 2', track: 'Sookta Paatham', time: '2 weeks ago', type: 'level' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'complete' ? 'bg-green-500' :
                      activity.type === 'start' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.track}</p>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Study Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-amber-600" />
                <span>Study Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Total Study Time', value: '47 hours' },
                  { label: 'Chapters Completed', value: '12' },
                  { label: 'Current Streak', value: '7 days' },
                  { label: 'Highest Level', value: 'Level 3' },
                ].map((stat, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{stat.label}</span>
                    <span className="font-semibold text-amber-700">{stat.value}</span>
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
