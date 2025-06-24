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
    link: "/experiments/design-systems/modern-colorful-theme.html",
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
                  onClick={() => window.open('/docs/modern-colorful-design-system.md', '_blank')}
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
                  onClick={() => window.open('/docs/design-system-migration-plan.md', '_blank')}
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
                  </span>
                  {experiment.highlight && (
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full mb-2 ml-2">
                      {experiment.highlight}
                    </span>
                  )}
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3">{experiment.title}</h3>
              <p className="text-gray-600 mb-4">{experiment.description}</p>
              
              <div className="flex gap-3">
                <a 
                  href={experiment.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-1M14 6h6m0 0v6m0-6L10 16" />
                  </svg>
                  Open Experiment
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Night Theme Light Equivalents */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Night Theme Light Equivalents</h2>
          <p className="text-blue-800 mb-4">Since you like the Night theme, here are light themes with similar elegance and sophistication:</p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-blue-800 mb-2">Business Theme</h3>
              <p className="text-blue-700">Clean, professional light theme with similar contrast and readability to Night.</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-blue-800 mb-2">Luxury Theme</h3>
              <p className="text-blue-700">Sophisticated light theme with refined elegance matching Night's premium feel.</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-blue-800 mb-2">CMYK Theme</h3>
              <p className="text-blue-700">High contrast light theme with crisp, modern aesthetics similar to Night's clarity.</p>
            </div>
          </div>
        </div>

        {/* Theme Recommendations */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-amber-900 mb-3">Recommended Themes for Vedic LMS</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-amber-800 mb-2">Night + Business</h3>
              <p className="text-amber-700">Dark/light mode pair with elegant, professional aesthetics for focused learning.</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-amber-800 mb-2">Autumn Theme</h3>
              <p className="text-amber-700">Warm oranges and browns that complement traditional Vedic colors like saffron and gold.</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-amber-800 mb-2">Forest Theme</h3>
              <p className="text-amber-700">Natural earth tones that reflect the connection to nature in Vedic traditions.</p>
            </div>
          </div>
        </div>

        {/* Direct Access Links */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Direct Access URLs</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Theme Comparison: <code className="bg-gray-200 px-2 py-1 rounded text-xs">http://localhost:5000/experiments/daisyui-5-examples/01-theme-comparison.html</code></li>
            <li>• Bootstrap 5 Full: <code className="bg-gray-200 px-2 py-1 rounded text-xs">http://localhost:5000/experiments/bootstrap5-integration/bootstrap5-vedic-prototype.html</code></li>
          </ul>
        </div>

        {/* Experiment Status */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Experimental Status</h3>
          <p className="text-yellow-800 text-sm">
            These experiments are completely isolated and don't affect the main application. 
            The entire experiments directory can be safely deleted without any impact on production functionality.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 text-center space-x-4">
          <a 
            href="/experiments/01-theme-comparison.html" 
            target="_blank"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quick Start - Theme Comparison
          </a>
          <a 
            href="/" 
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Return to Main App
          </a>
        </div>
      </div>
    </div>
  );
}