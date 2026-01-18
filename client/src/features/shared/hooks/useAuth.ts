/**
 * useAuth - Authentication state management hook
 * 
 * Provides centralized authentication state management with automatic
 * user session detection via /api/auth/me endpoint, role-based access
 * control, and logout functionality.
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  roles: string[];
  status: "active" | "pending_approval" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export function useAuth() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null; // Not authenticated
          }
          throw new Error("Failed to fetch user");
        }

        const data = await response.json();
        return data.user as AuthUser;
      } catch (err) {
        console.error("Auth check error", err);
        return null;
      }
    },
    retry: false,
  });

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear auth cache and navigate to landing
      queryClient.setQueryData(["auth", "me"], null); // Optimistic update for immediate UI switch
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/");
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  return {
    user: userData || null,
    isLoading,
    isAuthenticated: !!userData,
    isPendingApproval: userData?.status === "pending_approval",
    isActive: userData?.status === "active",
    error,
    logout,
  };
}
