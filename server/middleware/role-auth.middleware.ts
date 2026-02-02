import type { Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import type { AuthenticatedRequest } from './jwt-auth.middleware';

/**
 * Middleware to require specific roles
 * Assumes jwtAuth middleware has already run and attached user to req
 */
export function requireRole(allowedRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Unauthorized', 401));
        }

        const userRoles = req.user.roles || [];
        const hasRole = userRoles.some(role => allowedRoles.includes(role));

        if (!hasRole) {
            return next(new AppError(`Forbidden: Requires one of these roles: ${allowedRoles.join(', ')}`, 403));
        }

        next();
    };
}

export const requireAdmin = requireRole(['admin']);
export const requireInstructor = requireRole(['instructor', 'admin']); // Admins usually have instructor access too
