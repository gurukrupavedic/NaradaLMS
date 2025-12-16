import 'dotenv/config';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
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
    const host = process.env.PGHOST;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const sslSuffix = isLocal ? '?sslmode=disable' : '?sslmode=require';
    console.log('Using PG* environment variables for database connection');
    return `postgresql://${process.env.PGUSER}:${encodedPassword}@${host}:${port}/${process.env.PGDATABASE}${sslSuffix}`;
  }
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL environment variable for database connection');
    return process.env.DATABASE_URL;
  }
  throw new Error("DATABASE_URL or PG* environment variables must be set. Did you forget to provision a database?");
};

const DATABASE_URL = buildDatabaseUrl();

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

  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });

  dbClient = drizzlePg(pool, { schema });
} else {
  console.log('Using Neon serverless driver');
  pool = new NeonPool({
    connectionString: DATABASE_URL,
    max: DB_MAX_CONNECTIONS,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
  });

  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });

  dbClient = drizzleNeon({ client: pool, schema });
}

export { pool };
export const db = dbClient;