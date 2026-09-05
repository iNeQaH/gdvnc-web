import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { jwtSecretBytes } from '@/lib/secrets';
import prisma from '@/lib/prisma';
import {
  isFullAdminRole,
  isStaffRole,
  isSuperAdminUsername,
} from '@/lib/roles';

export { isFullAdminRole, isStaffRole, isSuperAdminUsername };

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
    .sign(jwtSecretBytes());
}

/**
 * Verify a JWT token string, returns payload or null
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretBytes());
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

/** JWT identity with current username/role from the database. */
export async function getSessionUser(): Promise<JwtPayload | null> {
  return await getAuthUser();
}

/**
 * Require the current user to be an ADMIN or MODERATOR.
 * Returns the payload if authorized, throws otherwise.
 */
export async function requireAdmin(): Promise<JwtPayload> {
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/** Require a full ADMIN (not moderator). */
export async function requireFullAdmin(): Promise<JwtPayload> {
  const user = await getSessionUser();
  if (!user || !isFullAdminRole(user.role)) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/** Require Super Admin (username iNeQaH). */
export async function requireSuperAdmin(): Promise<JwtPayload> {
  const user = await getSessionUser();
  if (!user || !isSuperAdminUsername(user.username)) {
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
