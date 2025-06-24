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
import { BookOpen, Edit, Music, Play, Save, Trash2 } from "lucide-react";

export function DesignSystemShowcase() {
  const [selectedVariant, setSelectedVariant] = useState<string>("blue");
  
  const colorVariants = [
    "blue", "green", "purple", "orange", "pink", "indigo", 
    "teal", "cyan", "yellow", "lime", "rose", "emerald"
  ];

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
                <div className={`w-full h-8 rounded bg-${variant}-500 mb-2`}></div>
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
                    <BookOpen className={`h-12 w-12 text-${selectedVariant}-600`} />
                  </div>
                  <CardTitle className="text-lg">Learning</CardTitle>
                  <CardDescription>
                    Browse and study learning tracks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card variant={selectedVariant as any} interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Edit className={`h-12 w-12 text-${selectedVariant}-600`} />
                  </div>
                  <CardTitle className="text-lg">Manage Content</CardTitle>
                  <CardDescription>
                    Create and edit learning content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card variant={selectedVariant as any} interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Music className={`h-12 w-12 text-${selectedVariant}-600`} />
                  </div>
                  <CardTitle className="text-lg">Audio Content</CardTitle>
                  <CardDescription>
                    Manage audio-text synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
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

        {/* Button Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Button Components</h2>
          
          {/* Color Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Color Variants</h3>
            <div className="flex flex-wrap gap-3">
              {colorVariants.map((variant) => (
                <Button key={variant} variant={variant as any}>
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
                  <Button educational="lesson" className="w-full">
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
                  <Button educational="edit" className="w-full">
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
                  <Button educational="preview" className="w-full">
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