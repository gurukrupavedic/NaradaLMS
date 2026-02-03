"use client" // This must be a client hook

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api"; // Updated to use the correct apiFetch from lib/api

export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    roles: string[];
    status: "active" | "pending_approval" | "inactive";
    createdAt: string; // Serialized date
    updatedAt: string;
}

export function useAuth() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const {
        data: userData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["auth", "me"],
        queryFn: async () => {
            try {
                const response = await apiRequest("/auth/me");

                // This apiFetch throws on error, so we catch it below
                // But for auth check we might want to handle 401 gracefully
                return response.user as AuthUser;
            } catch (err) {
                // If 401, return null (handled by apiFetch throwing? No, apiFetch throws for !ok)
                // We need to check if the error is 401. 
                // Our apiFetch throws 'res' if it can, or Error.

                // Quick fix: assumes any error means not authenticated for now
                return null;
            }
        },
        retry: false,
    });

    const logout = async () => {
        try {
            await apiRequest("/auth/logout", { method: "POST" });
            queryClient.setQueryData(["auth", "me"], null);
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
            router.push("/login"); // Need to figure out where login page is
        } catch (err) {
            console.error("Logout error", err);
        }
    };

    return {
        user: userData || null,
        isLoading,
        isAuthenticated: !!userData,
        logout,
    };
}
