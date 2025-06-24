import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Palette, Sun, Moon } from 'lucide-react';

export function ExperimentsShowcase() {
  const handleOpenTheme = (themeType: 'light' | 'dark') => {
    const baseUrl = window.location.origin;
    const themeUrl = `${baseUrl}/experiments/design-systems/${themeType}-theme-showcase.html`;
    window.open(themeUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Design System Experiments
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our modern colorful design system with comprehensive UI components, 
            24-color palette, and perfectly synchronized light/dark themes.
          </p>
        </div>

        {/* Main Theme Showcases */}
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