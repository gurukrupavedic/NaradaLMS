/**
 * Type declarations for server dependencies without @types packages.
 */
declare module "cookie-parser" {
  import type { RequestHandler } from "express";
  const cookieParser: (secret?: string | string[]) => RequestHandler;
  export = cookieParser;
}

declare module "csurf" {
  import type { RequestHandler } from "express";
  interface Options {
    cookie?: boolean | { key?: string; httpOnly?: boolean; secure?: boolean; sameSite?: boolean | "strict" | "lax" };
    value?: (req: import("express").Request) => string;
  }
  function csrf(options?: Options): RequestHandler;
  export = csrf;
}

declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}
