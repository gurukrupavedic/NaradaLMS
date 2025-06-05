import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Presentation, 
  Edit, 
  UserCog 
} from "lucide-react";
import StudentDashboard from "./student-dashboard";
import InstructorPanel from "./simple-instructor-panel";
import ContentManager from "./simple-content-manager";
import AdminPanel from "./simple-admin-panel";
import type { User } from "@shared/schema";

interface RoleTabsProps {
  user: User;
}

type TabId = 'my-learning' | 'instructor-panel' | 'manage-content' | 'administration';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole: string;
}

const TABS: Tab[] = [
  {
    id: 'my-learning',
    label: 'My Learning',
    icon: BookOpen,
    requiredRole: 'student',
  },
  {
    id: 'instructor-panel',
    label: 'Instructor Panel',
    icon: Presentation,
    requiredRole: 'instructor',
  },
  {
    id: 'manage-content',
    label: 'Manage Content',
    icon: Edit,
    requiredRole: 'content_manager',
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: UserCog,
    requiredRole: 'admin',
  },
];

export default function RoleTabs({ user }: RoleTabsProps) {
  // Determine which tabs the user has access to
  // Temporarily allow all tabs for testing content management
  const availableTabs = TABS;

  // Default to the first available tab
  const [activeTab, setActiveTab] = useState<TabId>(
    availableTabs.length > 0 ? availableTabs[0].id : 'my-learning'
  );

  // If user has no roles or no available tabs, show error
  if (availableTabs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md mx-auto">
          <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Access Roles Assigned
          </h3>
          <p className="text-gray-600 mb-4">
            Your account doesn't have any roles assigned yet. Please contact your 
            administrator to request access to the platform.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/logout'}
            variant="outline"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'my-learning':
        return <StudentDashboard user={user} />;
      case 'instructor-panel':
        return <InstructorPanel user={user} />;
      case 'manage-content':
        return <ContentManager user={user} />;
      case 'administration':
        return <AdminPanel user={user} />;
      default:
        return <StudentDashboard user={user} />;
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-8 border-b border-gray-200">
          {availableTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-vedic-brown text-vedic-brown'
                    : 'border-transparent text-gray-500 hover:text-vedic-brown hover:border-gray-300'
                }`}
              >
                <Icon className="inline h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
