/**
 * RUNTIME ENVIRONMENT INJECTION SYSTEM
 * 
 * This enables "Build Once, Deploy Everywhere" by:
 * 1. Docker entrypoint script injects env vars into window.__ENV__ at container startup
 * 2. React app reads from window.__ENV__ instead of process.env
 * 3. Single build artifact can be deployed to multiple organizations
 */

export interface RuntimeConfig {
    // Organization context (SLMTS or RR)
    ORGANIZATION_ID: 'slmts' | 'rr';

    // API endpoints
    API_URL: string;

    // Feature flags
    ENABLE_DEBUG: boolean;

    // Optional: Organization-specific branding
    ORG_NAME?: string;
    ORG_LOGO_URL?: string;
}

// Type augmentation for window object
declare global {
    interface Window {
        __ENV__?: Partial<RuntimeConfig>;
    }
}

/**
 * Get runtime configuration
 * Falls back to defaults if window.__ENV__ is not available
 */
export function getRuntimeConfig(): RuntimeConfig {
    // In browser: read from window.__ENV__ (injected by Docker entrypoint)
    if (typeof window !== 'undefined' && window.__ENV__) {
        return {
            ORGANIZATION_ID: window.__ENV__.ORGANIZATION_ID || 'slmts',
            API_URL: window.__ENV__.API_URL || 'http://localhost:4000',
            ENABLE_DEBUG: window.__ENV__.ENABLE_DEBUG || false,
            ORG_NAME: window.__ENV__.ORG_NAME,
            ORG_LOGO_URL: window.__ENV__.ORG_LOGO_URL,
        };
    }

    // Fallback for SSR or development
    return {
        ORGANIZATION_ID: (process.env.NEXT_PUBLIC_ORGANIZATION_ID as 'slmts' | 'rr') || 'slmts',
        API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
        ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
    };
}

/**
 * Hook to access runtime config in React components
 */
export function useRuntimeConfig(): RuntimeConfig {
    return getRuntimeConfig();
}
