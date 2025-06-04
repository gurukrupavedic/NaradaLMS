import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="w-16 h-16 bg-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-3xl">ॐ</span>
            </div>
            <h1 className="text-4xl font-bold text-amber-800">Vedic LMS</h1>
          </div>
          
          <p className="text-xl text-gray-600 max-w-md">
            Traditional Vedic learning with modern technology
          </p>
          
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-amber-700 hover:bg-amber-800 text-white px-12 py-4 text-lg"
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
