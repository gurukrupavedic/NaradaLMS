import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * DaisyUI5Showcase - Modern Colorful Design System showcase
 * 
 * Features the official Modern Colorful Design System for Vedic LMS
 * with reference implementations and documentation links.
 */
export function DaisyUI5Showcase() {
  const designSystem = {
    title: "Modern Colorful Design System",
    description: "Complete design system with vibrant colors, fluorescent glow effects, and elegant interactions - the official UI standard for Vedic LMS",
    link: "/experiments/design-systems/complete-component-showcase.html",
    highlight: "Official Design System"
  };

  const references = [
    {
      title: "shadcn/ui vs Bootstrap 5",
      description: "Comprehensive comparison of design systems with component examples, migration analysis, and technical specifications",
      link: "/experiments/design-systems/shadcn-vs-bootstrap5.html",
      highlight: "Framework comparison"
    },
    {
      title: "Bootstrap 5 Reference Implementation", 
      description: "Complete Bootstrap 5 prototype with native components, themes, and professional design patterns for reference",
      link: "/experiments/bootstrap5-integration/bootstrap5-vedic-prototype.html",
      highlight: "Bootstrap 5 reference"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Modern Colorful Design System</h1>
          <p className="text-gray-600">
            Complete design system specifications and reference implementations for Vedic LMS
          </p>
        </div>

        {/* Back Navigation */}
        <div className="mb-6">
          <a 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Main Design System - Prominently Featured */}
        <div className="mb-8">
          <Card 
            className="cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50"
            onClick={() => window.open(designSystem.link, '_blank')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-2xl text-blue-800 font-bold">{designSystem.title}</CardTitle>
                <Badge className="bg-blue-600 text-white px-3 py-1 text-sm font-medium">
                  {designSystem.highlight}
                </Badge>
              </div>
              <CardDescription className="text-blue-700 text-base leading-relaxed">
                {designSystem.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 mb-1"></div>
                  <span className="text-xs text-gray-600">Blue</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-green-500 mb-1"></div>
                  <span className="text-xs text-gray-600">Green</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-purple-500 mb-1"></div>
                  <span className="text-xs text-gray-600">Purple</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 mb-1"></div>
                  <span className="text-xs text-gray-600">Orange</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-pink-500 mb-1"></div>
                  <span className="text-xs text-gray-600">Pink</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 mb-1"></div>
                  <span className="text-xs text-gray-600">Indigo</span>
                </div>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3" 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(designSystem.link, '_blank');
                }}
              >
                Explore Complete Design System
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links to Documentation */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800">Design System Specs</CardTitle>
                <CardDescription className="text-green-700">Complete UI specifications & guidelines</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full border-green-600 text-green-700 hover:bg-green-600 hover:text-white"
                  onClick={() => window.open('/experiments/design-systems/complete-component-showcase.html', '_blank')}
                >
                  View Documentation
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-purple-800">Migration Plan</CardTitle>
                <CardDescription className="text-purple-700">Implementation roadmap & timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full border-purple-600 text-purple-700 hover:bg-purple-600 hover:text-white"
                  onClick={() => window.open('/experiments/design-systems/complete-component-showcase.html', '_blank')}
                >
                  View Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reference Implementations */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Reference Implementations</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {references.map((experiment, index) => (
            <Card 
              key={index}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
              onClick={() => window.open(experiment.link, '_blank')}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg">{experiment.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {experiment.highlight}
                  </Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {experiment.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(experiment.link, '_blank');
                  }}
                >
                  View Reference
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}