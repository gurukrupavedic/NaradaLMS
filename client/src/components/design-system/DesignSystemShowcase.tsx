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
import { BookOpen, Edit, Music, Play, Save, Trash2, Search, User, Mail, FileText, Headphones, Layers } from "lucide-react";

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