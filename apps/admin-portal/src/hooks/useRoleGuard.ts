'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { hasActiveOrgRole, isOrgScopedRole } from '@/lib/admin-portal-access';

/**
 * Role guard hook — redirects if the user lacks required **org** roles in **current org** (`user.currentOrgId`).
 * Does not treat `isSuperAdmin` as satisfying `admin` / `instructor` / `student` (§3.4).
 *
 * @param requiredRoles - Allowed roles; only `student`, `instructor`, and `admin` are supported (membership-based). Unknown roles deny access.
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

        const hasRequiredRole = requiredRoles.some((role) => {
            if (!isOrgScopedRole(role)) {
                return false;
            }
            return hasActiveOrgRole(user.memberships, user.currentOrgId, role);
        });

        if (!hasRequiredRole) {
            router.push('/unauthorized');
        }
    }, [user, isLoading, requiredRoles, router]);
}
