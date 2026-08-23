import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_jwt_secret_change_me'
);

const COOKIE_NAME = 'gdvnc_token';
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT token for a user
 */
export async function signToken(payload: { userId: string; username: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token string, returns payload or null
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Set the JWT cookie in the response via Next.js cookies()
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear the JWT cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the currently authenticated user from the JWT cookie.
 * Returns the decoded payload or null if not authenticated.
 */
export async function getAuthUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Require the current user to be an ADMIN or MODERATOR.
 * Returns the payload if authorized, throws otherwise.
 */
export async function requireAdmin(): Promise<JwtPayload> {
  const user = await getAuthUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Require any authenticated user.
 */
export async function requireAuth(): Promise<JwtPayload> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
