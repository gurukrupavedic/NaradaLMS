/**
 * Design System Showcase - Optimized & Organized
 * 
 * Compact, organized showcase for testing design system components.
 * Features grouped components, universal color picker, and reduced redundancy.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";
import { Progress, CircularProgress } from "./Progress";
import { Badge } from "./Badge";
import { Alert, AlertTitle, AlertDescription } from "./Alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { Avatar } from "./Avatar";
import { TextSegment } from "./TextSegment";
import { Textarea } from "./Textarea";
import { Switch } from "./Switch";
import { Tooltip, SimpleTooltip } from "./Tooltip";
import { Loading } from "./Loading";
import { RichTextEditor } from "./RichTextEditor";
import { BookOpen, Edit, Music, Play, Save, Trash2, Search, User, Mail, FileText, Headphones, Layers, CheckCircle, AlertCircle, Info, XCircle, Star, Crown, Shield, Copy } from "lucide-react";

export function DesignSystemShowcase() {
  const [selectedVariant, setSelectedVariant] = useState<string>("blue");
  const [activeGroup, setActiveGroup] = useState<string>("foundation");
  
  const colorVariants = [
    "blue", "green", "purple", "orange", "pink", "indigo", 
    "teal", "cyan", "yellow", "lime", "rose", "emerald"
  ];

  const colorMap: Record<string, string> = {
    blue: "#3b82f6", green: "#22c55e", purple: "#a855f7", orange: "#f97316",
    pink: "#ec4899", indigo: "#6366f1", teal: "#14b8a6", cyan: "#06b6d4",
    yellow: "#eab308", lime: "#84cc16", rose: "#f43f5e", emerald: "#10b981"
  };

  const componentGroups = [
    { id: "foundation", name: "Foundation", icon: Layers, count: 5 },
    { id: "display", name: "Data Display", icon: CheckCircle, count: 4 },
    { id: "navigation", name: "Navigation", icon: Search, count: 3 },
    { id: "content", name: "Content", icon: Edit, count: 3 }
  ];

  const educationalVariants = ["lesson", "progress", "admin", "student"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header with Universal Controls */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vedic LMS Design System</h1>
              <p className="text-sm text-gray-600">15 components • 12 colors • Production ready</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Active Color:</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-gray-300" 
                  style={{ backgroundColor: colorMap[selectedVariant] }}
                ></div>
                <span className="text-sm font-medium capitalize">{selectedVariant}</span>
              </div>
            </div>
          </div>
          
          {/* Compact Color Picker */}
          <div className="flex flex-wrap gap-2">
            {colorVariants.map((variant) => (
              <button
                key={variant}
                onClick={() => setSelectedVariant(variant)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedVariant === variant 
                    ? 'border-gray-800 ring-2 ring-gray-300 scale-110' 
                    : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                }`}
                style={{ backgroundColor: colorMap[variant] }}
                title={variant}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Component Group Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {componentGroups.map((group) => {
              const IconComponent = group.icon;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    activeGroup === group.id
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium">{group.name}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{group.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Foundation Group */}
        {activeGroup === "foundation" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Foundation Components</h2>
              <span className="text-sm text-gray-500">Core building blocks</span>
            </div>
          
            {/* Cards */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Card Family
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card variant={selectedVariant} educational="lesson">
                  <CardHeader>
                    <CardTitle>Chapter 1: Introduction</CardTitle>
                    <CardDescription>Begin your Vedic learning journey</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-gray-500" />
                      <span className="text-sm">5 lessons • 45 min</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card variant={selectedVariant} educational="progress">
                  <CardHeader>
                    <CardTitle>Learning Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={75} variant={selectedVariant} educational="progress" />
                    <p className="text-sm text-gray-600 mt-2">3 of 4 chapters completed</p>
                  </CardContent>
                </Card>
                
                <Card variant={selectedVariant} educational="admin">
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">125 active students</span>
                      <Badge variant={selectedVariant} educational="admin">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Buttons */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Button Family
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["lesson", "progress", "admin", "student"].map((context) => (
                  <div key={context} className="space-y-3">
                    <p className="text-sm font-medium capitalize text-gray-700">{context}</p>
                    <div className="space-y-2">
                      <Button variant={selectedVariant} educational={context} size="sm">
                        {context === "lesson" && <BookOpen className="w-4 h-4 mr-2" />}
                        {context === "progress" && <CheckCircle className="w-4 h-4 mr-2" />}
                        {context === "admin" && <Shield className="w-4 h-4 mr-2" />}
                        {context === "student" && <User className="w-4 h-4 mr-2" />}
                        {context === "lesson" ? "Start Lesson" : 
                         context === "progress" ? "Continue" :
                         context === "admin" ? "Manage" : "Study"}
                      </Button>
                      <Button variant={selectedVariant} educational={context} size="sm" outline>
                        Secondary
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Input Family
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Student Name</label>
                    <Input variant={selectedVariant} educational="student" placeholder="Enter full name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Course Search</label>
                    <Input variant={selectedVariant} educational="lesson" placeholder="Search courses..." icon={Search} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Admin Email</label>
                    <Input variant={selectedVariant} educational="admin" placeholder="admin@vedic-lms.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Progress Notes</label>
                    <Input variant={selectedVariant} educational="progress" placeholder="Add learning notes..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Badges & Avatars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Badge Family
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedVariant} educational="lesson">New Lesson</Badge>
                    <Badge variant={selectedVariant} educational="progress">75% Complete</Badge>
                    <Badge variant={selectedVariant} educational="admin">Admin</Badge>
                    <Badge variant={selectedVariant} educational="student">Student</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedVariant} educational="lesson" outline>Draft</Badge>
                    <Badge variant={selectedVariant} educational="progress" outline>In Progress</Badge>
                    <Badge variant={selectedVariant} educational="admin" outline>Pending</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Avatar Family
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar name="Dr. Raghuram" educational="admin" showStatus status="online" />
                    <Avatar name="Priya Sharma" educational="student" showStatus status="away" />
                    <Avatar name="Sanskrit Class" educational="lesson" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar name="Admin" educational="admin" size="sm" />
                    <Avatar name="Student" educational="student" size="sm" />
                    <Avatar name="Instructor" educational="progress" size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Display Group */}
        {activeGroup === "display" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Data Display Components</h2>
              <span className="text-sm text-gray-500">Progress, feedback & status</span>
            </div>

            {/* Progress Family */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Progress Family
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Chapter Progress</label>
                    <Progress value={75} variant={selectedVariant} educational="lesson" />
                    <p className="text-xs text-gray-500 mt-1">3 of 4 sections completed</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Course Completion</label>
                    <Progress value={45} variant={selectedVariant} educational="progress" />
                    <p className="text-xs text-gray-500 mt-1">9 of 20 chapters completed</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Student Performance</label>
                    <div className="flex items-center gap-4">
                      <CircularProgress value={85} variant={selectedVariant} educational="student" />
                      <div>
                        <p className="text-sm font-medium">Excellent Progress</p>
                        <p className="text-xs text-gray-500">85% average score</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert Family */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Alert Family
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Alert variant="info" educational="lesson">
                  <Info className="h-4 w-4" />
                  <AlertTitle>New Lesson Available</AlertTitle>
                  <AlertDescription>Chapter 3: Advanced Mantras is now ready for study.</AlertDescription>
                </Alert>
                
                <Alert variant="success" educational="progress">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Chapter Completed!</AlertTitle>
                  <AlertDescription>You've successfully finished the introductory chapter.</AlertDescription>
                </Alert>
                
                <Alert variant="warning" educational="admin">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>System Maintenance</AlertTitle>
                  <AlertDescription>Scheduled maintenance tonight from 2-4 AM IST.</AlertDescription>
                </Alert>
                
                <Alert variant="error" educational="student">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Assignment Overdue</AlertTitle>
                  <AlertDescription>Please submit your Sanskrit practice assignment.</AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Loading & Tooltip Family */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Loading States</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Loading variant={selectedVariant} size="sm" />
                    <span className="text-sm">Loading lessons...</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Loading variant={selectedVariant} size="md" />
                    <span className="text-sm">Processing audio...</span>
                  </div>
                  <div className="space-y-2">
                    <Loading.Skeleton className="h-4 w-full" />
                    <Loading.Skeleton className="h-4 w-3/4" />
                    <Loading.Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Tooltip Family</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Tooltip content="Start your learning journey">
                      <Button variant={selectedVariant} educational="lesson" size="sm">
                        <BookOpen className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                    <SimpleTooltip content="View progress details">
                      <Button variant={selectedVariant} educational="progress" size="sm">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </SimpleTooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Group */}
        {activeGroup === "navigation" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Navigation Components</h2>
              <span className="text-sm text-gray-500">User interaction & control</span>
            </div>

            {/* Tabs Family */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Tabs Family</h3>
              <Tabs defaultValue="lessons" variant={selectedVariant} educational="lesson">
                <TabsList>
                  <TabsTrigger value="lessons">Lessons</TabsTrigger>
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="assignments">Assignments</TabsTrigger>
                </TabsList>
                <TabsContent value="lessons" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card variant={selectedVariant} educational="lesson">
                      <CardHeader>
                        <CardTitle className="text-base">Lesson 1</CardTitle>
                        <CardDescription>Introduction to Vedic Chanting</CardDescription>
                      </CardHeader>
                    </Card>
                    <Card variant={selectedVariant} educational="lesson">
                      <CardHeader>
                        <CardTitle className="text-base">Lesson 2</CardTitle>
                        <CardDescription>Basic Sanskrit Pronunciation</CardDescription>
                      </CardHeader>
                    </Card>
                    <Card variant={selectedVariant} educational="lesson">
                      <CardHeader>
                        <CardTitle className="text-base">Lesson 3</CardTitle>
                        <CardDescription>Simple Mantras Practice</CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="progress" className="mt-4">
                  <div className="space-y-4">
                    <Progress value={60} variant={selectedVariant} educational="progress" />
                    <p className="text-sm text-gray-600">Overall course progress: 60%</p>
                  </div>
                </TabsContent>
                <TabsContent value="assignments" className="mt-4">
                  <p className="text-sm text-gray-600">No pending assignments</p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Select Family */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Select Family</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Role</label>
                  <Select>
                    <SelectTrigger variant={selectedVariant} educational="admin">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent educational="admin">
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Learning Track</label>
                  <Select>
                    <SelectTrigger variant={selectedVariant} educational="lesson">
                      <SelectValue placeholder="Select track" />
                    </SelectTrigger>
                    <SelectContent educational="lesson">
                      <SelectItem value="basics">Vedic Basics</SelectItem>
                      <SelectItem value="mantras">Sacred Mantras</SelectItem>
                      <SelectItem value="advanced">Advanced Studies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Status</label>
                  <Select>
                    <SelectTrigger variant={selectedVariant} educational="progress">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent educational="progress">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Under Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Switch Family */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Switch Family</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Audio Autoplay</span>
                    <Switch variant={selectedVariant} educational="lesson" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress Notifications</span>
                    <Switch variant={selectedVariant} educational="progress" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Admin Dashboard</span>
                    <Switch variant={selectedVariant} educational="admin" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Student Mode</span>
                    <Switch variant={selectedVariant} educational="student" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Group */}
        {activeGroup === "content" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Content Components</h2>
              <span className="text-sm text-gray-500">Text creation & editing</span>
            </div>

            {/* Text Areas */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Textarea Family</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lesson Content</label>
                  <Textarea 
                    variant={selectedVariant} 
                    educational="lesson"
                    placeholder="Enter lesson content in Sanskrit, Hindi, or English..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student Notes</label>
                  <Textarea 
                    variant={selectedVariant} 
                    educational="student"
                    placeholder="Add your learning notes and observations..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Rich Text Editor */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Rich Text Editor</h3>
              <RichTextEditor 
                variant={selectedVariant}
                educational="lesson"
                placeholder="Create rich educational content with formatting, links, and media..."
              />
            </div>

            {/* Text Segments */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Text Segment Family</h3>
              <div className="space-y-4">
                <TextSegment 
                  variant={selectedVariant}
                  educational="lesson"
                  content="ॐ गं गणपतये नमः"
                  script="devanagari"
                  isActive={true}
                />
                <TextSegment 
                  variant={selectedVariant}
                  educational="lesson"
                  content="Om gaṃ gaṇapataye namaḥ"
                  script="iast"
                  isActive={false}
                />
                <TextSegment 
                  variant={selectedVariant}
                  educational="lesson"
                  content="Salutations to Lord Ganesha, the remover of obstacles"
                  script="english"
                  isActive={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Component Integration Guide */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-12">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Integration Ready
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• All components follow consistent naming: Button, ButtonIcon, ButtonGroup</p>
            <p>• Universal color prop: variant="{selectedVariant}" applies to all components</p>
            <p>• Educational context: educational="lesson|progress|admin|student"</p>
            <p>• Copy component code directly from examples above</p>
          </div>
        </div>
      </div>
    </div>
  );
}
                  <Button className="w-full" variant={`outline-${selectedVariant}` as any}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card variant={selectedVariant as any} interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Edit 
                      className="h-12 w-12" 
                      style={{ color: colorMap[selectedVariant] }}
                    />
                  </div>
                  <CardTitle className="text-lg">Manage Content</CardTitle>
                  <CardDescription>
                    Create and edit learning content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant={`outline-${selectedVariant}` as any}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card variant={selectedVariant as any} interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Music 
                      className="h-12 w-12" 
                      style={{ color: colorMap[selectedVariant] }}
                    />
                  </div>
                  <CardTitle className="text-lg">Audio Content</CardTitle>
                  <CardDescription>
                    Manage audio-text synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant={`outline-${selectedVariant}` as any}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Educational Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Educational Variants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {educationalVariants.map((variant) => (
                <Card key={variant} educational={variant as any} glow="subtle">
                  <CardHeader>
                    <CardTitle className="text-base capitalize">{variant}</CardTitle>
                    <CardDescription>
                      {variant} content card variant
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Input Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Input Components</h2>
          
          {/* Input Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Focus Color Variants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input variant="blue" placeholder="Blue focus ring" />
              <Input variant="green" placeholder="Green focus ring" />
              <Input variant="purple" placeholder="Purple focus ring" />
              <Input variant="orange" placeholder="Orange focus ring" />
              <Input variant="pink" placeholder="Pink focus ring" />
              <Input variant="indigo" placeholder="Indigo focus ring" />
            </div>
          </div>

          {/* Educational Input Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Educational Input Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Lessons</label>
                <Input educational="search" placeholder="Search for lessons..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Chapter Title</label>
                <Input educational="title" placeholder="Enter chapter title" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Description</label>
                <Input educational="description" placeholder="Describe the content" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Student Email</label>
                <Input educational="email" type="email" placeholder="student@example.com" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Tabs Components</h2>
          
          {/* ChapterEditor Style Tabs */}
          <div>
            <h3 className="text-xl font-medium mb-4">ChapterEditor Navigation Tabs</h3>
            <Tabs defaultValue="content" className="w-full">
              <TabsList variant={selectedVariant as any} className="grid w-full grid-cols-3">
                <TabsTrigger 
                  value="content" 
                  variant={selectedVariant as any}
                  icon={<FileText className="h-4 w-4" />}
                >
                  Content
                </TabsTrigger>
                <TabsTrigger 
                  value="audio" 
                  variant={selectedVariant as any}
                  icon={<Headphones className="h-4 w-4" />}
                  badge="3"
                >
                  Audio Mapping
                </TabsTrigger>
                <TabsTrigger 
                  value="segments" 
                  variant={selectedVariant as any}
                  icon={<Layers className="h-4 w-4" />}
                  badge="12"
                >
                  Segmentation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content Editor</CardTitle>
                    <CardDescription>Rich text editing for multi-language content</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Chapter title..." educational="title" />
                    <Input placeholder="Chapter description..." educational="description" />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="audio" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Audio Mapping</CardTitle>
                    <CardDescription>Synchronize audio timestamps with text segments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={65} educational="processing" label="Mapping Progress" showPercentage />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="segments" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Text Segmentation</CardTitle>
                    <CardDescription>Break content into meaningful segments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Progress value={85} educational="completion" label="Segments Created" showPercentage />
                      <Progress value={45} educational="lesson" label="Mapped Segments" showPercentage />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Educational Tabs Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Educational Tab Variants</h3>
            <div className="space-y-6">
              {['content', 'audio', 'segments', 'overview'].map((educational) => (
                <div key={educational}>
                  <h4 className="text-sm font-medium mb-2 capitalize">{educational} Context</h4>
                  <Tabs defaultValue="tab1">
                    <TabsList educational={educational as any}>
                      <TabsTrigger value="tab1" educational={educational as any}>Tab 1</TabsTrigger>
                      <TabsTrigger value="tab2" educational={educational as any}>Tab 2</TabsTrigger>
                      <TabsTrigger value="tab3" educational={educational as any}>Tab 3</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Progress Components</h2>
          
          {/* Linear Progress */}
          <div>
            <h3 className="text-xl font-medium mb-4">Learning Progress Indicators</h3>
            <div className="space-y-6">
              <Progress value={75} educational="lesson" label="Lesson Progress" showPercentage />
              <Progress value={45} educational="chapter" label="Chapter Completion" showPercentage />
              <Progress value={90} educational="track" label="Track Mastery" showPercentage />
              <Progress value={60} educational="assessment" label="Assessment Score" showPercentage />
            </div>
          </div>

          {/* Circular Progress */}
          <div>
            <h3 className="text-xl font-medium mb-4">Circular Progress Indicators</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <CircularProgress value={85} variant="lesson" label="Lesson Progress" showPercentage />
              <CircularProgress value={70} variant="completion" label="Overall Progress" showPercentage />
              <CircularProgress value={95} variant="mastery" label="Mastery Level" showPercentage />
              <CircularProgress value={40} variant="practice" label="Practice Hours" showPercentage />
            </div>
          </div>

          {/* Size Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Progress Size Variants</h3>
            <div className="space-y-4">
              <Progress value={60} size="sm" educational="lesson" label="Small" showPercentage />
              <Progress value={60} size="default" educational="lesson" label="Default" showPercentage />
              <Progress value={60} size="lg" educational="lesson" label="Large" showPercentage />
              <Progress value={60} size="xl" educational="lesson" label="Extra Large" showPercentage />
            </div>
          </div>
        </div>

        {/* Badge Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Badge Components</h2>
          
          {/* Status Badges */}
          <div>
            <h3 className="text-xl font-medium mb-4">Content Status Badges</h3>
            <div className="flex flex-wrap gap-3">
              <Badge educational="published" icon={<CheckCircle className="h-3 w-3" />}>Published</Badge>
              <Badge educational="draft" icon={<Edit className="h-3 w-3" />}>Draft</Badge>
              <Badge educational="archived">Archived</Badge>
              <Badge educational="featured" icon={<Star className="h-3 w-3" />}>Featured</Badge>
            </div>
          </div>

          {/* Learning Progress Badges */}
          <div>
            <h3 className="text-xl font-medium mb-4">Learning Progress Badges</h3>
            <div className="flex flex-wrap gap-3">
              <Badge educational="completed" icon={<CheckCircle className="h-3 w-3" />}>Completed</Badge>
              <Badge educational="in-progress" pulse>In Progress</Badge>
              <Badge educational="locked">Locked</Badge>
              <Badge educational="mastered" icon={<Crown className="h-3 w-3" />}>Mastered</Badge>
            </div>
          </div>

          {/* Role Badges */}
          <div>
            <h3 className="text-xl font-medium mb-4">User Role Badges</h3>
            <div className="flex flex-wrap gap-3">
              <Badge educational="admin" icon={<Shield className="h-3 w-3" />}>Admin</Badge>
              <Badge educational="instructor">Instructor</Badge>
              <Badge educational="student">Student</Badge>
            </div>
          </div>

          {/* Color Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Color Variants (Solid & Light)</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {colorVariants.slice(0, 6).map((variant) => (
                  <Badge key={variant} variant={variant as any}>
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {colorVariants.slice(0, 6).map((variant) => (
                  <Badge key={variant} variant={`light-${variant}` as any}>
                    Light {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alert Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Alert Components</h2>
          
          {/* System Alerts */}
          <div>
            <h3 className="text-xl font-medium mb-4">System Status Alerts</h3>
            <div className="space-y-4">
              <Alert variant="success" icon={<CheckCircle className="h-4 w-4" />} dismissible>
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Chapter content has been successfully saved and published.
                </AlertDescription>
              </Alert>
              
              <Alert variant="warning" icon={<AlertCircle className="h-4 w-4" />} dismissible>
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Some audio segments are not yet mapped to text content.
                </AlertDescription>
              </Alert>
              
              <Alert variant="error" icon={<XCircle className="h-4 w-4" />} dismissible>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to upload audio file. Please check file format and try again.
                </AlertDescription>
              </Alert>
              
              <Alert variant="info" icon={<Info className="h-4 w-4" />} dismissible>
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  New segmentation features are now available in the editor.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Educational Alerts */}
          <div>
            <h3 className="text-xl font-medium mb-4">Educational Context Alerts</h3>
            <div className="space-y-4">
              <Alert educational="lesson-complete" icon={<CheckCircle className="h-4 w-4" />}>
                <AlertTitle>Lesson Complete</AlertTitle>
                <AlertDescription>
                  You have successfully completed "Introduction to Vedic Mantras".
                </AlertDescription>
              </Alert>
              
              <Alert educational="audio-ready" icon={<Headphones className="h-4 w-4" />}>
                <AlertTitle>Audio Content Ready</AlertTitle>
                <AlertDescription>
                  Audio files have been processed and are ready for mapping.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>

        {/* Select Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Select Components</h2>
          
          {/* Educational Selects */}
          <div>
            <h3 className="text-xl font-medium mb-4">Educational Context Selects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Language</label>
                <Select>
                  <SelectTrigger educational="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent educational="language">
                    <SelectItem value="te">Telugu</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sa">Sanskrit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">User Role</label>
                <Select>
                  <SelectTrigger educational="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent educational="role">
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Learning Track</label>
                <Select>
                  <SelectTrigger educational="track">
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent educational="track">
                    <SelectItem value="basics">Vedic Basics</SelectItem>
                    <SelectItem value="mantras">Sacred Mantras</SelectItem>
                    <SelectItem value="advanced">Advanced Studies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Status</label>
                <Select>
                  <SelectTrigger educational="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent educational="status">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Avatar Components</h2>
          <p className="text-gray-600">User profile pictures with initials fallback - shows user identity and online status in your LMS.</p>
          
          {/* Real LMS Use Cases */}
          <div>
            <h3 className="text-xl font-medium mb-4">LMS User Profiles</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Chapter Discussion</h4>
                <span className="text-sm text-gray-500">3 participants</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name="Dr. Raghuram" educational="instructor" showStatus status="online" />
                  <div>
                    <p className="font-medium text-sm">Dr. Raghuram</p>
                    <p className="text-xs text-gray-500">Instructor • Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar name="Priya Sharma" educational="student" showStatus status="away" />
                  <div>
                    <p className="font-medium text-sm">Priya Sharma</p>
                    <p className="text-xs text-gray-500">Student • Away</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar name="Admin Panel" educational="admin" showStatus status="online" />
                  <div>
                    <p className="font-medium text-sm">Admin Panel</p>
                    <p className="text-xs text-gray-500">Administrator • Online</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Header Bar Example */}
          <div>
            <h3 className="text-xl font-medium mb-4">Header Bar (Current User)</h3>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold">Vedic Learning Management System</h4>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Welcome back, Dr. Sharma</span>
                  <Avatar name="Dr. Sharma" educational="instructor" showStatus status="online" size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Size Reference */}
          <div>
            <h3 className="text-xl font-medium mb-4">Size Guide</h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <Avatar name="Small User" size="sm" educational="student" />
                <p className="text-xs mt-1 text-gray-500">Small (headers)</p>
              </div>
              <div className="text-center">
                <Avatar name="Default User" size="default" educational="instructor" />
                <p className="text-xs mt-1 text-gray-500">Default (lists)</p>
              </div>
              <div className="text-center">
                <Avatar name="Large User" size="lg" educational="admin" />
                <p className="text-xs mt-1 text-gray-500">Large (profiles)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Text Segment Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Text Segment Components</h2>
          <p className="text-gray-600">Visual text segment cards with colored left borders - perfect for showing segmented content in ChapterEditor.</p>
          
          {/* Mapping Status Segments */}
          <div>
            <h3 className="text-xl font-medium mb-4">Audio Mapping Status</h3>
            <div className="grid grid-cols-1 gap-4">
              <TextSegment
                status="mapped"
                title="Segment 1"
                content="ॐ गं गणपतये नमः। शुक्लाम्बरधरं विष्णुं शशिवर्णं चतुर्भुजम्। प्रसन्नवदनं ध्यायेत् सर्वविघ्नोपशान्तये॥"
                duration="0:12"
              />
              <TextSegment
                status="unmapped"
                title="Segment 2"
                content="मूकं करोति वाचालं पङ्गुं लङ्घयते गिरिम्। यत्कृपा तमहं वन्दे परमानन्दमाधवम्॥"
              />
              <TextSegment
                status="selected"
                title="Segment 3"
                content="सत्यं ज्ञानमनन्तं ब्रह्म। विज्ञानं आनन्दं ब्रह्म। सत्यं ब्रह्म। ज्ञानं ब्रह्म। आनन्दं ब्रह्म॥"
                isSelected={true}
              />
            </div>
          </div>

          {/* Content Type Segments */}
          <div>
            <h3 className="text-xl font-medium mb-4">Content Type Segments</h3>
            <div className="grid grid-cols-1 gap-4">
              <TextSegment
                status="sanskrit"
                title="Sanskrit Verse"
                content="अहं ब्रह्मास्मि - I am Brahman. This fundamental Upanishadic declaration represents the ultimate realization of non-dual consciousness."
              />
              <TextSegment
                status="translation"
                title="English Translation"
                content="That which is the finest essence - this whole world has that as its Self. That is Reality. That is the Self. That thou art, O Śvetaketu."
              />
              <TextSegment
                status="commentary"
                title="Scholarly Commentary"
                content="Adi Shankaracharya explains this mahavakya as pointing to the fundamental identity between the individual self (jiva) and the universal Self (Brahman)."
              />
            </div>
          </div>

          {/* Educational Context Segments */}
          <div>
            <h3 className="text-xl font-medium mb-4">Educational Context</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextSegment
                status="lesson"
                title="Lesson Content"
                content="Introduction to Vedic chanting: Understanding the importance of proper pronunciation and rhythm in Sanskrit mantras."
                size="sm"
              />
              <TextSegment
                status="practice"
                title="Practice Exercise"
                content="Repeat this mantra 108 times while focusing on the breath and maintaining proper intonation."
                size="sm"
              />
              <TextSegment
                status="assessment"
                title="Assessment Question"
                content="Explain the significance of 'Om' in Vedic tradition and demonstrate correct pronunciation with appropriate pauses."
                size="sm"
              />
            </div>
          </div>

          {/* Interactive Demo */}
          <div>
            <h3 className="text-xl font-medium mb-4">Interactive Segment Selection</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-4">Click segments to see selection behavior (like in ChapterEditor):</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 1, content: "गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः।", status: "mapped" },
                  { id: 2, content: "गुरुः साक्षात् परब्रह्म तस्मै श्रीगुरवे नमः॥", status: "unmapped" },
                  { id: 3, content: "अज्ञानतिमिरान्धस्य ज्ञानाञ्जनशलाकया।", status: "unmapped" }
                ].map((segment, index) => (
                  <TextSegment
                    key={segment.id}
                    status={segment.status as any}
                    title={`Segment ${segment.id}`}
                    content={segment.content}
                    segmentNumber={segment.id}
                    duration={segment.status === "mapped" ? "0:08" : undefined}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Specialized Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Specialized Components</h2>
          <p className="text-gray-600">Workflow-critical components for content creation and user interaction.</p>
          
          {/* Textarea Component */}
          <div>
            <h3 className="text-xl font-medium mb-4">Textarea - Content Creation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Chapter Description</label>
                <Textarea 
                  educational="description"
                  placeholder="Enter a detailed description of this chapter's content and learning objectives..."
                  showCharCount
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Student Response</label>
                <Textarea 
                  educational="response"
                  placeholder="Share your thoughts and reflections on this lesson..."
                  size="lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Commentary Notes</label>
                <Textarea 
                  educational="commentary"
                  placeholder="Add scholarly commentary and explanations..."
                  size="sm"
                  maxHeight={150}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Learning Instructions</label>
                <Textarea 
                  educational="instructions"
                  placeholder="Provide clear instructions for students..."
                  showCharCount
                  maxLength={300}
                />
              </div>
            </div>
          </div>

          {/* Switch Component */}
          <div>
            <h3 className="text-xl font-medium mb-4">Switch - Feature Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Content Publishing</h4>
                <Switch 
                  educational="published" 
                  label="Publish Chapter"
                  description="Make this chapter visible to students"
                  defaultChecked
                />
                <Switch 
                  educational="featured" 
                  label="Featured Content"
                  description="Highlight this chapter on the dashboard"
                />
                <Switch 
                  educational="archived" 
                  label="Archive Chapter"
                  description="Move to archived content section"
                />
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">User Preferences</h4>
                <Switch 
                  educational="notifications" 
                  label="Email Notifications"
                  description="Receive updates about course progress"
                  defaultChecked
                />
                <Switch 
                  educational="autoplay" 
                  label="Audio Autoplay"
                  description="Automatically play next audio segment"
                />
                <Switch 
                  educational="captions" 
                  label="Show Captions"
                  description="Display text alongside audio playback"
                  defaultChecked
                />
              </div>
            </div>
          </div>

          {/* Tooltip Component */}
          <div>
            <h3 className="text-xl font-medium mb-4">Tooltip - Help & Guidance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SimpleTooltip content="Click to get help with this feature" educational="help">
                <Button variant="outline-blue" size="sm">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </Button>
              </SimpleTooltip>
              
              <SimpleTooltip content="This feature is currently in beta testing" educational="beta" side="bottom">
                <Button variant="outline-orange" size="sm">
                  <Star className="h-4 w-4 mr-2" />
                  Beta Feature
                </Button>
              </SimpleTooltip>
              
              <SimpleTooltip content="Use Ctrl+S to save your work quickly" educational="shortcut">
                <Button variant="outline-purple" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </SimpleTooltip>
              
              <SimpleTooltip content="Upload audio files in MP3 or WAV format" educational="tip" side="left">
                <Button variant="outline-teal" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </SimpleTooltip>
            </div>
          </div>

          {/* Loading Component */}
          <div>
            <h3 className="text-xl font-medium mb-4">Loading States - Processing Feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Content Loading</h4>
                <div className="border rounded-lg p-4">
                  <Loading.Chapter educational="chapter" />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Audio Processing</h4>
                <div className="border rounded-lg p-4">
                  <Loading.Audio />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Upload Progress</h4>
                <div className="border rounded-lg p-4 text-center">
                  <Loading.Screen 
                    message="Uploading audio files..." 
                    educational="uploading"
                    size="default"
                  />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Inline Spinners</h4>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Loading.Spinner educational="processing" size="sm" />
                    <span className="text-sm">Processing content...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Loading.Spinner educational="saving" size="default" />
                    <span className="text-sm">Saving changes...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Loading.Spinner educational="audio-processing" size="lg" />
                    <span className="text-sm">Analyzing audio...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rich Text Editor Component */}
          <div>
            <h3 className="text-xl font-medium mb-4">Rich Text Editor - Content Creation</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Chapter Content Editor</h4>
                <RichTextEditor
                  educational="chapter"
                  placeholder="Write your chapter content with rich formatting..."
                  size="lg"
                  showCharCount
                  content="<h2>Introduction to Vedic Chanting</h2><p>Vedic chanting is a sacred practice that has been preserved for thousands of years. The proper pronunciation and rhythm are essential for maintaining the spiritual potency of these ancient mantras.</p><blockquote><p><strong>ॐ गं गणपतये नमः</strong></p></blockquote><p>This fundamental mantra invokes Lord Ganesha, the remover of obstacles, before beginning any sacred practice.</p>"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Sanskrit Content</h4>
                  <RichTextEditor
                    educational="sanskrit"
                    placeholder="Enter Sanskrit text with proper formatting..."
                    size="default"
                    content="<p><strong>श्लोक:</strong></p><p style='text-align: center'>गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः।<br>गुरुः साक्षात् परब्रह्म तस्मै श्रीगुरवे नमः॥</p>"
                  />
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Translation & Commentary</h4>
                  <RichTextEditor
                    educational="translation"
                    placeholder="Add translations and explanations..."
                    size="default"
                    content="<p><em>Translation:</em></p><p>The Guru is Brahma, the Guru is Vishnu, the Guru is the great Lord Shiva. The Guru is indeed the Supreme Brahman; salutations to that revered Guru.</p><hr><p><strong>Commentary:</strong> This verse establishes the supreme importance of the spiritual teacher in Vedic tradition.</p>"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Student Instructions</h4>
                <RichTextEditor
                  educational="instructions"
                  placeholder="Provide clear learning instructions..."
                  size="sm"
                  content="<h3>Practice Guidelines</h3><ol><li>Listen to the audio pronunciation carefully</li><li>Practice each syllable slowly before increasing speed</li><li>Focus on maintaining proper breath control</li><li>Repeat each verse 108 times for maximum benefit</li></ol><p><strong>Note:</strong> Remember that consistency in practice is more important than perfection.</p>"
                />
              </div>

              <div>
                <h4 className="font-medium mb-3">Lesson Notes</h4>
                <RichTextEditor
                  educational="notes"
                  placeholder="Take detailed notes during the lesson..."
                  size="default"
                  showCharCount
                  maxLength={1000}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Button Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Button Components</h2>
          
          {/* Solid Color Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Solid Color Variants</h3>
            <div className="flex flex-wrap gap-3">
              {colorVariants.map((variant) => (
                <Button key={variant} variant={variant as any}>
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Outline Color Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Outline Color Variants</h3>
            <div className="flex flex-wrap gap-3">
              {colorVariants.map((variant) => (
                <Button key={variant} variant={`outline-${variant}` as any}>
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Educational Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Educational Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button educational="save">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button educational="edit">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button educational="delete">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button educational="audio">
                <Play className="mr-2 h-4 w-4" />
                Play Audio
              </Button>
            </div>
          </div>

          {/* Size Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Size Variants</h3>
            <div className="flex items-end gap-3">
              <Button size="sm" variant={selectedVariant as any}>Small</Button>
              <Button size="default" variant={selectedVariant as any}>Default</Button>
              <Button size="lg" variant={selectedVariant as any}>Large</Button>
              <Button size="icon" variant={selectedVariant as any}>
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Integration Preview */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Integration Preview</h2>
          <p className="text-gray-600 mb-4">
            This is how the new design system components will look in your SimpleDashboard:
          </p>
          
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card variant="blue" interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <BookOpen className="h-12 w-12 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Learning</CardTitle>
                  <CardDescription>Browse and study learning tracks</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline-blue" className="w-full">
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card variant="green" interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Edit className="h-12 w-12 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Manage Content</CardTitle>
                  <CardDescription>Create and edit learning content</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline-green" className="w-full">
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card variant="purple" interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Music className="h-12 w-12 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Experiments</CardTitle>
                  <CardDescription>Design system showcases</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline-purple" className="w-full">
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}