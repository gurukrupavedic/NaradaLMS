/**
 * Design System Showcase - Live Component Testing
 * 
 * Interactive showcase for testing design system components in isolation
 * before integrating into the main LMS application.
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
import { BookOpen, Edit, Music, Play, Save, Trash2, Search, User, Mail, FileText, Headphones, Layers, CheckCircle, AlertCircle, Info, XCircle, Star, Crown, Shield } from "lucide-react";

export function DesignSystemShowcase() {
  const [selectedVariant, setSelectedVariant] = useState<string>("blue");
  
  const colorVariants = [
    "blue", "green", "purple", "orange", "pink", "indigo", 
    "teal", "cyan", "yellow", "lime", "rose", "emerald"
  ];

  // Color mapping for swatches (using actual hex values)
  const colorMap: Record<string, string> = {
    blue: "#3b82f6",
    green: "#22c55e", 
    purple: "#a855f7",
    orange: "#f97316",
    pink: "#ec4899",
    indigo: "#6366f1",
    teal: "#14b8a6",
    cyan: "#06b6d4",
    yellow: "#eab308",
    lime: "#84cc16",
    rose: "#f43f5e",
    emerald: "#10b981"
  };

  const educationalVariants = [
    "lesson", "progress", "content", "feature", "audio", "text", "assessment", "track"
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Vedic LMS Design System
          </h1>
          <p className="text-lg text-gray-600">
            Modern colorful components for educational experiences
          </p>
        </div>

        {/* Color Variant Selector */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Color Variants</h2>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {colorVariants.map((variant) => (
              <button
                key={variant}
                onClick={() => setSelectedVariant(variant)}
                className={`p-3 rounded-lg border-2 transition-all capitalize ${
                  selectedVariant === variant 
                    ? 'border-gray-800 ring-2 ring-gray-300' 
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div 
                  className="w-full h-8 rounded mb-2" 
                  style={{ backgroundColor: colorMap[variant] }}
                ></div>
                <div className="text-xs font-medium">{variant}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Card Components</h2>
          
          {/* Feature Cards (like SimpleDashboard) */}
          <div>
            <h3 className="text-xl font-medium mb-4">Feature Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card variant={selectedVariant as any} interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <BookOpen 
                      className="h-12 w-12" 
                      style={{ color: colorMap[selectedVariant] }}
                    />
                  </div>
                  <CardTitle className="text-lg">Learning</CardTitle>
                  <CardDescription>
                    Browse and study learning tracks
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
                <Avatar name="SM" size="sm" />
                <p className="text-xs mt-1 text-gray-500">Small (headers)</p>
              </div>
              <div className="text-center">
                <Avatar name="DF" size="default" />
                <p className="text-xs mt-1 text-gray-500">Default (lists)</p>
              </div>
              <div className="text-center">
                <Avatar name="LG" size="lg" />
                <p className="text-xs mt-1 text-gray-500">Large (profiles)</p>
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