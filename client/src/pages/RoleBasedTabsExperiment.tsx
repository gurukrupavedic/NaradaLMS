import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { Shield, BookOpen, BarChart3 } from "lucide-react";

/**
 * Experiment: Role-Based Tabs Component
 * Reference implementation for role switching UI patterns
 * Access via: /experiments/role-based-tabs
 */
export default function RoleBasedTabsExperiment() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState("student");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Role-Based Tabs Experiment</h1>
        <p className="text-gray-600 mb-6">
          Reference implementation for switching between admin, instructor, and student views
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Interface Modes</CardTitle>
            <CardDescription>
              Demonstrates tab-based role switching pattern
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Student</span>
                </TabsTrigger>
                <TabsTrigger value="instructor" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Instructor</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Student View</CardTitle>
                    <CardDescription>Learning interface and progress tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      This would display: tracks, chapters, learning progress, proficiency levels
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Instructor View</CardTitle>
                    <CardDescription>Student progress and assessment management</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      This would display: student list, progress metrics, assessment tools
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="admin" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Admin View</CardTitle>
                    <CardDescription>System management and user administration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      This would display: user management, system settings, analytics
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
