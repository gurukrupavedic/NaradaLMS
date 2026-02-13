"use client" // This must be a client hook

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
                return response.user as AuthUser;
            } catch (err: unknown) {
                // 401 means not authenticated — this is expected
                // Other errors (network, 500) should propagate so React Query can retry
                const message = err instanceof Error ? err.message : String(err);
                if (message.includes('401') || message.includes('Unauthorized')) {
                    return null;
                }
                throw err;
            }
        },
        retry: (failureCount, error) => {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('401') || message.includes('Unauthorized')) {
                return false;
            }
            return failureCount < 2;
        },
    });

    const logout = async () => {
        try {
            await apiRequest("/auth/logout", { method: "POST" });
            queryClient.setQueryData(["auth", "me"], null);
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
            router.push("/");
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
