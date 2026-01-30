import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { Logger } from '../utils/logger';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    let error = err;

    // 1. Zod Error (Validation)
    if (err instanceof ZodError) {
        const message = 'Validation Error';
        const details = err.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
        }));
        error = new AppError(message, 400, 'VALIDATION_ERROR', details);
    }

    // 2. JWT Errors
    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
    }
    if (err.name === 'TokenExpiredError') {
        error = new AppError('Your token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }

    // 3. Handle AppError (Trusted operational errors)
    if (error instanceof AppError) {
        // Log trusted errors as warn/info depending on severity, or error if 500
        if (error.statusCode >= 500) {
            Logger.error(error.message, error);
        } else {
            Logger.warn(error.message, { code: error.code, path: req.path });
        }

        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code || `HTTP_${error.statusCode}`,
                message: error.message,
                details: error.details || null
            }
        });
    }

    // 4. Handle Unknown Errors (Programming errors / Bugs)
    // Log strictly
    Logger.error('UNHANDLED EXCEPTION', err);

    // Send generic response in Production to avoid leaking details
    if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Something went wrong.',
                details: null
            }
        });
    }

    // Send detailed response in Development
    return res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: err.message,
            details: {
                stack: err.stack,
                name: err.name
            }
        }
    });
};
