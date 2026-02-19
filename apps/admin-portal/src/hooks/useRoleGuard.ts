'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Role guard hook - redirects to login if user doesn't have required role
 * @param requiredRoles - Array of roles that are allowed to access the page
 */
export function useRoleGuard(requiredRoles: string[]) {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        const hasRequiredRole = requiredRoles.some(role => user.roles?.includes(role));

        if (!hasRequiredRole) {
            router.push('/unauthorized');
        }
    }, [user, isLoading, requiredRoles, router]);
}
