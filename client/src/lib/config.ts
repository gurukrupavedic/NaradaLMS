/**
 * Frontend Configuration
 * Centralizes all environment variables for the client
 */

export const config = {
    apiUrl: import.meta.env.VITE_API_URL || '/api',
};
