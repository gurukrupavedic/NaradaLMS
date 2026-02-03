
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export type FetchOptions = RequestInit & {
    headers?: Record<string, string>;
};

export async function apiRequest<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    // Server-side: Pass cookies manually via dynamic import to avoid client bundle errors
    if (typeof window === "undefined") {
        try {
            // Use standard dynamic import for Next.js server compatibility
            // This is a pattern used to avoid bundling server-only modules in client-side code
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const token = cookieStore.get('token')?.value;

            // Pass all cookies if no specific token logic, or specific auth token
            if (token) {
                headers['Cookie'] = `token=${token}`;
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                // Forward all cookies just in case if no token found (generic behavior)
                const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
                if (allCookies) {
                    headers['Cookie'] = allCookies;
                }
            }
        } catch (error) {
            // Silence errors in environments where next/headers might not be available or strictly server-side
            // console.warn('Failed to load cookies in server environment', error);
        }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Important for client-side cross-origin cookies
    });

    if (response.status === 401) {
        // Handle unauthorized - redirection handled by middleware usually, but good to know
        console.warn("Unauthorized request to", endpoint);
    }

    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch {
            errorData = { message: errorText || response.statusText };
        }
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }

    // Handle empty responses
    if (response.status === 204) {
        return {} as T;
    }

    try {
        return await response.json();
    } catch (e) {
        // Fallback for non-JSON responses if any
        return {} as T;
    }
}
