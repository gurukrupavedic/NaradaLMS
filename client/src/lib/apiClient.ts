/**
 * API Client Utility
 * Handles all HTTP requests with automatic CSRF token management
 * and cookie-based authentication
 */

let csrfToken: string | null = null;

/**
 * Fetch CSRF token from the API
 * Cached after first request
 */
async function getCsrfToken(): Promise<string> {
    if (csrfToken) {
        return csrfToken;
    }

    const response = await fetch('/api/csrf-token', {
        credentials: 'include', // Send cookies
    });

    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken;
}

/**
 * Make an API request with automatic CSRF token and cookie handling
 * 
 * @param endpoint - API endpoint (e.g., '/auth/login')
 * @param options - Fetch options
 * @returns Response object
 */
export async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    // Get CSRF token for state-changing requests
    const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
        options.method?.toUpperCase() || 'GET'
    );

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };

    if (needsCsrf) {
        const token = await getCsrfToken();
        headers['X-CSRF-Token'] = token;
    }

    return fetch(`/api${endpoint}`, {
        ...options,
        credentials: 'include', // Send/receive cookies
        headers,
    });
}

/**
 * Clear cached CSRF token (call after logout)
 */
export function clearCsrfToken() {
    csrfToken = null;
}
