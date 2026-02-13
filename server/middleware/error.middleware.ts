import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { Logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    // Already sent response
    if (res.headersSent) {
        return next(err);
    }

    // AppError (our custom error class)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: { message: err.message, code: err.code }
        });
    }

    // Zod validation errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: err.errors,
            }
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: { message: 'Invalid token. Please log in again.', code: 'INVALID_TOKEN' }
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: { message: 'Your token has expired. Please log in again.', code: 'TOKEN_EXPIRED' }
        });
    }

    // Errors with .status or .statusCode (from Object.assign pattern)
    const statusCode = err.statusCode ?? err.status ?? 500;
    const message = err.message || 'Internal server error';

    if (statusCode >= 500) {
        Logger.error('Unhandled server error:', err);
    }

    return res.status(statusCode).json({
        error: { message, code: err.code || 'SERVER_ERROR' }
    });
}
