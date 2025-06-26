import { Button } from '@/components/ui/button';

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">ॐ</span>
            </div>
            <h1 className="text-4xl font-bold text-blue-800">Vedic LMS</h1>
          </div>
          
          <p className="text-xl text-gray-600 max-w-md">
            Traditional Vedic learning with modern technology
          </p>
          
          <Button 
            size="lg"
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Enter Vedic LMS
          </Button>
        </div>
      </div>
    </div>
  );
}
