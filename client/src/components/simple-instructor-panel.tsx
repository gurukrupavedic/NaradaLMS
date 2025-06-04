import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, BookOpen, TrendingUp, MessageSquare, Star } from "lucide-react";
import type { User } from "@shared/schema";

interface InstructorPanelProps {
  user: User;
}

export default function SimpleInstructorPanel({ user }: InstructorPanelProps) {
  const [students] = useState([
    {
      id: "1",
      name: "Arjun Sharma",
      email: "arjun@example.com",
      currentTrack: "Vedic Sanskrit Fundamentals",
      currentChapter: "Chapter 3: Sandhi Rules",
      progress: 65,
      level: 3,
      lastActive: "2 hours ago",
      totalStudyTime: 28
    },
    {
      id: "2",
      name: "Priya Patel",
      email: "priya@example.com",
      currentTrack: "Rigveda Samhita",
      currentChapter: "Chapter 1: Agni Sukta",
      progress: 42,
      level: 2,
      lastActive: "1 day ago",
      totalStudyTime: 15
    },
    {
      id: "3",
      name: "Vikram Singh",
      email: "vikram@example.com",
      currentTrack: "Vedic Sanskrit Fundamentals",
      currentChapter: "Chapter 1: Introduction",
      progress: 20,
      level: 1,
      lastActive: "3 days ago",
      totalStudyTime: 8
    }
  ]);

  const [assignments] = useState([
    {
      id: "1",
      title: "Practice Devanagari Writing",
      track: "Vedic Sanskrit Fundamentals",
      dueDate: "2024-06-10",
      submitted: 12,
      total: 15,
      avgScore: 85
    },
    {
      id: "2",
      title: "Recite Agni Sukta",
      track: "Rigveda Samhita",
      dueDate: "2024-06-08",
      submitted: 8,
      total: 10,
      avgScore: 92
    }
  ]);

  const classStats = {
    totalStudents: 25,
    activeStudents: 18,
    avgProgress: 58,
    avgLevel: 2.3,
    completionRate: 72
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
          <p className="text-gray-600">Monitor student progress and manage your classes</p>
        </div>
        <Button>
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Announcement
        </Button>
      </div>

      {/* Class Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Enrolled in your classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.activeStudents}</div>
            <p className="text-xs text-muted-foreground">Active this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.avgProgress}%</div>
            <p className="text-xs text-muted-foreground">Class average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Level</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.avgLevel}</div>
            <p className="text-xs text-muted-foreground">Proficiency level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">Assignment completion</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList>
          <TabsTrigger value="students">Student Progress</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-8" />
            </div>
            <Button variant="outline">Export Progress Report</Button>
          </div>

          <div className="grid gap-4">
            {students.map((student) => (
              <Card key={student.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <CardDescription>{student.email}</CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">Level {student.level}</Badge>
                      <p className="text-xs text-gray-500 mt-1">Last active: {student.lastActive}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{student.currentTrack}</span>
                        <span>{student.progress}%</span>
                      </div>
                      <Progress value={student.progress} className="w-full" />
                      <p className="text-xs text-gray-600 mt-1">Current: {student.currentChapter}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Study Time: {student.totalStudyTime}h</span>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm">View Details</Button>
                        <Button variant="outline" size="sm">Send Message</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Current Assignments</h2>
            <Button>Create Assignment</Button>
          </div>

          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <CardDescription>{assignment.track}</CardDescription>
                    </div>
                    <Badge variant={new Date(assignment.dueDate) > new Date() ? 'default' : 'destructive'}>
                      Due: {assignment.dueDate}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Submissions</p>
                      <p className="text-2xl font-bold">{assignment.submitted}/{assignment.total}</p>
                    </div>
                    <div>
                      <p className="font-medium">Average Score</p>
                      <p className="text-2xl font-bold">{assignment.avgScore}%</p>
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" size="sm">View Submissions</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">Progress chart would be displayed here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">Engagement metrics would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}