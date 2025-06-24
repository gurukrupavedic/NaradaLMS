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