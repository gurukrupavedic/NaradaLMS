import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { BookOpen, Presentation, Edit, UsersIcon, ChevronDown, Languages } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { InstructorPanel } from "@/components/InstructorPanel";

import Administration from "@/components/Administration";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export function Home() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("my-learning");
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🕉️</div>
          <p className="text-lg text-gray-600">Loading your learning dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRoles = user.roles || ['student'];
  const hasRole = (role: string) => userRoles.includes(role);

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const getDisplayName = (user: any) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'User';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl mr-3">🕉️</span>
                <h1 className="text-xl font-bold text-primary">Vedic LMS</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.profileImageUrl} alt="User Avatar" />
                      <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{getDisplayName(user)}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.location.href = '/api/logout'}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 bg-muted p-1 h-auto">
            {hasRole('student') && (
              <TabsTrigger 
                value="my-learning" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">My Learning</span>
              </TabsTrigger>
            )}
            
            {hasRole('instructor') && (
              <TabsTrigger 
                value="instructor-panel"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <Presentation className="h-4 w-4" />
                <span className="hidden sm:inline">Instructor Panel</span>
              </TabsTrigger>
            )}
            
            {hasRole('content_manager') && (
              <TabsTrigger 
                value="manage-content"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Manage Content</span>
              </TabsTrigger>
            )}
            
            {hasRole('admin') && (
              <TabsTrigger 
                value="administration"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <UsersIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Administration</span>
              </TabsTrigger>
            )}
          </TabsList>

          {hasRole('student') && (
            <TabsContent value="my-learning" className="space-y-6">
              <Dashboard />
            </TabsContent>
          )}
          
          {hasRole('instructor') && (
            <TabsContent value="instructor-panel" className="space-y-6">
              <InstructorPanel />
            </TabsContent>
          )}
          
          {hasRole('content_manager') && (
            <TabsContent value="manage-content" className="space-y-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground">Content management functionality has been moved.</p>
              </div>
            </TabsContent>
          )}
          
          {hasRole('admin') && (
            <TabsContent value="administration" className="space-y-6">
              <Administration />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
