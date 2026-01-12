import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { UserPlus, Users, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  email: string;
  status: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

export function ManageUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/auth/admin/users", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return res.json();
    },
  });

  const users: User[] = response?.users || [];

  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      const res = await fetch(`/api/auth/admin/users/${userId}/approve`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to approve user");
      }

      toast({
        title: "Success",
        description: "User has been approved",
        variant: "default",
      });

      // Refetch users list
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      console.error("Approve error", err);
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <p className="text-red-700">Failed to load users. Please try again.</p>
        </Card>
      </div>
    );
  }

  const pendingUsers = users.filter((u) => u.status === "pending_approval");
  const activeUsers = users.filter((u) => u.status === "active");

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review registrations and manage active users</p>
          </div>
        </div>

        <Tabs defaultValue={pendingUsers.length > 0 ? "pending" : "active"} className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Pending
              {pendingUsers.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-5 bg-amber-100 text-amber-700 hover:bg-amber-200">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Users
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-5">
                {activeUsers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Content Area - Flex Grow with Overflow Hidden to contain scrolls */}
          <div className="flex-1 mt-4">
            <TabsContent value="pending" className="h-[calc(100dvh-13rem)] m-0">
              {pendingUsers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                  <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <div className="grid gap-4 auto-rows-max overflow-y-auto h-full pr-2 pb-2">
                  {pendingUsers.map((user) => (
                    <Card key={user.id} className="p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{user.email}</p>
                          <Badge variant="outline" className="text-xs font-normal bg-amber-50 text-amber-700 border-amber-200">
                            Pending Approval
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {user.firstName || "No name"} {user.lastName || ""}
                          <span className="mx-2 text-gray-300">•</span>
                          Registered {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleApprove(user.id)}
                          disabled={approvingId === user.id}
                          className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          {approvingId === user.id ? "Approving..." : "Approve"}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="h-[calc(100dvh-13rem)] m-0 flex flex-col">
              <div className="border rounded-md bg-white overflow-hidden flex flex-col shadow-sm flex-1">
                {/* Table Header Wrapper */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Roles</th>
                        <th className="py-3 px-4">Joined</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">{user.email}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {user.firstName || user.lastName
                              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                              : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.length === 0 ? (
                                <span className="text-gray-400 text-xs italic">User</span>
                              ) : (
                                user.roles.map((role) => (
                                  <Badge key={role} variant="secondary" className="text-xs font-medium">
                                    {role}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-50 hover:opacity-100">
                              <span className="sr-only">Menu</span>
                              <div className="w-4 h-4 rounded-full bg-gray-200" />
                              {/* TODO: Add actions menu */}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
