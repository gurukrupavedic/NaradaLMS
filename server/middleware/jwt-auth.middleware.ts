import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JWTPayload } from '../auth/jwt.utils';
import '../shared/types';

export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}

export function jwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Read JWT from HttpOnly cookie (more secure than localStorage)
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    //Attach user to request - matches Express.User and our AuthenticatedRequest
    req.user = payload;

    next();
}

export function optionalJwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const token = req.cookies.auth_token;

    if (token) {
        const payload = verifyToken(token);

        if (payload) {
            req.user = payload;
        }
    }

    next();
}
