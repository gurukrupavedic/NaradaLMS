import 'dotenv/config';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import { DB_MAX_CONNECTIONS, DB_CONNECTION_TIMEOUT_MS } from "@shared/constants";
import { config } from "./config";

// Configure WebSocket for Neon in Node.js environment
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
  // Use fetch instead of WebSocket for better reliability
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchConnectionCache = true;
}

// Database Connection String resolution logic
function getConnectionString(): string {
  if (config.database.url) {
    console.log('Using config.database.url for database connection');
    return config.database.url;
  }

  // Fallback to individual PG* vars if config.database.url is not set
  const { PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    console.log('Using PG* environment variables for database connection');
    const port = PGPORT || '5432';
    const encodedPassword = encodeURIComponent(PGPASSWORD);
    const sslSuffix = config.env === 'production' ? "?sslmode=require" : "";
    return `postgresql://${PGUSER}:${encodedPassword}@${PGHOST}:${port}/${PGDATABASE}${sslSuffix}`;
  }

  throw new Error("config.database.url or PG* environment variables must be set. Did you forget to provision a database?");
}

const DATABASE_URL = getConnectionString();

// Decide driver based on host: use pg for localhost, neon for remote
const isLocalHost = (() => {
  try {
    const url = new URL(DATABASE_URL);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
})();

let pool: PgPool | NeonPool;
let dbClient: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzleNeon>;

if (isLocalHost) {
  console.log('Using pg driver for local Postgres');
  pool = new PgPool({
    connectionString: DATABASE_URL,
    max: DB_MAX_CONNECTIONS,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
    ssl: false
  });

  (pool as PgPool).on('error', (err) => {
    console.error('Database pool error:', err);
  });

  dbClient = drizzlePg(pool as PgPool, { schema });
} else {
  console.log('Using Neon serverless driver');
  const neonPool = new NeonPool({
    connectionString: DATABASE_URL,
    max: DB_MAX_CONNECTIONS,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
  });

  pool = neonPool;

  // Neon pool doesn't surface typed event names; use optional chaining to avoid runtime errors
  (neonPool as any)?.on?.('error', (err: unknown) => {
    console.error('Database pool error:', err);
  });

  // drizzle-neon expects the pool directly, not an options object
  dbClient = drizzleNeon(neonPool, { schema });
}

export { pool };
export const db = dbClient;