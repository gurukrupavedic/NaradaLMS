import 'dotenv/config';
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

// Build DATABASE_URL from individual PG* vars if DATABASE_URL is stale/missing
const buildDatabaseUrl = (): string => {
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    const port = process.env.PGPORT || '5432';
    const encodedPassword = encodeURIComponent(process.env.PGPASSWORD);
    console.log('Using PG* environment variables for database connection');
    return `postgresql://${process.env.PGUSER}:${encodedPassword}@${process.env.PGHOST}:${port}/${process.env.PGDATABASE}?sslmode=require`;
  }
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL environment variable for database connection');
    return process.env.DATABASE_URL;
  }
  throw new Error("DATABASE_URL or PG* environment variables must be set. Did you forget to provision a database?");
};

const DATABASE_URL = buildDatabaseUrl();

// Create connection pool with better error handling
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: DB_MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle({ client: pool, schema });