import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">ॐ</span>
            </div>
            <h1 className="text-4xl font-bold text-blue-800">Narada LMS</h1>
          </div>

          <p className="text-xl text-gray-600 max-w-md">
            Traditional Vedic learning with modern technology
          </p>

          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Sign In
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/register")}
              variant="outline"
              className="px-8 py-4 text-lg border-blue-600 text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
