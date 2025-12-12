/**
 * Experiments Index - Vedic LMS
 * 
 * Clean navigation hub for all design and UI experiments.
 * Follows proper architecture: index page → individual experiment routes.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Palette, Shield, GraduationCap, BookOpen, LayoutDashboard, Layers } from "lucide-react";

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
                </div>
                <CardTitle className="text-lg">Experiment 1: Design System</CardTitle>
                <CardDescription>
                  Complete 15-component modern colorful design system with educational semantics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/design-system">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Palette className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Experiment 2: Admin Panel */}
            <Card className="border-2 border-red-200 hover:border-red-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-red-100 text-red-800">PROTOTYPE</Badge>
                </div>
                <CardTitle className="text-lg">Experiment 2: Admin Panel</CardTitle>
                <CardDescription>
                  User management, invitations, and role assignments for administrators.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/admin-panel">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <Shield className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Experiment 3: Instructor Panel */}
            <Card className="border-2 border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-purple-100 text-purple-800">PROTOTYPE</Badge>
                </div>
                <CardTitle className="text-lg">Experiment 3: Instructor Panel</CardTitle>
                <CardDescription>
                  Student progress tracking and proficiency level management for instructors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/instructor-panel">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Experiment 4: Student Dashboard */}
            <Card className="border-2 border-green-200 hover:border-green-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-green-100 text-green-800">PROTOTYPE</Badge>
                </div>
                <CardTitle className="text-lg">Experiment 4: Student Dashboard</CardTitle>
                <CardDescription>
                  Learning progress, study statistics, and track overview for students.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/student-dashboard">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Experiment 5: Dashboard */}
            <Card className="border-2 border-amber-200 hover:border-amber-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-amber-100 text-amber-800">PROTOTYPE</Badge>
                </div>
                <CardTitle className="text-lg">Experiment 5: Dashboard</CardTitle>
                <CardDescription>
                  Alternative student view with learning tracks, activity feed, and statistics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/dashboard">
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Experiment 6: Role Tabs */}
            <Card className="border-2 border-cyan-200 hover:border-cyan-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-cyan-100 text-cyan-800">PROTOTYPE</Badge>
                </div>
                <CardTitle className="text-lg">Experiment 6: Role Tabs</CardTitle>
                <CardDescription>
                  Combined role-based navigation system with all panels in one view.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/role-tabs">
                  <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                    <Layers className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Legacy Experiments */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Legacy Experiments</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Legacy: Track View */}
            <Card className="border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-gray-100 text-gray-800">LEGACY</Badge>
                </div>
                <CardTitle className="text-lg">Legacy: Track View</CardTitle>
                <CardDescription>
                  Old track view page - moved to experiments for reference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/track-view/1">
                  <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Legacy: Chapter View */}
            <Card className="border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-gray-100 text-gray-800">LEGACY</Badge>
                </div>
                <CardTitle className="text-lg">Legacy: Chapter View</CardTitle>
                <CardDescription>
                  Old chapter view page - moved to experiments for reference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/chapter-view/1">
                  <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Legacy: Dashboard Old */}
            <Card className="border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-gray-100 text-gray-800">LEGACY</Badge>
                </div>
                <CardTitle className="text-lg">Legacy: Dashboard Old</CardTitle>
                <CardDescription>
                  Old dashboard page - moved to experiments for reference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/experiments/dashboard-old">
                  <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Open Experiment
                  </Button>
                </Link>
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
