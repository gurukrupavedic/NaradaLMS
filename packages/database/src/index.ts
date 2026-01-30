import 'dotenv/config';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "./schema.js";

// Configuration constants (Internal for database package)
const DB_CONNECTION_TIMEOUT_MS = 10000;
const DB_MAX_CONNECTIONS = 20;

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
        return `postgresql://${process.env.PGUSER}:${encodedPassword}@${host}:${port}/${process.env.PGDATABASE}${sslSuffix}`;
    }
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }
    throw new Error("DATABASE_URL or PG* environment variables must be set.");
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
let dbClient;

if (isLocalHost) {
    pool = new PgPool({
        connectionString: DATABASE_URL,
        max: DB_MAX_CONNECTIONS,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
        ssl: false
    });

    dbClient = drizzlePg(pool as PgPool, { schema });
} else {
    const neonPool = new NeonPool({
        connectionString: DATABASE_URL,
        max: DB_MAX_CONNECTIONS,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
    });

    pool = neonPool;
    dbClient = drizzleNeon(neonPool, { schema });
}

export { pool };
export const db = dbClient;
export { schema };
