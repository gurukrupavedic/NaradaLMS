import type { JWTPayload } from '../auth/jwt.utils';

declare global {
  namespace Express {
    // Populated by jwt-auth middleware from verified JWT
    interface User extends JWTPayload {}
    interface Request {
      /** Resolved from JWT `currentOrgId` after auth (see attachOrgContext / jwtAuth). */
      orgId?: string;
    }
  }
}

export {};
