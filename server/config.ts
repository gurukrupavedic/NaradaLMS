import 'dotenv/config';

/**
 * Server Configuration
 * Centralizes all environment variables and constants
 */

export const config = {
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '5000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3010')
        .split(',')
        .map(s => s.trim()),
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'change-me-in-production',
        expiry: process.env.JWT_EXPIRY || '7d',
    },
    uploads: {
        dir: process.env.UPLOAD_DIR || 'uploads',
        maxSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB default
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    adminEmail: process.env.ADMIN_EMAIL,
    /** Default org slug for register/OAuth when no `X-Tenant-Slug` (must be `slmts` or `rr`). */
    defaultTenantSlug: (() => {
        const raw = (process.env.DEFAULT_TENANT_SLUG || "slmts").trim().toLowerCase();
        return raw === "rr" ? "rr" : "slmts";
    })(),
};

// Validation for critical settings in production
const unsafeJwtSecrets = ['change-me-in-production', 'your-secret-key-change-in-production'];
if (config.env === 'production') {
    if (!config.jwt.secret || unsafeJwtSecrets.includes(config.jwt.secret)) {
        throw new Error('JWT_SECRET must be set to a secure value in production');
    }
    if (config.jwt.secret.length < 32) {
        throw new Error('FATAL: JWT_SECRET is too short (min 32 chars)!');
    }
}
