/// <reference path="./types.d.ts" />
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";

import passport from "passport";
import { createServer } from "http";
import { LOG_TRUNCATE_LENGTH, DEFAULT_ERROR_STATUS } from "@narada/types";
import path from "path";
import { configurePassport } from "./auth/passport-config";
import { identityRouter } from "./routes/identity.routes";
import { adminRouter } from "./routes/admin.routes";
import { initAdminService } from "./modules/system-admin/service";
import { AdminStorage } from "./modules/system-admin/storage";
import { initializeEventHandlers } from "./modules/system-admin/events";
import { Logger } from "./utils/logger";
import { errorHandler } from "./middleware/error.middleware";
import { config } from "./config";

import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import csrf from "csurf";

const app = express();

// Security Middleware (S-03, S-04)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some dev tools
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check strict whitelist
    if (config.corsOrigins.includes(origin) || origin === config.frontendUrl) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookie parser for JWT cookies
app.use(cookieParser());

// CSRF Protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'strict' : 'lax'
  }
});

// CSRF token endpoint - defined BEFORE middleware to avoid chicken-egg problem
// This endpoint generates the initial CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: (req as Request & { csrfToken(): string }).csrfToken() });
});

// Apply CSRF middleware to all other routes (only validates on POST/PUT/DELETE/PATCH)
app.use((req, res, next) => {
  // Skip CSRF token endpoint (already handled above)
  if (req.path === '/api/csrf-token') {
    return next();
  }
  csrfProtection(req, res, next);
});



// Passport
configurePassport();
app.use(passport.initialize());

// Request Logger (must be before routes)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      Logger.http(req.method, path, res.statusCode, duration);
    }
  });

  next();
});

// Serve uploaded files (audio, etc.)
app.use('/uploads', express.static('uploads'));

// Serve static files from public directory
app.use(express.static('public'));

// Identity & Access routes (Phase 1 module)
app.use('/api/auth', identityRouter);

// Admin routes (Phase 6 module)
app.use('/api/admin', adminRouter);

// Content & Publishing routes (Phase 2 module)
import { contentRouter } from "./routes/content.routes";
app.use('/api/content', contentRouter);

import { mediaRouter } from "./routes/media.routes";
app.use('/api', mediaRouter);

import { batchRouter } from "./routes/batch.routes";
app.use('/api', batchRouter);

import { studentRouter } from "./routes/student.routes";
app.use('/api', studentRouter);

import { learningRouter } from "./routes/learning.routes";
app.use('/api/learning', learningRouter);

(async () => {
  // Initialize System Admin module
  const adminStorage = new AdminStorage();
  initAdminService(adminStorage);
  initializeEventHandlers();

  const server = createServer(app);

  // Replace custom inline error handler with standardized middleware
  app.use(errorHandler);

  // No more Vite SPA serving — the API server is a pure API now.
  // Portals are served separately via Next.js.

  const port = config.port;
  server.listen(port, "127.0.0.1", () => {
    Logger.info(`serving on port ${port}`);
  });
})();
