import React from 'react';
import { cn } from '@/lib/utils';
import { BookOpen, Users, FileEdit, Settings } from 'lucide-react';
import type { User } from '@shared/schema';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  requiredRole: string;
}

const tabs: Tab[] = [
  {
    id: 'my-learning',
    label: 'My Learning',
    icon: <BookOpen className="w-4 h-4" />,
    requiredRole: 'student',
  },
  {
    id: 'instructor-panel',
    label: 'Instructor Panel',
    icon: <Users className="w-4 h-4" />,
    requiredRole: 'instructor',
  },
  {
    id: 'content-management',
    label: 'Manage Content',
    icon: <FileEdit className="w-4 h-4" />,
    requiredRole: 'content_manager',
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: <Settings className="w-4 h-4" />,
    requiredRole: 'admin',
  },
];

interface RoleBasedTabsProps {
  user: User;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function RoleBasedTabs({ user, activeTab, onTabChange }: RoleBasedTabsProps) {
  const userRoles = user.roles || [];
  
  const visibleTabs = tabs.filter(tab => userRoles.includes(tab.requiredRole));

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <nav className="flex space-x-8 border-b border-gray-200 mb-8">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center space-x-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors",
            activeTab === tab.id
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-gray-500 hover:text-amber-600 hover:border-amber-300"
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
