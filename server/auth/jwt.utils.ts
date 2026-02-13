import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { config } from '../config';

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRY = config.jwt.expiry;

export interface JWTPayload extends JwtPayload {
  id: string;
  email: string;
  roles: string[];
  status: string;
}

const signOptions: SignOptions = {
  expiresIn: JWT_EXPIRY,
  algorithm: 'HS256',
  issuer: 'narada-lms',
} as SignOptions;

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'narada-lms',
      algorithms: ['HS256'], // Strict algorithm enforcement
    }) as JWTPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}
