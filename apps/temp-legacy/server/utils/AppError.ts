export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;
    public readonly details?: any;

    constructor(message: string, statusCode: number, code?: string, details?: any, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}
