"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";

export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    roles: string[];
    status: "active" | "pending_approval" | "inactive";
    createdAt: string;
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
                return response.user as AuthUser;
            } catch (err) {
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
            window.location.href = "http://localhost:5000/login"; // Redirect to monolith login
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
