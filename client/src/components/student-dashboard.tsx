import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Clock, Book, TrendingUp, Calendar } from "lucide-react";
import type { Track, Chapter, StudentProgress, User } from "@shared/schema";

interface TrackWithProgress extends Track {
  chapters: Chapter[];
  progress: StudentProgress[];
}

export default function StudentDashboard({ user }: { user: User }) {
  const [, setLocation] = useLocation();

  const { data: tracks = [], isLoading } = useQuery<TrackWithProgress[]>({
    queryKey: ['/api/tracks'],
    select: (data: Track[]) => {
      // This would need to be enhanced to include chapters and progress
      return data.map(track => ({
        ...track,
        chapters: [],
        progress: [],
      }));
    },
  });

  const { data: studentProgress = [] } = useQuery<StudentProgress[]>({
    queryKey: [`/api/student-progress/${user.id}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vedic-brown"></div>
      </div>
    );
  }

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Learning Tracks */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900">Learning Tracks</CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Filter:</span>
                <Select defaultValue="all">
                  <SelectTrigger className="w-32">
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
              {tracks.map(track => {
                const trackProgress = studentProgress.filter(p => 
                  track.chapters.some(c => c.id === p.chapterId)
                );
                const completedChapters = trackProgress.filter(p => p.proficiencyLevel > 0).length;
                const totalChapters = track.chapters.length;
                const progressPercentage = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;
                const highestLevel = Math.max(0, ...trackProgress.map(p => p.proficiencyLevel));

                return (
                  <div key={track.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{track.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{track.description}</p>
                        
                        <div className="flex items-center space-x-4 mb-3">
                          <span className="text-sm text-gray-500 flex items-center">
                            <Book className="h-4 w-4 mr-1" />
                            {totalChapters} Chapters
                          </span>
                          <span className="text-sm text-gray-500 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            ~2 hours
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(highestLevel)}`}>
                            {getLevelLabel(highestLevel)}
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div 
                            className="bg-vedic-gold h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {completedChapters} of {totalChapters} chapters completed
                        </span>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          // Navigate to first available chapter or continue where left off
                          const nextChapter = track.chapters.find(c => 
                            !trackProgress.some(p => p.chapterId === c.id && p.proficiencyLevel > 0)
                          ) || track.chapters[0];
                          
                          if (nextChapter) {
                            setLocation(`/chapter/${nextChapter.id}`);
                          }
                        }}
                        className="ml-4 bg-vedic-brown hover:bg-vedic-brown/90 text-white"
                      >
                        {completedChapters === 0 ? 'Start' : 'Continue'}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {tracks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No learning tracks available yet.</p>
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
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {studentProgress.slice(0, 5).map((progress, index) => (
                <div key={progress.id} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    progress.proficiencyLevel === 4 ? 'bg-green-500' :
                    progress.proficiencyLevel >= 2 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {progress.proficiencyLevel === 4 ? 'Mastered' : 
                       progress.proficiencyLevel >= 2 ? 'Advanced' : 'Started'} Chapter
                    </p>
                    <p className="text-xs text-gray-500">Chapter {progress.chapterId}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {progress.lastAccessed 
                      ? new Date(progress.lastAccessed).toLocaleDateString()
                      : 'Recently'
                    }
                  </span>
                </div>
              ))}

              {studentProgress.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Study Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Study Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chapters Completed</span>
                <span className="font-semibold text-vedic-brown">
                  {studentProgress.filter(p => p.proficiencyLevel > 0).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Highest Level</span>
                <span className="font-semibold text-vedic-brown">
                  {getLevelLabel(Math.max(0, ...studentProgress.map(p => p.proficiencyLevel)))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Tracks</span>
                <span className="font-semibold text-vedic-brown">
                  {tracks.filter(t => t.status === 'published').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Study Session</span>
                <span className="font-semibold text-vedic-brown">
                  {studentProgress.length > 0 
                    ? new Date(Math.max(...studentProgress.map(p => 
                        new Date(p.lastAccessed || p.updatedAt).getTime()
                      ))).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
