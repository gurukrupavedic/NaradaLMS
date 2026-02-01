import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JWTPayload } from '../auth/jwt.utils';

// Extensions to Express Request
declare global {
    namespace Express {
        interface User extends JWTPayload { }
    }
}

export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}

export function jwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request - matches Express.User and our AuthenticatedRequest
    req.user = payload;

    next();
}

export function optionalJwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        if (payload) {
            req.user = payload;
        }
    }

    next();
}
