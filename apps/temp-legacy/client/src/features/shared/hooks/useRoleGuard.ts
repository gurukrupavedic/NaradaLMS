/**
 * useRoleGuard - Role-based access control hook
 * 
 * Enforces role-based access control on pages by checking if the current
 * user has at least one of the required roles. Redirects to /app/learning
 * with a toast notification if unauthorized.
 * 
 * @param requiredRoles - Array of roles, user must have at least ONE
 * @author Narada LMS Team
 * @since 2026-01-08
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useRoleGuard(requiredRoles: string[]) {
    const { user, isLoading } = useAuth();
    const [, navigate] = useLocation();
    const { toast } = useToast();

    useEffect(() => {
        // Wait for auth to load
        if (isLoading) return;

        // No user logged in - redirect (shouldn't happen due to AppShell guard)
        if (!user) {
            navigate('/app/learning');
            return;
        }

        // Check if user has at least ONE of the required roles
        const userRoles = user.roles || [];
        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: "You don't have permission to access this page.",
            });
            navigate('/app/learning');
        }
    }, [user, isLoading, requiredRoles, navigate, toast]);
}
