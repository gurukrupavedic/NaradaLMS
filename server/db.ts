import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { DB_MAX_CONNECTIONS, DB_CONNECTION_TIMEOUT_MS } from "@shared/constants";

// Configure WebSocket for Neon in Node.js environment
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
  // Use fetch instead of WebSocket for better reliability
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchConnectionCache = true;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with better error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: DB_MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle({ client: pool, schema });