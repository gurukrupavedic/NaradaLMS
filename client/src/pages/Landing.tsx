import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Music, Globe } from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: <BookOpen className="h-8 w-8 text-amber-600" />,
      title: "Traditional Learning",
      description: "Experience authentic Vedic learning through time-honored Guru-Shishya tradition adapted for the digital age."
    },
    {
      icon: <Music className="h-8 w-8 text-amber-600" />,
      title: "Audio Synchronization",
      description: "Interactive text-audio synchronization for perfect pronunciation and rhythm in Vedic recitation."
    },
    {
      icon: <Globe className="h-8 w-8 text-amber-600" />,
      title: "Multi-Script Support",
      description: "Learn in Telugu, Devanagari, or English (IAST) with specialized fonts for authentic display."
    },
    {
      icon: <Users className="h-8 w-8 text-amber-600" />,
      title: "Guided Instruction",
      description: "Expert instructors track your progress and guide your journey through Vedic knowledge."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">ॐ</span>
              </div>
              <h1 className="text-xl font-bold text-amber-800">Vedic LMS</h1>
            </div>
            
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Learn Vedic Wisdom in the 
            <span className="text-amber-600"> Traditional Way</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Immerse yourself in authentic Vedic learning with interactive audio-text synchronization, 
            multi-script support, and guidance from traditional teachers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-amber-700 hover:bg-amber-800 text-white px-8 py-3"
            >
              Begin Your Journey
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 px-8 py-3"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Modern Technology, Ancient Wisdom
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge technology with traditional teaching methods 
              to provide an unparalleled Vedic learning experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-amber-100 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg text-amber-800">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/60">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Begin Your Vedic Learning Journey?
          </h3>
          <p className="text-lg text-gray-600 mb-8">
            Join our community of learners and connect with the timeless wisdom of the Vedas.
          </p>
          
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-amber-700 hover:bg-amber-800 text-white px-12 py-4 text-lg"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-amber-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <span className="text-amber-800 font-bold">ॐ</span>
            </div>
            <span className="text-lg font-semibold">Vedic LMS</span>
          </div>
          <p className="text-amber-100">
            Preserving ancient wisdom through modern learning
          </p>
        </div>
      </footer>
    </div>
  );
}
