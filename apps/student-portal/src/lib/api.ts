// import { cookies } from 'next/headers'; // Dynamic import used instead

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type FetchOptions = RequestInit & {
    requiresAuth?: boolean;
};

export async function apiRequest<T = any>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    // Server-side: Pass cookies manually
    if (typeof window === 'undefined') {
        try {
            const { cookies } = await import('next/headers');
            const cookieStore = await cookies();
            const cookieHeader = cookieStore.toString();
            if (cookieHeader) {
                headers['Cookie'] = cookieHeader;
            }
        } catch (error) {
            console.warn('Failed to load cookies in server environment', error);
        }
    }

    // Client-side: Credentials 'include' handles cookies automatically
    const config: RequestInit = {
        ...options,
        headers,
        credentials: 'include',
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
}
