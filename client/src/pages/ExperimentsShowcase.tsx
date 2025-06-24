/**
 * Experiments Index - Vedic LMS
 * 
 * Clean navigation hub for all design and UI experiments.
 * Follows proper architecture: index page → individual experiment routes.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Palette, Plus, CheckCircle } from "lucide-react";

export function ExperimentsShowcase() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Experiments</h1>
                <p className="text-sm text-gray-600">Design and UI innovation lab</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Active Experiments */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Experiments</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Experiment 1: Design System */}
            <Card className="border-2 border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-blue-100 text-blue-800">PRODUCTION READY</Badge>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">Experiment 1: Design System</CardTitle>
                <CardDescription>
                  Complete 15-component modern colorful design system with educational semantics and vibrant color variants.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-1">
                    {['blue', 'green', 'purple', 'orange'].map((color) => (
                      <div key={color} className={`h-6 rounded bg-${color}-500`}></div>
                    ))}
                  </div>
                  <div className="text-sm text-gray-600">
                    ✓ 15 Components • ✓ 12 Colors • ✓ TypeScript
                  </div>
                  <Link href="/experiments/design-system">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Palette className="h-4 w-4 mr-2" />
                      Open Experiment
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Future Experiment Placeholder */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-gray-500">PLACEHOLDER</Badge>
                </div>
                <CardTitle className="text-lg text-gray-600">Experiment 2: Coming Soon</CardTitle>
                <CardDescription className="text-gray-500">
                  Space for future design innovations and component explorations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" disabled className="w-full text-gray-400 border-gray-300">
                  <Plus className="h-4 w-4 mr-2" />
                  Future Experiment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Experiment Guidelines */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Experiment Guidelines</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• Each experiment gets dedicated space for full creative exploration</p>
            <p>• Production-ready experiments graduate to main application integration</p>
            <p>• Clean separation between experiment navigation and content</p>
            <p>• Consistent architecture enables easy addition of future experiments</p>
          </div>
        </div>
      </div>
    </div>
  );
}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Light Theme Card */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Sun className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-gray-900 mb-2">Light Theme Showcase</CardTitle>
              <CardDescription className="text-gray-600">
                Clean white backgrounds with vibrant fluorescent glows and subtle hover effects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 6 organized component groups</li>
                  <li>• 24-color palette with hex codes</li>
                  <li>• Layout/Utility preview components</li>
                  <li>• Development-ready documentation</li>
                </ul>
              </div>
              <Button 
                onClick={() => handleOpenTheme('light')} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Light Theme
              </Button>
            </CardContent>
          </Card>

          {/* Dark Theme Card */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <Moon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-gray-900 mb-2">Dark Theme Showcase</CardTitle>
              <CardDescription className="text-gray-600">
                Dark backgrounds with enhanced multi-layer glow effects optimized for low-light environments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Identical content structure to light theme</li>
                  <li>• Enhanced fluorescent intensity</li>
                  <li>• Professional dark UI styling</li>
                  <li>• Perfect theme synchronization</li>
                </ul>
              </div>
              <Button 
                onClick={() => handleOpenTheme('dark')} 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Dark Theme
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Design System Overview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center mb-2">
              <Palette className="w-6 h-6 text-indigo-600 mr-3" />
              <CardTitle className="text-2xl text-gray-900">Modern Colorful Design System</CardTitle>
            </div>
            <CardDescription>
              Complete UI component library with vibrant 12-color palette and fluorescent glow variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Component Groups</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Inputs (7 current + 3 coming)</li>
                  <li>• Data Display (3 current + 7 coming)</li>
                  <li>• Navigation (2 current + 5 coming)</li>
                  <li>• Feedback/Overlay (1 current + 4 coming)</li>
                  <li>• Layout/Utility (0 current + 5 coming)</li>
                  <li>• Typography/Media (3 current + 2 coming)</li>
                </ul>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">Color Palette</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 12 primary vibrant colors</li>
                  <li>• 12 fluorescent glow variants</li>
                  <li>• Copy-ready hex codes</li>
                  <li>• Responsive grid layout</li>
                  <li>• Developer documentation</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">User Experience</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Surgical organization structure</li>
                  <li>• Component count tracking</li>
                  <li>• Cross-referenced navigation</li>
                  <li>• Coming Soon roadmap</li>
                  <li>• Theme synchronization</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center">
          <Button 
            onClick={() => window.location.href = '/dashboard'} 
            variant="outline" 
            className="mr-4"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}