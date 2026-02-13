import 'dotenv/config';

/**
 * Server Configuration
 * Centralizes all environment variables and constants
 */

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
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
};

// Validation for critical settings in production
if (config.env === 'production') {
    if (config.jwt.secret === 'change-me-in-production') {
        throw new Error('FATAL: JWT_SECRET must be changed in production!');
    }
    if (config.jwt.secret.length < 32) {
        throw new Error('FATAL: JWT_SECRET is too short (min 32 chars)!');
    }
}
