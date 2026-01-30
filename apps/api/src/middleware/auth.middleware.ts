import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../auth/jwt.utils.js';
import { AppError } from '../utils/AppError.js';

// Extend Express Request to include user context
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401, 'NO_TOKEN');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // 2. Verify and decode token
        const decoded = verifyToken(token);

        // 3. Attach user to request
        req.user = decoded;

        next();
    } catch (error) {
        next(error);
    }
};

// Optional: Role-based authorization middleware
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        }

        const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
        if (!hasRole) {
            return next(new AppError('Forbidden: Insufficient permissions', 403, 'FORBIDDEN'));
        }

        next();
    };
};
