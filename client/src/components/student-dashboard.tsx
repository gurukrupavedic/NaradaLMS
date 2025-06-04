import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Trophy, Flame } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface Chapter {
  id: string;
  title: string;
  order: number;
  proficiencyLevel: number;
}

interface Track {
  id: string;
  title: string;
  description: string;
  status: string;
  chapters: Chapter[];
}

interface StudentDashboardProps {
  user: User;
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const [, setLocation] = useLocation();

  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ['/api/tracks'],
  });

  const { data: studentStats = {
    totalStudyTime: 24,
    chaptersCompleted: 8,
    currentStreak: 5,
    level: 3
  } } = useQuery({
    queryKey: ['/api/student-stats'],
  });

  const getProficiencyColor = (level: number) => {
    const colors = {
      0: 'bg-gray-100 text-gray-800',
      1: 'bg-red-100 text-red-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-blue-100 text-blue-800',
      4: 'bg-green-100 text-green-800'
    };
    return colors[level as keyof typeof colors] || colors[0];
  };

  const getProficiencyLabel = (level: number) => {
    const labels = {
      0: 'Not Started',
      1: 'Level 1',
      2: 'Level 2',
      3: 'Level 3',
      4: 'Level 4'
    };
    return labels[level as keyof typeof labels] || 'Unknown';
  };

  const getTrackProgress = (chapters: Chapter[]) => {
    if (chapters.length === 0) return 0;
    const totalProficiency = chapters.reduce((sum, ch) => sum + ch.proficiencyLevel, 0);
    return Math.round((totalProficiency / (chapters.length * 4)) * 100);
  };

  const getTrackStatus = (chapters: Chapter[]) => {
    if (chapters.length === 0) return 'not_started';
    const avgProficiency = chapters.reduce((sum, ch) => sum + ch.proficiencyLevel, 0) / chapters.length;
    if (avgProficiency >= 3.5) return 'ready_for_test';
    if (avgProficiency > 0) return 'in_progress';
    return 'not_started';
  };

  const getTrackStatusColor = (status: string) => {
    switch (status) {
      case 'certified':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'ready_for_test':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getTrackStatusLabel = (status: string) => {
    switch (status) {
      case 'certified':
        return 'Certified';
      case 'ready_for_test':
        return 'Ready for Track Test';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  const recentActivity = [
    {
      type: "completed",
      title: "Completed: Devanagari Script Basics",
      time: "2 hours ago"
    },
    {
      type: "started",
      title: "Started: Sanskrit Grammar Rules",
      time: "1 day ago"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-vedic-gold/10 to-vedic-brown/10 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-vedic-brown mb-2">
          Welcome back, {user.firstName || 'Student'}!
        </h1>
        <p className="text-gray-600">
          Continue your Vedic learning journey. You're doing great!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudyTime}h</div>
            <p className="text-xs text-muted-foreground">Total hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.chaptersCompleted}</div>
            <p className="text-xs text-muted-foreground">Chapters done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak}</div>
            <p className="text-xs text-muted-foreground">Days in a row</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Level</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.level}</div>
            <p className="text-xs text-muted-foreground">Current level</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Tracks */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Learning Tracks</h2>
          {tracks.map((track) => (
            <Card key={track.id}>
              <CardHeader>
                <CardTitle className="text-lg">{track.title}</CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{track.currentChapter}</span>
                    <span>{track.progress}% complete</span>
                  </div>
                  <Progress value={track.progress} className="w-full" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{track.estimatedTime}</span>
                    <Button size="sm">Continue Learning</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                Browse All Tracks
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Study Schedule
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Trophy className="h-4 w-4 mr-2" />
                View Achievements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}