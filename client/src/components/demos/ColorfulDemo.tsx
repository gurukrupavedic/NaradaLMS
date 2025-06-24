/**
 * Colorful Design System Demo
 * Showcases all the modern colorful components and their capabilities
 */

import React from 'react';
import { ColorfulThemeProvider, useColorfulTheme } from '@/hooks/useColorfulTheme';
import { FeatureCard } from '@/components/ui/colorful-card';
import { ColorfulButton } from '@/components/ui/colorful-button';
import { ColorfulProgress, CircularProgress } from '@/components/ui/colorful-progress';
import { Book, Users, Settings, Award, FileText, Music } from 'lucide-react';

function ColorfulDemoContent() {
  const { theme, toggleTheme } = useColorfulTheme();
  
  const features = [
    {
      icon: <Book className="w-6 h-6" />,
      title: "Content Management",
      description: "Create and manage learning tracks with rich multimedia content",
      variant: 'blue' as const
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "User Management", 
      description: "Manage students, instructors, and administrators efficiently",
      variant: 'green' as const
    },
    {
      icon: <Music className="w-6 h-6" />,
      title: "Audio Mapping",
      description: "Synchronize audio content with text segments for immersive learning",
      variant: 'purple' as const
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Text Segmentation",
      description: "Break content into meaningful segments for better comprehension",
      variant: 'orange' as const
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Progress Tracking",
      description: "Monitor student progress and learning outcomes",
      variant: 'pink' as const
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: "System Settings",
      description: "Configure system preferences and advanced options",
      variant: 'indigo' as const
    }
  ];
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Modern Colorful Design System
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience the vibrant, elegant, and professional UI components with fluorescent glow effects
          </p>
          
          <div className="flex justify-center gap-4">
            <ColorfulButton variant="blue" onClick={toggleTheme}>
              Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
            </ColorfulButton>
            <ColorfulButton variant="purple" type="secondary">
              View Documentation
            </ColorfulButton>
          </div>
        </div>
        
        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              variant={feature.variant}
              onClick={() => console.log(`Clicked ${feature.title}`)}
            />
          ))}
        </div>
        
        {/* Button Showcase */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Button Variants</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(['blue', 'green', 'purple', 'orange', 'pink', 'indigo'] as const).map(variant => (
              <div key={variant} className="space-y-2">
                <ColorfulButton variant={variant} className="w-full">
                  Primary
                </ColorfulButton>
                <ColorfulButton variant={variant} type="secondary" className="w-full">
                  Secondary
                </ColorfulButton>
              </div>
            ))}
          </div>
        </div>
        
        {/* Progress Indicators */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Progress Indicators</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Linear Progress</h3>
              <ColorfulProgress variant="blue" value={75} showLabel label="Course Completion" />
              <ColorfulProgress variant="green" value={45} showLabel label="Chapter Progress" />
              <ColorfulProgress variant="purple" value={90} showLabel label="Audio Mapping" />
              <ColorfulProgress variant="orange" value={60} showLabel label="Text Segmentation" />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Circular Progress</h3>
              <div className="flex flex-wrap gap-6">
                <CircularProgress variant="blue" value={75} size={60} />
                <CircularProgress variant="green" value={45} size={60} />
                <CircularProgress variant="purple" value={90} size={60} />
                <CircularProgress variant="orange" value={60} size={60} />
                <CircularProgress variant="pink" value={85} size={60} />
                <CircularProgress variant="indigo" value={30} size={60} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Theme Information */}
        <div className="bg-muted rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Current Theme: {theme}</h3>
          <p className="text-muted-foreground">
            The modern colorful design system automatically adapts to light and dark modes, 
            providing optimal contrast and beautiful fluorescent glow effects in both themes.
          </p>
        </div>
        
        {/* Implementation Example */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Implementation Example</h2>
          <div className="bg-muted rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-foreground">
{`import { FeatureCard } from '@/components/ui/colorful-card';
import { ColorfulButton } from '@/components/ui/colorful-button';

<FeatureCard
  icon={<Book />}
  title="Content Management"
  description="Create and manage learning content"
  variant="blue"
  onClick={() => navigate('/content')}
/>

<ColorfulButton variant="purple" onClick={handleSubmit}>
  Save Changes
</ColorfulButton>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ColorfulDemo() {
  return (
    <ColorfulThemeProvider>
      <ColorfulDemoContent />
    </ColorfulThemeProvider>
  );
}