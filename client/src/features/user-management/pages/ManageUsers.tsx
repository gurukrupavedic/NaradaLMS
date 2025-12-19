import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/features/shared-features/hooks/use-toast";

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
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-600 mt-2">
          Review and approve pending user registrations
        </p>
      </div>

      {/* Pending Users Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Pending Approval ({pendingUsers.length})
          </h2>
          <p className="text-sm text-gray-600">
            Users waiting for admin approval
          </p>
        </div>

        {pendingUsers.length === 0 ? (
          <Card className="p-6 border-dashed border-gray-300 bg-gray-50">
            <p className="text-gray-600 text-center">
              No pending users at this time.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.email}</p>
                    <p className="text-sm text-gray-600">
                      {user.firstName || "No name provided"}
                      {user.lastName && ` ${user.lastName}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Registered:{" "}
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleApprove(user.id)}
                    disabled={approvingId === user.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {approvingId === user.id ? "Approving..." : "Approve"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Users Section */}
      <div className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Active Users ({activeUsers.length})
          </h2>
          <p className="text-sm text-gray-600">
            Approved users with access to the platform
          </p>
        </div>

        {activeUsers.length === 0 ? (
          <Card className="p-6 border-dashed border-gray-300 bg-gray-50">
            <p className="text-gray-600 text-center">
              No active users yet.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Roles
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{user.email}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {user.firstName || user.lastName
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-gray-500">None</span>
                        ) : (
                          user.roles.map((role) => (
                            <span
                              key={role}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                            >
                              {role}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
