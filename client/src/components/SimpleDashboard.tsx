import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/design-system";
import { BookOpen, Edit, Beaker, User as UserIcon } from "lucide-react";
import type { User } from "@shared/schema";

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  color: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: "Learning",
    description: "Browse and study learning tracks",
    icon: BookOpen,
    route: "/tracks",
    color: "blue"
  },
  {
    title: "Manage Content", 
    description: "Create and edit learning content",
    icon: Edit,
    route: "/manage",
    color: "green"
  },
  {
    title: "Experiments",
    description: "Design system showcases and explorations",
    icon: Beaker,
    route: "/experiments", 
    color: "purple"
  }
];

interface SimpleDashboardProps {
  user: User;
}

export default function SimpleDashboard({ user }: SimpleDashboardProps) {
  const [, setLocation] = useLocation();

  const handleFeatureClick = (route: string) => {
    setLocation(route);
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "border-blue-200 hover:border-blue-300 hover:shadow-blue-100";
      case "green":
        return "border-green-200 hover:border-green-300 hover:shadow-green-100";
      case "purple":
        return "border-purple-200 hover:border-purple-300 hover:shadow-purple-100";
      default:
        return "border-gray-200 hover:border-gray-300 hover:shadow-gray-100";
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case "blue":
        return "text-blue-600";
      case "green":
        return "text-green-600";
      case "purple":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vedic Learning Platform</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${getColorClasses(feature.color)}`}
                onClick={() => handleFeatureClick(feature.route)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Icon className={`h-12 w-12 ${getIconColor(feature.color)}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFeatureClick(feature.route);
                    }}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>




      </div>
    </div>
  );
}