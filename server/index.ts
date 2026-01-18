import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import { LOG_TRUNCATE_LENGTH, DEFAULT_ERROR_STATUS } from "@shared/constants";
import path from "path";
import { configurePassport } from "./auth/passport-config";
import { identityRouter } from "./routes/identity.routes";
import { adminRouter } from "./routes/admin.routes";
import { initAdminService } from "./modules/system-admin/service";
import { AdminStorage } from "./modules/system-admin/storage";
import { initializeEventHandlers } from "./modules/system-admin/events";
import { Logger } from "./utils/logger";
import { errorHandler } from "./middleware/error.middleware";

import helmet from "helmet";
import cors from "cors";

const app = express();

// Security Middleware (S-03, S-04)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for now to avoid breaking scripts; enable in future
}));
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? false : "*", // Strict in PROD, open in DEV
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sessions (PostgreSQL store)
const PgStore = connectPg(session);
const sessionStore = new PgStore({
  conString: process.env.DATABASE_URL,
  tableName: "sessions",
  createTableIfMissing: true,
});

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("FATAL: SESSION_SECRET is required in production");
}

app.use(session({
  secret: process.env.SESSION_SECRET || "change_me",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());



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
// Mount content routes under both legacy '/api' and new namespaced '/api/content'
app.use('/api', contentRouter);
app.use('/api/content', contentRouter);
import { mediaRouter } from "./routes/media.routes";
app.use('/api', mediaRouter);
import { batchRouter } from "./routes/batch.routes";
app.use('/api', batchRouter);
import { studentRouter } from "./routes/student.routes";
app.use('/api', studentRouter);
import { learningRouter } from "./routes/learning.routes";
app.use('/api/learning', learningRouter);

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

(async () => {
  // Initialize System Admin module
  const adminStorage = new AdminStorage();
  initAdminService(adminStorage);
  initializeEventHandlers();

  const server = createServer(app);

  // Replace custom inline error handler with standardized middleware
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "127.0.0.1", () => {
    Logger.info(`serving on port ${port}`);
  });
})();
