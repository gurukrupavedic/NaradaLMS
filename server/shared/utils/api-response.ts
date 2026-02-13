export interface ApiErrorResponse {
    error: {
        message: string;
        code?: string;
        details?: unknown;
        timestamp: string;
        requestId: string;
    };
}

export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createErrorResponse(message: string, code?: string, details?: unknown): ApiErrorResponse {
    return {
        error: {
            message,
            code,
            details,
            timestamp: new Date().toISOString(),
            requestId: generateRequestId(),
        },
    };
}
