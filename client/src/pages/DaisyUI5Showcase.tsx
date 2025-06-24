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
  const themeShowcases = [
    {
      title: "Light Theme Showcase",
      description: "Clean white background with subtle fluorescent glow effects and complete typography system",
      link: "/experiments/design-systems/light-theme-showcase.html",
      icon: "☀️",
      color: "blue",
      features: ["Typography Scale", "Interactive Components", "Fluorescent Glows"]
    },
    {
      title: "Dark Theme Showcase", 
      description: "Enhanced multi-layer fluorescent effects optimized for dark environments with luminous aesthetics",
      link: "/experiments/design-systems/dark-theme-showcase.html",
      icon: "🌙",
      color: "slate",
      features: ["Enhanced Glows", "Dark Optimized", "Halogen Effects"]
    }
  ];

  const references = [
    {
      title: "DaisyUI Theme Comparison",
      description: "Historical theme exploration for design inspiration",
      link: "/experiments/design-systems/daisyui-theme-comparison.html",
      category: "Legacy"
    },
    {
      title: "Bootstrap vs shadcn/ui",
      description: "Design system comparison study archive", 
      link: "/experiments/design-systems/shadcn-vs-bootstrap5.html",
      category: "Archive"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Modern Colorful Design System</h1>
          <p className="text-xl text-gray-600 mb-6">
            Complete showcase of vibrant UI components with fluorescent glow effects
          </p>
          <Badge className="bg-blue-600 text-white px-4 py-2 text-sm font-medium">
            Production Ready
          </Badge>
        </div>

        {/* Theme Showcases - Primary Focus */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Theme Showcases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {themeShowcases.map((theme, index) => (
              <Card 
                key={index}
                className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2"
                onClick={() => window.open(theme.link, '_blank')}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${
                    theme.color === 'blue' ? 'from-blue-500 to-purple-600' : 'from-slate-600 to-slate-800'
                  } rounded-2xl flex items-center justify-center text-3xl`}>
                    {theme.icon}
                  </div>
                  <CardTitle className="text-2xl">{theme.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {theme.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center gap-2 mb-6">
                    {theme.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className={`w-full text-lg py-3 ${
                      theme.color === 'blue' 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-slate-600 hover:bg-slate-700'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(theme.link, '_blank');
                    }}
                  >
                    View {theme.title.split(' ')[0]} Theme
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Design System Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Design System Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="text-4xl mb-4">🎨</div>
                <CardTitle>Modern & Vibrant</CardTitle>
                <CardDescription>
                  Contemporary aesthetics with 12 vibrant color variants and fluorescent glow effects
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="text-4xl mb-4">✨</div>
                <CardTitle>Interactive Effects</CardTitle>
                <CardDescription>
                  Subtle hover animations with halogen-style lighting and smooth transitions
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="text-4xl mb-4">♿</div>
                <CardTitle>Accessibility First</CardTitle>
                <CardDescription>
                  WCAG 2.1 compliant with proper contrast ratios and keyboard navigation
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Component Library Stats */}
        <div className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">55+</div>
              <div className="text-sm text-blue-700 font-medium">Components</div>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">12</div>
              <div className="text-sm text-green-700 font-medium">Color Variants</div>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">15</div>
              <div className="text-sm text-purple-700 font-medium">Categories</div>
            </div>
            <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-3xl font-bold text-orange-600 mb-2">100%</div>
              <div className="text-sm text-orange-700 font-medium">Accessible</div>
            </div>
          </div>
        </div>

        {/* Legacy References */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-center mb-6 text-gray-500">Legacy Experiments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto opacity-60">
            {references.map((ref, index) => (
              <Card 
                key={index}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                onClick={() => window.open(ref.link, '_blank')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">{ref.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {ref.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {ref.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(ref.link, '_blank');
                    }}
                  >
                    View Archive
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-2">
            Modern Colorful Design System - Built for Vedic LMS
          </p>
          <p className="text-sm text-gray-500">
            Ready for production implementation with light and dark theme support
          </p>
        </div>
      </div>
    </div>
  );
}