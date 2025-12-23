import { useLocation } from "wouter";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { BookOpen, Edit, Users, Layers } from "lucide-react";
import type { User } from "@shared/schema";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  color: "blue" | "green" | "purple" | "indigo";
  adminOnly?: boolean;
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
    title: "Batches",
    description: "Organize learners into cohorts",
    icon: Layers,
    route: "/manage/batches",
    color: "purple"
  },
  {
    title: "Manage Users",
    description: "Review and approve user registrations",
    icon: Users,
    route: "/manage/users",
    color: "indigo",
    adminOnly: true,
  }
];

const iconColors = {
  blue: "text-blue-600",
  green: "text-green-600",
  purple: "text-purple-600",
  indigo: "text-indigo-600",
};

interface SimpleDashboardProps {
  user: User;
}

export default function SimpleDashboard({ user }: SimpleDashboardProps) {
  const [, setLocation] = useLocation();

  const handleFeatureClick = (route: string) => {
    setLocation(route);
  };

  const visibleFeatures = FEATURES.filter((feature) => {
    if (feature.adminOnly) {
      return (user as any).roles?.includes("admin");
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vedic Learning Platform</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome, {user.email}</p>
            </div>
                        <div className="flex items-center gap-2">
                          <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
                window.location.href = "/";
              }}
            >
              Sign Out
            </Button>
                      </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title}
                variant={feature.color as any}
                interactive
                onClick={() => handleFeatureClick(feature.route)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Icon className={`h-12 w-12 ${iconColors[feature.color]}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    color={feature.color as any}
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

