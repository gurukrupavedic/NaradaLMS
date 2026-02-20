/**
 * Type declarations for server dependencies without @types packages.
 */
declare module "cookie-parser" {
  import type { RequestHandler } from "express";
  const cookieParser: (secret?: string | string[]) => RequestHandler;
  export = cookieParser;
}

