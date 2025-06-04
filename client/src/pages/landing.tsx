import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-vedic-cream to-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <svg className="h-8 w-8 text-vedic-brown mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z"/>
                </svg>
                <h1 className="text-xl font-bold text-vedic-brown">Vedic LMS</h1>
              </div>
            </div>
            
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-vedic-brown hover:bg-vedic-brown/90 text-white"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-vedic-brown mb-6">
            Authentic Vedic Learning
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Experience the traditional Guru-Shishya Parampara through modern technology. 
            Learn Vedic scriptures with interactive audio-text synchronization and 
            structured progression tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-vedic-brown hover:bg-vedic-brown/90 text-white px-8 py-3 text-lg"
            >
              Begin Your Journey
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-vedic-gold/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-vedic-brown">
                <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12 8.5L9 19z" />
                </svg>
                Interactive Audio-Text
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Character-position based synchronization between Vedic texts and recitations. 
                Click on any verse segment to hear precise pronunciation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-vedic-gold/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-vedic-brown">
                <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                Multi-Script Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Learn in Telugu, Devanagari, or English (IAST) scripts with proper 
                Unicode fonts designed for Vedic texts and accurate transliteration.
              </p>
            </CardContent>
          </Card>

          <Card className="border-vedic-gold/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-vedic-brown">
                <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Structured Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Systematic learning tracks with instructor-guided proficiency levels. 
                Track your progress through traditional Vedic texts and practices.
              </p>
            </CardContent>
          </Card>

          <Card className="border-vedic-gold/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-vedic-brown">
                <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Traditional Texts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Study authentic Vedic scriptures including Vaidika Nithya Karma, 
                Sookta Paatham, and Rudram with expert guidance.
              </p>
            </CardContent>
          </Card>

          <Card className="border-vedic-gold/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-vedic-brown">
                <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Expert Instruction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Learn from qualified Acharyas and Pandits with multi-role support 
                for personalized instruction and progress tracking.
              </p>
            </CardContent>
          </Card>

          <Card className="border-vedic-gold/20 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-vedic-brown">
                <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Authentic Heritage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Preserve and transmit the authentic Vedic tradition with modern 
                technology while maintaining traditional teaching methodologies.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-vedic-cream border-vedic-gold">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold text-vedic-brown mb-4">
                Ready to Begin Your Vedic Journey?
              </h3>
              <p className="text-gray-600 mb-6">
                Join our platform by invitation only. Contact your instructor or 
                administrator to receive access to this authentic learning experience.
              </p>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-vedic-brown hover:bg-vedic-brown/90 text-white px-8 py-3"
              >
                Access Your Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">© 2024 Vedic LMS. Preserving tradition through technology.</p>
            <p className="text-sm">Built with respect for the ancient wisdom of the Vedas.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
