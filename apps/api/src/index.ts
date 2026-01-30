import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import { db } from '@narada/database';
import { Logger } from './utils/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { AppError } from './utils/AppError.js';
import authRoutes from './routes/auth.routes.js';
import { organizationGuard } from './middleware/organization.middleware.js';

const app = express();
const port = process.env.PORT || 4000;

// 1. Security & Logging Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Custom Morgan logging using our Logger util
app.use(morgan('dev', {
    stream: {
        write: (message) => Logger.info(message.trim())
    }
}));

// 2. Core Routes
app.use('/api/auth', authRoutes);

// 3. Multi-Tenancy Guard (applied to all routes except auth)
// Note: Public routes like /health bypass this via placement
app.use('/api', organizationGuard);

app.get('/health', async (req, res) => {
    try {
        // DB Sanity
        await db.execute('SELECT 1');
        res.json({
            status: 'ok',
            service: '@narada/api',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        Logger.error('Health check failed', err);
        res.status(500).json({
            status: 'error',
            service: '@narada/api',
            database: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
});

// 3. 404 Handler
app.use('*', (req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

// 4. Global Error Handler
app.use(errorHandler);

app.listen(port, () => {
    Logger.info(`🚀 @narada/api listening at http://localhost:${port}`);
});
