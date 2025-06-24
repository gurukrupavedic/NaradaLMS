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
import { TextSegment } from "./TextSegment";
import { Textarea } from "./Textarea";
import { Switch } from "./Switch";
import { Tooltip, SimpleTooltip } from "./Tooltip";
import { Loading } from "./Loading";
import { RichTextEditor } from "./RichTextEditor";
import { BookOpen, Edit, Music, Play, Save, Trash2, Search, User, Mail, FileText, Headphones, Layers, CheckCircle, AlertCircle, Info, XCircle, Star, Crown, Shield, HelpCircle, Settings, Upload, Type } from "lucide-react";

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