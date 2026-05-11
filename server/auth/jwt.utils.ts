import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { config } from '../config';

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRY = config.jwt.expiry;

/** Membership status for the JWT's current org context (mirrors `user_organizations.status`). */
export type OrgMembershipStatusClaim =
  | 'pending'
  | 'active'
  | 'inactive'
  | 'rejected';

/** Claims signed into the auth cookie (no legacy global `roles` / `status`). */
export interface JwtSignClaims {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  currentOrgId?: string;
  orgRoles?: string[];
  orgMembershipStatus?: OrgMembershipStatusClaim;
}

export interface JWTPayload extends JwtPayload, JwtSignClaims {}

const signOptions: SignOptions = {
  expiresIn: JWT_EXPIRY,
  algorithm: 'HS256',
  issuer: 'narada-lms',
} as SignOptions;

export function generateToken(payload: JwtSignClaims): string {
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

function isLegacyJwtPayload(decoded: Record<string, unknown>): boolean {
  return (
    'roles' in decoded &&
    Array.isArray((decoded as { roles?: unknown }).roles) &&
    typeof decoded.isSuperAdmin !== 'boolean'
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'narada-lms',
      algorithms: ['HS256'], // Strict algorithm enforcement
    }) as Record<string, unknown>;

    if (isLegacyJwtPayload(decoded)) {
      return null;
    }

    if (
      typeof decoded.id !== 'string' ||
      typeof decoded.email !== 'string' ||
      typeof decoded.isSuperAdmin !== 'boolean'
    ) {
      return null;
    }

    return decoded as JWTPayload;
  } catch {
    return null;
  }
}
